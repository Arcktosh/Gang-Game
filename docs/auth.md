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

## Local dev user

The seed data creates:

```txt
Email:    dev@example.com
Password: password123
```

## Migration

Existing local databases created before this slice need:

```bash
pnpm db:apply:auth
```

A fresh local database should use:

```bash
pnpm db:apply:initial
pnpm db:apply:auth
pnpm db:seed
```

## Production notes still needed

- Add email verification.
- Add password reset.
- Add account lockout / rate limiting.
- Add CSRF hardening for non-JSON form posts if introduced.
- Add admin session review and forced logout.
