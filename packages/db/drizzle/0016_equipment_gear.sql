DO $$ BEGIN
  CREATE TYPE equipment_slot AS ENUM ('weapon', 'armor', 'vehicle', 'tool', 'phone', 'accessory');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE item_definitions
  ADD COLUMN IF NOT EXISTS equip_slot equipment_slot,
  ADD COLUMN IF NOT EXISTS max_durability integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stat_modifiers jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS character_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_key text NOT NULL REFERENCES item_definitions(key),
  slot equipment_slot NOT NULL,
  durability integer NOT NULL DEFAULT 100,
  is_equipped boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_equipment_character_equipped_idx ON character_equipment(character_id, is_equipped);
CREATE INDEX IF NOT EXISTS character_equipment_slot_idx ON character_equipment(character_id, slot);
CREATE INDEX IF NOT EXISTS character_equipment_item_idx ON character_equipment(item_key);

UPDATE item_definitions SET
  equip_slot = 'weapon',
  max_durability = 90,
  stat_modifiers = '{"strength":2,"dexterity":1}'::jsonb,
  metadata = metadata || '{"gearTier":"starter","gearRole":"combat"}'::jsonb
WHERE key = 'rusty-knife';

UPDATE item_definitions SET
  equip_slot = 'armor',
  max_durability = 120,
  stat_modifiers = '{"defense":3,"stamina":1}'::jsonb,
  metadata = metadata || '{"gearTier":"starter","gearRole":"defense"}'::jsonb
WHERE key = 'padded-jacket';

INSERT INTO item_definitions (key, name, category, description, base_price, base_risk, is_illegal, equip_slot, max_durability, stat_modifiers, metadata)
VALUES
  ('burner-phone', 'Burner Phone', 'gear', 'A disposable phone that reduces heat from risky coordination.', 120, 1, true, 'phone', 80, '{"heatReduction":1,"crimeSuccess":1}'::jsonb, '{"gearTier":"starter","gearRole":"stealth"}'::jsonb),
  ('lockpick-set', 'Lockpick Set', 'tool', 'Basic tools for quiet entry jobs and collection contracts.', 180, 2, true, 'tool', 70, '{"dexterity":2,"crimeSuccess":2}'::jsonb, '{"gearTier":"starter","gearRole":"crime"}'::jsonb),
  ('delivery-scooter', 'Delivery Scooter', 'vehicle', 'Cheap transport for small deliveries and fast exits.', 850, 0, false, 'vehicle', 150, '{"travelSafety":2,"stamina":1}'::jsonb, '{"gearTier":"starter","gearRole":"travel"}'::jsonb),
  ('weighted-chain', 'Weighted Chain', 'weapon', 'A crude close-range weapon that hits hard but wears quickly.', 260, 3, true, 'weapon', 65, '{"strength":4,"dexterity":-1}'::jsonb, '{"gearTier":"street","gearRole":"combat"}'::jsonb),
  ('kevlar-vest', 'Kevlar Vest', 'armor', 'Protective vest favored by crews expecting trouble.', 1250, 2, true, 'armor', 180, '{"defense":6,"stamina":-1}'::jsonb, '{"gearTier":"street","gearRole":"defense"}'::jsonb),
  ('encrypted-handset', 'Encrypted Handset', 'gear', 'Hardened communications device for faction operators.', 1500, 2, true, 'phone', 120, '{"intelligence":2,"heatReduction":3}'::jsonb, '{"gearTier":"street","gearRole":"coordination"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  equip_slot = EXCLUDED.equip_slot,
  max_durability = EXCLUDED.max_durability,
  stat_modifiers = EXCLUDED.stat_modifiers,
  metadata = item_definitions.metadata || EXCLUDED.metadata;

INSERT INTO market_prices (location, item_key, price, supply, demand)
VALUES
  ('starter-city', 'burner-phone', 140, 30, 80),
  ('starter-city', 'lockpick-set', 220, 20, 90),
  ('starter-city', 'delivery-scooter', 950, 8, 60),
  ('starter-city', 'weighted-chain', 310, 18, 75),
  ('starter-city', 'kevlar-vest', 1400, 7, 70),
  ('starter-city', 'encrypted-handset', 1700, 5, 85),
  ('harbor-district', 'burner-phone', 155, 40, 95),
  ('harbor-district', 'lockpick-set', 245, 25, 95),
  ('harbor-district', 'delivery-scooter', 1050, 10, 65),
  ('industrial-zone', 'weighted-chain', 280, 28, 80),
  ('industrial-zone', 'kevlar-vest', 1325, 12, 85),
  ('industrial-zone', 'encrypted-handset', 1850, 6, 90)
ON CONFLICT DO NOTHING;
