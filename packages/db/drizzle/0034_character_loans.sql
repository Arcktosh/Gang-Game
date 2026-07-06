CREATE TABLE IF NOT EXISTS character_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  offer_key text NOT NULL,
  principal integer NOT NULL,
  fee integer NOT NULL,
  repaid_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  due_at timestamptz NOT NULL,
  repaid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT character_loans_amounts_nonnegative CHECK (principal >= 0 AND fee >= 0 AND repaid_amount >= 0),
  CONSTRAINT character_loans_status_check CHECK (status IN ('active', 'repaid', 'defaulted', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS character_loans_character_status_idx
  ON character_loans(character_id, status, due_at);

CREATE INDEX IF NOT EXISTS character_loans_created_at_idx
  ON character_loans(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS character_loans_one_active_per_character_idx
  ON character_loans(character_id)
  WHERE status = 'active';
