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
cleanup() {
  if [ "${#cleanup_files[@]}" -gt 0 ]; then
    rm -f -- "${cleanup_files[@]}"
  fi
}
trap cleanup EXIT

test -f "$ENV_FILE" || fail "$ENV_FILE is required."
test -f "$COMPOSE_FILE" || fail "$COMPOSE_FILE is required."
test -f scripts/ensure-v2-production-schema.mjs || fail "V2 schema repair script is missing."

for required_var in POSTGRES_URL DEEPSEEK_API_KEY; do
  grep -Eq "^${required_var}=.+$" "$ENV_FILE" || fail "${required_var} is required in $ENV_FILE."
done

if ! grep -Eq '^AUTH_SECRET=.+$' "$ENV_FILE"; then
  session_secret="$(openssl rand -hex 32)"
  set_env_value AUTH_SECRET "$session_secret"
  unset session_secret
fi

# localhost inside the app container points back to itself, not to the VPS host.
ragflow_url="$(read_env RAGFLOW_BASE_URL)"
if [ -z "$ragflow_url" ] || printf '%s' "$ragflow_url" | grep -Eq '^http://(localhost|127\.0\.0\.1):9380/?$'; then
  set_env_value RAGFLOW_BASE_URL 'http://host.docker.internal:9380'
  printf '%s\n' 'Configured RAGFLOW_BASE_URL for Docker host access.'
fi
unset ragflow_url

docker network inspect coolify >/dev/null

# Build the exact source before doing anything that could replace the running app.
APP_VERSION="$DEPLOY_SHA" docker compose -f "$COMPOSE_FILE" build "$SERVICE"

# Read only the hostname from the configured URL inside the built image; never print the URL.
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

# Provision only the additive V2 table, on the same network used by the real DB hostname.
APP_VERSION="$DEPLOY_SHA" \
  docker compose -f "$COMPOSE_FILE" -f "$override_file" run --rm --no-deps \
    "$SERVICE" node scripts/ensure-v2-production-schema.mjs

# A mutable `latest` tag does not guarantee Compose recreates a running container.
# Force recreation, then prove the running container uses the exact image just built.
APP_VERSION="$DEPLOY_SHA" \
  docker compose -f "$COMPOSE_FILE" -f "$override_file" up -d --no-build \
    --force-recreate --remove-orphans "$SERVICE"

test "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" = 'true' || fail 'Production app is not running.'
running_image_id="$(docker inspect -f '{{.Image}}' "$CONTAINER")"
latest_image_id="$(docker image inspect -f '{{.Id}}' "$IMAGE")"
[ "$running_image_id" = "$latest_image_id" ] || fail 'Running container is not using the image that was just built.'

running_version="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" | sed -n 's/^APP_VERSION=//p' | tail -n 1)"
[ "$running_version" = "$DEPLOY_SHA" ] || fail 'Running container does not report the deployed SHA.'

app_networks=" $(docker inspect -f '{{range $net, $cfg := .NetworkSettings.Networks}}{{$net}} {{end}}' "$CONTAINER") "
case "$app_networks" in *" coolify "*) ;; *) fail 'Production app is missing the coolify network.' ;; esac
case "$app_networks" in *" $db_network "*) ;; *) fail 'Production app is missing its database network.' ;; esac

health_status=0
health_ok=0
health_version=0
for _attempt in $(seq 1 20); do
  health_result="$(docker exec "$CONTAINER" node -e '
    const expected = process.env.APP_VERSION;
    fetch("http://127.0.0.1:3000/api/v2/health", { cache: "no-store" })
      .then(async response => {
        let payload = null;
        try { payload = await response.json(); } catch {}
        console.log(`STATUS=${response.status}`);
        console.log(`OK=${response.ok && payload?.status === "ok" ? 1 : 0}`);
        console.log(`VERSION=${payload?.version === expected ? 1 : 0}`);
      })
      .catch(() => {
        console.log("STATUS=0");
        console.log("OK=0");
        console.log("VERSION=0");
      });
  ' 2>/dev/null || true)"
  health_status="$(printf '%s\n' "$health_result" | sed -n 's/^STATUS=//p' | tail -n 1)"
  health_ok="$(printf '%s\n' "$health_result" | sed -n 's/^OK=//p' | tail -n 1)"
  health_version="$(printf '%s\n' "$health_result" | sed -n 's/^VERSION=//p' | tail -n 1)"
  health_status="${health_status:-0}"
  health_ok="${health_ok:-0}"
  health_version="${health_version:-0}"
  if [ "$health_status" = '200' ] && [ "$health_ok" = '1' ] && [ "$health_version" = '1' ]; then
    break
  fi
  sleep 2
done

if [ "$health_status" != '200' ] || [ "$health_ok" != '1' ] || [ "$health_version" != '1' ]; then
  fail "Internal V2 health failed after deployment (HTTP ${health_status})."
fi

printf 'DEPLOY_IMAGE_READY=1\n'
printf 'DEPLOY_DB_NETWORK_READY=1\n'
printf 'DEPLOY_INTERNAL_HEALTH=1\n'
