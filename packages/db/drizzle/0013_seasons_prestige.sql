ALTER TABLE characters ADD COLUMN IF NOT EXISTS prestige_level integer NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS legacy_points integer NOT NULL DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS season_points integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seasons_status_dates_idx ON seasons(status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS season_reward_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  tier integer NOT NULL,
  points_required integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  reward_cash integer NOT NULL DEFAULT 0,
  reward_experience integer NOT NULL DEFAULT 0,
  reward_legacy_points integer NOT NULL DEFAULT 0,
  title_reward_key text,
  title_reward_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_id, tier)
);

CREATE INDEX IF NOT EXISTS season_reward_tiers_season_points_idx ON season_reward_tiers(season_id, points_required);

CREATE TABLE IF NOT EXISTS character_season_progress (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  season_points integer NOT NULL DEFAULT 0,
  highest_claimed_tier integer NOT NULL DEFAULT 0,
  best_rank integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(character_id, season_id)
);

CREATE INDEX IF NOT EXISTS character_season_progress_season_points_idx ON character_season_progress(season_id, season_points DESC);

CREATE TABLE IF NOT EXISTS legacy_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  prestige_level integer NOT NULL,
  legacy_points_awarded integer NOT NULL DEFAULT 0,
  retired_level integer NOT NULL DEFAULT 1,
  retired_experience integer NOT NULL DEFAULT 0,
  retired_cash integer NOT NULL DEFAULT 0,
  retired_bank integer NOT NULL DEFAULT 0,
  profile_score integer NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legacy_records_character_created_idx ON legacy_records(character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS legacy_records_user_created_idx ON legacy_records(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS legacy_perks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  perk_key text NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'prestige',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, perk_key)
);

INSERT INTO seasons (key, title, description, status, starts_at, ends_at, metadata)
VALUES (
  'season-001-street-founders',
  'Street Founders',
  'The first seasonal arc rewards early empire building across jobs, crimes, contracts, shops, factions, gambling, markets, and profile goals.',
  'active',
  '2026-07-01T00:00:00Z',
  '2026-09-30T23:59:59Z',
  '{"theme":"founders","chapter":1}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

WITH active_season AS (
  SELECT id FROM seasons WHERE key = 'season-001-street-founders'
)
INSERT INTO season_reward_tiers (season_id, tier, points_required, title, description, reward_cash, reward_experience, reward_legacy_points, title_reward_key, title_reward_name)
SELECT id, 1, 100, 'Known Face', 'Earn your first season points and appear on the street radar.', 250, 50, 0, NULL, NULL FROM active_season
UNION ALL
SELECT id, 2, 300, 'Corner Regular', 'Keep playing across multiple systems.', 750, 150, 1, NULL, NULL FROM active_season
UNION ALL
SELECT id, 3, 750, 'City Operator', 'Build a visible city presence.', 1500, 350, 2, 'season_city_operator', 'City Operator' FROM active_season
UNION ALL
SELECT id, 4, 1500, 'Underground Name', 'Become a serious seasonal contender.', 3500, 800, 3, NULL, NULL FROM active_season
UNION ALL
SELECT id, 5, 3000, 'Street Founder', 'Complete the founding seasonal arc.', 7500, 1500, 5, 'season_street_founder', 'Street Founder' FROM active_season
ON CONFLICT (season_id, tier) DO NOTHING;
