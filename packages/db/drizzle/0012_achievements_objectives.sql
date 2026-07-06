-- Feature pass 11: achievements, titles, and recurring objectives

CREATE TABLE IF NOT EXISTS achievement_definitions (
  key text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  metric_key text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  points integer NOT NULL DEFAULT 0,
  cash_reward integer NOT NULL DEFAULT 0,
  experience_reward integer NOT NULL DEFAULT 0,
  title_reward_key text,
  title_reward_name text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_achievements (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  achievement_key text NOT NULL REFERENCES achievement_definitions(key) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (character_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS character_achievements_character_completed_idx
  ON character_achievements(character_id, is_completed, completed_at);

CREATE TABLE IF NOT EXISTS character_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  title_key text NOT NULL,
  title text NOT NULL,
  source text NOT NULL DEFAULT 'achievement',
  is_active boolean NOT NULL DEFAULT false,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, title_key)
);

CREATE INDEX IF NOT EXISTS character_titles_character_active_idx
  ON character_titles(character_id, is_active);

CREATE TABLE IF NOT EXISTS objective_definitions (
  key text PRIMARY KEY,
  cadence text NOT NULL DEFAULT 'daily',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  metric_key text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  reward_cash integer NOT NULL DEFAULT 0,
  reward_experience integer NOT NULL DEFAULT 0,
  reward_points integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  objective_key text NOT NULL REFERENCES objective_definitions(key) ON DELETE CASCADE,
  cadence text NOT NULL DEFAULT 'daily',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, objective_key, period_start)
);

CREATE INDEX IF NOT EXISTS character_objectives_character_period_idx
  ON character_objectives(character_id, cadence, period_start, status);

INSERT INTO achievement_definitions (key, title, description, category, metric_key, target, points, cash_reward, experience_reward, title_reward_key, title_reward_name)
VALUES
  ('first_steps', 'First Steps', 'Create a character and enter the city.', 'general', 'character_created', 1, 5, 100, 10, 'new_blood', 'New Blood'),
  ('honest_shift_5', 'Clocked In', 'Complete 5 day jobs.', 'jobs', 'jobs_completed', 5, 10, 250, 25, 'worker', 'Worker'),
  ('petty_crime_5', 'Street Starter', 'Complete 5 successful crimes.', 'crime', 'crimes_successful', 5, 10, 250, 25, 'street_starter', 'Street Starter'),
  ('training_10', 'Gym Regular', 'Complete 10 training sessions.', 'progression', 'training_completed', 10, 15, 200, 35, 'gym_regular', 'Gym Regular'),
  ('course_3', 'Book Smart', 'Complete 3 courses.', 'progression', 'courses_completed', 3, 15, 200, 35, 'book_smart', 'Book Smart'),
  ('market_10', 'Street Trader', 'Buy or sell 10 items on the local market.', 'economy', 'market_trades', 10, 15, 300, 35, 'street_trader', 'Street Trader'),
  ('shop_sale_5', 'Shopkeeper', 'Sell 5 items through a player shop.', 'shops', 'shop_items_sold', 5, 20, 500, 50, 'shopkeeper', 'Shopkeeper'),
  ('contract_3', 'Reliable Runner', 'Complete 3 contracts assigned to you.', 'contracts', 'contracts_completed', 3, 20, 500, 50, 'reliable_runner', 'Reliable Runner'),
  ('faction_member', 'Colors On', 'Join a faction.', 'factions', 'faction_joined', 1, 10, 150, 20, 'colors_on', 'Colors On'),
  ('casino_10', 'Table Regular', 'Resolve 10 casino wagers.', 'gambling', 'gambling_wagers', 10, 15, 250, 35, 'table_regular', 'Table Regular')
ON CONFLICT (key) DO NOTHING;

INSERT INTO objective_definitions (key, cadence, title, description, metric_key, target, reward_cash, reward_experience, reward_points)
VALUES
  ('daily_work_3', 'daily', 'Work Three Shifts', 'Complete 3 jobs today.', 'jobs_completed', 3, 150, 20, 5),
  ('daily_crime_3', 'daily', 'Take Three Chances', 'Attempt 3 crimes today.', 'crimes_attempted', 3, 150, 20, 5),
  ('daily_train_2', 'daily', 'Keep Sharp', 'Complete 2 training sessions today.', 'training_completed', 2, 100, 15, 5),
  ('daily_market_3', 'daily', 'Move Product', 'Complete 3 market trades today.', 'market_trades', 3, 120, 15, 5),
  ('weekly_contract_3', 'weekly', 'Runner Reputation', 'Complete 3 contracts this week.', 'contracts_completed', 3, 750, 100, 20),
  ('weekly_shop_5', 'weekly', 'Shop Momentum', 'Sell 5 items through your shop this week.', 'shop_items_sold', 5, 750, 100, 20),
  ('weekly_casino_10', 'weekly', 'Casino Circuit', 'Resolve 10 casino wagers this week.', 'gambling_wagers', 10, 500, 75, 15),
  ('weekly_study_2', 'weekly', 'Night School', 'Complete 2 courses this week.', 'courses_completed', 2, 500, 75, 15)
ON CONFLICT (key) DO NOTHING;
