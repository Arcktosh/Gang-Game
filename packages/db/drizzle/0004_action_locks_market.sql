ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS max_energy integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_nerve integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS last_resource_tick_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE crime_definitions
  ADD COLUMN IF NOT EXISTS cooldown_seconds integer NOT NULL DEFAULT 300;

CREATE TABLE IF NOT EXISTS character_action_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  action_type text NOT NULL,
  locked_until timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS character_action_locks_character_action_unique ON character_action_locks(character_id, action_type);
CREATE INDEX IF NOT EXISTS character_action_locks_locked_until_idx ON character_action_locks(locked_until);

INSERT INTO market_prices (location, item_key, price, supply, demand)
VALUES
  ('starter-city', 'street-sample', 95, 100, 120),
  ('starter-city', 'lockpick-set', 340, 75, 90),
  ('starter-city', 'burner-phone', 165, 100, 80),
  ('starter-city', 'first-aid-kit', 135, 120, 70),
  ('harbor-district', 'street-sample', 72, 160, 110),
  ('harbor-district', 'lockpick-set', 280, 110, 95),
  ('harbor-district', 'burner-phone', 145, 140, 70),
  ('harbor-district', 'first-aid-kit', 125, 140, 60),
  ('uptown', 'street-sample', 130, 80, 150),
  ('uptown', 'lockpick-set', 420, 55, 110),
  ('uptown', 'burner-phone', 210, 85, 90),
  ('uptown', 'first-aid-kit', 160, 110, 90)
ON CONFLICT DO NOTHING;
