CREATE TABLE IF NOT EXISTS product_catalog (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  product_type text NOT NULL,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_catalog_active_type_idx
  ON product_catalog (is_active, product_type);

CREATE TABLE IF NOT EXISTS user_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_key text REFERENCES product_catalog(key) ON DELETE SET NULL,
  entitlement_key text NOT NULL,
  source text NOT NULL DEFAULT 'system',
  status text NOT NULL DEFAULT 'active',
  granted_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_entitlements_user_status_idx
  ON user_entitlements (user_id, status, starts_at, ends_at);

CREATE UNIQUE INDEX IF NOT EXISTS user_entitlements_user_key_active_unique
  ON user_entitlements (user_id, entitlement_key)
  WHERE status = 'active' AND ends_at IS NULL;

CREATE TABLE IF NOT EXISTS character_cosmetics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  cosmetic_key text NOT NULL,
  slot text NOT NULL,
  source_entitlement_id uuid REFERENCES user_entitlements(id) ON DELETE SET NULL,
  is_equipped boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS character_cosmetics_character_slot_idx
  ON character_cosmetics (character_id, slot, is_equipped);

CREATE UNIQUE INDEX IF NOT EXISTS character_cosmetics_unique
  ON character_cosmetics (character_id, cosmetic_key);

CREATE UNIQUE INDEX IF NOT EXISTS character_cosmetics_one_equipped_per_slot_idx
  ON character_cosmetics (character_id, slot)
  WHERE is_equipped = true;

INSERT INTO product_catalog (key, name, description, product_type, price_cents, currency, metadata)
VALUES
  ('founder_badge', 'Founder Badge', 'Permanent launch supporter badge for a player profile.', 'cosmetic', 499, 'USD', '{"entitlementKey":"cosmetic.founder_badge","slot":"badge"}'),
  ('founder_frame', 'Founder Profile Frame', 'Permanent launch supporter frame for a character profile.', 'cosmetic', 799, 'USD', '{"entitlementKey":"cosmetic.founder_frame","slot":"profile_frame"}'),
  ('season_pass_s1', 'Season 1 Premium Pass', 'Premium cosmetic reward track placeholder for Season 1.', 'season_pass', 999, 'USD', '{"entitlementKey":"season.pass.s1"}'),
  ('vip_monthly', 'VIP Monthly', 'Convenience and cosmetic membership placeholder without gameplay power.', 'subscription', 599, 'USD', '{"entitlementKey":"vip.monthly"}')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  product_type = EXCLUDED.product_type,
  price_cents = EXCLUDED.price_cents,
  currency = EXCLUDED.currency,
  metadata = EXCLUDED.metadata,
  updated_at = now();
