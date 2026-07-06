ALTER TABLE shops ADD COLUMN IF NOT EXISTS advertising_until timestamptz;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating_total integer NOT NULL DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS shops_location_open_ad_idx
  ON shops(location, is_open, advertising_until);

CREATE TABLE IF NOT EXISTS shop_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  reviewer_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shop_reviews_shop_reviewer_unique
  ON shop_reviews(shop_id, reviewer_character_id);

CREATE INDEX IF NOT EXISTS shop_reviews_shop_created_at_idx
  ON shop_reviews(shop_id, created_at);

CREATE TABLE IF NOT EXISTS shop_ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  spend integer NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_ad_campaigns_shop_ends_at_idx
  ON shop_ad_campaigns(shop_id, ends_at);
