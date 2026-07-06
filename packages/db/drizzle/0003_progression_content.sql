CREATE TYPE training_stat AS ENUM ('strength', 'stamina', 'defense', 'dexterity', 'endurance');
CREATE TYPE course_stat AS ENUM ('intelligence', 'labour', 'endurance');
CREATE TYPE progression_status AS ENUM ('scheduled', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS training_activities (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  stat training_stat NOT NULL,
  energy_cost integer NOT NULL DEFAULT 10,
  cash_cost integer NOT NULL DEFAULT 0,
  stat_gain integer NOT NULL DEFAULT 1,
  experience_gain integer NOT NULL DEFAULT 2,
  duration_seconds integer NOT NULL DEFAULT 1800
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  activity_key text NOT NULL REFERENCES training_activities(key),
  status progression_status NOT NULL DEFAULT 'completed',
  stat training_stat NOT NULL,
  stat_gain integer NOT NULL DEFAULT 1,
  energy_cost integer NOT NULL DEFAULT 0,
  cash_cost integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS training_sessions_character_started_at_idx ON training_sessions(character_id, started_at);

CREATE TABLE IF NOT EXISTS course_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  stat course_stat NOT NULL,
  cash_cost integer NOT NULL DEFAULT 0,
  energy_cost integer NOT NULL DEFAULT 5,
  stat_gain integer NOT NULL DEFAULT 1,
  experience_gain integer NOT NULL DEFAULT 5,
  duration_seconds integer NOT NULL DEFAULT 7200
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  course_key text NOT NULL REFERENCES course_definitions(key),
  status progression_status NOT NULL DEFAULT 'completed',
  stat course_stat NOT NULL,
  stat_gain integer NOT NULL DEFAULT 1,
  cash_cost integer NOT NULL DEFAULT 0,
  energy_cost integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS course_enrollments_character_started_at_idx ON course_enrollments(character_id, started_at);

INSERT INTO training_activities (key, name, description, stat, energy_cost, cash_cost, stat_gain, experience_gain, duration_seconds) VALUES
  ('street-gym', 'Street Gym', 'Basic strength training using low-cost equipment.', 'strength', 12, 15, 1, 3, 1800),
  ('roadwork', 'Roadwork', 'Build stamina with timed running sessions.', 'stamina', 10, 0, 1, 3, 1800),
  ('sparring', 'Sparring', 'Improve defense with controlled fights.', 'defense', 14, 25, 1, 4, 2400),
  ('agility-drills', 'Agility Drills', 'Improve dexterity for stealth and quick escapes.', 'dexterity', 12, 10, 1, 4, 2100),
  ('endurance-circuit', 'Endurance Circuit', 'Hard conditioning to increase endurance.', 'endurance', 16, 20, 1, 5, 2700)
ON CONFLICT (key) DO NOTHING;

INSERT INTO course_definitions (key, name, description, stat, cash_cost, energy_cost, stat_gain, experience_gain, duration_seconds) VALUES
  ('basic-accounting', 'Basic Accounting', 'Understand ledgers, income tracking, and business finances.', 'intelligence', 100, 8, 1, 8, 7200),
  ('logistics-101', 'Logistics 101', 'Plan movement, storage, and delivery operations.', 'labour', 80, 8, 1, 7, 7200),
  ('first-aid', 'First Aid', 'Learn basic recovery habits and emergency response.', 'endurance', 120, 10, 1, 8, 9000),
  ('street-law', 'Street Law', 'Learn how heat, evidence, and court outcomes work.', 'intelligence', 150, 10, 1, 10, 10800)
ON CONFLICT (key) DO NOTHING;
