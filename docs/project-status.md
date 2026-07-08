# Project Status

Feature Pass 59 added public launch polish and policy drafts. Feature Pass 60 added the accessibility, responsive design, PWA, and SEO baseline. Feature Pass 56 established the monetization foundation; later passes added playable actions, public launch polish, account recovery, retrieval docs, Docker Compose resilience, and player banking, first-pass money sinks, loans, partial loan repayments, loan admin visibility, market events, player-to-player trade offers, player-trade hardening, timed progression, inventory item actions, legal resolution/jail activities, faction armory, and scoped contract assignments.

For fast retrieval, start with `docs/README.md`, `docs/current-state.md`, `docs/next-task-brief.md`, and `docs/backlog-index.md`. This file keeps the expanded project state in one place.

## Snapshot

- Current pass: **Feature Pass 86 contract command center and scoped assignments**.
- Status: **static MVP candidate pending installed-environment runtime proof**.
- Primary blocker: execute `pnpm prove:mvp-runtime` and `pnpm prove:integration` in an environment with pnpm, PostgreSQL, Redis, and a disposable restore database.
- Development posture: runtime proof remains the highest priority; further broad gameplay should pause until proof failures are known and fixed.

## Completed broad feature areas

- Repository/platform foundation: monorepo, web app, worker app, shared packages, Docker Compose, seed script, environment validation, CI/static validation scripts.
- Auth/account: registration, login, sessions, character creation, password reset, email verification, account recovery tokens, and session invalidation after reset.
- Core gameplay: jobs, crimes, travel, market, banking/history/statements, money sinks, loans with partial repayment, training, education, cooldown/resource groundwork, event logging, and progression snapshots.
- Legal/recovery: heat, jail, hospital, legal services, bribes, care, fine/bail settlement, abstract court outcomes, jail-only activities, status refresh, worker release/recovery tick.
- Inventory/world systems: items with rarity/value/risk summaries, consumable use, direct same-location transfers, equipment, durability, repairs, vehicles, vehicle upgrades, crafting, workshops, contacts, and NPC crews.
- Multiplayer/social: factions, territories, PvP, bounties, public/private/faction contracts, shops, newspaper, direct messages, notifications, and SSE/browser alert foundations.
- Admin/safety: RBAC/capability gates, moderation reports, enforcement, appeals, search, balance tools, loan exposure visibility, flags, transparency, audit log, inventory/session audit visibility, and moderation archive visibility.
- Launch/readiness: public policy drafts, onboarding, beta plan, site-quality baseline, PWA/SEO/accessibility wiring, monetization placeholders, release runbook, backup/restore scripts, runtime proof orchestrator, and integration proof scaffold.
- Documentation retrieval: compact current-state, next-task, backlog, and documentation map files added in Feature Pass 64. TypeScript config compatibility was updated in Feature Pass 65 by removing deprecated `baseUrl` usage. Feature Pass 67 adds player bank transfers and finance price-history retrieval. Feature Pass 68 adds bank-history retrieval, recent bank activity on the dashboard, and finance sparkline charts. Feature Pass 69 adds authenticated money-sink catalog/purchase actions and dashboard controls. Feature Pass 70 adds first-pass loan offers, loan funding, bank repayment, a loan ledger migration, and dashboard loan controls. Feature Pass 71 adds overdue/default loan worker handling, unresolved-loan guardrails, and dashboard default visibility. Feature Pass 72 adds partial repayment amounts, incremental bank debits, and dashboard payment controls. Feature Pass 73 adds admin loan exposure visibility and a guarded economy-manager loan queue endpoint. Feature Pass 77 adds deterministic market-event scheduling/lifecycle helpers and newspaper payload generation. Feature Pass 78 adds first-pass market-event persistence, worker publishing, market API surfacing, and a market-page alert panel. The follow-up dashboard performance hotfix makes same-page section changes use lightweight hash navigation, defers Economy chart-history fetches until needed, batches finance-history state updates, and skips rendering hidden action cards. Feature Pass 75 adds filtered bank statements, statement summaries, and CSV export. Feature Pass 76 adds deterministic market pressure/event formula helpers for the first supply/demand event slice.

## Validation baseline

Static validators exist for migrations, hardening, route contracts, MVP pages, playable actions, MVP gameplay, admin RBAC, admin operations UI, job lifecycle, legal recovery, release readiness, integration-test wiring, MVP acceptance, runtime-proof wiring, monetization, public launch, site quality, in-progress closures, docs drift, and CI workflow.

## Remaining MVP risk

- Full dependency-backed `pnpm validate:static`, `pnpm typecheck`, and `pnpm test` still need a real install.
- Runtime smoke, strict health checks, database backup, and restore proof still need a running app and real databases.
- DB-backed integration tests need a disposable PostgreSQL database.
- Production observability is not complete: external log shipping, alerting, error reporting, retry/dead-letter policy, distributed rate limiting, abuse analytics, and load testing remain.

## Current next step

Run the proof path from `docs/next-task-brief.md`:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
pnpm prove:integration
```

Fix any failures found before adding more feature breadth.

## Closed in Feature Pass 72

- Loan repayment now supports partial bank payments as well as full payoff. The API accepts an optional repayment amount, applies source-specific conditional bank debits, updates the loan ledger incrementally, and records financial/player-event audit rows for partial and final payments.
- The dashboard loan card now has a repayment amount form, shows paid-vs-total progress, and no longer requires enough bank balance for full payoff before allowing a payment.

## Closed in Feature Pass 73

- Admin loan exposure visibility now shows active, overdue, defaulted, and repaid loan counts plus unresolved outstanding balances in the operations console.
- A guarded `manage_economy` admin endpoint exposes searchable/paginated loan exposure rows for economy review.

## Closed in Feature Pass 73 dashboard performance hotfix

- Dashboard/profile same-page section links now avoid app-router work for hash-only navigation.
- Economy finance sparkline histories are loaded only when the Economy section is opened and are applied in one batched state update.
- Hidden action cards no longer render their item lists while another dashboard section is active.

## Still pending after Feature Pass 73

- Run the full installed-environment runtime proof with Docker, pnpm, PostgreSQL, Redis, migrations, tests, smoke checks, backup, and restore.
- Add deeper loan balance tuning after runtime proof is complete.
- Dependency-backed `pnpm typecheck`, `pnpm test`, and PostgreSQL/Redis runtime proof still require an installed environment.

## Pass 73 validation hotfix

Resolved the reported package-game test drift and made `pnpm prove:mvp-runtime` repeatable by preparing a clean proof database instead of reusing the already-migrated local development database.


## Documentation consolidation

Feature Pass 74 consolidates the historical `feature-pass-XX.md` audit trail into `docs/feature-history.md` and removes the separate `docs/feature-index.md`, reducing the docs folder file count while keeping current planning docs separate from historical notes.


## Closed in Feature Pass 75

- Bank history retrieval now supports action/date/limit/offset filters, JSON statement summaries, and CSV export.
- The dashboard Economy section can load filtered statement rows, show inflow/outflow/net totals, and download the latest CSV statement.
## Feature Pass 75 stability hotfix

Fixed dashboard section-switching regressions reported during local runtime testing: finance-history empty-state updates now avoid maximum update-depth loops, async form handlers reset captured form references, and message unread counts no longer rely on raw duplicated timestamp casts.



## Closed in Feature Pass 76

- Shared game economy helpers now expose market pressure snapshots and deterministic event impact calculations for shortage, surplus, demand spike, crackdown, and route disruption scenarios.
- Formula coverage now verifies event catalog immutability for callers, missing-event safety, price floors/ceilings, risk deltas, and adjusted supply/demand/volatility output.

## Still pending after Feature Pass 76

- Market events still need database persistence, worker publishing, API/UI surfacing, and balancing after runtime proof.
- Full dependency-backed typecheck/tests and runtime proof still require the installed local environment.


## Closed in Feature Pass 77

- Market-event helpers now select deterministic occurrences by cadence bucket, location, item, and seed.
- Lifecycle output now reports upcoming/active/expired status plus start/expiry countdown seconds.
- Market-event newspaper payloads now produce category, title, excerpt, body, and metadata ready for later DB publishing.

## Still pending after Feature Pass 77

- Full dependency-backed typecheck/tests and runtime proof still require the installed local environment.
- Market-event persistence, worker scheduling, route surfacing, dashboard/market UI display, and newspaper publishing remain follow-up work.

## Closed in Feature Pass 80

- Player-trade action-lock keys now compile under the shared `GameActionType` union used by `assertActionUnlocked` and `setActionCooldown`.
- Accepting private trade offers now enforces buyer accept cooldowns before any money/inventory movement.
- Shared player-trade exposure summaries now feed the trade-center query and `/trades` page.


## Closed in Feature Pass 81

- Training and education starts now create scheduled progression rows with due times, action cooldown metadata, and upfront cash/energy deductions.
- Worker progression ticks complete due training/course rows and apply stat, XP, level, and max-nerve rewards.
- Course definitions now support required level and prerequisite course keys, with dashboard requirement messaging and disabled locked-course actions.

## Closed in Feature Pass 82

- Added shared inventory helpers for item rarity normalization, rarity value multipliers, consumable effects, and inventory exposure scoring.
- Added `0039_inventory_item_actions.sql` plus `db:apply:inventory-actions` to backfill item rarity and first-aid consumable metadata.
- Added DB queries and `/api/inventory` for authenticated inventory profile retrieval, idempotent consumable use, cooldown-protected item use, and direct same-location item transfers.
- Added the `/inventory` game page and sidebar link with stack summaries, consumable controls, and transfer forms.

Runtime migration/API/UI proof still requires the installed local workspace.


## Closed in Feature Pass 83

- Added shared legal formulas for fine settlement, bail settlement, abstract court outcomes, and jail-only activities.
- Added `/api/legal/jail` and `/api/legal/court` for authenticated, idempotent jail settlement, court, and jail-activity actions.
- Added DB helpers to release active jail sentences, debit cash/bank, update legal state, write service logs, financial transactions, and player events.
- Expanded the Legal page with estimated fine/bail costs, court controls, and jail-only activity controls.

Runtime route/database proof still requires the installed local workspace.

## Closed in Feature Pass 84

- Added `pnpm db:apply:all` and `packages/db/scripts/apply-migrations.ts` for tracked, idempotent SQL migration application.
- Updated runtime proof to use the all-migration runner instead of a hard-coded migration command list.
- Expanded the Factions page with bank operations, member rank management, permission boundaries, and territory action controls.
- Restored `.github/workflows/ci.yml` so `pnpm validate:ci-workflow` has a concrete GitHub Actions workflow to audit.

Runtime route/database proof still requires the installed local workspace.


## Closed in Feature Pass 85

- Added faction armory storage with `0040_faction_armory.sql`, schema mapping, and `db:apply:faction-armory` scripts while keeping `pnpm db:apply:all` as the preferred migration path.
- Added shared faction armory permission/action helpers plus authenticated DB/API handling for member deposits and lieutenant+ withdrawals.
- Extended the Factions page with stocked armory summaries, rarity/value/risk exposure, member withdrawal controls, and personal inventory deposit controls.

## Still pending after Feature Pass 85

- Run full installed-environment runtime proof to verify the new migration, Factions page armory forms, idempotency handling, and inventory row movement against PostgreSQL.


## Closed in Feature Pass 86

- Fixed nullable faction id usage on the Factions page by using the derived `ownFactionId` for bank, leave, and armory form endpoints.
- Added shared contract scope helpers and acceptance guards for public contracts, private assignments, and faction-only tasks.
- Expanded contract queries/creation so private assignments and faction contracts are permission-scoped while public high-value contracts keep newspaper promotion.
- Added `/contracts` as a dedicated player page with public posting, private assignment, faction task posting, acceptance, completion, and cancellation controls.
- Added `/contracts` to the sidebar and static page/action validators.

## Still pending after Feature Pass 86

- Run full installed-environment runtime proof to verify contract page forms, scoped visibility, escrow debits/refunds, acceptance/completion cooldowns, and faction/private visibility against PostgreSQL.
