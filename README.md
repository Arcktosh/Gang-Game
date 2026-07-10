# DrugDeal Game

Text-based persistent browser MMO built with Next.js, PostgreSQL, Drizzle ORM, Redis, shared TypeScript packages, and a worker service.

> Safety note: gameplay systems are fictional and abstract. Crime/legal mechanics should stay game-like and avoid real-world operational detail.

## Fast retrieval path

Read these first during future implementation passes:

1. `AGENTS.md` - repository boundaries, dependency direction, and change protocol.
2. `.agent-memory/README.md` - generated retrieval order for AI-assisted tasks.
3. `.agent-memory/tasks.json` - machine-readable task queue and acceptance criteria.
4. `docs/README.md` - human-maintained documentation map and retrieval rules.
5. `docs/current-state.md` - compact project state and proof gaps.
6. `docs/api-reference.md` - API route map when editing routes.
7. `docs/migration-guide.md` - database setup and migration flow.

Public launch references remain in `docs/privacy-policy.md`, `docs/terms-of-service.md`, `docs/community-rules.md`, and `docs/beta-test-plan.md`. Monetization planning remains in `docs/monetization.md`.

## Current state

The repo is at **Feature Pass 97**. It is still an **MVP candidate**, not production-proven, because installed-environment proof remains outstanding. Feature Pass 56 added the monetization foundation and MVP acceptance gate; Feature Pass 59 added public launch polish and policy drafts; Feature Pass 60 added the site-quality baseline for accessibility, responsive design, PWA, and SEO; Feature Pass 88 consolidated package scripts/docs and added Redis-backed rate limiting with memory fallback; Feature Pass 89 adds idempotent achievement syncing plus worker retry/dead-letter handling; Feature Pass 90 adds admin message hiding plus configurable message-retention cleanup; Feature Pass 91 adds admin-operated feature flags for production kill switches; Feature Pass 92 adds automated operational anomaly detection with worker scans and admin review; Feature Pass 93 adds admin economy, inventory, and session audit workbench routes with CSV exports; Feature Pass 94 adds first-pass admin rollback tooling for cash/bank adjustment mistakes; Feature Pass 95 repairs audit-route typecheck failures and makes the MVP runtime proof runner Windows-safe; Feature Pass 96 aligns the Admin Console audit workbench prop types with nullable DB audit rows reported by local typecheck; Feature Pass 97 adds deterministic AI-agent memory indexes, a validated JSON task queue, and normalized shared-package barrel exports. MVP acceptance is tracked in `docs/mvp-acceptance.md` and now runs through the consolidated `pnpm validate:static` chain.

Current breadth includes auth/account recovery, character creation, core actions, jobs, crimes, legal/hospital recovery, travel, market, banking/statements, money sinks, loans, finance charts, factions, PvP, shops, newspaper, messages, notifications, admin/moderation/enforcement, public launch pages, site-quality baseline, monetization placeholders, static validation gates, and Redis-backed anti-spam/rate limiting, idempotent dashboard achievement sync, worker retry/dead-letter handling, admin message hiding, message-retention cleanup, admin-operated feature flags for production kill switches, operational anomaly review, admin audit workbench filters/CSV exports, cash/bank rollback controls for admin adjustment mistakes, typed audit CSV mappers, nullable-safe Admin Console audit workbench rendering, and Windows-safe runtime proof process spawning.

## Architecture

- `apps/web` - Next.js App Router web game and HTTP/API routes.
- `apps/worker` - scheduled game ticks and background processing.
- `packages/db` - Drizzle schema, migrations, database client, and query functions.
- `packages/game` - pure game rules, formulas, and simulations.
- `packages/validators` - shared Zod validators.
- `packages/ui` - shared UI components.
- `docs` - compact source-of-truth docs and consolidated historical pass notes.

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:setup
pnpm dev:worker
pnpm dev
```

The default compose images use AWS Public ECR mirrors of the official PostgreSQL and Redis images to reduce Docker Hub dependency. Override `POSTGRES_IMAGE` and `REDIS_IMAGE` in `.env` if needed.

## Local login

The seed script creates a local admin/dev user:

```txt
Email:    dev@example.com
Password: password123
```

Sessions use an `httpOnly` cookie named `dd_session`. For local API testing only, game routes still accept `x-user-id` when `NODE_ENV !== 'production'`.

## Useful commands

```bash
pnpm dev                         # Start the Next.js app
pnpm dev:worker                  # Start the worker process
pnpm build                       # Workspace builds
pnpm typecheck                   # Workspace TypeScript checks
pnpm test                        # Package test suites
pnpm validate                    # Alias for pnpm validate:static
pnpm validate:static             # Consolidated dependency-light static validation chain
pnpm validate:docs               # Documentation/API drift audit
pnpm agent:memory                # Regenerate AI retrieval indexes
pnpm agent:memory:check          # Verify indexes and task queue are current
pnpm validate:migrations         # Migration order and coverage audit
# validate:runtime-proof is consolidated into pnpm validate:static
pnpm smoke:runtime               # Runtime smoke checks against a running app
pnpm prove:mvp-runtime           # Full installed-environment MVP proof
pnpm prove:integration           # Opt-in database-backed integration proof
pnpm db:setup                    # Ensure database exists, then apply all migrations
pnpm db:apply:all                # Apply tracked migrations to an existing database
pnpm db:apply:file -- drizzle/0031_monetization_foundation.sql  # Targeted repair only
pnpm db:backup                   # PostgreSQL custom-format backup using DATABASE_URL
pnpm db:restore -- backup.dump   # Restore using DATABASE_URL
```


## Release proof docs

- `docs/mvp-release-runbook.md` - release checklist and rollback flow.
- `docs/backup-restore.md` - PostgreSQL backup/restore procedures.
- `docs/runtime-smoke.md` - smoke checks for a running app.
- `docs/migration-guide.md` - database setup and migration flow.

## Current API surface

See `docs/api-reference.md`. Major route groups include auth/account recovery, characters, jobs, crimes, travel, training, education, market, finance, gambling, factions, territories, PvP, bounties, shops, contracts, newspaper, messages, notifications, monetization placeholders, and admin routes.

## Current limitations

- Runtime proof still required: install, migration, typecheck, tests, live smoke checks, backup, restore, and DB integration proof must run with pnpm, PostgreSQL, and Redis.
- Database-backed route/integration tests are scaffolded but not yet proven in this environment.
- Production observability still needs external log shipping, alerting, abuse analytics, bot detection, and load testing.
- Public legal documents are drafts pending jurisdiction-reviewed final versions.

## Recommended next pass

Run MVP runtime proof in a fully installed environment:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

Preview the command sequence without executing external tools:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
```
