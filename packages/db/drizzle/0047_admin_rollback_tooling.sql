-- Feature Pass 94: admin rollback lookup support.
-- These indexes make it cheap to detect whether an admin economy adjustment
-- has already been reversed and to list rollback candidates by character/type.

CREATE UNIQUE INDEX IF NOT EXISTS admin_action_logs_rollback_original_idx
  ON admin_action_logs ((metadata->>'originalActionLogId'))
  WHERE action_type = 'rollback_apply';

CREATE INDEX IF NOT EXISTS admin_action_logs_target_type_created_idx
  ON admin_action_logs (target_character_id, action_type, created_at DESC)
  WHERE action_type IN ('cash_adjustment', 'bank_adjustment', 'rollback_apply');
