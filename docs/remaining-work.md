# Remaining Work

Feature Pass 59 added public launch polish and policy drafts. Feature Pass 60 added the accessibility, responsive design, PWA, and SEO baseline. Feature Pass 56 established the monetization foundation. Feature Pass 67 added player banking and finance price-history retrieval. Feature Pass 68 added bank-history retrieval, dashboard bank activity, and finance sparkline charts. Feature Pass 69 added first-pass money sinks. Feature Pass 70 added first-pass loans. Feature Pass 71 added overdue/default loan handling. Feature Pass 72 added partial loan repayment controls. Feature Pass 73 added admin loan exposure visibility. Feature Pass 75 added richer banking statements and CSV export. Feature Pass 76 added the deterministic market event formula foundation. Feature Pass 77 added deterministic market-event scheduling and newspaper payload helpers. Feature Pass 78 added first-pass market-event persistence, worker publishing, market API surfacing, and Market page alerts. Feature Pass 79 added reserved-inventory player-to-player trade offers with accept/cancel/expiry handling, API routes, worker expiry, and a browser page. Feature Pass 80 fixed the player-trade action lock type coverage, enforced accept cooldown checks, and added trade exposure summaries to shared formulas, DB output, and the Trades page. Feature Pass 81 added timed progression scheduling, course prerequisites, worker completion, and dashboard queue visibility. Feature Pass 82 added item rarity, inventory exposure summaries, consumable item use, and direct same-location item transfers. Feature Pass 83 added jail fine settlement, bail, abstract court hearings, jail-only activities, and Legal page controls. Feature Pass 86 added a dedicated Contracts page plus private assignments and faction-scoped contract visibility/permission checks. Runtime proof still required before public MVP testing.

Use `docs/backlog-index.md` for a compact retrieval map. This file is the prioritized backlog.

## P0 - Required before public MVP testing

1. Execute installed-environment runtime proof:
   - `MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime`
   - `MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime`
2. Execute DB-backed integration proof:
   - `pnpm prove:integration`
3. Fix any install, migration, typecheck, test, runtime smoke, backup, restore, or integration failures.
4. Document proof results in `docs/validation-audit.md` and a new feature-history note.
5. Run manual site-quality checks against a real deployed build: Lighthouse, keyboard-only navigation, screen-reader smoke, and mobile viewport checks.

## P1 - Recommended before wider beta

### Runtime and operations

- Add external structured log shipping and alerting.
- Add error-reporting adapter and redaction policy.
- Replace in-memory rate limiting with Redis/Postgres-backed distributed rate limits.
- Add background job retry policy and dead-letter queue.
- Add abuse analytics, bot detection, and load testing.
- Add runtime tests for idempotency replay/conflict and transaction rollback behavior.

### Core gameplay depth

- Build a generic action definition model.
- Normalize failure handling and conflict responses across action routes.
- Tune action requirements, costs, rewards, success chances, cooldowns, and balance config usage.
- Add training cooldown tuning, course prerequisites, and course completion timers.
- Add crime categories, investigation score, crime skill progression, court outcomes, bail/fine flow, and jail-only gameplay.

### UX and product polish

- Add optimistic feedback and confirmation dialogs for risky actions.
- Add E2E/browser tests against a seeded runtime.
- Add public profile routes.
- Improve newspaper search/full-text filtering and ad-slot layouts.
- Expand audit/history pages beyond the MVP admin console surfaces.

## P2 - Retention and economy expansion

- Validate market-event and player-trade persistence, worker publishing/expiry, API/UI surfacing, and newspaper publishing in runtime proof; then add inflation controls, deeper trade analytics/history, loan balance tuning, and deeper finance analytics.
- Advanced item mod slots, rare affixes, faction armory crafting, vehicle damage/impound, and deeper item balance tuning after runtime proof.
- Faction shop permissions, diplomacy, territory map UI, taxes/upgrades, war UI, deeper armory balance, and faction contribution leaderboards.
- Group chats, faction-wide notifications, email/push adapters, per-device browser preferences, and message retention policy.
- Skill trees, reputation tracks, season leaderboards/rewards/events, daily login streaks, tutorial, guide/wiki, referral, and mentor systems.

## P3 - Commercial launch

- Replace draft policies with jurisdiction-reviewed legal documents. Production legal review is required before commercial launch.
- Add payment-provider adapter only after refund, support, tax, privacy, and entitlement workflows are ready.
- Complete production moderation staffing/processes.
- Add rollback tooling and automated anomaly detection.

## Feature Pass 61 in-progress task update

- [x] Full Messages page with active conversation actions, in-place live updates, block/report/mute controls, report history, and responsive control layouts.


## Closed in Feature Pass 66

- Docker image pulls for PostgreSQL and Redis are less brittle: compose now uses configurable image variables, AWS Public ECR mirror defaults, service health checks, and Redis persistence.

## Closed in Feature Pass 67

- Player bank deposits/withdrawals now have shared formulas, validators, an authenticated idempotent API route, conditional database writes, transaction/event logging, and dashboard controls.
- Finance price-history retrieval now has an authenticated API route for chart consumers.
- Static validation drift around the runtime repair migration guide, legal recovery marker, executable proof scripts, and CI workflow has been corrected.

## Closed in Feature Pass 68

- Bank-history retrieval now exposes recent authenticated player bank transactions.
- The dashboard economy section now shows recent bank activity after deposits/withdrawals.
- Stocks and crypto rows now load finance price history and render first-pass sparkline chart summaries.

## Closed in Feature Pass 69

- First-pass money sinks now expose an authenticated catalog/purchase API and dashboard controls for optional cash/bank drains.

## Still pending after Feature Pass 69

- Run the full installed-environment runtime proof with Docker, pnpm, PostgreSQL, Redis, migrations, tests, smoke checks, backup, and restore.


## Closed in Feature Pass 70

- First-pass loans now expose authenticated offer/history retrieval, loan funding, bank repayment, financial transaction logging, player event logging, a character-loans ledger migration, and dashboard controls.

## Still pending after Feature Pass 70

- Run the full installed-environment runtime proof with Docker, pnpm, PostgreSQL, Redis, migrations, tests, smoke checks, backup, and restore.
- Add deeper loan balance tuning after runtime proof is complete.


## Closed in Feature Pass 72

- Loan repayment now supports optional partial bank payments, incremental ledger updates, conditional bank debits, and dashboard payment amount controls.

## Still pending after Feature Pass 72

- Run the full installed-environment runtime proof with Docker, pnpm, PostgreSQL, Redis, migrations, tests, smoke checks, backup, and restore.
- Add deeper loan balance tuning after runtime proof is complete.


## Closed in Feature Pass 73

- Admin loan exposure visibility now exists in the operations console, backed by a `manage_economy`-gated API for active, overdue, defaulted, and repaid loans.
- Economy managers can review unresolved outstanding balances, due dates, default windows, player bank/cash context, and searchable loan rows without direct database access.

## Closed in Feature Pass 73 dashboard performance hotfix

- Same-page section switching was optimized to avoid unnecessary app-router navigation and reduce hidden dashboard render work.
- Finance history fetches for dashboard sparklines are deferred until the Economy section is visible.

## Still pending after Feature Pass 73

- Run the full installed-environment runtime proof with Docker, pnpm, PostgreSQL, Redis, migrations, tests, smoke checks, backup, and restore.
- Add deeper loan balance tuning and long-range statement pagination after runtime proof is complete.

## Validation follow-up

After applying the Pass 73 validation hotfix, rerun `pnpm --filter @drugdeal/game test` and `pnpm prove:mvp-runtime` locally. The runtime proof should now create/use a disposable `*_mvp_proof` database unless `MVP_PROOF_USE_CURRENT_DATABASE=true` is set.


## Feature Pass 74 documentation consolidation

- Historical implementation notes now live in `docs/feature-history.md` instead of many individual `feature-pass-XX.md` files.
- Use current-state/planning docs for active work and search `docs/feature-history.md` only when historical context is needed.


## Closed in Feature Pass 75

- Bank statement retrieval now supports action/date filters, pagination controls, summary totals, and CSV export without adding new tables.
- Dashboard Economy now has a statement loader and CSV download for the latest 100 bank movements.

## Still pending after Feature Pass 75

- Run full installed-environment runtime proof.
- Add long-range statement pagination/search and deeper finance analytics after runtime proof passes.
## Feature Pass 75 stability hotfix

Fixed dashboard section-switching regressions reported during local runtime testing: finance-history empty-state updates now avoid maximum update-depth loops, async form handlers reset captured form references, and message unread counts no longer rely on raw duplicated timestamp casts.



## Closed in Feature Pass 76

- Shared market pressure snapshots now expose normalized supply, demand, volatility, pressure, multiplier, and price values.
- Deterministic market-event definitions and impact calculations now cover shortage, surplus, demand-spike, crackdown, and route-disruption scenarios.
- Formula tests cover event copies, missing-event handling, risk deltas, price floors/ceilings, and supply/demand/volatility adjustments.

## Still pending after Feature Pass 76

- Runtime proof remains the P0 gate before public MVP testing.
- Market events now have formula, deterministic scheduling, lifecycle, and newspaper payload helpers, but they are not yet persisted, surfaced through the API/UI, or published by a worker.


## Closed in Feature Pass 77

- Shared market-event helpers now create deterministic cadence-bucket occurrences per location/item/seed.
- Market-event lifecycle helpers classify upcoming, active, and expired windows.
- Market-event newspaper payload builders now prepare category, title, excerpt, body, and metadata for later publishing.

## Still pending after Feature Pass 77

- Runtime proof remains the P0 gate before public MVP testing.
- Market events now have first-pass database persistence, worker scheduling/publishing, market API surfacing, UI display, and newspaper article publishing. Runtime proof still needs to validate the migration and worker path before deeper tuning/admin controls.


## Closed in Feature Pass 78

- Market events now have a `market_events` migration/schema, scheduling and active-event query helpers, worker tick integration, `/api/market` active-event output, Market page alert cards, and automatic newspaper publishing for active unpublished events.

## Still pending after Feature Pass 78

- Run full installed-environment runtime proof to apply and verify the new migration, worker scheduling, API response shape, and newspaper publishing path.
- Tune event balance, decide whether active events directly alter buy/sell settlement prices, and add admin controls after proof.

## Closed in Feature Pass 80

- Fixed player-trade action-lock type coverage for dependency-backed `packages/db` builds.
- Added buyer accept cooldown enforcement for private trade offers.
- Added trade-center exposure summaries across shared formulas, DB retrieval, and the browser page.

## Still pending after Feature Pass 80

- Run full installed-environment runtime proof to apply and verify the player-trades migration, API routes, UI rendering, worker expiry, and rollback behavior.
- Add deeper trade analytics/history after runtime proof passes.


## Closed in Feature Pass 81

- Timed training/course starts now persist scheduled rows with due times and cooldown metadata.
- The worker completes due progression rows and grants stat/XP rewards at completion time.
- Course prerequisites now include required level and prerequisite-course checks, with dashboard visibility for locked courses.

## Still pending after Feature Pass 81

- Run full installed-environment runtime proof to apply and verify the progression timer migration, worker completion tick, API scheduling behavior, and dashboard queue rendering.

## Closed in Feature Pass 84

- Added an idempotent migration runner with `schema_migrations` tracking, checksum validation, dry-run support, and baseline support for older manually migrated databases.
- Replaced the runtime proof migration chain with `pnpm db:apply:all` so newly added SQL scripts are automatically picked up in filename order.
- Expanded faction browser operations with bank controls, member rank management, and territory action forms.
- Restored the GitHub Actions CI workflow expected by the CI workflow validator.

## Still pending after Feature Pass 84

- Run full installed-environment runtime proof to apply tracked migrations on a real database and verify the new faction management UI/API paths.
- For databases migrated before this runner existed, baseline only the scripts already applied before running normal migration application.
