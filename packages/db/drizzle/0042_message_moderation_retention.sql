-- Feature Pass 90: message moderation visibility and retention cleanup support.

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hidden_reason text,
  ADD COLUMN IF NOT EXISTS retention_expires_at timestamptz;

UPDATE messages
SET retention_expires_at = created_at + interval '365 days'
WHERE retention_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS messages_thread_visible_created_idx
  ON messages(thread_id, created_at)
  WHERE hidden_at IS NULL;

CREATE INDEX IF NOT EXISTS messages_hidden_created_idx
  ON messages(hidden_at, created_at)
  WHERE hidden_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_retention_expires_idx
  ON messages(retention_expires_at)
  WHERE retention_expires_at IS NOT NULL;
