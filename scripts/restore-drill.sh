#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${RUNNER_TEMP:-/tmp}/principles-ci-postgres-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
BIN_DIR="$ROOT/package/native/bin"
LIB_DIR="$ROOT/package/native/lib"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-55432}"
POSTGRES_USER="${POSTGRES_USER:-principles}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"
DRILL_DB="principles_restore_drill_${GITHUB_RUN_ID:-local}_${GITHUB_RUN_ATTEMPT:-1}"
DRILL_DB="$(printf '%s' "$DRILL_DB" | tr -cd 'A-Za-z0-9_')"
DUMP_FILE="$ROOT/restore-drill.dump"

export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

for binary in pg_dump pg_restore createdb dropdb psql; do
  test -x "$BIN_DIR/$binary" || {
    printf 'Restore drill missing PostgreSQL binary: %s\n' "$binary" >&2
    exit 1
  }
done

cleanup() {
  "$BIN_DIR/dropdb" \
    -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
    --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

"$BIN_DIR/pg_dump" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" -Fc -f "$DUMP_FILE"
test -s "$DUMP_FILE"

"$BIN_DIR/dropdb" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  --if-exists "$DRILL_DB" >/dev/null
"$BIN_DIR/createdb" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  "$DRILL_DB"
"$BIN_DIR/pg_restore" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  --exit-on-error --no-owner --no-privileges \
  -d "$DRILL_DB" "$DUMP_FILE"

migration_count="$(
  "$BIN_DIR/psql" \
    -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
    -d "$DRILL_DB" -Atc 'SELECT count(*) FROM schema_migrations;'
)"
table_count="$(
  "$BIN_DIR/psql" \
    -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
    -d "$DRILL_DB" -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
)"

[[ "$migration_count" =~ ^[1-9][0-9]*$ ]] || {
  printf 'Restore drill has no migration history.\n' >&2
  exit 1
}
[[ "$table_count" =~ ^[1-9][0-9]*$ ]] || {
  printf 'Restore drill restored no public tables.\n' >&2
  exit 1
}

printf 'RESTORE_DRILL_OK=1 migrations=%s tables=%s\n' "$migration_count" "$table_count"
