DO $$ BEGIN
  CREATE TYPE enforcement_action_type AS ENUM ('warning', 'social_mute', 'shop_restriction', 'temporary_suspension', 'cash_penalty');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE enforcement_appeal_status AS ENUM ('open', 'accepted', 'rejected', 'withdrawn');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'enforcement_action';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'enforcement_lift';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'appeal_review';

ALTER TABLE moderation_notes
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS character_enforcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  action_type enforcement_action_type NOT NULL,
  reason text NOT NULL,
  severity integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  lifted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  lifted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_enforcements_character_active_idx
  ON character_enforcements(character_id, is_active, ends_at);

CREATE INDEX IF NOT EXISTS character_enforcements_action_active_idx
  ON character_enforcements(action_type, is_active, ends_at);

CREATE TABLE IF NOT EXISTS enforcement_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_id uuid NOT NULL REFERENCES character_enforcements(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  body text NOT NULL,
  status enforcement_appeal_status NOT NULL DEFAULT 'open',
  reviewed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enforcement_appeals_enforcement_character_unique UNIQUE (enforcement_id, character_id)
);

CREATE INDEX IF NOT EXISTS enforcement_appeals_status_created_idx
  ON enforcement_appeals(status, created_at);

CREATE INDEX IF NOT EXISTS enforcement_appeals_character_created_idx
  ON enforcement_appeals(character_id, created_at);
