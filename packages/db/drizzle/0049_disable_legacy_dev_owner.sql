-- Feature Pass 104: revoke the historical development owner before production use.
-- Migration 0001 remains immutable for checksum compatibility; this follow-up
-- disables every account matching the fixed seed id or legacy dev@example.com
-- address, revokes active credentials, and removes all administrator capability.

DO $$
DECLARE
  legacy_user_id uuid;
BEGIN
  FOR legacy_user_id IN
    SELECT id
    FROM users
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
       OR lower(email) = 'dev@example.com'
  LOOP
    DELETE FROM user_sessions WHERE user_id = legacy_user_id;
    DELETE FROM password_reset_tokens WHERE user_id = legacy_user_id;
    DELETE FROM email_verification_tokens WHERE user_id = legacy_user_id;

    UPDATE users
    SET
      email = 'disabled-legacy-' || replace(id::text, '-', '') || '@invalid.local',
      password_hash = 'disabled:legacy-seed:revoked',
      display_name = 'Disabled legacy development seed',
      is_admin = false,
      admin_role = 'none',
      email_verified_at = NULL,
      updated_at = now()
    WHERE id = legacy_user_id;
  END LOOP;
END
$$;
