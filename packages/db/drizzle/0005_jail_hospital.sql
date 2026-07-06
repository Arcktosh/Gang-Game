ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS status_until timestamptz,
  ADD COLUMN IF NOT EXISTS status_reason text;

CREATE TABLE IF NOT EXISTS hospital_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  reason text NOT NULL,
  severity integer NOT NULL DEFAULT 1,
  health_lost integer NOT NULL DEFAULT 0,
  bill integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  admitted_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS hospital_stays_character_status_idx ON hospital_stays(character_id, status);
CREATE INDEX IF NOT EXISTS hospital_stays_release_idx ON hospital_stays(status, released_at);

CREATE TABLE IF NOT EXISTS jail_sentences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE cascade,
  reason text NOT NULL,
  severity integer NOT NULL DEFAULT 1,
  fine integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  arrested_at timestamptz NOT NULL DEFAULT now(),
  release_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS jail_sentences_character_status_idx ON jail_sentences(character_id, status);
CREATE INDEX IF NOT EXISTS jail_sentences_release_idx ON jail_sentences(status, release_at);
