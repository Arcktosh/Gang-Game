ALTER TABLE message_thread_members
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz,
  ADD COLUMN IF NOT EXISTS muted_at timestamptz,
  ADD COLUMN IF NOT EXISTS left_at timestamptz;

CREATE INDEX IF NOT EXISTS message_thread_members_character_idx ON message_thread_members(character_id);

CREATE TYPE message_report_status AS ENUM ('open', 'reviewed', 'dismissed', 'actioned');

CREATE TABLE message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE cascade,
  reporter_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  reason text NOT NULL DEFAULT '',
  status message_report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX message_reports_message_idx ON message_reports(message_id);
CREATE INDEX message_reports_reporter_created_at_idx ON message_reports(reporter_character_id, created_at);

CREATE TABLE character_blocks (
  blocker_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  blocked_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_character_id, blocked_character_id),
  CHECK (blocker_character_id <> blocked_character_id)
);
CREATE INDEX character_blocks_blocked_idx ON character_blocks(blocked_character_id);
