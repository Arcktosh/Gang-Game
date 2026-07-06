#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required to restore a database backup." >&2
  exit 1
fi

BACKUP_FILE="${1:-}"
if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: pnpm db:restore -- path/to/backup.dump" >&2
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

CLEAN_FLAGS=()
if [[ "${RESTORE_CLEAN:-false}" == "true" ]]; then
  CLEAN_FLAGS+=(--clean --if-exists)
fi

pg_restore \
  --dbname="${DATABASE_URL}" \
  --no-owner \
  --no-acl \
  "${CLEAN_FLAGS[@]}" \
  "${BACKUP_FILE}"

printf 'Restored database backup: %s\n' "${BACKUP_FILE}"
