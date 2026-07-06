CREATE TABLE IF NOT EXISTS financial_assets (
  key text PRIMARY KEY,
  asset_type text NOT NULL CHECK (asset_type IN ('stock', 'crypto')),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT 'general',
  base_price integer NOT NULL,
  volatility integer NOT NULL DEFAULT 3,
  drift integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key text NOT NULL REFERENCES financial_assets(key) ON DELETE cascade,
  price integer NOT NULL,
  volume integer NOT NULL DEFAULT 0,
  sentiment integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_prices_asset_created_at_idx ON asset_prices(asset_key, created_at);

CREATE TABLE IF NOT EXISTS character_asset_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  asset_key text NOT NULL REFERENCES financial_assets(key) ON DELETE cascade,
  quantity integer NOT NULL DEFAULT 0,
  average_cost integer NOT NULL DEFAULT 0,
  realized_profit integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_asset_positions_character_asset_unique UNIQUE(character_id, asset_key)
);

CREATE INDEX IF NOT EXISTS character_asset_positions_character_idx ON character_asset_positions(character_id);

CREATE TABLE IF NOT EXISTS asset_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  asset_key text NOT NULL REFERENCES financial_assets(key) ON DELETE cascade,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity integer NOT NULL,
  price_each integer NOT NULL,
  gross_amount integer NOT NULL,
  fee integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_orders_character_created_at_idx ON asset_orders(character_id, created_at);
CREATE INDEX IF NOT EXISTS asset_orders_asset_created_at_idx ON asset_orders(asset_key, created_at);

INSERT INTO financial_assets (key, asset_type, symbol, name, description, sector, base_price, volatility, drift) VALUES
  ('stock-safeport-logistics', 'stock', 'SPL', 'SafePort Logistics', 'Regional logistics operator affected by smuggling demand and travel route pressure.', 'logistics', 125, 3, 1),
  ('stock-nightline-security', 'stock', 'NLS', 'Nightline Security', 'Private security company that tends to move during faction conflict.', 'security', 210, 4, 0),
  ('stock-metro-meds', 'stock', 'MMD', 'Metro Medical Group', 'Private clinic group linked to hospital demand and street violence.', 'medical', 175, 2, 0),
  ('stock-iron-gym', 'stock', 'IRG', 'Iron Gym Holdings', 'Training chain for strength, stamina, and endurance-focused players.', 'fitness', 90, 2, 1),
  ('crypto-streetcoin', 'crypto', 'STC', 'StreetCoin', 'High-volume street currency used by risky traders.', 'crypto', 45, 8, 0),
  ('crypto-ghostpay', 'crypto', 'GHOST', 'GhostPay', 'Privacy-focused token with heavy volatility and rumor-driven swings.', 'crypto', 320, 10, -1),
  ('crypto-courier', 'crypto', 'CRR', 'Courier Chain', 'Route-settlement token tied to travel and delivery activity.', 'crypto', 75, 6, 1)
ON CONFLICT (key) DO NOTHING;

INSERT INTO asset_prices (asset_key, price, volume, sentiment)
SELECT key, base_price, 100, drift FROM financial_assets
ON CONFLICT DO NOTHING;
