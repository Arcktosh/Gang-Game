# Runtime Smoke Test Guide

`pnpm smoke:runtime` runs a small dependency-light smoke test suite against a running web app. It is intended for local validation and CI smoke stages after static checks pass.

## Start the app first

```bash
pnpm install
cp .env.example .env
docker compose up -d
# apply migrations from docs/migration-guide.md
pnpm dev
```

Then, in another terminal:

```bash
pnpm smoke:runtime
```

## What it checks

The smoke script verifies runtime behavior that static checks cannot prove:

- `/api/health` is reachable and returns JSON.
- Request IDs propagate through middleware and route handlers.
- Baseline security headers are attached.
- Unauthenticated `/api/auth/me` returns a standard `401` error.
- Cross-origin unsafe mutations are rejected before reaching route handlers.
- Framework-level `404` responses still receive middleware security headers and request IDs.

## Useful environment variables

```bash
SMOKE_BASE_URL=http://localhost:3000
SMOKE_TIMEOUT_MS=5000
SMOKE_RETRIES=2
SMOKE_RETRY_DELAY_MS=500
SMOKE_STRICT_HEALTH_OK=false
```

Use strict health mode after migrations and database configuration are expected to be valid:

```bash
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

## Expected output

The command prints JSON:

```json
{
  "summary": {
    "ok": true,
    "errors": 0,
    "warnings": 0
  },
  "results": []
}
```

A degraded health endpoint is reported as a warning by default because local developers may run the app before configuring PostgreSQL. CI should use `SMOKE_STRICT_HEALTH_OK=true` once database setup is complete.

## Where this fits in validation

Recommended sequence:

```bash
pnpm validate:static
pnpm typecheck
pnpm test
pnpm smoke:runtime
```

For a stricter CI stage with PostgreSQL and migrations:

```bash
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

## Orchestrated MVP runtime proof

For final MVP validation, prefer the Feature Pass 54 orchestrator instead of running smoke checks manually:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

The orchestrator starts the web app, waits for `/api/health`, and runs `SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime` as part of the full release proof.
