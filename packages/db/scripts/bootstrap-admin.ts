import postgres from 'postgres';
import {
  hashBootstrapPassword,
  loadMonorepoRootEnv,
  normalizeBootstrapEmail,
  parseBoolean,
  requireStrongBootstrapPassword,
} from './account-bootstrap-utils';

loadMonorepoRootEnv(import.meta.url);

if (process.env.NODE_ENV !== 'production') {
  throw new Error('Administrator bootstrap requires NODE_ENV=production.');
}

if (!parseBoolean(process.env.ALLOW_ADMIN_BOOTSTRAP)) {
  throw new Error('Set ALLOW_ADMIN_BOOTSTRAP=true for the single bootstrap invocation.');
}

if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== 'CREATE_OR_RESET_OWNER') {
  throw new Error('Set ADMIN_BOOTSTRAP_CONFIRM=CREATE_OR_RESET_OWNER to confirm this privileged operation.');
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required for administrator bootstrap.');
}

const email = normalizeBootstrapEmail(process.env.ADMIN_BOOTSTRAP_EMAIL);
const password = requireStrongBootstrapPassword(
  process.env.ADMIN_BOOTSTRAP_PASSWORD,
  'ADMIN_BOOTSTRAP_PASSWORD',
  16,
);
const displayName = String(process.env.ADMIN_BOOTSTRAP_DISPLAY_NAME ?? 'Production Owner')
  .trim()
  .slice(0, 80);
const allowExisting = parseBoolean(process.env.ADMIN_BOOTSTRAP_ALLOW_EXISTING);
const passwordHash = await hashBootstrapPassword(password);
const sql = postgres(connectionString, { max: 1 });

try {
  const result = await sql.begin(async (tx) => {
    const [existing] = await tx<{ id: string }[]>`
      SELECT id
      FROM users
      WHERE lower(email) = ${email}
      LIMIT 1
      FOR UPDATE
    `;

    if (existing && !allowExisting) {
      throw new Error(
        'An account already uses ADMIN_BOOTSTRAP_EMAIL. Set ADMIN_BOOTSTRAP_ALLOW_EXISTING=true only when an intentional owner reset is required.',
      );
    }

    const [owner] = existing
      ? await tx<{ id: string; email: string }[]>`
          UPDATE users
          SET
            password_hash = ${passwordHash},
            display_name = ${displayName || 'Production Owner'},
            is_admin = true,
            admin_role = 'owner',
            email_verified_at = COALESCE(email_verified_at, now()),
            updated_at = now()
          WHERE id = ${existing.id}::uuid
          RETURNING id, email
        `
      : await tx<{ id: string; email: string }[]>`
          INSERT INTO users (
            email,
            password_hash,
            display_name,
            is_admin,
            admin_role,
            email_verified_at
          ) VALUES (
            ${email},
            ${passwordHash},
            ${displayName || 'Production Owner'},
            true,
            'owner',
            now()
          )
          RETURNING id, email
        `;

    if (!owner) {
      throw new Error('Administrator bootstrap did not return an owner record.');
    }

    await tx`DELETE FROM user_sessions WHERE user_id = ${owner.id}::uuid`;
    await tx`DELETE FROM password_reset_tokens WHERE user_id = ${owner.id}::uuid`;
    await tx`DELETE FROM email_verification_tokens WHERE user_id = ${owner.id}::uuid`;

    return { owner, reset: Boolean(existing) };
  });

  console.log(
    `${result.reset ? 'Reset' : 'Created'} production owner: ${result.owner.email} (${result.owner.id}).`,
  );
  console.log('All previous sessions and one-time account tokens for this user were revoked.');
  console.log('Unset the bootstrap environment variables immediately after this command completes.');
} finally {
  await sql.end();
}
