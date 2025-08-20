-- POS hold/suspend system
CREATE TABLE IF NOT EXISTS pos_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id VARCHAR(255) NOT NULL,
  customer_id VARCHAR(255),
  lane VARCHAR(32),
  hold_name VARCHAR(128),
  cart_data JSONB NOT NULL,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  tax_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_holds_cashier_id ON pos_holds (cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_holds_created_at ON pos_holds (created_at);