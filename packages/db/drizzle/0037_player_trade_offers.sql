CREATE TABLE IF NOT EXISTS player_trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  buyer_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  item_key text NOT NULL REFERENCES item_definitions(key) ON DELETE restrict,
  quantity integer NOT NULL,
  price_each integer NOT NULL,
  status text NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_trade_offers_status_check CHECK (status IN ('open', 'accepted', 'cancelled', 'expired')),
  CONSTRAINT player_trade_offers_quantity_check CHECK (quantity > 0),
  CONSTRAINT player_trade_offers_price_check CHECK (price_each > 0),
  CONSTRAINT player_trade_offers_not_self_check CHECK (seller_character_id <> buyer_character_id)
);

CREATE INDEX IF NOT EXISTS player_trade_offers_seller_status_created_idx
  ON player_trade_offers(seller_character_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS player_trade_offers_buyer_status_created_idx
  ON player_trade_offers(buyer_character_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS player_trade_offers_status_expires_idx
  ON player_trade_offers(status, expires_at);
CREATE INDEX IF NOT EXISTS player_trade_offers_item_status_idx
  ON player_trade_offers(item_key, status);
