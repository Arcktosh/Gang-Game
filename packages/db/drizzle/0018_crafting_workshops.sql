-- Feature pass 17: crafting, item modification, and black-market workshops.

DO $$ BEGIN
  CREATE TYPE crafting_recipe_type AS ENUM ('craft', 'modify', 'repair', 'dismantle');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE crafting_job_status AS ENUM ('queued', 'completed', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE workshop_type AS ENUM ('garage', 'lab', 'electronics', 'clinic', 'forge', 'tailor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS crafting_recipe_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  recipe_type crafting_recipe_type NOT NULL DEFAULT 'craft',
  workshop_type workshop_type NOT NULL DEFAULT 'garage',
  description text NOT NULL DEFAULT '',
  output_item_key text NOT NULL REFERENCES item_definitions(key),
  output_quantity integer NOT NULL DEFAULT 1,
  required_level integer NOT NULL DEFAULT 1,
  required_intelligence integer NOT NULL DEFAULT 1,
  required_labour integer NOT NULL DEFAULT 1,
  energy_cost integer NOT NULL DEFAULT 5,
  cash_cost integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 300,
  risk integer NOT NULL DEFAULT 0,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  workshop_type workshop_type NOT NULL,
  name text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  condition integer NOT NULL DEFAULT 100,
  storage_capacity integer NOT NULL DEFAULT 100,
  is_hidden boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_workshops_character_idx ON character_workshops(character_id);
CREATE UNIQUE INDEX IF NOT EXISTS character_workshops_character_type_unique ON character_workshops(character_id, workshop_type);

CREATE TABLE IF NOT EXISTS crafting_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  recipe_key text NOT NULL REFERENCES crafting_recipe_definitions(key),
  workshop_id uuid REFERENCES character_workshops(id) ON DELETE SET NULL,
  status crafting_job_status NOT NULL DEFAULT 'queued',
  output_item_key text NOT NULL REFERENCES item_definitions(key),
  output_quantity integer NOT NULL DEFAULT 1,
  cash_cost integer NOT NULL DEFAULT 0,
  energy_cost integer NOT NULL DEFAULT 0,
  risk_score integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completes_at timestamptz NOT NULL,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS crafting_jobs_character_status_idx ON crafting_jobs(character_id, status);
CREATE INDEX IF NOT EXISTS crafting_jobs_completes_at_idx ON crafting_jobs(completes_at);

CREATE TABLE IF NOT EXISTS crafting_job_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crafting_job_id uuid NOT NULL REFERENCES crafting_jobs(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_key text NOT NULL REFERENCES item_definitions(key),
  quantity integer NOT NULL DEFAULT 1,
  consumed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crafting_job_inputs_job_idx ON crafting_job_inputs(crafting_job_id);
CREATE INDEX IF NOT EXISTS crafting_job_inputs_character_idx ON crafting_job_inputs(character_id);

INSERT INTO item_definitions (key, name, category, description, base_price, base_risk, is_illegal, equip_slot, max_durability, stat_modifiers, metadata)
VALUES
  ('scrap-metal', 'Scrap Metal', 'gear', 'Useful salvage for repairs, vehicle plates, and crude tools.', 18, 0, false, NULL, 0, '{}'::jsonb, '{"craftingMaterial":true}'::jsonb),
  ('electronic-parts', 'Electronic Parts', 'gear', 'Loose chips, batteries, and boards used for phones and devices.', 35, 0, false, NULL, 0, '{}'::jsonb, '{"craftingMaterial":true}'::jsonb),
  ('medical-supplies', 'Medical Supplies', 'medical', 'Basic supplies for field care and clinic upgrades.', 60, 1, false, NULL, 0, '{}'::jsonb, '{"craftingMaterial":true}'::jsonb),
  ('reinforced-plates', 'Reinforced Plates', 'gear', 'Cut plates used to harden vehicles and armor.', 125, 1, false, NULL, 0, '{}'::jsonb, '{"craftingMaterial":true}'::jsonb),
  ('field-medkit', 'Field Medkit', 'medical', 'A compact kit that can support future hospital and recovery actions.', 180, 1, false, NULL, 0, '{}'::jsonb, '{"consumable":true}'::jsonb),
  ('improvised-tools', 'Improvised Tools', 'tool', 'Cheap tools for low-level crimes and workshop tasks.', 140, 2, true, 'tool', 80, '{"dexterity":1,"labour":1}'::jsonb, '{}'::jsonb),
  ('signal-jammer', 'Signal Jammer', 'gear', 'A risky device that can support stealth, smuggling, and future raids.', 650, 5, true, 'accessory', 90, '{"dexterity":1,"heatReduction":2,"crimeSuccess":2}'::jsonb, '{}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  base_price = excluded.base_price,
  base_risk = excluded.base_risk,
  is_illegal = excluded.is_illegal,
  equip_slot = excluded.equip_slot,
  max_durability = excluded.max_durability,
  stat_modifiers = excluded.stat_modifiers,
  metadata = excluded.metadata;

INSERT INTO market_prices (location, item_key, price, supply, demand)
VALUES
  ('starter-city', 'scrap-metal', 22, 180, 80),
  ('starter-city', 'electronic-parts', 42, 120, 95),
  ('starter-city', 'medical-supplies', 70, 90, 115),
  ('harbor-district', 'scrap-metal', 16, 220, 70),
  ('harbor-district', 'electronic-parts', 38, 150, 105),
  ('university-quarter', 'electronic-parts', 45, 130, 120),
  ('industrial-zone', 'reinforced-plates', 135, 60, 110)
ON CONFLICT DO NOTHING;

INSERT INTO crafting_recipe_definitions (
  key, name, recipe_type, workshop_type, description, output_item_key, output_quantity, required_level, required_intelligence, required_labour, energy_cost, cash_cost, duration_seconds, risk, inputs, metadata
)
VALUES
  ('craft-improvised-tools', 'Build Improvised Tools', 'craft', 'garage', 'Turn scrap into a basic tool kit for entry-level jobs and crimes.', 'improvised-tools', 1, 1, 1, 2, 8, 25, 600, 1, '{"scrap-metal":3}'::jsonb, '{}'::jsonb),
  ('craft-field-medkit', 'Assemble Field Medkit', 'craft', 'clinic', 'Combine medical supplies into a portable field medkit.', 'field-medkit', 1, 2, 2, 1, 10, 40, 900, 0, '{"medical-supplies":2}'::jsonb, '{}'::jsonb),
  ('craft-reinforced-plates', 'Cut Reinforced Plates', 'craft', 'garage', 'Shape scrap into plates used for armor and vehicle hardening.', 'reinforced-plates', 1, 3, 2, 4, 12, 75, 1200, 1, '{"scrap-metal":5}'::jsonb, '{}'::jsonb),
  ('craft-signal-jammer', 'Wire Signal Jammer', 'craft', 'electronics', 'Build a risky jammer for stealth-heavy actions and future raids.', 'signal-jammer', 1, 4, 5, 2, 16, 220, 1800, 5, '{"electronic-parts":5,"scrap-metal":1}'::jsonb, '{}'::jsonb),
  ('repair-burner-phone', 'Refurbish Burner Phone', 'repair', 'electronics', 'Use parts to refurbish burner phones for resale or equipment.', 'burner-phone', 1, 2, 3, 1, 8, 35, 900, 1, '{"electronic-parts":2}'::jsonb, '{}'::jsonb),
  ('modify-kevlar-vest', 'Patch Kevlar Vest', 'modify', 'tailor', 'Patch and reinforce damaged armor with scrap and plates.', 'kevlar-vest', 1, 4, 2, 3, 14, 125, 1500, 2, '{"reinforced-plates":1,"scrap-metal":2}'::jsonb, '{"futureModifier":"defense"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = excluded.name,
  recipe_type = excluded.recipe_type,
  workshop_type = excluded.workshop_type,
  description = excluded.description,
  output_item_key = excluded.output_item_key,
  output_quantity = excluded.output_quantity,
  required_level = excluded.required_level,
  required_intelligence = excluded.required_intelligence,
  required_labour = excluded.required_labour,
  energy_cost = excluded.energy_cost,
  cash_cost = excluded.cash_cost,
  duration_seconds = excluded.duration_seconds,
  risk = excluded.risk,
  inputs = excluded.inputs,
  metadata = excluded.metadata;
