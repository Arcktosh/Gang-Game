-- Feature Pass 23: moderation queue review metadata.

ALTER TABLE message_reports
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_note text;

ALTER TABLE newspaper_article_reports
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution_note text;

CREATE INDEX IF NOT EXISTS message_reports_status_created_at_idx
  ON message_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS newspaper_article_reports_status_created_at_idx
  ON newspaper_article_reports(status, created_at DESC);
