DROP INDEX IF EXISTS character_loans_one_active_per_character_idx;

CREATE UNIQUE INDEX IF NOT EXISTS character_loans_one_unresolved_per_character_idx
  ON character_loans(character_id)
  WHERE status IN ('active', 'defaulted');

CREATE INDEX IF NOT EXISTS character_loans_active_due_idx
  ON character_loans(status, due_at)
  WHERE status = 'active';
