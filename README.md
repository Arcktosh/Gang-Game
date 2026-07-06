# DrugDeal Game

Text-based persistent browser MMO skeleton using Next.js, PostgreSQL, Drizzle ORM, Redis, shared TypeScript packages, and a worker service.

> Safety note: gameplay systems are fictional and abstract. Crime/legal mechanics should stay game-like and avoid real-world operational detail.

## Fast retrieval path

For future implementation passes, read these files first and avoid scanning the whole repo unless a task needs code-level detail:

1. `docs/README.md` - documentation map and retrieval rules.
2. `docs/current-state.md` - one-page current project state.
3. `docs/next-task-brief.md` - highest-value next tasks and execution constraints.
4. `docs/backlog-index.md` - compact map of remaining unstarted/thin feature areas.
5. `docs/api-reference.md` - API route map when editing routes.
6. `docs/migration-guide.md` - database order when editing schema/migrations.
7. `docs/validation-audit.md` - validation commands and known proof gaps.
8. `docs/mvp-release-runbook.md` - MVP release checklist and runtime validation gate.
9. `docs/backup-restore.md` - backup and restore runbook.
10. `docs/runtime-smoke.md` - live runtime smoke-test guide.
11. `docs/privacy-policy.md` - public beta privacy-policy draft.
12. `docs/terms-of-service.md` - public beta terms draft.
13. `docs/community-rules.md` - public beta conduct rules.
14. `docs/beta-test-plan.md` - public beta test plan.
15. `docs/feature-history.md` - consolidated historical implementation audit trail.

Historical implementation notes are consolidated in `docs/feature-history.md`; do not read that first during normal task planning.

## Current state

The repo is at **Feature Pass 75**. Feature breadth is sufficient for a static MVP candidate. Feature Pass 59 added public launch polish and policy drafts. Feature Pass 60 added the accessibility, responsive design, PWA, and SEO baseline. Feature Pass 56 added the monetization foundation documented in `docs/monetization.md`; Feature Pass 64 keeps this reference discoverable; Feature Pass 65 removes deprecated TypeScript `baseUrl` usage for TS 6 compatibility. Feature Pass 66 updates Docker Compose to use configurable PostgreSQL/Redis images with AWS Public ECR defaults, health checks, and Redis persistence so local startup is less dependent on Docker Hub tag pulls. Feature Pass 67 adds player bank deposits/withdrawals and finance price-history retrieval. Feature Pass 68 adds authenticated bank-history retrieval, dashboard bank activity, and finance sparkline charts. Feature Pass 69 adds authenticated money-sink catalog/purchase actions and dashboard controls. Feature Pass 70 adds first-pass loan offers, loan funding, bank repayment, loan ledger migration, and dashboard loan controls. Feature Pass 71 adds overdue/default loan handling, worker processing, unresolved-loan database guardrails, and dashboard default-state visibility. Feature Pass 72 adds partial loan repayments, payment amount validation, incremental bank debits, audit/event logging, and dashboard payment controls. Feature Pass 73 adds economy-manager loan exposure visibility in the admin console and a guarded admin loan queue API. Feature Pass 74 consolidates the historical per-pass documentation into `docs/feature-history.md`, reducing docs folder file count while preserving the audit trail. Feature Pass 75 adds richer banking statements with filters, summaries, and CSV export. MVP acceptance is documented in `docs/mvp-acceptance.md` and guarded by `pnpm validate:mvp-acceptance`. Current breadth includes: auth and account recovery, character creation, core actions, jobs, crimes, legal/hospital recovery, travel, market, banking/history/statements, money sinks, loans with partial repayment and admin exposure review, finance charts, factions, PvP, shops, newspaper, messages, notifications, admin/moderation/enforcement, public launch pages, site-quality baseline, monetization placeholders, and static validation gates are in place.

The highest-value remaining work is **runtime proof in an installed environment** and then fixing any failures found. See `docs/next-task-brief.md`.

## Architecture

- `apps/web` - Next.js App Router web game and HTTP/API routes.
- `apps/worker` - scheduled game ticks and background processing.
- `packages/db` - Drizzle schema, migrations, database client, and query functions.
- `packages/game` - pure game rules, formulas, and simulations.
- `packages/validators` - shared Zod validators.
- `packages/ui` - shared UI components.
- `docs` - compact retrieval docs, source-of-truth status, roadmap, API/migration references, and consolidated historical pass notes.

## Quick start

```bash
pnpm install
cp .env.example .env
docker compose up -d
docker compose ps
```

The default compose images use AWS Public ECR mirrors of the official PostgreSQL and Redis images to avoid Docker Hub fetch failures/rate limits. To force Docker Hub instead, set `POSTGRES_IMAGE=docker.io/library/postgres:16-alpine` and `REDIS_IMAGE=docker.io/library/redis:7-alpine` in `.env`.

Apply the database in the canonical order documented in `docs/migration-guide.md`. The root convenience scripts include all current migrations through `db:apply:loan-defaulting`.

```bash
pnpm db:apply:initial
pnpm db:apply:auth
pnpm db:apply:progression
pnpm db:seed
pnpm db:apply:gameplay
pnpm db:apply:risk
pnpm db:apply:legal
pnpm db:apply:factions
pnpm db:apply:shops
pnpm db:apply:finance
pnpm db:apply:gambling
pnpm db:apply:contracts
pnpm db:apply:achievements
pnpm db:apply:seasons
pnpm db:apply:admin
pnpm db:apply:pvp
pnpm db:apply:equipment
pnpm db:apply:vehicles
pnpm db:apply:crafting
pnpm db:apply:contacts
pnpm db:apply:notifications
pnpm db:apply:messages
pnpm db:apply:newspaper-social
pnpm db:apply:shop-ops
pnpm db:apply:moderation
pnpm db:apply:enforcement
pnpm db:apply:enforcement-ops
pnpm db:apply:idempotency
pnpm db:apply:hardening
pnpm db:apply:admin-roles
pnpm db:apply:job-lifecycle
pnpm db:apply:monetization
pnpm db:apply:auth-recovery
pnpm db:apply:runtime-repair
pnpm db:apply:loans
pnpm db:apply:loan-defaulting
```

Start the app and worker:

```bash
pnpm dev:worker
pnpm dev
```

## Local login

The seed script creates a local admin/dev user:

```txt
Email:    dev@example.com
Password: password123
```

Sessions use an `httpOnly` cookie named `dd_session`. For local API testing only, game routes still accept this fallback header when `NODE_ENV !== 'production'`:

```bash
-H 'x-user-id: 00000000-0000-0000-0000-000000000001'
```

## Useful commands

```bash
pnpm dev                         # Start the Next.js app
pnpm dev:worker                  # Start the worker process
pnpm typecheck                   # TypeScript checks
pnpm test                        # Package test suites
pnpm validate:static             # Dependency-light static validation chain after install
pnpm validate:docs               # Documentation/API drift audit
pnpm validate:runtime-proof      # Runtime proof wiring validation
pnpm smoke:runtime               # Runtime smoke checks against a running app
pnpm prove:mvp-runtime           # Full installed-environment MVP proof
pnpm prove:integration           # Opt-in database-backed integration proof
pnpm db:backup                   # PostgreSQL custom-format backup using DATABASE_URL
pnpm db:restore -- backup.dump   # Restore using DATABASE_URL
```

## Current API surface

See `docs/api-reference.md`. Major route groups include auth/account recovery, characters, jobs, crimes, travel, training, education, market, finance, gambling, factions, territories, PvP, bounties, shops, contracts, newspaper, messages, notifications, and admin routes.

## Current limitations

- Full dependency install, typecheck, tests, live smoke checks, backup/restore proof, and runtime migration validation still need to be executed with pnpm, PostgreSQL, and Redis.
- Database-backed route/integration tests are scaffolded but not yet proven in this environment.
- Production observability still needs external log shipping, alerting, retry/dead-letter policy, abuse analytics, and a distributed Redis/Postgres-backed rate limiter.
- Several deep retention systems remain post-MVP: skill trees, tutorial/wiki, season rewards, auction house, faction diplomacy/war UI, deeper market/supply controls, and public profile routes.

## Recommended next pass

Run MVP runtime proof in a fully installed environment:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

Preview the command sequence without executing external tools:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
```


### Pass 75 stability hotfix

A follow-up runtime hotfix fixes dashboard finance-history empty-state update loops, async form reset safety, and message unread-count timestamp filtering.
