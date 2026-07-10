-- Feature Pass 94: first-pass admin rollback action types.
-- Kept separate from indexes because PostgreSQL requires committed enum values
-- before they are referenced by later DDL inside the migration runner.

ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'rollback_review';
ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'rollback_apply';
