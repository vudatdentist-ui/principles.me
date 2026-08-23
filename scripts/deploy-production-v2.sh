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

cleanup_files=()
canary_container=""
release_container=""
old_backup=""
cleanup() {
  if [ "${#cleanup_files[@]}" -gt 0 ]; then
    rm -f -- "${cleanup_files[@]}"
  fi
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
test -f scripts/ensure-v2-production-schema.mjs || fail "V2 schema repair script is missing."
test -f scripts/smoke-v2-production.mjs || fail "V2 production smoke script is missing."

for required_var in POSTGRES_URL DEEPSEEK_API_KEY; do
  grep -Eq "^${required_var}=.+$" "$ENV_FILE" || fail "${required_var} is required in $ENV_FILE."
done

if ! grep -Eq '^AUTH_SECRET=.+$' "$ENV_FILE"; then
  session_secret="$(openssl rand -hex 32)"
  set_env_value AUTH_SECRET "$session_secret"
  unset session_secret
fi

ragflow_url="$(read_env RAGFLOW_BASE_URL)"
if [ -z "$ragflow_url" ] || printf '%s' "$ragflow_url" | grep -Eq '^http://(localhost|127\.0\.0\.1):9380/?$'; then
  set_env_value RAGFLOW_BASE_URL 'http://host.docker.internal:9380'
  printf '%s\n' 'Configured RAGFLOW_BASE_URL for Docker host access.'
fi
unset ragflow_url

docker network inspect coolify >/dev/null
APP_VERSION="$DEPLOY_SHA" docker compose -f "$COMPOSE_FILE" build "$SERVICE"

db_host="$(docker run --rm --env-file "$ENV_FILE" --entrypoint node "$IMAGE" -e '
  try {
    const value = process.env.POSTGRES_URL || "";
    process.stdout.write(value ? new URL(value).hostname : "");
  } catch {}
')"
[ -n "$db_host" ] || fail 'Could not derive the configured PostgreSQL hostname.'

app_db_candidates=0
matching_networks=0
db_network=""

while IFS= read -r cid; do
  [ -n "$cid" ] || continue
  image_name="$(docker inspect -f '{{.Config.Image}}' "$cid" 2>/dev/null || true)"
  case "$(printf '%s' "$image_name" | tr '[:upper:]' '[:lower:]')" in
    *postgres*|*postgresql*) ;;
    *) continue ;;
  esac

  env_dump="$(mktemp)"
  cleanup_files+=("$env_dump")
  docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$cid" > "$env_dump"
  pg_user="$(sed -n 's/^POSTGRES_USER=//p' "$env_dump" | tail -n 1)"
  pg_db="$(sed -n 's/^POSTGRES_DB=//p' "$env_dump" | tail -n 1)"
  pg_password="$(sed -n 's/^POSTGRES_PASSWORD=//p' "$env_dump" | tail -n 1)"
  pg_user="${pg_user:-postgres}"
  pg_db="${pg_db:-$pg_user}"

  base_schema="$(docker exec -e PGPASSWORD="$pg_password" "$cid" \
    psql -U "$pg_user" -d "$pg_db" -Atqc \
    "SELECT CASE WHEN to_regclass('public.\"User\"') IS NOT NULL AND to_regclass('public.\"Decision\"') IS NOT NULL THEN 1 ELSE 0 END;" \
    2>/dev/null || true)"
  unset pg_password
  [ "$base_schema" = '1' ] || continue

  app_db_candidates=$((app_db_candidates + 1))
  container_name="$(docker inspect -f '{{.Name}}' "$cid" | sed 's#^/##')"

  while IFS='|' read -r network aliases; do
    [ -n "$network" ] || continue
    alias_match=0
    if [ "$container_name" = "$db_host" ]; then
      alias_match=1
    else
      old_ifs="$IFS"
      IFS=','
      for alias in $aliases; do
        if [ -n "$alias" ] && [ "$alias" = "$db_host" ]; then
          alias_match=1
          break
        fi
      done
      IFS="$old_ifs"
    fi

    if [ "$alias_match" = '1' ]; then
      matching_networks=$((matching_networks + 1))
      db_network="$network"
    fi
  done <<EOF_NETWORKS
$(docker inspect -f '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}}|{{range $cfg.Aliases}}{{.}},{{end}}{{println}}{{end}}' "$cid")
EOF_NETWORKS
done <<EOF_CONTAINERS
$(docker ps -q)
EOF_CONTAINERS

if [ "$app_db_candidates" != '1' ] || [ "$matching_networks" != '1' ]; then
  fail "Refusing deployment: expected one Principles database and one matching network; got appDb=${app_db_candidates} matchingNetworks=${matching_networks}."
fi
case "$db_network" in
  ''|*[!A-Za-z0-9_.-]*) fail 'Resolved database network name is unsafe for Compose interpolation.' ;;
esac

docker network inspect "$db_network" >/dev/null
set_env_value PRINCIPLES_DB_NETWORK "$db_network"

override_file="$(mktemp)"
cleanup_files+=("$override_file")
cat > "$override_file" <<EOF_OVERRIDE
services:
  principles:
    networks:
      - coolify
      - principles-db
networks:
  principles-db:
    external: true
    name: "$db_network"
EOF_OVERRIDE

APP_VERSION="$DEPLOY_SHA" \
  docker compose -f "$COMPOSE_FILE" -f "$override_file" run --rm --no-deps \
    "$SERVICE" node scripts/ensure-v2-production-schema.mjs

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
  docker network connect "$db_network" "$name"
  docker start "$name" >/dev/null
}

short_sha="${DEPLOY_SHA:0:12}"
canary_container="principles-canary-${short_sha}"
docker rm -f "$canary_container" >/dev/null 2>&1 || true
create_app_container "$canary_container"
wait_for_health "$canary_container" || fail 'Canary container did not become healthy.'
docker exec "$canary_container" \
  node scripts/smoke-v2-production.mjs http://127.0.0.1:3000
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
  public_health="$(curl --fail --silent --show-error --max-time 10 https://principles.me/api/v2/health 2>/dev/null || true)"
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
case "$app_networks" in *" $db_network "*) ;; *) fail 'Release container is missing its database network.' ;; esac

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
printf 'DEPLOY_DB_NETWORK_READY=1\n'
printf 'DEPLOY_INTERNAL_HEALTH=1\n'
printf 'DEPLOY_PUBLIC_ROUTE_READY=1\n'
printf 'DEPLOY_ZERO_DOWNTIME_SWAP=1\n'
