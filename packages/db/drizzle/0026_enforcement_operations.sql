-- Feature Pass 25 - enforcement operations and admin search

ALTER TABLE character_enforcements
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_reason text;

CREATE INDEX IF NOT EXISTS character_enforcements_expiry_due_idx
  ON character_enforcements(is_active, ends_at)
  WHERE is_active = true AND ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS characters_admin_search_idx
  ON characters USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(location, '')));

CREATE INDEX IF NOT EXISTS users_admin_email_search_idx
  ON users USING gin (to_tsvector('simple', coalesce(email, '') || ' ' || coalesce(display_name, '')));
