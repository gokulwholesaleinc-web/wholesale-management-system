CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  request_id UUID,
  actor_id UUID,
  actor_role TEXT,

  action TEXT NOT NULL,            -- canonical dot.case (e.g., 'order.placed')
  subject_type TEXT NOT NULL,      -- e.g., 'customer'
  subject_id UUID NOT NULL,
  target_type TEXT,                -- e.g., 'invoice'
  target_id UUID,
  severity SMALLINT NOT NULL DEFAULT 20, -- 10 info, 20 notice, 30 warn, 40 error

  ip VARCHAR(64),
  user_agent TEXT,
  meta JSONB,                      -- redacted structured data
  diff JSONB,                      -- before/after snapshot

  hash_prev CHAR(64),              -- sha256 of previous event
  hash_self CHAR(64)               -- sha256 of canonicalized current event
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_act_at ON activity_events(at);
CREATE INDEX IF NOT EXISTS idx_act_subject ON activity_events(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_act_action ON activity_events(action);
CREATE INDEX IF NOT EXISTS idx_act_actor ON activity_events(actor_id, at);