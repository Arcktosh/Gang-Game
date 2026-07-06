# Database Migration Guide

Use this as the canonical local setup order for the current repo state.

## Fresh local database

```bash
pnpm install
cp .env.example .env
docker compose up -d

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

## Notes

- The migration scripts currently apply raw SQL files directly. They are convenient for local development, but a production deployment should use a single managed migration flow.
- The current SQL files are incremental. Apply them in order on a fresh database.
- Some older README snippets were shorter than the current migration chain. This guide supersedes those snippets.


## Feature Pass 56 root script alignment

Feature Pass 56 confirms the root workspace exposes `pnpm db:apply:admin-roles` and `pnpm db:apply:job-lifecycle`, matching the documented migration flow.


## Feature Pass 56 runtime proof

The full migration and seed chain above is now encoded in `scripts/prove-mvp-runtime.mjs` and can be executed with `pnpm prove:mvp-runtime` in a fully installed environment.


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
