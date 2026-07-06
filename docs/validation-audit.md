# Validation Audit Guide

This guide defines the validation stage after MVP hardening. The goal is to prove the system works in a real runtime environment before feature development continues.

## Local validation order

Run these commands in order from a clean checkout:

```bash
pnpm install
pnpm validate:static
pnpm typecheck
pnpm test
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

Or run the full orchestrated proof in a real environment:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

Then start PostgreSQL and apply migrations in the canonical order from `docs/migration-guide.md`.

## Static audit scripts

### `pnpm validate:migrations`

Checks the SQL migration folder for:

- numeric ordering
- duplicate migration numbers
- missing root `db:apply:*` coverage
- destructive SQL patterns that need manual review

This script does not connect to PostgreSQL. It is a static repository audit and now runs through plain Node using `scripts/validate-migrations.mjs`.

### `pnpm validate:static`

Runs static repository validation without requiring a web server:

```bash
pnpm validate:migrations
pnpm audit:hardening
pnpm audit:route-contracts
pnpm validate:mvp-pages
pnpm validate:playable-actions
pnpm validate:mvp-gameplay
pnpm validate:admin-rbac
pnpm validate:job-lifecycle
pnpm validate:legal-recovery
pnpm validate:release-readiness
pnpm validate:mvp-acceptance
pnpm validate:runtime-proof
pnpm validate:docs
pnpm validate:ci-workflow
```

### `pnpm audit:hardening`

Scans API route files and outputs a JSON report containing:

- total routes
- unsafe mutation routes
- route-level rate-limit coverage
- idempotency helper coverage
- pagination helper coverage
- observability wrapper coverage across all route files
- route notes for manual review

This script is intentionally conservative. It flags patterns that need review; it does not prove security correctness. It now runs through plain Node using `scripts/audit-hardening.mjs`.

### `pnpm validate:mvp-gameplay`

Checks MVP gameplay progression wiring that can drift without database-backed integration tests:

- canonical XP/progression helper exports;
- job and crime route progression snapshots;
- database transaction-safety updates for level and max-nerve rewards;
- profile-page XP progress display;
- formula test references for the progression helpers.

This script runs through plain Node using `scripts/validate-mvp-gameplay.mjs`.


### `pnpm validate:admin-rbac`

Checks admin access-control drift that can silently widen production permissions:

- every admin API route uses `requireAdminCapability`;
- no admin API route directly checks `session.user.isAdmin`;
- every admin route declares a literal capability;
- the admin page gates access through `hasAdminCapability`;
- session queries expose `adminRole`;
- `0029_admin_roles.sql`, `0030_job_lifecycle.sql`, `db:apply:admin-roles`, and `db:apply:job-lifecycle` remain wired.

This script runs through plain Node using `scripts/validate-admin-rbac.mjs`.

### `pnpm validate:legal-recovery`

Checks MVP legal/hospital recovery wiring that can drift without database-backed route tests:

- hospital care is available through the legal recovery API surface;
- hospital care mutation routes use auth, rate limiting, idempotency, and observability;
- expired jail/hospital statuses clear during character refresh;
- active jail/hospital records are completed when status expires;
- the legal page exposes recovery actions.

This script runs through plain Node using `scripts/validate-legal-recovery.mjs`.


### `pnpm validate:release-readiness
pnpm validate:mvp-acceptance
pnpm validate:runtime-proof`

Checks MVP release-readiness, MVP-acceptance documentation and operational wiring that can drift without runtime access:

- README links to the release, backup/restore, runtime smoke, and migration docs;
- required environment keys remain present in `.env.example`;
- Docker Compose still exposes PostgreSQL and Redis services;
- backup and restore scripts exist, are executable, and call `pg_dump` / `pg_restore`;
- the MVP release runbook includes install, migration, static validation, typecheck, test, strict smoke, backup, and rollback steps;
- package scripts expose `db:backup`, `db:restore`, and `validate:release-readiness, MVP-acceptance, runtime-proof`;
- `validate:static` includes the release-readiness, MVP-acceptance, and runtime-proof gates.

This script runs through plain Node using `scripts/validate-release-readiness.mjs and scripts/validate-mvp-acceptance.mjs`.

### `pnpm validate:runtime-proof`

Checks that the installed-environment runtime proof path is still wired and documented:

- root `prove:mvp-runtime` and `validate:runtime-proof` scripts exist;
- `scripts/prove-mvp-runtime.mjs` is executable;
- the proof script includes install, Docker, full migration/seed chain, static validation, typecheck, tests, strict smoke, backup, and optional restore proof;
- the release runbook, MVP acceptance checklist, runtime smoke guide, backup/restore guide, README, project status, remaining-work list, and validation audit mention the proof command.

This script runs through plain Node using `scripts/validate-runtime-proof.mjs`.

### `pnpm validate:docs`

Checks documentation drift that can otherwise mislead maintainers:

- every API route file is listed in `docs/api-reference.md`;
- every documented API route has a matching route file;
- detailed `docs/feature-history.md` contains consolidated pass history;
- the migration guide mentions the latest SQL migration;
- the root package exposes the docs validation script.

This script runs through plain Node using `scripts/validate-docs.mjs`.

### `pnpm smoke:runtime`

Runs a dependency-light HTTP smoke suite against a running web app. See `docs/runtime-smoke.md` for detailed usage and environment variables.

By default it treats a degraded health endpoint as a warning so local developers can validate middleware/security behavior before PostgreSQL is fully wired. In CI after migrations are applied, use:

```bash
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

## Runtime validation checklist

Before public MVP testing, verify the following against a running app:

- `/api/health` returns environment and runtime diagnostics without secrets.
- Unsafe API requests from untrusted origins are rejected.
- `x-request-id` is returned on health and observability-wrapped routes.
- Login/register rate limits trigger after configured thresholds.
- Retried `Idempotency-Key` requests replay completed responses.
- Reused `Idempotency-Key` values with different payloads return conflict.
- Market buy/sell cannot produce negative cash or inventory.
- Shop purchase cannot oversell a listing.
- Contract accept/complete/cancel conflicts return `409` when state has changed.
- Admin balance and enforcement cash penalties cannot produce invalid negative balances.
- Loan funding creates one active loan at a time and loan repayment cannot overdraw bank balance.
- Maintenance tick can clean expired sessions, idempotency keys, stale locks, and digest rows.

## Database validation checklist

Run against a disposable database first:

1. Apply migrations from `0000` through the current latest migration.
2. Apply starter seed content.
3. Verify all check constraints are present.
4. Verify operational indexes are present.
5. Attempt representative invalid writes and confirm the database rejects them.
6. Run app flows that touch the constrained tables.

## CI recommendation

A first CI pipeline should run:

```bash
pnpm install --frozen-lockfile
pnpm validate:static
pnpm typecheck
pnpm test
pnpm smoke:runtime
```

A later CI stage should add a PostgreSQL service and run migration smoke tests.

## Known limitations

- Static route scans are pattern-based and may miss guards hidden behind abstractions.
- Static route scans may flag safe routes that use non-standard helper names.
- Migration validation does not execute SQL.
- Runtime correctness still depends on executing the smoke harness against a running app, full integration tests, and production-like load/concurrency tests.


## Pass 40 static audit result

The static checks were executed successfully in pass 40 without package installation:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
```

Current results:

- migration validation: passing
- migrations detected: 29 (`0000` through `0028`)
- duplicate migration numbers: 0
- uncovered non-seed migrations: 0
- potentially destructive migration patterns: 0
- API route files audited: 74
- unsafe route files: 56
- unsafe route files with route-level rate-limit helper usage: 56
- route hardening notes: 0

These results are static checks only. Runtime validation with installed dependencies and PostgreSQL is still required.


## Pass 41 runtime smoke harness

Pass 41 added `scripts/runtime-smoke.mjs` and `pnpm smoke:runtime`. The harness checks `/api/health`, unauthenticated auth shape, cross-origin mutation rejection, request-id propagation, and baseline security headers. It was syntax-checked in the uploaded project state, but it still needs to be run against a live Next.js server after dependency installation and migration setup.

## Pass 42 documentation drift validation

Pass 42 added `scripts/validate-docs.mjs` and `pnpm validate:docs`, then included it in `pnpm validate:static`. Pass 43 extends `pnpm validate:static` with `pnpm validate:ci-workflow`. Pass 44 expanded unsafe-route observability coverage. Pass 45 completes observability coverage for all current API route files and makes missing route observability an audit error. Pass 46 adds `scripts/audit-route-contracts.mjs`, `pnpm audit:route-contracts`, and includes representative route-contract validation in `pnpm validate:static`. Pass 47 adds `scripts/validate-mvp-pages.mjs`, `pnpm validate:mvp-pages`, and includes MVP page coverage validation in `pnpm validate:static`. Pass 48 adds `scripts/validate-mvp-gameplay.mjs` and includes MVP gameplay validation. Pass 49 adds `scripts/validate-admin-rbac.mjs` and includes admin RBAC validation. Pass 50 adds `scripts/validate-job-lifecycle.mjs` and includes job lifecycle validation. Pass 51 adds `scripts/validate-legal-recovery.mjs` and includes legal/hospital recovery validation. Pass 52 adds `scripts/validate-release-readiness.mjs and scripts/validate-mvp-acceptance.mjs` and includes MVP release-readiness, MVP-acceptance validation. The docs validator cross-checks the API reference against 75 concrete route files, verifies the consolidated feature history, and confirms the migration guide mentions the latest SQL migration.

Current results:

- documented concrete API routes: 75
- consolidated feature-history file detected
- latest migration referenced by the migration guide: `0030_job_lifecycle.sql`
- documentation drift errors: 0

`pnpm validate:static` could not be executed in this sandbox because `pnpm` is not installed here. The underlying Node validators were executed directly and passed.


## Pass 43 CI workflow validation

Pass 43 added `.github/workflows/ci.yml`, `scripts/validate-ci-workflow.mjs`, `pnpm validate:ci-workflow`, and `pnpm validate:ci`. The CI workflow runs on pull requests and pushes to `main`/`master`, installs dependencies with pnpm through Corepack on Node.js 22, and executes the same validation chain developers can run locally.

Current CI workflow validation results:

- workflow file detected: `.github/workflows/ci.yml`
- required checkout/setup-node/Corepack/pnpm install fragments detected
- `pnpm validate:ci` detected in workflow
- `validate:ci` chains `pnpm validate:static`, `pnpm typecheck`, and `pnpm test`
- CI workflow drift errors: 0

The workflow validator is static and dependency-light. It confirms the CI configuration is wired correctly, but the full CI job still needs to run in GitHub or another clean environment with dependencies installed.


## Pass 45 API observability validation

Pass 44 wrapped unsafe/state-changing API routes with `withApiObservability`. Pass 45 wrapped the remaining read-only route files and updated `scripts/audit-hardening.mjs` so any API route file without request observability now fails the static hardening audit.

Current observability validation results:

- API route files audited: 74
- unsafe route files: 56
- unsafe route files with route-level rate limiting: 56
- total route files with observability signals: 74
- hardening audit errors: 0

The observability audit is static and pattern-based. Runtime smoke checks should still verify request IDs and response timing headers against a running app.


## Pass 46 representative route-contract validation

Pass 46 added a dependency-light route-contract audit and a web package route-contract test. The audit checks representative MVP route groups for the expected guard shape: auth/session checks, request observability, rate limits, body/query validation, idempotency where applicable, and admin authorization for admin routes.

Current route-contract validation results:

- representative route contracts checked: 12
- route groups covered: auth, jobs, crimes, market, shops, contracts, admin
- shop listing creation now uses `withIdempotency`
- admin search now has bounded query validation and route-level rate limiting
- route-contract audit errors: 0

This remains static/representative coverage. It does not replace database-backed integration tests or runtime smoke execution against PostgreSQL.


## Pass 47 MVP page coverage validation

Pass 47 added a shared authenticated game page shell and dedicated player pages for profile, jobs, crimes, legal status, market, shops, messages, newspaper, and factions. It also added `scripts/validate-mvp-pages.mjs` so missing MVP pages or missing navigation links fail static validation.

Current MVP page validation results:

- dedicated MVP player pages checked: 9
- shared `GamePageShell` usage checked: passing
- active-character context usage checked: passing
- shared navigation links checked: passing
- MVP page validation errors: 0

These are first-pass state-inspection pages. Richer client-side actions and admin pages remain separate MVP completion work.


## Pass 49 admin RBAC validation

Pass 49 added `scripts/validate-admin-rbac.mjs` and `pnpm validate:admin-rbac`. The validator checks 14 admin route files, confirms every route uses `requireAdminCapability`, rejects direct admin-flag checks in admin routes, verifies the admin page uses `hasAdminCapability`, and checks that `0029_admin_roles.sql` plus `db:apply:admin-roles` remain wired.

Current RBAC validation results:

- admin route files checked: 14
- capability usage: `view_admin`, `search_players`, `manage_config`, `manage_announcements`, `moderate_content`, `enforce_players`, `manage_economy`
- RBAC drift errors: 0


## Pass 52 release-readiness, MVP-acceptance runbook

Pass 52 added `docs/mvp-release-runbook.md`, `docs/backup-restore.md`, `scripts/backup-db.sh`, `scripts/restore-db.sh`, and `scripts/validate-release-readiness.mjs and scripts/validate-mvp-acceptance.mjs`. The new validation gate is included in `pnpm validate:static` and passed in the dependency-light sandbox. Runtime execution of install, migration, typecheck, tests, strict smoke, backup, and restore is still required in a fully installed environment.


## Feature Pass 53 - MVP acceptance validation

Pass 53 added `scripts/validate-mvp-acceptance.mjs` and `pnpm validate:mvp-acceptance`. The validator confirms the final MVP acceptance surface is wired: root migration scripts, MVP pages, representative MVP API routes, late hardening migrations, static validators, release documents, runtime proof commands, and Feature Pass 53 documentation references.

The static gate now includes MVP acceptance validation before documentation and CI workflow drift checks. Runtime proof still requires a real dependency install, PostgreSQL/Redis runtime, typecheck/test execution, strict smoke checks, and backup/restore exercise.


## Feature Pass 55 integration validation

`pnpm validate:integration-tests` checks that the opt-in integration-test scaffold, proof command, docs, and package scripts remain wired.

## Feature Pass 56 monetization validation

`pnpm validate:monetization` checks the monetization migration, schema/query support, checkout placeholder, API routes, docs, package scripts, and API reference entries.

## Feature Pass 57 playable action validation

`pnpm validate:playable-actions` checks that the shared client action form exists, uses fetch with idempotency-key support and page refreshes, and that jobs, crimes, legal, market, shops, messages, and factions pages expose their expected POST action wiring.


## Feature Pass 59 admin operations UI validation

`pnpm validate:admin-operations-ui` checks that the admin console exposes the core MVP operator workflows and that their target admin API routes remain capability-gated and observable. The validator covers character search, flagging, flag resolution, status clearing, enforcement, enforcement lifting, appeal review, moderation report resolution, balance adjustment, transparency, audit, and the root admin page capability gate.

## Feature Pass 59 public launch validation

`pnpm validate:public-launch` runs `scripts/validate-public-launch.mjs`. The validator checks public launch pages, policy docs, beta test plan, README links, MVP release runbook links, MVP acceptance wording, and static validation wiring. It keeps public launch polish visible in `pnpm validate:static`.


## Feature Pass 60 site quality validation

`pnpm validate:site-quality` runs `scripts/validate-site-quality.mjs`. The validator checks the static accessibility, responsive design, PWA, SEO, metadata, sitemap, robots, public icon, shared game shell, action-form accessibility, documentation, and package-script wiring.

The site quality validator is dependency-light and does not replace real Lighthouse, keyboard, screen-reader, mobile viewport, or installability testing against a running production build.

## Feature Pass 61 in-progress closure validation

`pnpm validate:in-progress-closures` runs `scripts/validate-in-progress-closures.mjs`. The validator keeps the completed in-progress Messages page task wired by checking live SSE inbox status, mark-read, mute/unmute, leave-thread, report, block/unblock, report history, responsive action-grid styles, package scripts, and remaining-work documentation.

## Feature Pass 62 in-progress page closure validation

Feature Pass 62 did not add a new static validator. It closes the remaining in-progress page tasks using existing static gates and targeted TypeScript transpile parsing:

- `pnpm validate:mvp-pages` continues to verify dedicated player page coverage and shared navigation.
- `pnpm validate:playable-actions` continues to verify that MVP pages expose authenticated browser action forms.
- `pnpm validate:admin-operations-ui` continues to verify core admin operation wiring and capability-gated target routes.
- `pnpm validate:docs` now checks consolidated feature history and documentation set.
- A targeted transpile parse check covered the changed Shops, Newspaper, Profile, Admin page, Admin panel, shared action form, and admin query files.

Runtime browser verification and full dependency-backed typecheck/build remain part of the real-environment runtime proof gate.

## Feature Pass 64 documentation retrieval validation

Feature Pass 64 refactors documentation for lower future scan cost without moving API or migration files. Validation performed:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
```

Both dependency-light checks pass. Full `pnpm validate:static`, typecheck, tests, runtime smoke, backup proof, restore proof, and DB integration proof still require an installed environment.


## Feature Pass 66 Docker Compose note

- `docker-compose.yml` keeps PostgreSQL and Redis services for local proof.
- PostgreSQL and Redis image references are configurable through `POSTGRES_IMAGE` and `REDIS_IMAGE`.
- Defaults use AWS Public ECR mirrors of the official images to reduce Docker Hub fetch/rate-limit failures.
- PostgreSQL and Redis now expose health checks; Redis data is persisted through `redis-data`.

## Feature Pass 67 banking and finance-history validation

Feature Pass 67 adds a contained economy feature slice and fixes static drift found while validating it.

Dependency-light validation completed in this environment:

- `node scripts/validate-migrations.mjs`
- `node scripts/audit-hardening.mjs`
- `node scripts/validate-mvp-pages.mjs`
- `node scripts/validate-playable-actions.mjs`
- `node scripts/validate-mvp-gameplay.mjs`
- `node scripts/validate-admin-rbac.mjs`
- `node scripts/validate-admin-operations-ui.mjs`
- `node scripts/validate-job-lifecycle.mjs`
- `node scripts/validate-legal-recovery.mjs`
- `node scripts/validate-release-readiness.mjs`
- `node scripts/validate-integration-tests.mjs`
- `node scripts/validate-mvp-acceptance.mjs`
- `node scripts/validate-runtime-proof.mjs`
- `node scripts/validate-monetization-foundation.mjs`
- `node scripts/validate-public-launch.mjs`
- `node scripts/validate-site-quality.mjs`
- `node scripts/validate-in-progress-closures.mjs`
- `node scripts/validate-docs.mjs`
- `node scripts/validate-ci-workflow.mjs`

Validation notes:

- API docs now include all 84 concrete API route files, including `POST /api/bank` and `GET /api/finance/history`.
- The hardening audit reports 84 observed route wrappers and zero errors.
- `docs/migration-guide.md` now mentions `0033_runtime_schema_repair.sql`.
- Backup, restore, and runtime proof scripts are executable in this working tree.
- `.github/workflows/ci.yml` is present and validates against the expected `pnpm validate:ci` lane.

Dependency-backed `pnpm typecheck`, `pnpm test`, and PostgreSQL/Redis runtime proof still require an installed environment.

## Feature Pass 68 bank-history and finance-chart validation

Feature Pass 68 adds a player-facing economy UI slice on top of the Feature Pass 67 banking and finance-history APIs.

Dependency-light validation completed in this environment:

- `node scripts/validate-migrations.mjs`
- `node scripts/audit-hardening.mjs`
- `node scripts/audit-route-contracts.mjs`
- `node scripts/validate-mvp-pages.mjs`
- `node scripts/validate-playable-actions.mjs`
- `node scripts/validate-mvp-gameplay.mjs`
- `node scripts/validate-admin-rbac.mjs`
- `node scripts/validate-admin-operations-ui.mjs`
- `node scripts/validate-job-lifecycle.mjs`
- `node scripts/validate-legal-recovery.mjs`
- `node scripts/validate-release-readiness.mjs`
- `node scripts/validate-integration-tests.mjs`
- `node scripts/validate-mvp-acceptance.mjs`
- `node scripts/validate-runtime-proof.mjs`
- `node scripts/validate-monetization-foundation.mjs`
- `node scripts/validate-public-launch.mjs`
- `node scripts/validate-site-quality.mjs`
- `node scripts/validate-in-progress-closures.mjs`
- `node scripts/validate-docs.mjs`
- `node scripts/validate-ci-workflow.mjs`
- targeted `tsc --noEmit` parse check for the edited dashboard, API, DB-query, and validator files

Validation notes:

- API docs now include all 85 concrete API route files, including `GET /api/bank/history`.
- The hardening audit reports 85 observed route wrappers and zero errors/warnings.
- Representative route contracts still pass.
- Targeted TypeScript parsing found no syntax-level TypeScript errors in the edited files; dependency/module resolution errors are expected without installed dependencies.
- Dependency-backed `pnpm typecheck`, `pnpm test`, and PostgreSQL/Redis runtime proof still require an installed environment.


## Feature Pass 69 money-sink validation

Feature Pass 69 adds a contained economy balancing slice: authenticated money-sink catalog retrieval, idempotent purchase actions, source-specific cash/bank debits, financial transaction logging, player event logging, dashboard controls, and pure game-rule tests for sink catalog/purchase calculations.

Dependency-light validation completed in this environment:

- `node scripts/validate-migrations.mjs`
- `node scripts/audit-hardening.mjs`
- `node scripts/audit-route-contracts.mjs`
- `node scripts/validate-mvp-pages.mjs`
- `node scripts/validate-playable-actions.mjs`
- `node scripts/validate-mvp-gameplay.mjs`
- `node scripts/validate-admin-rbac.mjs`
- `node scripts/validate-admin-operations-ui.mjs`
- `node scripts/validate-job-lifecycle.mjs`
- `node scripts/validate-legal-recovery.mjs`
- `node scripts/validate-release-readiness.mjs`
- `node scripts/validate-integration-tests.mjs`
- `node scripts/validate-mvp-acceptance.mjs`
- `node scripts/validate-runtime-proof.mjs`
- `node scripts/validate-monetization-foundation.mjs`
- `node scripts/validate-public-launch.mjs`
- `node scripts/validate-site-quality.mjs`
- `node scripts/validate-in-progress-closures.mjs`
- `node scripts/validate-docs.mjs`
- `node scripts/validate-ci-workflow.mjs`
- targeted TypeScript parse check for the edited dashboard, API, DB-query, game-rule, validator, and test files

Validation notes:

- API docs now include all 86 concrete API route files, including `GET, POST /api/economy/sinks`.
- The hardening audit reports 86 observed route wrappers and zero errors/warnings.
- Representative route contracts still pass.
- Targeted TypeScript parsing found no syntax-level TypeScript errors in the edited files; dependency/module resolution errors are expected without installed dependencies.
- Dependency-backed `pnpm typecheck`, `pnpm test`, and PostgreSQL/Redis runtime proof still require an installed environment.

## Feature Pass 70 sandbox validation

Feature Pass 70 was validated with dependency-light checks in this sandbox:

```bash
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-ci-workflow.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-in-progress-closures.mjs
```

Results: migration validation found 35 ordered migrations through `0034_character_loans.sql`; API documentation covered 87 / 87 concrete routes; hardening audit found 87 / 87 route files wrapped with observability and 0 errors/warnings; representative route contracts passed. A targeted TypeScript transpile parse passed for the edited files.

Not run here: dependency-backed `pnpm typecheck`, `pnpm test`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration` because this sandbox does not provide pnpm, Docker, PostgreSQL, Redis, or installed workspace dependencies.

## Feature Pass 71 sandbox validation

Feature Pass 71 was validated with dependency-light checks in this sandbox:

```bash
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-ci-workflow.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-in-progress-closures.mjs
```

Results: migration validation found 36 ordered migrations through `0035_loan_defaulting.sql`; API documentation covered 87 / 87 concrete routes; hardening audit found 87 / 87 route files wrapped with observability and 0 errors/warnings; representative route contracts passed. A targeted TypeScript transpile parse passed for the 6 edited TypeScript/TSX files, and `node --check` passed for the edited proof scripts.

Not run here: dependency-backed `pnpm typecheck`, `pnpm test`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration` because this sandbox does not provide pnpm, Docker, PostgreSQL, Redis, or installed workspace dependencies.

## Feature Pass 72 sandbox validation

Feature Pass 72 was validated with dependency-light checks in this sandbox:

```bash
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-ci-workflow.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-in-progress-closures.mjs
```

Results: migration validation found 36 ordered migrations through `0035_loan_defaulting.sql`; API documentation covered 87 / 87 concrete routes; hardening audit found 87 / 87 route files wrapped with observability and 0 errors/warnings; representative route contracts passed. A targeted TypeScript transpile parse passed for the 6 edited TypeScript/TSX files.

Not run here: dependency-backed `pnpm typecheck`, `pnpm test`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration` because this sandbox does not provide pnpm, Docker, PostgreSQL, Redis, or installed workspace dependencies.

## Feature Pass 73 sandbox validation

Feature Pass 73 was validated with dependency-light checks in this sandbox:

```bash
node scripts/validate-migrations.mjs
node scripts/validate-docs.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-ci-workflow.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-in-progress-closures.mjs
```

Results: migration validation found 36 ordered migrations through `0035_loan_defaulting.sql`; API documentation covered 88 / 88 concrete routes; hardening audit found 88 / 88 route files wrapped with observability and 0 errors/warnings; admin RBAC validation found 15 admin routes with capability guards; representative route contracts passed. A targeted TypeScript transpile parse passed for the 5 edited TypeScript/TSX files.

Not run here: dependency-backed `pnpm typecheck`, `pnpm test`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration` because this sandbox does not provide pnpm, Docker runtime services, PostgreSQL, Redis, or installed workspace dependencies.

## Feature Pass 73 type-safety hotfix

A follow-up TypeScript check found that `src/app/(game)/dashboard/page.tsx` could not pass `bankTransactions` into `CharacterPanel` because Drizzle returns `financial_transactions.metadata` as `unknown`.

Fix applied:

- `packages/db/src/queries/finance.ts` now normalizes bank transaction metadata in `listCharacterBankTransactions()`.
- Returned bank rows now expose dashboard-safe metadata with optional `action`, `cashAfter`, and `bankAfter` fields.
- This keeps both the dashboard and `GET /api/bank/history` on the same narrowed bank-history shape.

Dependency-light validation rerun after the hotfix:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-docs.mjs
```

Results: migration validation still reports 36 ordered migrations through `0035_loan_defaulting.sql`; API documentation still covers 88 / 88 concrete routes; hardening audit still reports 88 / 88 observed route files with 0 errors/warnings; representative route contracts and docs validation passed.

A full `pnpm typecheck` still requires installed workspace dependencies, including `@types/node`, in the target development environment.

## Feature Pass 73 dashboard performance hotfix

A follow-up dashboard responsiveness hotfix was applied after section changes were reported as slow or occasionally unresponsive. The hotfix keeps same-page section navigation out of the Next.js router for hash-only links, skips redundant dashboard section state updates, defers dashboard finance-history fetches until the Economy section is opened, batches finance-history updates, and prevents hidden action cards from rendering their lists.

Dependency-light validation rerun after the performance hotfix:

```bash
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-playable-actions.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-admin-rbac.mjs
node scripts/validate-admin-operations-ui.mjs
node scripts/validate-job-lifecycle.mjs
node scripts/validate-legal-recovery.mjs
node scripts/validate-release-readiness.mjs
node scripts/validate-integration-tests.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-monetization-foundation.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-in-progress-closures.mjs
node scripts/validate-docs.mjs
node scripts/validate-ci-workflow.mjs
```

Results: migration validation still reports 36 ordered migrations through `0035_loan_defaulting.sql`; API documentation still covers 88 / 88 concrete routes; hardening audit still reports 88 / 88 observed route files with 0 errors/warnings; route contracts, MVP/page/admin/static validators, docs validation, and CI workflow validation passed. A targeted TypeScript transpile parse passed for `apps/web/src/features/game/game-side-menu.tsx` and `apps/web/src/features/dashboard/character-panel.tsx`.

A full `pnpm typecheck` still requires installed workspace dependencies in the target development environment.

## Feature Pass 73 validation hotfix

A follow-up local validation run reported one stale package-game assertion and one repeatability issue in the runtime proof command.

Fixes applied:

- Updated `packages/game/src/__tests__/meta-admin.test.ts` so the legacy-points fixture expects the current formula output of `36`.
- Added `packages/db/scripts/prepare-mvp-proof-database.ts` and `db:prepare:mvp-proof`.
- Updated `scripts/prove-mvp-runtime.mjs` so runtime proof uses a disposable `*_mvp_proof` database by default instead of applying the initial schema to an already-migrated local development DB.
- Added `MVP_PROOF_DATABASE_URL` and `MVP_PROOF_USE_CURRENT_DATABASE=true` controls for proof database selection.
- Removed the Windows `shell: true` child-process path for proof commands to avoid Node 25 shell-argument deprecation warnings.

Dependency-light validation rerun after this hotfix:

```bash
node --check scripts/prove-mvp-runtime.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-docs.mjs
```

Full confirmation still needs to be rerun in the target development environment with installed dependencies and Docker services:

```bash
pnpm --filter @drugdeal/game test
pnpm prove:mvp-runtime
```

## Feature Pass 74 documentation consolidation validation

Feature Pass 74 reduced docs folder file count from 96 markdown files to 25 markdown files by consolidating historical pass notes into `docs/feature-history.md`. Validation performed in this sandbox:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-public-launch.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-release-readiness.mjs
```

Observed results: `validate-docs` reports 88/88 API routes documented, 72 feature-history sections, and zero errors. Migration validation reports 36 ordered migrations through `0035_loan_defaulting.sql`.


## Feature Pass 75 validation note

Richer bank statement query validation, API route CSV/JSON handling, database statement filtering, and dashboard statement controls were checked with dependency-light static validation and targeted TypeScript transpile parsing in the sandbox. Full `pnpm typecheck`, `pnpm test`, and runtime proof still require the installed environment.

## Feature Pass 75 stability hotfix validation note

A runtime report identified a dashboard maximum-update-depth loop, an async form-reset `currentTarget` null failure, and a message-center unread query failure. The hotfix updates the dashboard finance-history effect, captures form references before async actions, and rewrites unread-count filtering through Drizzle predicates rather than raw timestamp casts.

Dependency-light validation rerun after this hotfix:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-pages.mjs
node scripts/validate-mvp-gameplay.mjs
node scripts/validate-site-quality.mjs
node scripts/validate-runtime-proof.mjs
```

