#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${RUNNER_TEMP:-/tmp}/principles-ci-postgres-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
BIN_DIR="$ROOT/package/native/bin"
LIB_DIR="$ROOT/package/native/lib"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-55432}"
POSTGRES_USER="${POSTGRES_USER:-principles}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"
POSTGRES_MAJOR="${POSTGRES_MAJOR:-16}"
POSTGRES_CLIENT_IMAGE="${POSTGRES_CLIENT_IMAGE:-postgres:${POSTGRES_MAJOR}-alpine}"
DRILL_DB="principles_restore_drill_${GITHUB_RUN_ID:-local}_${GITHUB_RUN_ATTEMPT:-1}"
DRILL_DB="$(printf '%s' "$DRILL_DB" | tr -cd 'A-Za-z0-9_')"
DUMP_FILE="$ROOT/restore-drill.dump"

export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

resolve_pg_binary() {
  local binary="$1"
  local candidate

  for candidate in \
    "$BIN_DIR/$binary" \
    "/usr/lib/postgresql/$POSTGRES_MAJOR/bin/$binary" \
    "/usr/pgsql-$POSTGRES_MAJOR/bin/$binary"; do
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v "$binary" >/dev/null 2>&1; then
    command -v "$binary"
    return 0
  fi

  return 1
}

run_pg_binary() {
  local executable="$1"
  shift

  if [[ "$executable" == docker:* ]]; then
    docker run --rm \
      --network host \
      --user "$(id -u):$(id -g)" \
      --volume "$ROOT:$ROOT" \
      --env "PGPASSWORD=${PGPASSWORD:-}" \
      "$POSTGRES_CLIENT_IMAGE" "${executable#docker:}" "$@"
    return
  fi

  "$executable" "$@"
}

resolve_docker_pg_binary() {
  local binary="$1"

  command -v docker >/dev/null 2>&1 || return 1
  docker run --rm \
    --network host \
    --user "$(id -u):$(id -g)" \
    --volume "$ROOT:$ROOT" \
    --env "PGPASSWORD=${PGPASSWORD:-}" \
    "$POSTGRES_CLIENT_IMAGE" "$binary" --version >/dev/null 2>&1 || return 1
  printf 'docker:%s\n' "$binary"
}

require_pg_binary() {
  local binary="$1"
  local path version

  if path="$(resolve_pg_binary "$binary")"; then
    version="$("$path" --version 2>/dev/null || true)"
    if [[ "$version" == *"PostgreSQL) $POSTGRES_MAJOR."* ]]; then
      printf '%s\n' "$path"
      return 0
    fi
    printf 'Restore drill found an incompatible PostgreSQL client; %s reports: %s\n' \
      "$path" "${version:-unknown}" >&2
  fi

  if path="$(resolve_docker_pg_binary "$binary")"; then
    printf '%s\n' "$path"
    return 0
  fi

  printf 'Restore drill missing PostgreSQL %s client binary (local or Docker image %s).\n' \
    "$binary" "$POSTGRES_CLIENT_IMAGE" >&2
  return 1
}

PG_DUMP="$(require_pg_binary pg_dump)"
PG_RESTORE="$(require_pg_binary pg_restore)"
CREATEDB="$(require_pg_binary createdb)"
DROPDB="$(require_pg_binary dropdb)"
PSQL="$(require_pg_binary psql)"

printf 'RESTORE_DRILL_CLIENT=%s\n' "$($PG_DUMP --version)"

cleanup() {
  run_pg_binary "$DROPDB" \
    -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
    --if-exists "$DRILL_DB" >/dev/null 2>&1 || true
  rm -f "$DUMP_FILE"
}
trap cleanup EXIT

run_pg_binary "$PG_DUMP" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" -Fc -f "$DUMP_FILE"
test -s "$DUMP_FILE"

run_pg_binary "$DROPDB" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  --if-exists "$DRILL_DB" >/dev/null
run_pg_binary "$CREATEDB" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  -T template0 "$DRILL_DB"
run_pg_binary "$PG_RESTORE" \
  -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
  --exit-on-error --no-owner --no-privileges \
  -d "$DRILL_DB" "$DUMP_FILE"

migration_count="$(
  run_pg_binary "$PSQL" \
    -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
    -d "$DRILL_DB" -Atc 'SELECT count(*) FROM schema_migrations;'
)"
table_count="$(
  run_pg_binary "$PSQL" \
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
