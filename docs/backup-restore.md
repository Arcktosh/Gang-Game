# Database Backup and Restore Runbook

This runbook defines the minimum backup/restore process for MVP testing. It assumes PostgreSQL client tools are installed wherever the commands are run.

## Required environment

`DATABASE_URL` must point at the database to back up or restore.

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/drugdeal_game"
```

## Create a backup

Use the package script:

```bash
pnpm db:backup
```

This calls `scripts/backup-db.sh`, which uses `pg_dump` in custom format with `--no-owner` and `--no-acl`.

By default, backups are written to `backups/drugdeal-game-<timestamp>.dump`. Override the destination when needed:

```bash
BACKUP_FILE=backups/pre-release.dump pnpm db:backup
```

## Restore a backup

Restore into a disposable database first whenever possible:

```bash
pnpm db:restore -- backups/pre-release.dump
```

This calls `scripts/restore-db.sh`, which uses `pg_restore` with `--no-owner` and `--no-acl`.

To clean existing objects before restore, set `RESTORE_CLEAN=true`:

```bash
RESTORE_CLEAN=true pnpm db:restore -- backups/pre-release.dump
```

Use clean restore only when the target database is disposable or explicitly approved for overwrite.

## Verify restore quality

After restoring, start the app against the restored database and run:

```bash
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

Then manually verify these MVP flows:

- Login/session shape.
- Character profile loads.
- Job apply/work/resign flow.
- Crime action creates success or legal/hospital consequence.
- Legal status refresh clears expired states.
- Admin search and moderation pages require the correct role/capability.

## Backup policy for MVP testing

For MVP testing, use this minimum policy:

- Create one backup before applying migrations.
- Create one backup immediately after a successful migration and smoke test.
- Keep the last known-good backup outside the application working directory.
- Never test restore for the first time during an incident.

## Incident restore checklist

1. Stop the web app and worker.
2. Copy the failing database, if possible, for later investigation.
3. Restore the last known-good `.dump` into a disposable database.
4. Point `DATABASE_URL` at the restored database.
5. Run `SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime`.
6. If smoke passes, promote the restored database or redeploy the last known-good app package.

## Runtime proof integration

Feature Pass 54 wires backup and disposable restore checks into the MVP runtime proof command. Set `MVP_RESTORE_DATABASE_URL` to a disposable PostgreSQL database before running:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

Without `MVP_RESTORE_DATABASE_URL`, `pnpm prove:mvp-runtime` still creates a backup but records the restore proof as skipped. Do not accept a public MVP release until the restore proof has run against a disposable database.
