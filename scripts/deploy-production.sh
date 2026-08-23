#!/usr/bin/env bash
set -Eeuo pipefail

: "${DEPLOY_SHA:?DEPLOY_SHA is required}"

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.hostinger.yml}"
SERVICE="principles"
CONTAINER="principles-web"
IMAGE="principles-council-principles:latest"

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

read_env() {
  local name="$1"
  sed -n "s/^${name}=//p" "$ENV_FILE" | tail -n 1
}

set_env_value() {
  local name="$1"
  local value="$2"
  local temp
  temp="$(mktemp)"
  grep -v "^${name}=" "$ENV_FILE" > "$temp" || true
  printf '%s=%s\n' "$name" "$value" >> "$temp"
  cat "$temp" > "$ENV_FILE"
  rm -f "$temp"
}

canary_container=""
release_container=""
old_backup=""
cleanup() {
  if [ -n "$canary_container" ]; then
    docker rm -f "$canary_container" >/dev/null 2>&1 || true
  fi
  if [ -n "$release_container" ]; then
    docker rm -f "$release_container" >/dev/null 2>&1 || true
  fi
  if [ -n "$old_backup" ] && docker inspect "$old_backup" >/dev/null 2>&1; then
    if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
      docker rename "$old_backup" "$CONTAINER" >/dev/null 2>&1 || true
    fi
  fi
}
trap cleanup EXIT

test -f "$ENV_FILE" || fail "$ENV_FILE is required."
test -f "$COMPOSE_FILE" || fail "$COMPOSE_FILE is required."
test -f scripts/smoke-production.mjs || fail "Production smoke script is missing."

for required_var in DEEPSEEK_API_KEY RAGFLOW_API_KEY RAGFLOW_DATASET_IDS; do
  grep -Eq "^${required_var}=.+$" "$ENV_FILE" || fail "${required_var} is required in $ENV_FILE."
done

ragflow_url="$(read_env RAGFLOW_BASE_URL)"
if [ -z "$ragflow_url" ] || printf '%s' "$ragflow_url" | grep -Eq '^http://(localhost|127\.0\.0\.1):9380/?$'; then
  set_env_value RAGFLOW_BASE_URL 'http://host.docker.internal:9380'
  printf '%s\n' 'Configured RAGFLOW_BASE_URL for Docker host access.'
fi
unset ragflow_url

docker network inspect coolify >/dev/null
APP_VERSION="$DEPLOY_SHA" docker compose -f "$COMPOSE_FILE" build "$SERVICE"

wait_for_health() {
  local name="$1"
  local state=""
  local health=""
  for _attempt in $(seq 1 45); do
    state="$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || true)"
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$name" 2>/dev/null || true)"
    if [ "$state" = 'running' ] && [ "$health" = 'healthy' ]; then
      return 0
    fi
    if [ "$state" = 'exited' ] || [ "$state" = 'dead' ]; then
      return 1
    fi
    sleep 2
  done
  return 1
}

create_app_container() {
  local name="$1"
  shift
  docker create \
    --name "$name" \
    --env-file "$ENV_FILE" \
    -e "APP_VERSION=$DEPLOY_SHA" \
    --add-host 'host.docker.internal:host-gateway' \
    --network coolify \
    "$@" \
    "$IMAGE" >/dev/null
  docker start "$name" >/dev/null
}

short_sha="${DEPLOY_SHA:0:12}"
canary_container="principles-canary-${short_sha}"
docker rm -f "$canary_container" >/dev/null 2>&1 || true
create_app_container "$canary_container"
wait_for_health "$canary_container" || fail 'Canary container did not become healthy.'
docker exec "$canary_container" \
  node scripts/smoke-production.mjs http://127.0.0.1:3000
printf 'DEPLOY_CANARY_SMOKE=1\n'
docker rm -f "$canary_container" >/dev/null
canary_container=""

current_priority=""
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  current_priority="$(docker inspect -f '{{index .Config.Labels "principles.deploy.priority"}}' "$CONTAINER" 2>/dev/null || true)"
fi
if [[ "$current_priority" =~ ^[0-9]+$ ]]; then
  next_priority=$((current_priority + 1))
else
  next_priority=1000
fi

router="principles-${short_sha}"
service="principles-${short_sha}"
redirect="principles-${short_sha}-https-redirect"
release_container="principles-web-next-${short_sha}"
docker rm -f "$release_container" >/dev/null 2>&1 || true
create_app_container "$release_container" \
  --restart unless-stopped \
  --label 'traefik.enable=true' \
  --label 'traefik.docker.network=coolify' \
  --label "principles.deploy.priority=${next_priority}" \
  --label "traefik.http.routers.${router}-http.rule=Host(\`principles.me\`) || Host(\`www.principles.me\`)" \
  --label "traefik.http.routers.${router}-http.entrypoints=http" \
  --label "traefik.http.routers.${router}-http.priority=${next_priority}" \
  --label "traefik.http.routers.${router}-http.middlewares=${redirect}" \
  --label "traefik.http.middlewares.${redirect}.redirectscheme.scheme=https" \
  --label "traefik.http.routers.${router}-https.rule=Host(\`principles.me\`) || Host(\`www.principles.me\`)" \
  --label "traefik.http.routers.${router}-https.entrypoints=https" \
  --label "traefik.http.routers.${router}-https.priority=${next_priority}" \
  --label "traefik.http.routers.${router}-https.tls=true" \
  --label "traefik.http.routers.${router}-https.tls.certresolver=letsencrypt" \
  --label "traefik.http.routers.${router}-https.service=${service}" \
  --label "traefik.http.services.${service}.loadbalancer.server.port=3000"

wait_for_health "$release_container" || fail 'Release container did not become healthy.'

public_ready=0
for _attempt in $(seq 1 30); do
  public_health="$(curl --fail --silent --show-error --max-time 10 https://principles.me/api/health 2>/dev/null || true)"
  if printf '%s' "$public_health" | grep -Fq '"status":"ok"' && \
     printf '%s' "$public_health" | grep -Fq "\"version\":\"$DEPLOY_SHA\""; then
    public_ready=1
    break
  fi
  sleep 2
done
[ "$public_ready" = '1' ] || fail 'Traefik did not route public traffic to the healthy release.'

running_image_id="$(docker inspect -f '{{.Image}}' "$release_container")"
latest_image_id="$(docker image inspect -f '{{.Id}}' "$IMAGE")"
[ "$running_image_id" = "$latest_image_id" ] || fail 'Release container is not using the image that was just built.'

app_networks=" $(docker inspect -f '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}} {{end}}' "$release_container") "
case "$app_networks" in *" coolify "*) ;; *) fail 'Release container is missing the coolify network.' ;; esac

if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  old_backup="principles-web-old-${short_sha}"
  docker rm -f "$old_backup" >/dev/null 2>&1 || true
  docker rename "$CONTAINER" "$old_backup"
fi

docker rename "$release_container" "$CONTAINER"
release_container=""

if [ -n "$old_backup" ]; then
  docker rm -f "$old_backup" >/dev/null
  old_backup=""
fi

printf 'DEPLOY_IMAGE_READY=1\n'
printf 'DEPLOY_INTERNAL_HEALTH=1\n'
printf 'DEPLOY_PUBLIC_ROUTE_READY=1\n'
printf 'DEPLOY_ZERO_DOWNTIME_SWAP=1\n'
