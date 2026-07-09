# Current State Brief

Last updated: Feature Pass 89 achievement idempotency and worker retry/dead-letter hardening.

## Project posture

DrugDeal Game is a **static MVP candidate pending installed-environment runtime proof**. Feature breadth is strong enough for controlled evaluation, but production readiness still depends on proving install, migration, typecheck, tests, app/worker startup, runtime smoke checks, backup, restore, and DB integration tests together.

## Completed MVP-level areas

- Monorepo with Next.js web app, worker app, shared database/game/validator/UI packages.
- Auth/session, password reset, email verification, profile privacy, and character creation.
- Core gameplay across jobs, crimes, legal/hospital recovery, travel, market, training, education, banking, loans, finance, gambling, factions, territories, PvP, shops, contracts, messages, notifications, newspaper, and admin operations.
- Static validation gates for migrations, hardening, route contracts, MVP pages, playable actions, admin RBAC, job/legal flows, public launch, site quality, monetization, runtime-proof wiring, docs, and CI.
- Docker Compose PostgreSQL/Redis with health checks and persisted Redis data.
- Consolidated root package scripts and database scripts; normal migration flow is `pnpm db:setup` or `pnpm db:apply:all`, with `pnpm db:apply:file -- drizzle/<file>.sql` only for targeted repair.
- Redis-backed anti-spam/rate limiting through `RATE_LIMIT_REDIS_URL` or `REDIS_URL`, with memory fallback unless `RATE_LIMIT_REDIS_REQUIRED=true`.
- Achievement syncing now uses atomic upsert semantics so concurrent dashboard/progression reads do not fail on duplicate `character_achievements` inserts.
- Worker ticks now use a shared retry/backoff scheduler with overlap skipping and DB-backed `worker_dead_letters` records after exhausted retries.

## Highest-risk gaps

1. Runtime proof still required in a real installed environment.
2. Database-backed integration tests are scaffolded but not fully proven.
3. External log shipping, alerting, abuse analytics, bot detection, and load testing remain production-hardening work.
4. Public legal/payment workflows remain draft-only pending review.

## Current command surface

Use the reduced command set in `README.md`: `pnpm validate:static`, `pnpm validate:ci`, `pnpm db:setup`, `pnpm db:apply:all`, `pnpm db:apply:file`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration`.
