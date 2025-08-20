CREATE TABLE IF NOT EXISTS http_idempotency (
  key TEXT PRIMARY KEY,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add cleanup job for old idempotency keys (optional)
CREATE INDEX IF NOT EXISTS idx_http_idempotency_created_at ON http_idempotency (created_at);