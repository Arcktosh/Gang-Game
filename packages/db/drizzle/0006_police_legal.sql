ALTER TABLE characters ADD COLUMN IF NOT EXISTS last_heat_tick_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE characters ADD COLUMN IF NOT EXISTS legal_reputation integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS legal_service_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  service_tier text NOT NULL,
  cost integer NOT NULL DEFAULT 0,
  heat_before integer NOT NULL DEFAULT 0,
  heat_after integer NOT NULL DEFAULT 0,
  success boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_service_logs_character_created_at_idx ON legal_service_logs(character_id, created_at);

CREATE TABLE IF NOT EXISTS moderation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  note text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_notes_character_created_at_idx ON moderation_notes(character_id, created_at);
