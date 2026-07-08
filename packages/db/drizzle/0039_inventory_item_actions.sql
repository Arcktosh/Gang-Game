DO $$ BEGIN
  CREATE TYPE item_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE item_definitions
  ADD COLUMN IF NOT EXISTS rarity item_rarity NOT NULL DEFAULT 'common';

UPDATE item_definitions
SET rarity = CASE key
  WHEN 'burner-phone' THEN 'uncommon'::item_rarity
  WHEN 'lockpick-set' THEN 'uncommon'::item_rarity
  WHEN 'first-aid-kit' THEN 'common'::item_rarity
  ELSE rarity
END;

UPDATE item_definitions
SET metadata = coalesce(metadata, '{}'::jsonb) || '{"consumable":{"health":30,"summary":"Restored health with a first-aid kit."}}'::jsonb
WHERE key = 'first-aid-kit';
