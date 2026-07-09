# MVP Release Runbook

This runbook is the first-release operating checklist for Feature Pass 54 and later MVP release candidates. It separates what the sandbox can validate from the runtime checks that must be executed in a real environment with dependencies and PostgreSQL available.

## Release decision

Do not tag an MVP release until all of these are true:

- Static validation passes locally or in CI.
- TypeScript checks pass with installed dependencies.
- The automated test suite passes.
- All migrations apply to a clean PostgreSQL database in the documented order.
- The web app starts against that database.
- Strict runtime smoke checks pass.
- A fresh database backup has been created and a restore has been tested on a disposable database.

## Environment preparation

```bash
pnpm install
cp .env.example .env
docker compose up -d
docker compose ps
```

The default PostgreSQL and Redis images are configurable in `.env`. The checked-in defaults use AWS Public ECR mirrors of the official images so local proof does not depend on Docker Hub availability.

Review `.env` before starting the app:

- `DATABASE_URL` points at the intended PostgreSQL database.
- `REDIS_URL` points at Redis for local/dev readiness. The current production rate limiter is still in-memory, but Redis is part of the target runtime shape.
- `AUTH_SECRET` is unique and at least 16 characters.
- `NEXT_PUBLIC_APP_URL` and `APP_ORIGIN` match the exact browser origin.
- `TRUSTED_ORIGINS` is empty unless a reverse proxy, preview URL, or controlled admin origin needs access.

## Fresh database setup

Apply migrations in the canonical order from `docs/migration-guide.md`. The quick command sequence is also kept in `README.md` for developer onboarding.

The final migration in the current MVP chain is `0030_job_lifecycle.sql`.

## One-command runtime proof

Feature Pass 54 adds the preferred proof command for a real installed environment:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

The command performs the MVP proof sequence end to end: dependency install, Docker Compose startup, tracked migration/seed chain through the latest SQL file, `pnpm validate:static`, `pnpm typecheck`, `pnpm test`, web startup, strict runtime smoke, backup creation, and optional restore into a disposable database.

Preview the sequence without executing external tools:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
```

Useful skips for targeted debugging are available: `--skip-install`, `--skip-docker`, `--skip-migrations`, `--skip-validation`, `--skip-server`, and `--skip-backup`. Do not use skip flags for a release decision.

## Required validation sequence

Manual fallback commands before every MVP release candidate:

```bash
pnpm validate:static
pnpm typecheck
pnpm test
```

Then start the app:

```bash
pnpm dev
```

In another terminal, run strict smoke validation:

```bash
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

Strict smoke mode is required for an MVP candidate because degraded health means database/runtime configuration is not fully proven.

## Worker validation

Start the worker separately after the web app has passed smoke checks:

```bash
pnpm dev:worker
```

Confirm worker startup logs do not show database connection failures, invalid environment configuration, or maintenance-loop crashes.

## Backup gate

Create a backup before any release migration or public test:

```bash
pnpm db:backup
```

The backup and restore procedure is documented in `docs/backup-restore.md`.

## Rollback approach

For the MVP stage, rollback is database-backup based:

1. Stop the web app and worker.
2. Preserve current logs and the failing release artifact.
3. Restore the last known-good database backup into a disposable database first.
4. Point the app at the restored database.
5. Run `SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime`.
6. Only then promote the restored database or redeploy the last known-good app package.

Schema downgrades are not automated yet. Avoid applying release migrations directly to a public database without a verified backup.

## Post-release smoke checklist

After deploying or starting the MVP candidate, verify:

- `/api/health` reports `ok` in strict smoke mode.
- `/api/auth/me` returns the expected unauthenticated `401` shape.
- Cross-origin unsafe mutation attempts are rejected.
- Security headers and request IDs are present.
- Dev admin login works with a seeded local database only.
- Creating a character, applying for a job, working a shift, attempting a crime, and opening the legal/profile pages work through the browser.

## Known MVP limitations

These are accepted for MVP testing but should remain visible:

- Full database-backed route tests still need a real PostgreSQL-backed test harness.
- Rate limiting is still in-memory and must become distributed before a larger public beta.
- External error reporting and log shipping are not wired yet.
- Admin audit pages need more UX depth even though admin route RBAC is enforced.
- Password reset and email verification remain post-MVP unless public registration is opened.

## Historical note

Feature Pass 52 introduced the first MVP release runbook and backup/restore readiness gate. Feature Pass 54 adds the executable runtime proof orchestrator on top of that release process.

## Feature Pass 57 update

Feature Pass 57 keeps `pnpm prove:mvp-runtime` as the release proof command and extends the migration chain with `0031_monetization_foundation.sql`, now applied through `pnpm db:apply:all`.

Feature Pass 56 remains documented as the monetization foundation baseline; Feature Pass 57 adds playable MVP action forms on top of the same runtime proof sequence.

## Feature Pass 59 admin operations proof

The static release lane now includes `scripts/validate-admin-operations-ui.mjs` through `pnpm validate:static`, which confirms the admin console exposes MVP operator workflows for search, flags, status clearing, moderation reports, enforcement, appeals, economy adjustments, transparency, and audit before runtime proof is attempted.

## Public launch polish checklist

Before inviting public beta testers, review and publish the following docs and pages:

- `docs/privacy-policy.md` and `/privacy`
- `docs/terms-of-service.md` and `/terms`
- `docs/community-rules.md` and `/rules`
- `docs/beta-test-plan.md` and `/onboarding`

These documents are MVP drafts. Production legal review remains required before commercial launch.

## Site-quality release checks

Feature Pass 60 adds static accessibility, responsive design, PWA, and SEO wiring. Before public beta, run these manual checks against a deployed build:

- Lighthouse accessibility, SEO, best-practices, and PWA audits.
- Keyboard-only navigation through public, auth, gameplay, and admin pages.
- Screen-reader smoke checks for action forms and live status messages.
- Mobile viewport checks at 360px, 390px, 768px, and desktop widths.
- Installability check from a Chromium-based browser.
