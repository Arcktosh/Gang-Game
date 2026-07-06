-- Feature pass 19: notification center, activity feed, and digest groundwork.

DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM (
    'system',
    'combat',
    'economy',
    'contract',
    'faction',
    'travel',
    'crew',
    'crafting',
    'market',
    'season',
    'admin'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_feed_scope AS ENUM ('private', 'faction', 'public', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  category notification_category NOT NULL DEFAULT 'system',
  priority notification_priority NOT NULL DEFAULT 'normal',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  action_url text,
  source_type text,
  source_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, read_at, archived_at, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_character_created_idx ON notifications(character_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_source_unique_idx ON notifications(user_id, character_id, source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS activity_feed_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope activity_feed_scope NOT NULL DEFAULT 'private',
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  faction_id uuid REFERENCES factions(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  category notification_category NOT NULL DEFAULT 'system',
  source_type text,
  source_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_feed_scope_created_idx ON activity_feed_entries(scope, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_character_created_idx ON activity_feed_entries(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_feed_faction_created_idx ON activity_feed_entries(faction_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS activity_feed_source_unique_idx ON activity_feed_entries(scope, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(character_id, '00000000-0000-0000-0000-000000000000'::uuid), source_type, source_id) WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  muted_categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  digest_enabled boolean NOT NULL DEFAULT true,
  digest_frequency_minutes integer NOT NULL DEFAULT 1440,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_count integer NOT NULL DEFAULT 0,
  unread_count integer NOT NULL DEFAULT 0,
  summary text NOT NULL DEFAULT '',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_digests_user_created_idx ON notification_digests(user_id, created_at DESC);
