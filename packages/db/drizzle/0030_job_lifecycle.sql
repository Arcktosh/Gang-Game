CREATE TYPE job_status AS ENUM ('active', 'resigned', 'terminated');

CREATE TABLE character_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  job_key text NOT NULL REFERENCES job_definitions(key),
  status job_status NOT NULL DEFAULT 'active',
  rank integer NOT NULL DEFAULT 1,
  shifts_completed integer NOT NULL DEFAULT 0,
  total_earned integer NOT NULL DEFAULT 0,
  hired_at timestamp with time zone NOT NULL DEFAULT now(),
  promoted_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX character_jobs_character_status_idx ON character_jobs(character_id, status);
CREATE INDEX character_jobs_job_status_idx ON character_jobs(job_key, status);
CREATE UNIQUE INDEX character_jobs_one_active_per_character_idx ON character_jobs(character_id) WHERE status = 'active';
