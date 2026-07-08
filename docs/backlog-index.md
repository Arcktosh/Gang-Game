# Backlog Retrieval Index

This is a compact map of remaining not-started or thin areas. Use it to pick a focused slice without reading the full checklist.

## P0 - Proof and operations before public testing

- Execute `pnpm prove:mvp-runtime` in a fully installed environment.
- Execute `pnpm prove:integration` against a disposable PostgreSQL database.
- Fix runtime migration/typecheck/test/smoke/backup/restore failures.
- Add external logging, error reporting, alerting, retry/dead-letter policy, and distributed rate limiting.
- Add runtime tests for idempotency replay/conflict and transaction rollback cases.

## P1 - Technical hardening

- Redis/Postgres-backed rate limiting.
- Broader pagination on remaining list endpoints.
- Optimistic locking where concurrent writes can conflict.
- Background job retry policy and dead-letter queue.
- Abuse prevention and bot detection.
- Load testing for high-volume endpoints and SSE streams.

## P1 - Core gameplay depth

- Generic action definition model.
- Consistent failure-handling model.
- Tuned action requirements, costs, rewards, success chances, and cooldowns.
- Training cooldown tuning, course prerequisites, and course completion timers/worker are first-pass complete; runtime proof and deeper balance tuning remain.
- Crime categories, investigation score, and crime skill progression. Court outcomes, bail/fine flow, and jail-only actions are first-pass complete and need runtime proof/tuning.
- Injury model with temporary stat penalties.

## P1/P2 - Economy and items

- Validate market-event persistence/worker publishing in runtime proof, then tune event balance and add inflation controls.
- Passive income controls, player-to-player trade offer runtime proof, deeper trade analytics/history, deeper finance analytics, and loan balance tuning. First-pass loans, partial repayment, overdue/default handling, admin exposure review, and richer banking statements/exports are now present.
- Advanced item mod slots, rare affixes, faction armory crafting, and deeper post-proof item balance tuning. First-pass rarity, consumable use, direct item transfers, and faction armory deposits/withdrawals are complete.
- Vehicle impound/damage and deeper cargo/delivery gameplay.

## P2 - Factions, social, and retention

- Faction shop permissions, territory map UI, taxes/upgrades, diplomacy, formal war UI, contribution leaderboards, and deeper armory balance. Faction ranks/permissions, first-pass inventory/armory, and faction-scoped contract tasks are complete.
- Group chats, faction-wide notifications, email/push adapters, per-device browser notification preferences, message retention policy.
- Public profile route, skill trees, reputation tracks, season leaderboards/rewards/events, daily login streaks, tutorial, guide/wiki, referral and mentor systems.

## P2 - Admin and moderation depth

- Message hide/delete workflow for actioned reports.
- Rollback tooling.
- Automated anomaly detection.
- Deeper historical moderation, economy, inventory, and session/IP audit pages beyond the MVP console surfaces.
- Feature flags and full game-balance config editor wired into formulas/ticks.

## P3 - Commercial launch

- Replace policy drafts with jurisdiction-reviewed legal documents.
- Add payment provider adapter only after support, refund, tax, privacy, and entitlement workflows are approved.
- Run Lighthouse, keyboard-only, screen-reader, and mobile-device checks against a deployed build.


## Feature Pass 74 documentation consolidation

- Historical implementation notes now live in `docs/feature-history.md` instead of many individual `feature-pass-XX.md` files.
- Use current-state/planning docs for active work and search `docs/feature-history.md` only when historical context is needed.


## Feature Pass 75 banking statements

- Richer bank statements/exports are now first-pass complete: filtered history, summary totals, and CSV export. Long-range paging/search can be expanded after runtime proof.


## Feature Pass 76 market event formula foundation

- Market event generation is no longer starting from zero: shared game helpers now model supply/demand/volatility/risk impact, deterministic cadence scheduling, lifecycle status, and newspaper payloads. Remaining work is persistence, worker publishing, UI/API surfacing, and balance tuning.


## Feature Pass 77 market event scheduling/news helpers

- Shared scheduling and article-payload helpers are now present. Next economy pass should persist active occurrences, expose active events through market routes, and publish the generated newspaper payloads from the worker.


## Feature Pass 78 market event persistence/API/UI worker wiring

- First-pass market-event persistence, worker publishing, market API surfacing, and Market page alerts are now present. Next market-event pass should validate the migration/worker path locally, then tune impact application and add admin controls.


## Feature Pass 81 timed progression and course prerequisites

- Timed training/education now has scheduled rows, course requirements, worker completion, and dashboard queue visibility. The next progression pass should validate the worker path locally and tune balance values after runtime proof.

## Feature Pass 82 inventory item actions

- Inventory is no longer only passive storage: item rarity, stack value/risk summaries, consumable item use, and direct same-location transfer actions are wired through shared formulas, DB queries, API route, and `/inventory` UI. Runtime proof is still required for the migration/API path.


## Feature Pass 83 legal resolution and jail activities

First-pass jail fine settlement, bail settlement, court hearings, and jail-only activities are wired through shared formulas, DB helpers, API routes, and the Legal page. Runtime proof remains required before public MVP testing.


## Feature Pass 85 faction armory

Faction inventory/armory is now wired through schema migration `0040_faction_armory.sql`, shared permission/action helpers, `/api/factions/:factionId/inventory`, member contribution/ledger/event logging, and Factions page controls. Runtime proof remains required for migration execution and inventory-row movement.
