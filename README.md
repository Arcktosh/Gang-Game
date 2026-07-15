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

The repo is at **Feature Pass 105**. It is a **production release candidate pending installed-environment proof**, not a production-approved deployment. Feature Pass 56 established the executable MVP acceptance gate, Feature Pass 59 added public launch polish and draft policies, and Feature Pass 60 added the site-quality baseline for accessibility, responsive behavior, PWA support, and SEO. Feature Pass 103 added the required character setup boundary, accessible disclosure controls, capability-aware contract/faction/shop surfaces, persistent product images, compact market/shop cards, and product detail graphs. Feature Pass 104 removed the historical fixed development credential from the deployable path and added guarded local-seed and production-owner bootstrap commands. Feature Pass 105 promotes the former dashboard, profile, and inventory disclosure sections into 17 dedicated routes, keeps cards independently collapsible within each route, and reorganizes the side navigation into gameplay-focused categories. MVP acceptance is tracked in `docs/mvp-acceptance.md` and runs through the consolidated `pnpm validate:static` chain.

Current breadth includes auth/account recovery, enforced character creation, core actions, jobs, crimes, legal/hospital recovery, travel, image-backed markets and shops, banking/statements, money sinks, loans, finance charts, factions, PvP, contracts, newspaper, messages, notifications, admin/moderation/enforcement, public launch pages, site-quality baselines, monetization placeholders, static validation gates, Redis-backed anti-spam/rate limiting, worker retry/dead-letter handling, feature flags, operational anomaly review, admin audit/rollback workbenches, and guarded account bootstrap operations, routed dashboard/profile/inventory hubs, and categorized side navigation.

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

## Optional local development owner

No fixed development password is shipped. After migrations are applied, create or reset the local owner only with an operator-chosen password:

```bash
NODE_ENV=development \
ALLOW_DEVELOPMENT_SEED=true \
DEV_SEED_EMAIL=dev@example.com \
DEV_SEED_PASSWORD="$LOCAL_DEV_OWNER_PASSWORD" \
pnpm db:seed
```

Set `LOCAL_DEV_OWNER_PASSWORD` from a local secret source before running the command. The seeder refuses to run outside development or without the explicit enable flag. Migration `0049_disable_legacy_dev_owner.sql` neutralizes the historical seeded owner before this guarded local-only command can recreate it.

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
pnpm db:seed                     # Explicitly guarded local-development owner seed
pnpm db:bootstrap:admin          # Explicitly guarded production owner bootstrap/reset
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
