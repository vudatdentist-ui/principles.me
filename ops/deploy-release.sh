#!/usr/bin/env bash
set -euo pipefail

: "${COMPOSE_FILE:?COMPOSE_FILE is required}"
: "${COMPOSE_PROJECT:?COMPOSE_PROJECT is required}"
: "${PRINCIPLES_IMAGE:?PRINCIPLES_IMAGE is required}"
: "${PRINCIPLES_IMAGE_TAG:?PRINCIPLES_IMAGE_TAG is required}"
: "${PRINCIPLES_ENV_FILE:?PRINCIPLES_ENV_FILE is required}"
: "${PRINCIPLES_HOST:?PRINCIPLES_HOST is required}"
: "${TRAEFIK_ROUTER:?TRAEFIK_ROUTER is required}"

compose=(docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE")

if "${compose[@]}" config --services | grep -qx postgres; then
  "${compose[@]}" up -d postgres
  for attempt in {1..30}; do
    if "${compose[@]}" exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
      break
    fi
    if [[ "$attempt" == "30" ]]; then
      echo "PostgreSQL did not become ready." >&2
      exit 1
    fi
    sleep 2
  done
fi

"${compose[@]}" pull principles
"${compose[@]}" run --rm principles pnpm db:migrate
"${compose[@]}" up -d --no-build principles

health_url="https://${PRINCIPLES_HOST}/api/health"
for attempt in {1..30}; do
  if curl --fail --silent --show-error "$health_url" >/dev/null; then
    echo "Release ${PRINCIPLES_IMAGE_TAG} is healthy at ${health_url}."
    exit 0
  fi
  if [[ "$attempt" == "30" ]]; then
    echo "Release health check failed: ${health_url}" >&2
    "${compose[@]}" ps >&2 || true
    "${compose[@]}" logs --tail=120 principles >&2 || true
    exit 1
  fi
  sleep 4
done
