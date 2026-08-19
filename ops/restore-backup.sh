#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_FILE:?BACKUP_FILE is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file does not exist: $BACKUP_FILE" >&2
  exit 1
fi

pg_restore --list "$BACKUP_FILE" >/dev/null

if [[ "${ALLOW_RESTORE:-}" != "YES" ]]; then
  echo "Backup verified. Set ALLOW_RESTORE=YES to restore into RESTORE_DATABASE_URL." >&2
  exit 2
fi

pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  --dbname "$RESTORE_DATABASE_URL" \
  "$BACKUP_FILE"

echo "Restore completed. Run migrations and smoke tests before directing traffic to this database."
