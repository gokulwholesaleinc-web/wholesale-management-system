-- Credit Terms & A/R Migration
-- Adds comprehensive accounts receivable system

-- Customers: add credit fields (safe to re-run)
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS credit_term VARCHAR(16) DEFAULT 'Prepaid' NOT NULL,
  ADD COLUMN IF NOT EXISTS credit_limit_cents BIGINT DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS on_credit_hold BOOLEAN DEFAULT FALSE NOT NULL;

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Invoices
CREATE TABLE IF NOT EXISTS ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  order_id INTEGER,
  invoice_no VARCHAR(32) UNIQUE,
  status VARCHAR(16) NOT NULL DEFAULT 'open', -- draft|open|paid|void
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  tax_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_inv_customer ON ar_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_inv_status ON ar_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_inv_order ON ar_invoices(order_id);

-- Invoice lines
CREATE TABLE IF NOT EXISTS ar_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
  sku VARCHAR(64),
  description TEXT,
  uom VARCHAR(16),
  quantity NUMERIC(18,3) NOT NULL DEFAULT 1,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  line_subtotal_cents BIGINT NOT NULL DEFAULT 0,
  tax_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ar_lines_invoice ON ar_invoice_lines(invoice_id);

-- Payments (header)
CREATE TABLE IF NOT EXISTS ar_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id VARCHAR NOT NULL,
  received_at DATE NOT NULL DEFAULT CURRENT_DATE,
  method VARCHAR(24) NOT NULL, -- cash|check|ach|card|adjustment
  reference VARCHAR(64), -- check #, txn id
  amount_cents BIGINT NOT NULL,
  unapplied_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_pmt_customer ON ar_payments(customer_id);

-- Payment applications (many-to-many)
CREATE TABLE IF NOT EXISTS ar_payment_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES ar_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES ar_invoices(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_app_invoice ON ar_payment_apps(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ar_app_payment ON ar_payment_apps(payment_id);

-- Trigger to keep ar_invoices.balance_cents in sync
CREATE OR REPLACE FUNCTION trg_ar_invoice_update_balance() RETURNS TRIGGER AS $$
BEGIN
  -- Handle both INSERT/UPDATE and DELETE cases
  DECLARE
    target_invoice_id UUID;
  BEGIN
    -- Determine which invoice_id to update
    IF TG_OP = 'DELETE' THEN
      target_invoice_id := OLD.invoice_id;
    ELSE
      target_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Recompute balance from total minus applied payments
    UPDATE ar_invoices ai SET
      balance_cents = ai.total_cents - COALESCE((
        SELECT SUM(apa.amount_cents) FROM ar_payment_apps apa WHERE apa.invoice_id = ai.id
      ), 0),
      status = CASE
        WHEN ai.status = 'void' THEN 'void'
        WHEN (ai.total_cents - COALESCE((SELECT SUM(apa.amount_cents) FROM ar_payment_apps apa WHERE apa.invoice_id = ai.id), 0)) <= 0 THEN 'paid'
        ELSE 'open'
      END,
      updated_at = NOW()
    WHERE ai.id = target_invoice_id;
    
    RETURN NULL;
  END;
END;$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trg_after_payment_app ON ar_payment_apps;
CREATE TRIGGER trg_after_payment_app
AFTER INSERT OR UPDATE OR DELETE ON ar_payment_apps
FOR EACH ROW EXECUTE FUNCTION trg_ar_invoice_update_balance();