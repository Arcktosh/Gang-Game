ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS gambling_reputation integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS gambling_games (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  min_wager integer NOT NULL DEFAULT 1,
  max_wager integer NOT NULL DEFAULT 100,
  house_edge_basis_points integer NOT NULL DEFAULT 500,
  variance integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gambling_wagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  game_key text NOT NULL REFERENCES gambling_games(key),
  wager integer NOT NULL,
  outcome text NOT NULL,
  payout integer NOT NULL DEFAULT 0,
  profit integer NOT NULL DEFAULT 0,
  roll integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gambling_wagers_character_created_at_idx ON gambling_wagers(character_id, created_at);
CREATE INDEX IF NOT EXISTS gambling_wagers_game_created_at_idx ON gambling_wagers(game_key, created_at);

INSERT INTO gambling_games (key, name, description, min_wager, max_wager, house_edge_basis_points, variance)
VALUES
  ('slots', 'Basement Slots', 'Fast, high-variance slot machine spins with rare jackpot outcomes.', 5, 500, 750, 5),
  ('dice-low', 'Dice Low', 'Bet that the roll lands in the low range.', 10, 1000, 450, 2),
  ('dice-high', 'Dice High', 'Bet that the roll lands in the high range.', 10, 1000, 450, 2),
  ('blackjack-lite', 'Backroom Blackjack', 'Simplified blackjack-style wager resolved instantly.', 25, 2500, 600, 3)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  min_wager = EXCLUDED.min_wager,
  max_wager = EXCLUDED.max_wager,
  house_edge_basis_points = EXCLUDED.house_edge_basis_points,
  variance = EXCLUDED.variance,
  is_active = true;
