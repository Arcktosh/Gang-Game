# Database Migration Guide

Use this as the canonical local setup order for the current repo state.

## Fresh local database

```bash
pnpm install
cp .env.example .env
docker compose up -d

pnpm db:apply:all
```

`pnpm db:apply:all` runs every SQL file under `packages/db/drizzle` in filename order, records successful files in `schema_migrations`, and skips files already recorded on later runs. This is the preferred migration command for local proof, staging, and production-like deployments.

## Existing databases created with the older one-script-at-a-time flow

The new runner tracks migrations by filename and checksum. For a database that was already migrated before `schema_migrations` existed, first baseline the migrations that are already present, then run the normal apply command for newer files. Example for a database known to be current through `0039_inventory_item_actions.sql`:

```bash
DB_MIGRATIONS_BASELINE_THROUGH=0039 pnpm --filter @drugdeal/db db:apply:all
pnpm db:apply:all
```

Do not baseline beyond the last migration you have actually applied. If a checksum mismatch is reported, inspect the SQL drift manually before setting `DB_MIGRATIONS_ALLOW_CHECKSUM_MISMATCH=true`.

## Legacy single-file application order

The individual scripts remain available for targeted repair, but the idempotent all-migration runner should be used for normal setup. The historical manual order was:

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
pnpm db:apply:market-events
pnpm db:apply:player-trades
pnpm db:apply:progression-timers
pnpm db:apply:inventory-actions

```

## Migration map

| Script | SQL file | Purpose |
| --- | --- | --- |
| `db:apply:initial` | `0000_initial_schema.sql` | Base schema |
| `db:seed` | `0001_seed_starter_content.sql` | Starter content and dev data |
| `db:apply:auth` | `0002_auth_sessions.sql` | Auth/session tables |
| `db:apply:progression` | `0003_progression_content.sql` | Training/education/progression content |
| `db:apply:gameplay` | `0004_action_locks_market.sql` | Action locks, resources, market trading |
| `db:apply:risk` | `0005_jail_hospital.sql` | Jail/hospital status records |
| `db:apply:legal` | `0006_police_legal.sql` | Legal services, heat decay, audit groundwork |
| `db:apply:factions` | `0007_factions_territories.sql` | Factions, faction bank, territories |
| `db:apply:shops` | `0008_shops_newspaper.sql` | Player shops and newspaper base |
| `db:apply:finance` | `0009_finance_markets.sql` | Fictional finance markets |
| `db:apply:gambling` | `0010_gambling.sql` | Gambling systems |
| `db:apply:contracts` | `0011_contracts.sql` | Contracts and escrow |
| `db:apply:achievements` | `0012_achievements_objectives.sql` | Achievements, objectives, titles |
| `db:apply:seasons` | `0013_seasons_prestige.sql` | Seasons and prestige/legacy |
| `db:apply:admin` | `0014_admin_ops_balance.sql` | Admin operations and config |
| `db:apply:pvp` | `0015_pvp_bounties_wars.sql` | PvP, bounties, faction wars |
| `db:apply:equipment` | `0016_equipment_gear.sql` | Equipment and gear durability |
| `db:apply:vehicles` | `0017_vehicles_travel.sql` | Vehicles and travel modifiers |
| `db:apply:crafting` | `0018_crafting_workshops.sql` | Crafting and workshops |
| `db:apply:contacts` | `0019_contacts_crews.sql` | Contacts and NPC crews |
| `db:apply:notifications` | `0020_notifications_feed.sql` | Notifications and activity feed |
| `db:apply:messages` | `0021_messages_social.sql` | Message threads, reports, blocking |
| `db:apply:newspaper-social` | `0022_newspaper_social.sql` | Article comments, reactions, reports |
| `db:apply:shop-ops` | `0023_shop_operations.sql` | Shop ads, reviews, operational controls |
| `db:apply:moderation` | `0024_moderation_queue.sql` | Admin moderation queue |
| `db:apply:enforcement` | `0025_enforcement_appeals.sql` | Enforcement and appeals |
| `db:apply:enforcement-ops` | `0026_enforcement_operations.sql` | Enforcement expiry and transparency ops |
| `db:apply:idempotency` | `0027_idempotency_keys.sql` | API idempotency key storage for safe client retries |
| `db:apply:hardening` | `0028_hardening_completion.sql` | Database invariant checks and operational indexes |
| `db:apply:admin-roles` | `0029_admin_roles.sql` | Admin role enum, user role column, and legacy admin backfill |
| `db:apply:job-lifecycle` | `0030_job_lifecycle.sql` | Character employment state, active job uniqueness, ranks, shifts, and earnings |
| `db:apply:monetization` | `0031_monetization_foundation.sql` | Product catalog, user entitlements, character cosmetics, and seeded fair-monetization products |
| `db:apply:auth-recovery` | `0032_auth_account_recovery.sql` | Email verification timestamp, password reset tokens, and email verification tokens |
| `db:apply:runtime-repair` | `0033_runtime_schema_repair.sql` | Runtime schema compatibility repairs for installed MVP proof |
| `db:apply:loans` | `0034_character_loans.sql` | Character loan ledger, status indexes, and one-active-loan guard |
| `db:apply:loan-defaulting` | `0035_loan_defaulting.sql` | Loan default worker indexes and one-unresolved-loan guard |
| `db:apply:market-events` | `0036_market_events.sql` | Market event scheduling, publishing, and active-event lookup |
| `db:apply:player-trades` | `0037_player_trade_offers.sql` | Reserved-inventory player-to-player trade offers |
| `db:apply:progression-timers` | `0038_progression_timers.sql` | Timed training/course completions and course prerequisites |
| `db:apply:inventory-actions` | `0039_inventory_item_actions.sql` | Item rarity enum, rarity backfill, and consumable metadata |
| `db:apply:faction-armory` | `0040_faction_armory.sql` | Faction armory storage and stock indexes |

## Notes

- `pnpm db:apply:all` is the managed migration flow for this repository and records applied files in `schema_migrations`.
- The current SQL files are incremental and are applied in filename order by the all-migration runner.
- Some older README snippets were shorter than the current migration chain. This guide supersedes those snippets.


## Feature Pass 56 root script alignment

Feature Pass 56 confirms the root workspace exposes `pnpm db:apply:admin-roles` and `pnpm db:apply:job-lifecycle`, matching the documented migration flow.


## Feature Pass 56 runtime proof

The runtime proof now uses the idempotent `pnpm db:apply:all` migration runner and can be executed with `pnpm prove:mvp-runtime` in a fully installed environment.


## Feature Pass 55 integration proof

Feature Pass 55 adds `pnpm prove:integration` and `docs/integration-testing.md` for opt-in database-backed MVP flow testing against a disposable `TEST_DATABASE_URL`.

## Feature Pass 56 monetization foundation

Feature Pass 56 adds `0031_monetization_foundation.sql` and `pnpm db:apply:monetization`. Apply it after `pnpm db:apply:job-lifecycle`.


## Feature Pass 63 account recovery

Feature Pass 63 adds `0032_auth_account_recovery.sql` and `pnpm db:apply:auth-recovery`. Apply it after `pnpm db:apply:monetization`.

## Feature Pass 66 runtime schema repair

Feature Pass 66 adds `0033_runtime_schema_repair.sql` and `pnpm db:apply:runtime-repair`. Apply it after `pnpm db:apply:auth-recovery`.


## Feature Pass 70 character loans

Feature Pass 70 adds `0034_character_loans.sql` and `pnpm db:apply:loans`. Apply it after `pnpm db:apply:runtime-repair`.


## Feature Pass 71 loan defaulting

Feature Pass 71 adds `0035_loan_defaulting.sql` and `pnpm db:apply:loan-defaulting`. Apply it after `pnpm db:apply:loans`.


## Feature Pass 78 market events

Feature Pass 78 adds `0036_market_events.sql` and `pnpm db:apply:market-events`. Apply it after `pnpm db:apply:loan-defaulting`.

## Feature Pass 79 player trades

Feature Pass 79 adds `0037_player_trade_offers.sql` and `pnpm db:apply:player-trades`. Apply it after `pnpm db:apply:market-events`.


## Feature Pass 81 progression timers

Feature Pass 81 adds `0038_progression_timers.sql` and `pnpm db:apply:progression-timers`. Apply it after `pnpm db:apply:player-trades`.

## Feature Pass 82 inventory item actions

Feature Pass 82 adds `0039_inventory_item_actions.sql` and `pnpm db:apply:inventory-actions`. Apply it after `pnpm db:apply:progression-timers`.


## Feature Pass 84 idempotent migration runner

Feature Pass 84 adds `packages/db/scripts/apply-migrations.ts`, `pnpm db:apply:all`, checksum validation, `schema_migrations` tracking, and `DB_MIGRATIONS_BASELINE_THROUGH` support for databases that were previously migrated with the legacy one-script-at-a-time flow.

## Feature Pass 85 faction armory

Feature Pass 85 adds `0040_faction_armory.sql` and `pnpm db:apply:faction-armory`. Apply it after `pnpm db:apply:inventory-actions`, or prefer `pnpm db:apply:all` so the migration runner applies only migrations not yet recorded in `schema_migrations`.
