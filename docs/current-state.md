# Current State Brief

Last updated: Feature Pass 86 contract command center.

## Project posture

The project is a **static MVP candidate pending installed-environment runtime proof**. Feature breadth is high enough for controlled MVP evaluation, and the current risk is whether the app, database migrations, worker, tests, runtime smoke checks, backup, and restore all pass together in a real environment.

## Completed MVP-level areas

- Monorepo with Next.js web app, worker app, shared database/game/validator/UI packages.
- Docker Compose uses configurable PostgreSQL/Redis image variables, AWS Public ECR mirror defaults, service health checks, and persistent Redis storage for local runtime proof.
- Auth/session foundation plus password reset and email verification with hashed one-time tokens.
- Character creation, profile UI, title controls, event summaries, and privacy guidance.
- Core actions for jobs, crimes, travel, market, banking/statements, timed training, prerequisite-gated education, legal recovery, hospital care, bail/fine settlement, court hearings, and jail-only activities.
- Job application, work, rank/promotion, resignation, and visible progression loop.
- Jail/hospital/legal consequences, fine/bail settlement, abstract court outcomes, jail activities, and automatic recovery/status refresh.
- Inventory with rarity/value/risk summaries, consumable use, direct same-location transfers, equipment, durability, repairs, vehicle profile/upgrades, crafting queues, contacts, and NPC assignments.
- Factions, faction armory inventory, territories, PvP, bounties, public/private/faction contracts, and first-pass faction chat groundwork.
- Player shops with creation, listings, purchases, cancellation, ads, reviews, ledger/sales history, and owner controls.
- Newspaper with submissions, categories/archive, comments, reactions, reports, and moderation handoff.
- Economy additions include player cash-to-bank deposits/withdrawals, authenticated bank transaction history, dashboard bank activity, filtered bank statements with summaries/CSV export, authenticated money-sink catalog/purchase actions, loan offers/funding/partial repayment/full payoff plus overdue/default worker handling and admin loan exposure review, authenticated finance price-history retrieval, deterministic market pressure/event formula helpers, market-event scheduling/news payload helpers, first-pass persisted market-event worker/API/UI wiring, reserved-inventory player trade offers with accept/cancel/expiry handling, trade exposure summaries, accept cooldown enforcement, direct inventory transfer/use actions, timed progression worker completion for training/course rewards, client-side finance sparkline charts with deferred Economy-section history loading, and legal settlement/court/jail-activity actions.
- Direct messages with conversations, live status, read/mute/leave/block/report controls, and report history.
- Notifications, activity feed, preferences, browser alert wiring, and SSE streams.
- Admin console with RBAC/capability gates, search, moderation, enforcement, appeals, balance tools, loan exposure visibility, flags, transparency, inventory audit, session audit, and moderation archive visibility.
- Public beta pages, policy drafts, community rules, onboarding, site-quality baseline, PWA/SEO/accessibility wiring, and monetization placeholders.

## Validation already represented statically

- Migration ordering/script coverage.
- API hardening and observability coverage.
- Representative route contracts.
- MVP page and playable-action coverage.
- Progression, admin RBAC, job lifecycle, legal recovery, release-readiness, integration-test wiring, MVP acceptance, runtime-proof wiring, monetization, public-launch, site-quality, in-progress closure, documentation, and CI workflow audits.

## Main blockers

1. Run `docker compose up -d` and confirm PostgreSQL/Redis are healthy with `docker compose ps`; override `POSTGRES_IMAGE`/`REDIS_IMAGE` only if the local network requires a different registry.
2. Run `pnpm prove:mvp-runtime` in a real installed environment with pnpm, PostgreSQL, Redis, and a disposable restore database.
3. Run `pnpm prove:integration` against a disposable PostgreSQL database.
4. Fix any install, migration, typecheck, test, smoke, backup, or restore failures found by those proofs.
5. Run dependency-backed typecheck/tests after install to confirm the Feature Pass 67-83 banking, bank-history, money-sink, loan/defaulting/partial-repayment/admin-exposure, dashboard performance hotfix, market-event, player-trade, inventory-action, legal-resolution, and finance chart code paths compile under the full workspace dependency graph.
6. Add external production observability: log shipping, alerting, error reporting, retry/dead-letter policy, distributed rate limiting, and abuse analytics.

## Do not prioritize yet

Do not add more broad gameplay systems until runtime proof passes. New work should be limited to fixing proof failures, reducing operational risk, or compact low-risk UX/economy gaps.

## Pass 73 validation hotfix

The package-game legacy-points test expectation was aligned with the current formula output. The MVP runtime proof now uses an isolated disposable `*_mvp_proof` database by default, preventing repeated proof runs from failing on existing enum/table objects in the local development database.


## Documentation consolidation

Feature Pass 74 consolidates the historical `feature-pass-XX.md` audit trail into `docs/feature-history.md` and removes the separate `docs/feature-index.md`, reducing the docs folder file count while keeping current planning docs separate from historical notes.


## Feature Pass 75 banking statements

Bank history now supports filtered JSON statements and CSV export. The dashboard Economy section can load filtered statement rows, view inflow/outflow/net summaries, and download the latest statement CSV.
## Feature Pass 75 stability hotfix

Fixed dashboard section-switching regressions reported during local runtime testing: finance-history empty-state updates now avoid maximum update-depth loops, async form handlers reset captured form references, and message unread counts no longer rely on raw duplicated timestamp casts.



## Feature Pass 76 market event formula foundation

The shared game package now exposes deterministic market pressure snapshots, copied market-event definitions, a market-event impact calculator, cadence-bucket scheduling helpers, lifecycle status helpers, and newspaper payload helpers. This closes the pure shared-logic slice of supply/demand market events without introducing database writes or runtime worker breadth before installed-environment proof.


## Feature Pass 77 market event scheduling/news helpers

Market events can now be selected deterministically per location/item/seed/cadence bucket, classified as upcoming/active/expired, and converted into market-category newspaper article payloads.

## Feature Pass 78 market event persistence/API/UI worker wiring

Market events can now be persisted as scheduled occurrences, published to newspaper articles by the worker, exposed through `/api/market`, and shown as live alerts on the Market page. Runtime proof remains required to validate the migration and worker path locally.

## Feature Pass 80 player-trade build fix and exposure summary

Player-trade cooldown keys are now covered by the shared DB action-lock type union, and accepting offers checks the buyer's cooldown before moving cash or inventory. Trade-center output now includes shared exposure summaries, and the Trades page shows open sent/received counts, reserved value, pending buyer cost, completed volume, and fees.

## Feature Pass 81 timed progression and course prerequisites

Training and education now use scheduled completion rows instead of applying stat rewards immediately. Starting a training session or course deducts cash/energy, records a due time, applies the action cooldown, and the worker completes due sessions/courses by granting stat/XP rewards. Courses now support required level and prerequisite-course metadata, and the dashboard shows locked course requirements plus the active progression queue.

## Feature Pass 82 inventory item actions

Inventory now has a dedicated `/inventory` page and `/api/inventory` route. Players can review rarity, estimated stack value, risk exposure, consumables, nearby same-location transfer candidates, use consumable items through idempotent actions, and directly transfer available item stacks. The migration adds the `item_rarity` enum, item rarity backfill, and first-aid consumable metadata.


## Feature Pass 83 legal resolution and jail activities

Legal gameplay now includes fine settlement, bail settlement, abstract court-hearing outcomes, and jail-only activities. The Legal page exposes these actions with estimated costs/cooldowns, and the new API routes log financial/legal/player-event outcomes without adding a new migration. Runtime proof remains required for the route/database behavior.

## Feature Pass 84 faction operations and migration runner

The Factions page now exposes faction bank deposit/withdraw controls, boss-only member rank updates, member permission summaries, and territory operation forms for scout/claim/reinforce/attack with shared cooldown feedback. The database package now includes an idempotent all-migration runner (`pnpm db:apply:all`) that records applied SQL files in `schema_migrations`, validates checksums, supports dry-run mode, can baseline databases that were migrated before tracking existed, and restores the CI workflow required by the static validation gate.

## Feature Pass 85 faction armory

Faction inventory is now represented by `faction_inventory_items` with an idempotent migration and root/package apply scripts. Active members can deposit personal item stacks into the armory for contribution credit, lieutenants and above can withdraw stock, all actions share a faction-inventory cooldown, and the Factions page displays stocked items with rarity/value/risk summaries plus personal-stack deposit controls.
