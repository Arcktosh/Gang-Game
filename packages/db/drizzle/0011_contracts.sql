DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM ('delivery', 'protection', 'collection', 'bounty', 'faction_task');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('open', 'accepted', 'completed', 'cancelled', 'expired', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  assigned_to_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  faction_id uuid REFERENCES factions(id) ON DELETE SET NULL,
  contract_type contract_type NOT NULL,
  status contract_status NOT NULL DEFAULT 'open',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  origin_location text,
  target_location text,
  item_key text REFERENCES item_definitions(key),
  quantity integer NOT NULL DEFAULT 0,
  reward integer NOT NULL DEFAULT 0,
  escrow_amount integer NOT NULL DEFAULT 0,
  risk integer NOT NULL DEFAULT 1,
  expires_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_status_created_at_idx ON contracts(status, created_at);
CREATE INDEX IF NOT EXISTS contracts_creator_idx ON contracts(created_by_character_id, created_at);
CREATE INDEX IF NOT EXISTS contracts_assignee_idx ON contracts(assigned_to_character_id, created_at);
CREATE INDEX IF NOT EXISTS contracts_faction_idx ON contracts(faction_id, created_at);
CREATE INDEX IF NOT EXISTS contracts_target_location_idx ON contracts(target_location, status);

CREATE TABLE IF NOT EXISTS contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  actor_character_id uuid REFERENCES characters(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_events_contract_created_at_idx ON contract_events(contract_id, created_at);
CREATE INDEX IF NOT EXISTS contract_events_actor_created_at_idx ON contract_events(actor_character_id, created_at);
