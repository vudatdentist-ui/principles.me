#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
: "${APP_DIR:?}" "${STAGE:?}" "${RELEASE:?}"
[[ "$RELEASE" =~ ^[0-9]+-[0-9]+$ ]]
env_file="$APP_DIR/.env.production"
test -s "$env_file"
name="principles-library-$RELEASE"
root="/opt/principles-library/$RELEASE"
test ! -e "$root"
if grep -Eq '^ANYTHINGLLM_BASE_URL=.+' "$env_file"; then echo 'Existing library configured; fresh provisioning requires an empty target.' >&2; exit 1; fi
image='mintplexlabs/anythingllm@sha256:8ef5ab45e5e7af66f91e2a0ef5b6989f884bf3baed0087b7a59b0a775aa8e822'
docker pull "$image" >/dev/null
docker network inspect coolify >/dev/null
install -d -m 700 "$root"
install -d -m 700 -o 1000 -g 1000 "$root/storage"
service_env="$root/service.env"
{
  printf 'AUTH_TOKEN=%s\nJWT_SECRET=%s\n' "$(openssl rand -hex 28)" "$(openssl rand -hex 32)"
  printf '%s\n' NODE_ENV=production STORAGE_DIR=/app/server/storage VECTOR_DB=lancedb EMBEDDING_ENGINE=native EMBEDDING_MODEL_PREF=MintplexLabs/multilingual-e5-small DISABLE_TELEMETRY=true LLM_PROVIDER=deepseek
  grep -E '^DEEPSEEK_API_KEY=.+' "$env_file"
  printf '%s\n' DEEPSEEK_MODEL_PREF=deepseek-chat
} > "$service_env"
chown 1000:1000 "$service_env"
started=false
cleanup() {
  if [[ "$started" == true ]]; then docker rm -f "$name" >/dev/null || true; fi
}
trap cleanup EXIT
docker run -d --name "$name" --restart unless-stopped --network coolify --cpus 2 --memory 4g \
  --env-file "$service_env" -v "$root/storage:/app/server/storage" -v "$service_env:/app/server/.env" \
  --label traefik.enable=true --label traefik.docker.network=coolify \
  --label 'traefik.http.routers.principles-library.rule=Host(`lib.principles.me`)' \
  --label traefik.http.routers.principles-library.entrypoints=https \
  --label traefik.http.routers.principles-library.tls=true \
  --label traefik.http.routers.principles-library.tls.certresolver=letsencrypt \
  --label traefik.http.services.principles-library.loadbalancer.server.port=3001 "$image" >/dev/null
started=true
for attempt in {1..90}; do
  if docker exec "$name" node -e 'fetch("http://127.0.0.1:3001/api/ping").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; then break; fi
  sleep 2
done
docker cp "$STAGE/books" "$name:/tmp/principles-books"
docker cp "$STAGE/import.cjs" "$name:/tmp/principles-import.cjs"
docker exec -u root "$name" chmod -R a+rX /tmp/principles-books
docker exec -w /app/server "$name" node /tmp/principles-import.cjs
docker exec -w /app/server "$name" node -e '
const fs=require("fs");const key=fs.readFileSync("/tmp/principles-service-key","utf8");
(async()=>{
 const response=await fetch("http://127.0.0.1:3001/api/v1/workspace/finance-and-economic-library/vector-search",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({query:"Biên an toàn trong đầu tư là gì?",topN:4})});
 if(!response.ok) throw Error("Retrieval HTTP "+response.status);
 const hits=(await response.json()).results;
 if(!hits?.some(h=>h.text?.trim() && h.metadata?.title))throw Error("Missing attributed passage");
 console.log("BOOK_RETRIEVAL_PASS",hits[0].metadata.title);
})().catch(e=>{console.error(e.message);process.exit(1)})'
tmp="$(mktemp "$APP_DIR/.library-env.XXXXXX")"
trap 'rm -f "$tmp"; cleanup' EXIT
grep -Ev '^ANYTHINGLLM_(BASE_URL|API_KEY|LIBRARY_WORKSPACE)=' "$env_file" > "$tmp"
printf '\nANYTHINGLLM_BASE_URL=http://%s:3001\nANYTHINGLLM_LIBRARY_WORKSPACE=finance-and-economic-library\nANYTHINGLLM_API_KEY=%s\n' "$name" "$(docker exec "$name" cat /tmp/principles-service-key)" >> "$tmp"
chmod --reference="$env_file" "$tmp"
chown --reference="$env_file" "$tmp"
docker exec -u root "$name" rm -rf /tmp/principles-service-key /tmp/principles-books /tmp/principles-import.cjs
cp -p "$env_file" "$root/before-library.env"
mv "$tmp" "$env_file"
started=false
echo 'BOOK_SERVICE_READY=1'
