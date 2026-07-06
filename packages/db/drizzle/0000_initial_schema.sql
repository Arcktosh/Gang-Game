CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE character_status AS ENUM ('free', 'traveling', 'jailed', 'hospitalized');
CREATE TYPE event_visibility AS ENUM ('private', 'faction', 'public', 'admin');
CREATE TYPE item_category AS ENUM ('drug', 'gear', 'weapon', 'armor', 'vehicle', 'tool', 'medical', 'collectible');
CREATE TYPE transaction_type AS ENUM ('cash', 'bank', 'stock', 'crypto', 'shop', 'system');
CREATE TYPE travel_status AS ENUM ('scheduled', 'completed', 'cancelled', 'intercepted');
CREATE TYPE message_thread_type AS ENUM ('direct', 'group', 'faction');
CREATE TYPE faction_role AS ENUM ('recruit', 'runner', 'soldier', 'lieutenant', 'captain', 'underboss', 'boss');
CREATE TYPE membership_status AS ENUM ('active', 'invited', 'left', 'kicked');
CREATE TYPE listing_status AS ENUM ('active', 'sold', 'cancelled', 'expired');
CREATE TYPE action_outcome AS ENUM ('pending', 'success', 'failure', 'critical_failure');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE cascade,
  name text NOT NULL,
  status character_status NOT NULL DEFAULT 'free',
  location text NOT NULL DEFAULT 'starter-city',
  cash integer NOT NULL DEFAULT 500,
  bank integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  experience integer NOT NULL DEFAULT 0,
  intelligence integer NOT NULL DEFAULT 1,
  labour integer NOT NULL DEFAULT 1,
  endurance integer NOT NULL DEFAULT 1,
  strength integer NOT NULL DEFAULT 1,
  stamina integer NOT NULL DEFAULT 1,
  defense integer NOT NULL DEFAULT 1,
  dexterity integer NOT NULL DEFAULT 1,
  health integer NOT NULL DEFAULT 100,
  energy integer NOT NULL DEFAULT 100,
  nerve integer NOT NULL DEFAULT 20,
  heat integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX characters_user_idx ON characters(user_id);
CREATE UNIQUE INDEX characters_name_unique ON characters(lower(name));

CREATE TABLE locations (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  police_pressure integer NOT NULL DEFAULT 1,
  market_volatility integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE player_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE set null,
  character_id uuid REFERENCES characters(id) ON DELETE set null,
  visibility event_visibility NOT NULL DEFAULT 'private',
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX player_events_character_created_at_idx ON player_events(character_id, created_at);
CREATE INDEX player_events_type_idx ON player_events(type);

CREATE TABLE item_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  category item_category NOT NULL,
  description text NOT NULL DEFAULT '',
  base_price integer NOT NULL,
  base_risk integer NOT NULL DEFAULT 0,
  is_illegal boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  item_key text NOT NULL REFERENCES item_definitions(key),
  quantity integer NOT NULL DEFAULT 0,
  durability integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX inventory_character_item_unique ON inventory_items(character_id, item_key);

CREATE TABLE market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location text NOT NULL,
  item_key text NOT NULL REFERENCES item_definitions(key),
  price integer NOT NULL,
  supply integer NOT NULL DEFAULT 100,
  demand integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX market_prices_location_item_created_at_idx ON market_prices(location, item_key, created_at);

CREATE TABLE job_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  required_labour integer NOT NULL DEFAULT 1,
  required_intelligence integer NOT NULL DEFAULT 1,
  energy_cost integer NOT NULL DEFAULT 10,
  base_wage integer NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 3600
);

CREATE TABLE job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  job_key text NOT NULL REFERENCES job_definitions(key),
  payout integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX job_runs_character_started_at_idx ON job_runs(character_id, started_at);

CREATE TABLE crime_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  required_level integer NOT NULL DEFAULT 1,
  required_nerve integer NOT NULL DEFAULT 1,
  difficulty integer NOT NULL DEFAULT 1,
  min_reward integer NOT NULL,
  max_reward integer NOT NULL,
  heat_gain integer NOT NULL DEFAULT 1,
  jail_risk integer NOT NULL DEFAULT 1
);

CREATE TABLE crime_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  crime_key text NOT NULL REFERENCES crime_definitions(key),
  outcome action_outcome NOT NULL,
  reward integer NOT NULL DEFAULT 0,
  heat_gained integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crime_attempts_character_created_at_idx ON crime_attempts(character_id, created_at);

CREATE TABLE travel_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location text NOT NULL,
  to_location text NOT NULL,
  cost integer NOT NULL,
  duration_seconds integer NOT NULL,
  risk integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX travel_routes_from_to_unique ON travel_routes(from_location, to_location);

CREATE TABLE travel_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  route_id uuid NOT NULL REFERENCES travel_routes(id),
  status travel_status NOT NULL DEFAULT 'scheduled',
  arrives_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX travel_plans_character_status_idx ON travel_plans(character_id, status);
CREATE INDEX travel_plans_arrives_at_idx ON travel_plans(arrives_at);

CREATE TABLE message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type message_thread_type NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE message_thread_members (
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE cascade,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, character_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE cascade,
  sender_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_thread_created_at_idx ON messages(thread_id, created_at);

CREATE TABLE factions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text NOT NULL,
  description text NOT NULL DEFAULT '',
  bank integer NOT NULL DEFAULT 0,
  reputation integer NOT NULL DEFAULT 0,
  created_by_character_id uuid REFERENCES characters(id) ON DELETE set null,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX factions_name_unique ON factions(lower(name));
CREATE UNIQUE INDEX factions_tag_unique ON factions(lower(tag));

CREATE TABLE faction_members (
  faction_id uuid NOT NULL REFERENCES factions(id) ON DELETE cascade,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  role faction_role NOT NULL DEFAULT 'recruit',
  status membership_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (faction_id, character_id)
);
CREATE INDEX faction_members_character_idx ON faction_members(character_id);

CREATE TABLE shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  name text NOT NULL,
  location text NOT NULL,
  reputation integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shops_owner_idx ON shops(owner_character_id);

CREATE TABLE shop_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE cascade,
  item_key text NOT NULL REFERENCES item_definitions(key),
  quantity integer NOT NULL,
  price_each integer NOT NULL,
  status listing_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shop_listings_shop_status_idx ON shop_listings(shop_id, status);

CREATE TABLE financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE set null,
  type transaction_type NOT NULL,
  amount numeric(14, 2) NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_transactions_character_created_at_idx ON financial_transactions(character_id, created_at);
