#!/usr/bin/env bash
set -Eeuo pipefail

ACTION="${1:-}"
PG_PACKAGE='@embedded-postgres/linux-x64@16.14.0-beta.17'
ROOT="${RUNNER_TEMP:-/tmp}/principles-ci-postgres-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
PACKAGE_DIR="$ROOT/package"
DATA_DIR="$ROOT/data"
LOG_FILE="$ROOT/postgres.log"
BIN_DIR="$PACKAGE_DIR/native/bin"
LIB_DIR="$PACKAGE_DIR/native/lib"
POSTGRES_PORT="${POSTGRES_PORT:-55432}"
POSTGRES_USER="${POSTGRES_USER:-principles}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"

hydrate_abi_links() {
  local versioned base abi
  for versioned in "$LIB_DIR"/*.so.*.*; do
    [ -e "$versioned" ] || continue
    base="$(basename "$versioned")"
    abi="${base%.*}"
    if [ ! -e "$LIB_DIR/$abi" ]; then
      ln -s "$base" "$LIB_DIR/$abi"
    fi
  done
}

start_postgres() {
  "$BIN_DIR/pg_ctl" \
    -D "$DATA_DIR" \
    -l "$LOG_FILE" \
    -o "-h 127.0.0.1 -p $POSTGRES_PORT" \
    -w start >/dev/null 2>&1
}

case "$ACTION" in
  start)
    rm -rf "$ROOT"
    mkdir -p "$ROOT"

    archive="$(npm pack "$PG_PACKAGE" --pack-destination "$ROOT" --silent)"
    test -n "$archive"
    tar -xzf "$ROOT/$archive" -C "$ROOT"
    node "$PACKAGE_DIR/scripts/hydrate-symlinks.js"

    test -d "$LIB_DIR" || {
      printf 'Missing embedded PostgreSQL library directory.\n' >&2
      exit 1
    }

    hydrate_abi_links
    export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

    for binary in initdb pg_ctl postgres; do
      test -x "$BIN_DIR/$binary" || {
        printf 'Missing embedded PostgreSQL binary: %s\n' "$binary" >&2
        exit 1
      }
    done

    if command -v ldd >/dev/null 2>&1; then
      missing_libraries="$(ldd "$BIN_DIR/initdb" 2>/dev/null | grep 'not found' || true)"
      if [ -n "$missing_libraries" ]; then
        printf 'Embedded PostgreSQL has unresolved shared libraries:\n%s\n' "$missing_libraries" >&2
        exit 1
      fi
    fi

    [[ "$POSTGRES_DB" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || {
      printf 'Invalid CI database name: %s\n' "$POSTGRES_DB" >&2
      exit 1
    }

    "$BIN_DIR/initdb" \
      -D "$DATA_DIR" \
      -U "$POSTGRES_USER" \
      -A trust \
      --encoding=UTF8 \
      --no-locale >/dev/null

    if [ "$POSTGRES_DB" != 'postgres' ]; then
      printf 'CREATE DATABASE "%s";\n' "$POSTGRES_DB" | \
        "$BIN_DIR/postgres" --single -D "$DATA_DIR" postgres >/dev/null
    fi

    requested_port="$POSTGRES_PORT"
    if ! start_postgres; then
      if grep -Eqi 'address already in use|could not bind|could not create any tcp/ip sockets' "$LOG_FILE"; then
        started=0
        for offset in $(seq 1 50); do
          POSTGRES_PORT=$((requested_port + offset))
          rm -f "$DATA_DIR/postmaster.pid"
          if start_postgres; then
            started=1
            break
          fi
        done
        if [ "$started" != '1' ]; then
          printf 'Embedded PostgreSQL could not find a free port after %s.\n' "$requested_port" >&2
          cat "$LOG_FILE" >&2 || true
          exit 1
        fi
        if [ -n "${GITHUB_ENV:-}" ]; then
          printf 'POSTGRES_PORT=%s\n' "$POSTGRES_PORT" >> "$GITHUB_ENV"
        fi
        printf 'CI_POSTGRES_PORT_FALLBACK=1 requested=%s selected=%s\n' \
          "$requested_port" "$POSTGRES_PORT"
      else
        printf 'Embedded PostgreSQL failed to start.\n' >&2
        cat "$LOG_FILE" >&2 || true
        exit 1
      fi
    fi

    "$BIN_DIR/postgres" --version
    printf 'CI_POSTGRES_READY=1 port=%s database=%s\n' "$POSTGRES_PORT" "$POSTGRES_DB"
    ;;

  stop)
    if [ -d "$LIB_DIR" ]; then
      hydrate_abi_links
      export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
    fi
    if [ -x "$BIN_DIR/pg_ctl" ] && [ -d "$DATA_DIR" ]; then
      "$BIN_DIR/pg_ctl" -D "$DATA_DIR" -m fast -w stop >/dev/null 2>&1 || true
    fi
    rm -rf "$ROOT"
    ;;

  *)
    printf 'Usage: %s start|stop\n' "$0" >&2
    exit 2
    ;;
esac
