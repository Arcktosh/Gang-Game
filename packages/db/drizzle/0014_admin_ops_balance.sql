-- Feature pass 13: admin operations, moderation controls, announcements, and balance config.

DO $$ BEGIN
  CREATE TYPE admin_action_type AS ENUM (
    'config_upsert',
    'character_flag',
    'character_unflag',
    'cash_adjustment',
    'bank_adjustment',
    'stat_adjustment',
    'status_clear',
    'announcement_publish',
    'announcement_archive',
    'moderation_note'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE character_flag_type AS ENUM (
    'watchlist',
    'suspected_alt',
    'market_abuse',
    'chat_abuse',
    'botting',
    'exploit_review',
    'suspended'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE announcement_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS game_config_entries (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  is_public boolean NOT NULL DEFAULT false,
  updated_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_config_entries_category_idx ON game_config_entries(category);

CREATE TABLE IF NOT EXISTS admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  action_type admin_action_type NOT NULL,
  summary text NOT NULL,
  before_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_action_logs_admin_created_idx ON admin_action_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_logs_target_character_created_idx ON admin_action_logs(target_character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_logs_type_created_idx ON admin_action_logs(action_type, created_at DESC);

CREATE TABLE IF NOT EXISTS character_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  flag_type character_flag_type NOT NULL,
  reason text NOT NULL,
  severity integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_flags_character_active_idx ON character_flags(character_id, is_active);
CREATE INDEX IF NOT EXISTS character_flags_type_active_idx ON character_flags(flag_type, is_active);

CREATE TABLE IF NOT EXISTS system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  status announcement_status NOT NULL DEFAULT 'draft',
  severity text NOT NULL DEFAULT 'info',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS system_announcements_status_window_idx ON system_announcements(status, starts_at, ends_at);

INSERT INTO game_config_entries (key, label, description, value, category, is_public)
VALUES
  (
    'economy.global',
    'Global economy tuning',
    'Top-level economy multipliers used by workers and game formulas.',
    '{"cashRewardMultiplier":1,"marketVolatilityMultiplier":1,"shopFeeBasisPoints":500}'::jsonb,
    'economy',
    true
  ),
  (
    'risk.police',
    'Police and heat tuning',
    'Risk, heat, jail, and hospital tuning values.',
    '{"heatDecayPerTick":1,"failedBribeHeatPenalty":8,"jailDurationMultiplier":1,"hospitalDurationMultiplier":1}'::jsonb,
    'risk',
    false
  ),
  (
    'progression.training',
    'Training and education tuning',
    'Progression multipliers for jobs, training, courses, seasons, and prestige.',
    '{"experienceMultiplier":1,"trainingGainMultiplier":1,"courseGainMultiplier":1,"seasonPointMultiplier":1}'::jsonb,
    'progression',
    true
  ),
  (
    'pvp.factions',
    'Faction and territory tuning',
    'Faction bank, territory income, and future war balancing values.',
    '{"territoryIncomeMultiplier":1,"attackRiskMultiplier":1,"reinforceCostMultiplier":1}'::jsonb,
    'factions',
    false
  )
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_announcements (title, body, status, severity)
VALUES (
  'Street Founders season is live',
  'The first test season is active. Earn season points through jobs, crimes, contracts, shops, gambling, and progression systems.',
  'published',
  'info'
)
ON CONFLICT DO NOTHING;
