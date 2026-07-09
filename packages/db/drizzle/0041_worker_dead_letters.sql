-- Feature pass 89: worker retry/dead-letter observability

CREATE TABLE IF NOT EXISTS worker_dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tick_name text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  error_name text NOT NULL DEFAULT 'Error',
  error_message text NOT NULL,
  error_stack text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS worker_dead_letters_status_created_idx
  ON worker_dead_letters(status, created_at);

CREATE INDEX IF NOT EXISTS worker_dead_letters_tick_created_idx
  ON worker_dead_letters(tick_name, created_at);
