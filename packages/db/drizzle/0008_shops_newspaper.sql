ALTER TABLE shops ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE shop_listings ADD COLUMN IF NOT EXISTS sold_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE shop_listings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS shop_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE cascade,
  seller_character_id uuid REFERENCES characters(id) ON DELETE set null,
  buyer_character_id uuid REFERENCES characters(id) ON DELETE set null,
  listing_id uuid REFERENCES shop_listings(id) ON DELETE set null,
  entry_type text NOT NULL,
  item_key text REFERENCES item_definitions(key),
  quantity integer NOT NULL DEFAULT 0,
  amount integer NOT NULL DEFAULT 0,
  balance_after integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_ledger_entries_shop_created_at_idx ON shop_ledger_entries(shop_id, created_at);
CREATE INDEX IF NOT EXISTS shop_ledger_entries_buyer_created_at_idx ON shop_ledger_entries(buyer_character_id, created_at);
CREATE INDEX IF NOT EXISTS shop_ledger_entries_seller_created_at_idx ON shop_ledger_entries(seller_character_id, created_at);

CREATE TABLE IF NOT EXISTS newspaper_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_character_id uuid REFERENCES characters(id) ON DELETE set null,
  location text,
  category text NOT NULL DEFAULT 'news',
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL,
  visibility event_visibility NOT NULL DEFAULT 'public',
  is_published boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS newspaper_articles_created_at_idx ON newspaper_articles(created_at);
CREATE INDEX IF NOT EXISTS newspaper_articles_category_created_at_idx ON newspaper_articles(category, created_at);
CREATE INDEX IF NOT EXISTS newspaper_articles_location_created_at_idx ON newspaper_articles(location, created_at);

INSERT INTO newspaper_articles (category, title, slug, excerpt, body, visibility, metadata)
VALUES
  ('editorial', 'Starter City Opens Its Underground Markets', 'starter-city-opens-underground-markets', 'Local traders are testing private shops and player-run listings.', 'Starter City has seen a sudden rise in private trade. Officials claim it is harmless entrepreneurship. Street sources disagree.', 'public', '{"seed": true}'::jsonb),
  ('market', 'Shopkeepers Prepare For Long-Term Player Economy', 'shopkeepers-prepare-for-long-term-player-economy', 'Private storefronts are expected to change item supply and local prices.', 'Analysts expect shops to become the center of player-to-player trade, faction provisioning, and future taxation.', 'public', '{"seed": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
