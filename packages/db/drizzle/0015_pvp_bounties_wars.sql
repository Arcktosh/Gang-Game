DO $$ BEGIN
  CREATE TYPE combat_outcome AS ENUM ('attacker_win', 'defender_win', 'draw', 'fled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bounty_status AS ENUM ('open', 'claimed', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE faction_war_status AS ENUM ('declared', 'active', 'resolved', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS combat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  defender_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  attacker_faction_id uuid REFERENCES factions(id) ON DELETE SET NULL,
  defender_faction_id uuid REFERENCES factions(id) ON DELETE SET NULL,
  territory_key text REFERENCES territories(key) ON DELETE SET NULL,
  outcome combat_outcome NOT NULL,
  attacker_power integer NOT NULL DEFAULT 0,
  defender_power integer NOT NULL DEFAULT 0,
  damage_to_attacker integer NOT NULL DEFAULT 0,
  damage_to_defender integer NOT NULL DEFAULT 0,
  cash_stolen integer NOT NULL DEFAULT 0,
  experience_awarded integer NOT NULL DEFAULT 0,
  heat_gain integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS combat_logs_attacker_created_at_idx ON combat_logs(attacker_character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS combat_logs_defender_created_at_idx ON combat_logs(defender_character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS combat_logs_territory_created_at_idx ON combat_logs(territory_key, created_at DESC);

CREATE TABLE IF NOT EXISTS bounties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  claimed_by_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  status bounty_status NOT NULL DEFAULT 'open',
  reward integer NOT NULL DEFAULT 0,
  posting_fee integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  expires_at timestamptz,
  claimed_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bounties_status_reward_idx ON bounties(status, reward DESC);
CREATE INDEX IF NOT EXISTS bounties_target_status_idx ON bounties(target_character_id, status);
CREATE INDEX IF NOT EXISTS bounties_creator_created_at_idx ON bounties(created_by_character_id, created_at DESC);

CREATE TABLE IF NOT EXISTS faction_wars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_faction_id uuid NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  defender_faction_id uuid NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  declared_by_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  territory_key text REFERENCES territories(key) ON DELETE SET NULL,
  status faction_war_status NOT NULL DEFAULT 'declared',
  attacker_score integer NOT NULL DEFAULT 0,
  defender_score integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  resolved_at timestamptz,
  winner_faction_id uuid REFERENCES factions(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT faction_wars_distinct_factions CHECK (attacker_faction_id <> defender_faction_id)
);

CREATE INDEX IF NOT EXISTS faction_wars_status_ends_at_idx ON faction_wars(status, ends_at);
CREATE INDEX IF NOT EXISTS faction_wars_attacker_status_idx ON faction_wars(attacker_faction_id, status);
CREATE INDEX IF NOT EXISTS faction_wars_defender_status_idx ON faction_wars(defender_faction_id, status);

INSERT INTO game_config_entries (key, label, value, description, category, is_public)
VALUES
  ('pvp.combat', 'PvP combat tuning', '{"enabled":true,"baseCooldownSeconds":300,"cashStealPercent":8,"maxCashSteal":2500,"hospitalizeBelowHealth":10}'::jsonb, 'PvP combat tuning values.', 'pvp', false),
  ('pvp.bounties', 'Bounty tuning', '{"enabled":true,"postingFeePercent":10,"minReward":100,"maxReward":1000000}'::jsonb, 'Bounty reward and fee tuning values.', 'pvp', false),
  ('pvp.wars', 'Faction war tuning', '{"enabled":true,"defaultWarHours":24,"territoryTransferScore":25}'::jsonb, 'Faction war duration and territory transfer tuning values.', 'pvp', false)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_public = EXCLUDED.is_public,
  updated_at = now();
