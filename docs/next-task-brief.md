# Next Task Brief

## Recommended next pass

**Runtime Validation Execution - Installed Dependency and Database Proof**

This is the highest-value next pass because the repo has feature breadth and static gates, but runtime behavior has not been proven in this environment.

## Required environment

- pnpm available.
- Docker available for local PostgreSQL/Redis via `docker compose up -d`, or externally managed PostgreSQL/Redis.
- PostgreSQL available for the main app database.
- PostgreSQL disposable restore database available for backup/restore proof.
- Redis available for worker/runtime smoke paths.
- If Docker Hub image pulls fail, use the default `.env.example` image values: `public.ecr.aws/docker/library/postgres:16-alpine` and `public.ecr.aws/docker/library/redis:7-alpine`, or override them with a reachable internal registry.
- Environment variables configured from `.env.example` and the runtime-proof docs.

## Command sequence

Start local services first:

```bash
docker compose up -d
docker compose ps
```

Preview first:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
```

Then run the proof:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

Run integration proof separately:

```bash
pnpm prove:integration
```

## Expected output of the pass

- A short result note with pass/fail for install, migrations, static validation, typecheck, tests, runtime smoke, backup, restore, and integration proof.
- Fixes for any failures found.
- Updated `docs/current-state.md`, `docs/validation-audit.md`, `docs/remaining-work.md`, and a new section in `docs/feature-history.md`.

## Scope guardrails

- Do not start new gameplay breadth during this pass.
- Do not refactor feature code unless required by proof failures.
- Keep crime/legal gameplay fictional and abstract.
- Prefer small, targeted fixes over broad rewrites.
- If the installed proof has already passed outside this repo snapshot, choose compact checklist slices first; good follow-ups after Feature Pass 73 are player-to-player trade, supply/demand events, richer banking statements, deeper loan balance tuning, or deeper finance analytics.

## Fallback if runtime proof cannot be run

If the environment still lacks pnpm/PostgreSQL/Redis, run the dependency-light checks that are available:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
```

Then proceed only with documentation/status cleanup or static-proof fixes.


## Feature Pass 74 documentation consolidation

- Historical implementation notes now live in `docs/feature-history.md` instead of many individual `feature-pass-XX.md` files.
- Use current-state/planning docs for active work and search `docs/feature-history.md` only when historical context is needed.


## Feature Pass 75 banking statements

- Bank statement filters, summaries, and CSV export are now in place. The next best compact economy follow-ups remain player-to-player trade, supply/demand events, finance analytics, or loan balance tuning, but runtime proof remains the recommended P0 pass.


## Feature Pass 76 market event formula foundation

This pass followed the fallback path because dependency/runtime proof was intentionally not run in the sandbox. The next best production-readiness step remains installed-environment proof. If proof remains blocked, the safest compact follow-ups are market-event persistence/API surfacing using the new scheduling/news helpers, deeper finance analytics, loan balance tuning, or player-to-player trade.


## Feature Pass 77 market event scheduling/news helpers

The fallback static path now has deterministic market-event occurrence selection, lifecycle classification, newspaper payload generation, first-pass database persistence, worker publishing, market API surfacing, and Market page alerts. The next market-event pass should validate the migration/worker path locally, then tune settlement-price effects and admin controls rather than extending formulas again.


## Feature Pass 78 market event persistence/API/UI worker wiring

The fallback path now includes first-pass `market_events` persistence, scheduling/publishing query helpers, worker tick integration, active event output from `/api/market`, and a Market page alert panel.

## Feature Pass 79 player-to-player trade offers

The fallback path now includes `player_trade_offers` persistence, reserved-inventory offer creation, same-location recipient selection, accept/cancel/expiry flows, financial transaction logging, player events, API routes, worker expiry, a `/trades` browser page, action-lock type coverage, accept cooldown enforcement, and player-trade exposure summaries. The next best step remains installed runtime proof so the new migration, worker expiry path, API routes, and UI are verified against a real database.


## Feature Pass 81 timed progression and course prerequisites

The fallback static path now includes timed training/course scheduling, course required-level/prerequisite metadata, dashboard queue visibility, and a worker completion tick. The next best step remains installed runtime proof so the new migration, worker tick, API scheduling behavior, and UI queue can be verified against a real database.

## Feature Pass 82 inventory item actions

The fallback static path now includes item rarity, inventory exposure summaries, consumable item-use effects, a protected `/api/inventory` action route, and a dedicated `/inventory` page for stack review and direct same-location transfers. The next best step remains installed runtime proof so migration 0039, idempotent item-use/transfer actions, and the Inventory page can be verified against a real database.


## Feature Pass 83 legal resolution and jail activities

The fallback static path now includes fine settlement, bail settlement, abstract court hearings, and jail-only activities with API/UI/DB wiring. The next best step remains installed runtime proof so `/api/legal/jail`, `/api/legal/court`, sentence release updates, cooldowns, and legal logs can be verified against a real database.

## Feature Pass 84 faction operations and migration runner

The fallback static path now includes an idempotent all-migration runner (`pnpm db:apply:all`) and a larger faction operations UI pass. The next best step remains installed runtime proof to verify schema migration tracking, baseline behavior for existing databases, faction bank writes, member role updates, territory action cooldowns, and the updated runtime-proof migration flow.

## Feature Pass 85 faction armory

The fallback static path now includes faction armory storage, deposit/withdraw API wiring, role-gated withdrawals, contribution/ledger/event logging, and Factions page controls. The next best proof step is still installed runtime validation, especially `pnpm db:apply:all`, `/api/factions/:factionId/inventory`, and cross-table inventory movement.

## Feature Pass 86 contract command center

The fallback static path now includes a dedicated `/contracts` page, public/private/faction contract scopes, private assignment validation, faction-task role gates, and the Factions page nullable endpoint fix. The next best step remains installed runtime proof so contract visibility, escrow movement, cooldowns, and database query scopes are verified against PostgreSQL.
