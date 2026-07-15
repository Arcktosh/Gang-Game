# Authentication Design

The first authentication slice uses first-party session cookies and a database-backed session table.

## Flow

1. `POST /api/auth/register` creates a user with a `scrypt` password hash.
2. `POST /api/auth/login` validates the password and creates a session.
3. The raw session token is stored only in an `httpOnly` cookie named `dd_session`.
4. The database stores only a SHA-256 hash of the token in `user_sessions.session_token_hash`.
5. Game APIs call `requireRequestUserId()` and prefer the session cookie.
6. In local development only, `x-user-id` still works as a fallback for quick API testing.
7. `POST /api/auth/logout` deletes the current session and clears the cookie.

## Routes

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Local development owner

The repository does not ship a known password. Migration `0049_disable_legacy_dev_owner.sql` revokes and de-privileges the historical seeded development owner. A local owner can be created or reset only through the explicit development guard:

```bash
NODE_ENV=development \
ALLOW_DEVELOPMENT_SEED=true \
DEV_SEED_EMAIL=dev@example.com \
DEV_SEED_PASSWORD="$LOCAL_DEV_OWNER_PASSWORD" \
pnpm db:seed
```

Load `LOCAL_DEV_OWNER_PASSWORD` from a local secret source first. `DEV_SEED_PASSWORD` must be at least 12 characters and contain uppercase, lowercase, numeric, and symbol characters. The command revokes existing sessions and one-time account tokens for the local owner.

## Migration

Existing local databases created before this slice need:

```bash
pnpm db:apply:all
```

A fresh local database should use:

```bash
pnpm db:setup
```

Run the guarded local seed command above only when an administrator account is needed for development.

## Production owner bootstrap

Production owner creation is separate from local seeding and requires a one-invocation confirmation:

```bash
NODE_ENV=production \
ALLOW_ADMIN_BOOTSTRAP=true \
ADMIN_BOOTSTRAP_CONFIRM=CREATE_OR_RESET_OWNER \
ADMIN_BOOTSTRAP_EMAIL='owner@example.org' \
ADMIN_BOOTSTRAP_PASSWORD="$PRODUCTION_OWNER_PASSWORD" \
pnpm db:bootstrap:admin
```

Load `PRODUCTION_OWNER_PASSWORD` from the deployment secret manager first. The password must be at least 16 characters with uppercase, lowercase, numeric, and symbol characters. Existing accounts are refused unless `ADMIN_BOOTSTRAP_ALLOW_EXISTING=true` is deliberately supplied for an owner reset. Remove all bootstrap variables immediately afterward.

## Remaining production operations

- Prove bootstrap, login, logout, forced token revocation, and recovery behavior against a staging database.
- Keep runtime secrets outside source control and rotate any bootstrap secret after use.
- Continue monitoring lockout, rate-limit, CSRF, and session-review behavior through the production proof runbook.
