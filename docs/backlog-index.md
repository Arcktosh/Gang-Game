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
- Training cooldown tuning, course prerequisites, and course completion timers/worker.
- Crime categories, investigation score, crime skill progression, court outcomes, bail/fine flow, and jail-only actions.
- Injury model with temporary stat penalties.

## P1/P2 - Economy and items

- Supply/demand model, market event generation, market-news impact model, and inflation controls.
- Passive income controls, player-to-player trade, deeper finance analytics, and loan balance tuning. First-pass loans, partial repayment, overdue/default handling, admin exposure review, and richer banking statements/exports are now present.
- Item rarity, consumable effects, item transfer, advanced mod slots, rare affixes, faction armory crafting.
- Vehicle impound/damage and deeper cargo/delivery gameplay.

## P2 - Factions, social, and retention

- Faction ranks/permissions, inventory, contracts, shop permissions, territory map UI, taxes/upgrades, diplomacy, formal war UI.
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
