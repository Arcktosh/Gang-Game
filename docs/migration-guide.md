# Database Migration Guide

Use this as the canonical local setup path.

## Fresh local database

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:setup
```

`pnpm db:setup` ensures the database named by `DATABASE_URL` exists and then runs the tracked all-migration runner.

## Existing database

```bash
pnpm db:apply:all
```

`pnpm db:apply:all` runs every SQL file under `packages/db/drizzle` in filename order, records successful files in `schema_migrations`, validates checksums, and skips already-applied files.

## Baseline an older database

For a database that was already migrated before `schema_migrations` existed, baseline only the migrations you know are already present:

```bash
DB_MIGRATIONS_BASELINE_THROUGH=0039 pnpm --filter @drugdeal/db db:apply:all
pnpm db:apply:all
```

Do not baseline beyond the last SQL file actually applied. If a checksum mismatch appears, inspect the SQL drift before using `DB_MIGRATIONS_ALLOW_CHECKSUM_MISMATCH=true`.

## Targeted repair only

The old one-script-per-migration aliases were removed. Use the targeted file runner only when repairing a known migration in a controlled environment:

```bash
pnpm db:apply:file -- drizzle/0031_monetization_foundation.sql
pnpm db:apply:file -- drizzle/0042_message_moderation_retention.sql
pnpm db:apply:file -- drizzle/0044_operational_anomalies.sql
pnpm db:apply:file -- drizzle/0045_admin_audit_workbench.sql
pnpm db:apply:file -- drizzle/0046_admin_rollback_action_types.sql
pnpm db:apply:file -- drizzle/0047_admin_rollback_tooling.sql
```

Normal setup, staging, and production-like deployments should use `pnpm db:setup` or `pnpm db:apply:all` instead.

## Current migration inventory

- First migration: `0000_initial_schema.sql`.
- Seed migration: `0001_seed_starter_content.sql`.
- Monetization foundation: `0031_monetization_foundation.sql`.
- Admin rollback action types: `0046_admin_rollback_action_types.sql`.
- Latest migration: `0047_admin_rollback_tooling.sql`.

Validate migration order and coverage with:

```bash
node scripts/validate-migrations.mjs
```
