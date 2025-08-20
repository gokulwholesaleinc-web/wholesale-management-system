CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Canonical fields live on users (your table name)
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS term VARCHAR(16) NOT NULL DEFAULT 'Prepaid',
  ADD COLUMN IF NOT EXISTS credit_limit_cents BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_credit_hold BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill cents from any legacy dollar column if present (creditLimit / credit_limit)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='creditlimit') THEN
    EXECUTE 'UPDATE users SET credit_limit_cents = CASE WHEN credit_limit_cents=0 THEN ROUND((creditlimit::numeric)*100) ELSE credit_limit_cents END WHERE creditlimit IS NOT NULL';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='credit_limit') THEN
    EXECUTE 'UPDATE users SET credit_limit_cents = CASE WHEN credit_limit_cents=0 THEN ROUND((credit_limit::numeric)*100) ELSE credit_limit_cents END WHERE credit_limit IS NOT NULL';
  END IF;
END$$;

-- Exposure from A/R open invoices
CREATE OR REPLACE VIEW customer_ar_exposure AS
SELECT u.id AS customer_id,
       COALESCE((SELECT SUM(ai.balance_cents) FROM ar_invoices ai WHERE ai.customer_id=u.id AND ai.status='open'),0) AS exposure_cents
FROM users u;

-- Compatibility view exposing BOTH shapes (legacy dollars + new cents)
CREATE OR REPLACE VIEW customer_credit_unified AS
SELECT u.id AS customer_id,
       u.term,
       u.on_credit_hold,
       u.credit_limit_cents,
       (u.credit_limit_cents::numeric/100.0) AS creditlimit,     -- legacy dollars (RO pref)
       (e.exposure_cents::numeric/100.0)  AS currentbalance,     -- legacy dollars (computed)
       e.exposure_cents
FROM users u
LEFT JOIN customer_ar_exposure e ON e.customer_id=u.id;

-- Allow updates through the view (dollars → cents; term/hold passthrough)
CREATE OR REPLACE FUNCTION customer_credit_unified_upd() RETURNS trigger AS $$
BEGIN
  IF NEW.creditlimit IS DISTINCT FROM OLD.creditlimit THEN
    UPDATE users SET credit_limit_cents = ROUND((NEW.creditlimit::numeric)*100) WHERE id = OLD.customer_id;
  END IF;
  IF (NEW.term IS DISTINCT FROM OLD.term) OR (NEW.on_credit_hold IS DISTINCT FROM OLD.on_credit_hold) THEN
    UPDATE users SET term = COALESCE(NEW.term, term), on_credit_hold = COALESCE(NEW.on_credit_hold, on_credit_hold) WHERE id = OLD.customer_id;
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ccu_update ON customer_credit_unified;
CREATE TRIGGER trg_ccu_update INSTEAD OF UPDATE ON customer_credit_unified FOR EACH ROW EXECUTE FUNCTION customer_credit_unified_upd();

-- Audit logs table for credit changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  action VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip VARCHAR(64),
  user_agent VARCHAR(512),
  metadata JSONB
);