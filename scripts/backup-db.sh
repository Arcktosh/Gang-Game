#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required to create a database backup." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${BACKUP_FILE:-${BACKUP_DIR}/drugdeal-game-${TIMESTAMP}.dump}"

mkdir -p "$(dirname "${BACKUP_FILE}")"

pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${BACKUP_FILE}"

printf 'Created database backup: %s\n' "${BACKUP_FILE}"
