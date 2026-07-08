ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE course_definitions ADD COLUMN IF NOT EXISTS required_level integer NOT NULL DEFAULT 1;
ALTER TABLE course_definitions ADD COLUMN IF NOT EXISTS prerequisite_course_key text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'course_definitions_prerequisite_course_key_fkey'
  ) THEN
    ALTER TABLE course_definitions
      ADD CONSTRAINT course_definitions_prerequisite_course_key_fkey
      FOREIGN KEY (prerequisite_course_key) REFERENCES course_definitions(key) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS training_sessions_status_due_at_idx ON training_sessions(status, due_at);
CREATE INDEX IF NOT EXISTS course_enrollments_status_due_at_idx ON course_enrollments(status, due_at);

UPDATE course_definitions
SET required_level = CASE key
  WHEN 'basic-accounting' THEN 1
  WHEN 'logistics-101' THEN 2
  WHEN 'first-aid' THEN 2
  WHEN 'street-law' THEN 3
  ELSE greatest(required_level, 1)
END;

UPDATE course_definitions
SET prerequisite_course_key = CASE key
  WHEN 'logistics-101' THEN 'basic-accounting'
  WHEN 'street-law' THEN 'basic-accounting'
  ELSE prerequisite_course_key
END
WHERE key IN ('logistics-101', 'street-law');
