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
    test -e "$LIB_DIR/libpq.so.5" || {
      printf 'Missing embedded PostgreSQL libpq.so.5.\n' >&2
      find "$LIB_DIR" -maxdepth 1 -type f -o -type l 2>/dev/null | sort >&2 || true
      exit 1
    }
    export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"

    for binary in initdb pg_ctl postgres; do
      test -x "$BIN_DIR/$binary" || {
        printf 'Missing embedded PostgreSQL binary: %s\n' "$binary" >&2
        exit 1
      }
    done

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

    "$BIN_DIR/pg_ctl" \
      -D "$DATA_DIR" \
      -l "$LOG_FILE" \
      -o "-h 127.0.0.1 -p $POSTGRES_PORT" \
      -w start >/dev/null

    "$BIN_DIR/postgres" --version
    printf 'CI_POSTGRES_READY=1 port=%s database=%s\n' "$POSTGRES_PORT" "$POSTGRES_DB"
    ;;

  stop)
    if [ -d "$PACKAGE_DIR/native/lib" ]; then
      export LD_LIBRARY_PATH="$PACKAGE_DIR/native/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
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
