import postgres from 'postgres';
import {
  hashBootstrapPassword,
  loadMonorepoRootEnv,
  normalizeBootstrapEmail,
  parseBoolean,
  requireStrongBootstrapPassword,
} from './account-bootstrap-utils';

const LEGACY_DEVELOPMENT_USER_ID = '00000000-0000-0000-0000-000000000001';
const LEGACY_DEVELOPMENT_EMAIL = 'dev@example.com';

loadMonorepoRootEnv(import.meta.url);

if (process.env.NODE_ENV !== 'development') {
  throw new Error('The development user seeder only runs when NODE_ENV=development.');
}

if (!parseBoolean(process.env.ALLOW_DEVELOPMENT_SEED)) {
  throw new Error('Set ALLOW_DEVELOPMENT_SEED=true to explicitly enable the local development user seeder.');
}

const email = normalizeBootstrapEmail(process.env.DEV_SEED_EMAIL, LEGACY_DEVELOPMENT_EMAIL);
const password = requireStrongBootstrapPassword(process.env.DEV_SEED_PASSWORD, 'DEV_SEED_PASSWORD', 12);
const displayName = String(process.env.DEV_SEED_DISPLAY_NAME ?? 'Local Dev Player').trim().slice(0, 80);
const passwordHash = await hashBootstrapPassword(password);
const connectionString =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/drugdeal_game';
const sql = postgres(connectionString, { max: 1 });

try {
  const user = await sql.begin(async (tx) => {
    const collision = await tx<{ id: string }[]>`
      SELECT id
      FROM users
      WHERE lower(email) = ${email}
        AND id <> ${LEGACY_DEVELOPMENT_USER_ID}::uuid
      LIMIT 1
    `;

    if (collision.length > 0) {
      throw new Error(`Refusing to replace ${email}; it belongs to a different user.`);
    }

    const [seededUser] = await tx<{ id: string; email: string }[]>`
      INSERT INTO users (
        id,
        email,
        password_hash,
        display_name,
        is_admin,
        admin_role,
        email_verified_at,
        updated_at
      ) VALUES (
        ${LEGACY_DEVELOPMENT_USER_ID}::uuid,
        ${email},
        ${passwordHash},
        ${displayName || 'Local Dev Player'},
        true,
        'owner',
        now(),
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = excluded.email,
        password_hash = excluded.password_hash,
        display_name = excluded.display_name,
        is_admin = true,
        admin_role = 'owner',
        email_verified_at = now(),
        updated_at = now()
      RETURNING id, email
    `;

    if (!seededUser) {
      throw new Error('Development user seed did not return a user record.');
    }

    await tx`DELETE FROM user_sessions WHERE user_id = ${seededUser.id}::uuid`;
    await tx`DELETE FROM password_reset_tokens WHERE user_id = ${seededUser.id}::uuid`;
    await tx`DELETE FROM email_verification_tokens WHERE user_id = ${seededUser.id}::uuid`;

    return seededUser;
  });

  console.log(`Seeded guarded local development owner: ${user.email} (${user.id}).`);
  console.log('Existing sessions and one-time account tokens were revoked.');
} finally {
  await sql.end();
}
