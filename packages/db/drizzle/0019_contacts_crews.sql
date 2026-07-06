CREATE TYPE contact_specialty AS ENUM ('muscle', 'driver', 'dealer', 'lawyer', 'medic', 'hacker', 'broker', 'scout');
CREATE TYPE contact_status AS ENUM ('idle', 'assigned', 'injured', 'inactive');
CREATE TYPE contact_assignment_type AS ENUM ('job_assist', 'crime_setup', 'shop_shift', 'territory_scout', 'market_tip', 'recovery_support');
CREATE TYPE contact_assignment_status AS ENUM ('queued', 'completed', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS npc_contact_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  specialty contact_specialty NOT NULL,
  description text NOT NULL DEFAULT '',
  min_level integer NOT NULL DEFAULT 1,
  base_loyalty integer NOT NULL DEFAULT 35,
  recruit_cost integer NOT NULL DEFAULT 250,
  upkeep integer NOT NULL DEFAULT 50,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS character_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  contact_key text NOT NULL REFERENCES npc_contact_definitions(key),
  nickname text,
  specialty contact_specialty NOT NULL,
  level integer NOT NULL DEFAULT 1,
  experience integer NOT NULL DEFAULT 0,
  loyalty integer NOT NULL DEFAULT 35,
  upkeep integer NOT NULL DEFAULT 50,
  status contact_status NOT NULL DEFAULT 'idle',
  status_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(character_id, contact_key)
);

CREATE INDEX IF NOT EXISTS character_contacts_character_status_idx ON character_contacts(character_id, status);

CREATE TABLE IF NOT EXISTS contact_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES character_contacts(id) ON DELETE CASCADE,
  assignment_type contact_assignment_type NOT NULL,
  status contact_assignment_status NOT NULL DEFAULT 'queued',
  risk_score integer NOT NULL DEFAULT 0,
  reward_cash integer NOT NULL DEFAULT 0,
  reward_experience integer NOT NULL DEFAULT 0,
  loyalty_delta integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completes_at timestamptz NOT NULL,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS contact_assignments_character_status_idx ON contact_assignments(character_id, status);
CREATE INDEX IF NOT EXISTS contact_assignments_ready_idx ON contact_assignments(status, completes_at);

INSERT INTO npc_contact_definitions (key, name, specialty, description, min_level, base_loyalty, recruit_cost, upkeep, metadata) VALUES
  ('driver-rico', 'Rico the Wheelman', 'driver', 'A careful driver who lowers travel and delivery risk.', 1, 45, 350, 65, '{"bonus":"travel"}'),
  ('muscle-tanya', 'Tanya Stone', 'muscle', 'Reliable backup for intimidation, bounties, and risky collections.', 1, 40, 375, 70, '{"bonus":"combat"}'),
  ('dealer-moss', 'Moss the Runner', 'dealer', 'Moves small product batches and can cover shop shifts.', 1, 42, 300, 55, '{"bonus":"shops"}'),
  ('lawyer-vela', 'Vela & Associates', 'lawyer', 'A legal contact that helps manage heat and jail preparation.', 2, 35, 600, 100, '{"bonus":"legal"}'),
  ('medic-suri', 'Suri the Night Nurse', 'medic', 'Speeds up recovery and reduces hospital downtime.', 2, 38, 500, 85, '{"bonus":"hospital"}'),
  ('hacker-zero', 'Zero Signal', 'hacker', 'Finds market intel and supports digital setup jobs.', 3, 32, 750, 120, '{"bonus":"intel"}'),
  ('broker-lena', 'Lena the Broker', 'broker', 'Improves shop, contract, and trading opportunities.', 3, 36, 700, 110, '{"bonus":"market"}'),
  ('scout-nandi', 'Nandi the Scout', 'scout', 'Scouts territory activity before faction moves.', 1, 44, 325, 60, '{"bonus":"territory"}')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  specialty = EXCLUDED.specialty,
  description = EXCLUDED.description,
  min_level = EXCLUDED.min_level,
  base_loyalty = EXCLUDED.base_loyalty,
  recruit_cost = EXCLUDED.recruit_cost,
  upkeep = EXCLUDED.upkeep,
  metadata = EXCLUDED.metadata;
