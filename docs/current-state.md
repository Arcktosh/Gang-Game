# Current State Brief

Last updated: Feature Pass 105 routed gameplay hubs and card-level disclosures after the Feature Pass 104 account bootstrap hardening.

## Project posture

DrugDeal Game is a **production release candidate pending installed-environment runtime proof**. Source-level feature and security work is ready for controlled staging evaluation, but production approval still depends on proving install, migration, typecheck, tests, app/worker startup, runtime smoke checks, backup, restore, media persistence, and DB integration together.

## Completed MVP-level areas

- Monorepo with Next.js web app, worker app, shared database/game/validator/UI packages.
- Auth/session, password reset, email verification, profile privacy, and character creation.
- Core gameplay across jobs, crimes, legal/hospital recovery, travel, market, training, education, banking, loans, finance, gambling, factions, territories, PvP, shops, contracts, messages, notifications, newspaper, and admin operations.
- Static validation gates for migrations, hardening, route contracts, MVP pages, playable actions, admin RBAC, job/legal flows, public launch, site quality, monetization, runtime-proof wiring, docs, and CI.
- Docker Compose PostgreSQL/Redis with health checks and persisted Redis data.
- Consolidated root package scripts and database scripts; normal migration flow is `pnpm db:setup` or `pnpm db:apply:all`, with `pnpm db:apply:file -- drizzle/<file>.sql` only for targeted repair.
- Deterministic agent memory now indexes files, imports, package manifests, public APIs, routes, pages, and top-level symbols under `.agent-memory`, with a validated JSON task queue and root `AGENTS.md` operating guide.
- Redis-backed anti-spam/rate limiting through `RATE_LIMIT_REDIS_URL` or `REDIS_URL`, with memory fallback unless `RATE_LIMIT_REDIS_REQUIRED=true`.
- Achievement syncing now uses atomic upsert semantics so concurrent dashboard/progression reads do not fail on duplicate `character_achievements` inserts.
- Worker ticks now use a shared retry/backoff scheduler with overlap skipping and DB-backed `worker_dead_letters` records after exhausted retries.
- Admin moderation can hide reported messages from player inboxes, and maintenance cleanup can expire old messages via `MESSAGE_RETENTION_DAYS` while skipping open reports.
- Admin-operated feature flags now provide production kill switches for messages, newspaper actions, shops, trades, gambling, finance trading, market actions, contracts, factions, and PvP attacks.
- Automated operational anomaly detection now scans for high net worth, transaction spikes, oversized inventory stacks, and recent session IP spread with admin review controls.
- Admin rollback tooling can reverse recent cash/bank admin adjustments from the audit trail with duplicate-rollback prevention and a separate rollback audit record. The Admin Console audit workbench now uses the shared nullable audit row types from `@drugdeal/db`, so records without descriptions, character names, or emails render with safe fallbacks instead of failing typecheck.
- Authenticated game routes enforce character setup through `/create-character`. The eight dashboard sections, six profile sections, and three inventory sections now have dedicated routes; cards inside those pages use native collapsible disclosures, and the sidebar groups every route by gameplay domain with exact active-page indication. Contracts, factions, and shops omit empty or unauthorized action surfaces instead of rendering unusable placeholders.
- Product definitions now support persistent PostgreSQL-backed JPEG, PNG, and WebP images. Admins with `manage_config` can upload, replace, or remove images, while market and shop grids use compact image cards with expandable descriptions and local supply/demand graphs.
- The historical fixed development owner is neutralized by migration `0049_disable_legacy_dev_owner.sql`. Local development owner seeding and production owner bootstrap now use separate, environment-guarded commands with operator-supplied strong passwords and transactional session/token revocation.

## Highest-risk gaps

1. Runtime proof still required in a real installed environment; Feature Pass 95 fixed the Windows `spawn EINVAL` failure path, and Feature Pass 96 fixed the follow-up Admin Console nullable audit row typecheck failure reported during `pnpm prove:mvp-runtime`.
2. Database-backed integration tests are scaffolded but not fully proven.
3. Vendor-neutral structured telemetry and alert shipping are implemented; production sink deployment, dashboards, alert exercises, abuse analytics, bot detection, and load testing remain.
4. Public legal/payment workflows remain draft-only pending review.

## Current command surface

Use the reduced command set in `README.md`: `pnpm validate:static`, `pnpm validate:ci`, `pnpm agent:memory`, `pnpm agent:memory:check`, `pnpm db:setup`, `pnpm db:apply:all`, `pnpm db:apply:file`, guarded `pnpm db:seed`, guarded `pnpm db:bootstrap:admin`, `pnpm prove:mvp-runtime`, and `pnpm prove:integration`.

## Feature Pass 98 test baseline update

The worker, database, and UI packages now have executable baseline test commands instead of placeholder echoes. Static validation verifies the commands and expected test files. Full execution remains pending the installed-environment proof.

## Feature Pass 99 production proof readiness

The runtime proof now begins with `pnpm doctor:proof`, which reports environment and repository prerequisites before any long-running install, migration, build, test, smoke, backup, or restore operation. `VAL-001` remains open until the strict doctor and full proof both pass. A committed `pnpm-lock.yaml` is now explicitly treated as a production reproducibility requirement.


## Feature Pass 100 production observability and CI proof

- Added `@drugdeal/observability` as a dependency-free shared package for structured events, critical alerts, recursive redaction, and optional HTTP shipping.
- Added request completion/server-error telemetry to all API routes through the existing observability wrapper.
- Added worker startup, shutdown, schedule, retry, overlap, completion, failure, and exhausted-retry alerts.
- Added safe observability configuration status to `/api/health` runtime diagnostics.
- Added `docs/observability-runbook.md`, environment configuration, tests, and a static contract validator.
- Generated `pnpm-lock.yaml` with pnpm 9.15.4, resolving the reproducible-install blocker identified in Feature Pass 99.
- Installed dependencies and ran the dependency-backed workspace CI gate in the sandbox.

- The installed test run found and fixed direct Node JSX execution for `StatCard` by adding the required React runtime import.
- Next production build concurrency is now bounded by `NEXT_BUILD_CPUS` (default 4) to prevent resource exhaustion on shared CI hosts.
- Static validation, workspace typecheck, production build, and all executable package tests passed after the repairs.

## Feature Pass 101 production-proof contract

The runtime proof now certifies the production path rather than the development path. It installs from the frozen lockfile, runs the production build, verifies Redis-required allow/allow/reject behavior, starts the built Next.js app with `next start`, executes strict runtime smoke checks, proves the worker remains alive through a configurable stability window, performs backup/restore, and writes `artifacts/mvp-runtime-proof.json` on both success and failure. Infrastructure execution remains pending on a host with Docker, PostgreSQL tools, Redis, and pnpm 9.15.4.

## Feature Pass 102 — executable gameplay integration boundary

- Job and crime transaction logic now lives in reusable `@drugdeal/db` gameplay action services.
- The API routes retain authentication, validation, rate limiting, idempotency, observability, and HTTP response responsibilities only.
- The database integration suite now proves job application, work, resignation, deterministic crime success, persisted history/events, and no partial writes on rejected actions.
- `pnpm prove:integration` now writes `artifacts/integration-proof.json` on both success and failure.
- Live PostgreSQL execution remains required before `VAL-002` can be closed.

## Feature Pass 103 — accessible game surfaces and product media

- Added the required character-creation redirect boundary for all authenticated game pages.
- Replaced hash-hidden profile/inventory sections with native collapsible disclosures and made dashboard sections independently expandable.
- Hid private/faction contract tools, empty contract collections, faction operations, and shop collections when the active character cannot use them.
- Added migration `0048_item_product_images.sql`, image query helpers, validated admin upload/delete routes, cacheable public delivery, and compact market/shop product cards.
- Dependency-free migration, route-contract, source-parse, and documentation validation cover the new paths. Full installed typecheck/build/test and live PostgreSQL upload proof remain part of `VAL-001`/`VAL-002`.

## Feature Pass 104 — account bootstrap and release credential hardening

- Added `0049_disable_legacy_dev_owner.sql` to revoke sessions and one-time tokens, invalidate the historical password, remove administrator privileges, and move the legacy seed address to a non-routable domain.
- Replaced direct execution of the historical SQL seed with a development-only `pnpm db:seed` command requiring `ALLOW_DEVELOPMENT_SEED=true` and an operator-supplied strong password.
- Added a production-only `pnpm db:bootstrap:admin` command requiring an explicit confirmation phrase, a strong operator-supplied password, and deliberate opt-in before resetting an existing account.
- Wrapped owner creation/reset and credential revocation in database transactions so privileges and tokens cannot be left partially updated.
- Source-level release auditing now has concrete neutralization, guarded local seed, and production bootstrap evidence. Live database execution remains part of the staging proof.

## Feature Pass 105 — routed gameplay hubs and card disclosures

- Promoted eight dashboard sections, six profile sections, and three inventory sections into 17 dedicated App Router pages while preserving `/dashboard`, `/profile`, and `/inventory` as overview routes.
- Replaced the former page-level section controls with a reusable native `details/summary` card disclosure. Hidden dashboard cards return `null`, so inactive route content is not mounted as inaccessible page content.
- Reorganized the side navigation into Overview, Character, Actions, Economy, Inventory, Community, and World categories; every promoted route is linked and the longest matching route receives the single `aria-current="page"` state.
- Scoped notification and message event streams to `/dashboard/activity` and `/dashboard/messages` respectively.
- Expanded the source-level MVP page validator to cover 27 player routes, categorized navigation contracts, routed section implementations, card disclosures, and the existing character/media/capability requirements.
- Installed TypeScript checking, optimized build, and browser keyboard/screen-reader/responsive proof remain part of `VAL-001` because the offline environment cannot retrieve the pinned pnpm toolchain and workspace dependencies.
