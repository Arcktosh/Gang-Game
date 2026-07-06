DO $$ BEGIN
  CREATE TYPE vehicle_upgrade_type AS ENUM ('engine', 'armor', 'storage', 'stealth', 'documents');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE travel_cargo_status AS ENUM ('loaded', 'delivered', 'seized', 'lost');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE travel_plans
  ADD COLUMN IF NOT EXISTS effective_cost integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cargo_value integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_equipment_id uuid REFERENCES character_equipment(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS vehicle_upgrade_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  upgrade_type vehicle_upgrade_type NOT NULL,
  description text NOT NULL DEFAULT '',
  cash_cost integer NOT NULL DEFAULT 0,
  required_level integer NOT NULL DEFAULT 1,
  stat_modifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_vehicle_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES character_equipment(id) ON DELETE CASCADE,
  upgrade_key text NOT NULL REFERENCES vehicle_upgrade_definitions(key),
  installed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS character_vehicle_upgrade_unique ON character_vehicle_upgrades(equipment_id, upgrade_key);
CREATE INDEX IF NOT EXISTS character_vehicle_upgrades_character_idx ON character_vehicle_upgrades(character_id);
CREATE INDEX IF NOT EXISTS character_vehicle_upgrades_equipment_idx ON character_vehicle_upgrades(equipment_id);

CREATE TABLE IF NOT EXISTS travel_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_plan_id uuid NOT NULL REFERENCES travel_plans(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_key text NOT NULL REFERENCES item_definitions(key),
  quantity integer NOT NULL DEFAULT 0,
  status travel_cargo_status NOT NULL DEFAULT 'loaded',
  risk_added integer NOT NULL DEFAULT 0,
  cargo_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS travel_cargo_character_status_idx ON travel_cargo(character_id, status);
CREATE INDEX IF NOT EXISTS travel_cargo_plan_idx ON travel_cargo(travel_plan_id);

INSERT INTO vehicle_upgrade_definitions (key, name, upgrade_type, description, cash_cost, required_level, stat_modifiers)
VALUES
  ('tuned-engine', 'Tuned Engine', 'engine', 'Cuts travel time by improving vehicle speed.', 650, 1, '{"travelSpeed":3}'::jsonb),
  ('hidden-compartment', 'Hidden Compartment', 'storage', 'Adds smuggling capacity and reduces cargo seizure risk.', 900, 1, '{"cargoCapacity":6,"smugglingSafety":2}'::jsonb),
  ('reinforced-panels', 'Reinforced Panels', 'armor', 'Improves travel safety during ambushes and patrol checks.', 1100, 2, '{"travelSafety":3,"defense":1}'::jsonb),
  ('false-documents', 'False Registration', 'documents', 'Reduces checkpoint risk and police heat from movement.', 750, 2, '{"heatReduction":2,"smugglingSafety":1}'::jsonb),
  ('quiet-exhaust', 'Quiet Exhaust', 'stealth', 'Helps crews move with lower visibility.', 500, 1, '{"travelSafety":1,"crimeSuccess":1}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  upgrade_type = EXCLUDED.upgrade_type,
  description = EXCLUDED.description,
  cash_cost = EXCLUDED.cash_cost,
  required_level = EXCLUDED.required_level,
  stat_modifiers = EXCLUDED.stat_modifiers;

INSERT INTO item_definitions (key, name, category, description, base_price, base_risk, is_illegal, equip_slot, max_durability, stat_modifiers, metadata)
VALUES
  ('rusty-sedan', 'Rusty Sedan', 'vehicle', 'A cheap car with room for a little cargo.', 1600, 0, false, 'vehicle', 190, '{"travelSafety":2,"cargoCapacity":4}'::jsonb, '{"vehicleTier":"starter","vehicleClass":"car"}'::jsonb),
  ('panel-van', 'Panel Van', 'vehicle', 'Slow but useful for hauling larger loads between districts.', 3200, 1, false, 'vehicle', 240, '{"travelSafety":1,"cargoCapacity":10}'::jsonb, '{"vehicleTier":"street","vehicleClass":"van"}'::jsonb),
  ('sports-bike', 'Sports Bike', 'vehicle', 'Fast, risky, and excellent for short runs.', 2800, 0, false, 'vehicle', 160, '{"travelSpeed":5,"travelSafety":-1,"cargoCapacity":1}'::jsonb, '{"vehicleTier":"street","vehicleClass":"bike"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  equip_slot = EXCLUDED.equip_slot,
  max_durability = EXCLUDED.max_durability,
  stat_modifiers = EXCLUDED.stat_modifiers,
  metadata = item_definitions.metadata || EXCLUDED.metadata;

INSERT INTO market_prices (location, item_key, price, supply, demand)
VALUES
  ('starter-city', 'rusty-sedan', 1750, 5, 65),
  ('starter-city', 'panel-van', 3500, 3, 80),
  ('starter-city', 'sports-bike', 3050, 4, 75),
  ('harbor-district', 'panel-van', 3300, 5, 85),
  ('industrial-zone', 'rusty-sedan', 1550, 8, 60),
  ('industrial-zone', 'panel-van', 3150, 6, 90)
ON CONFLICT DO NOTHING;
