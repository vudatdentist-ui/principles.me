#!/usr/bin/env bash
set -Eeuo pipefail

# Manual equivalent of the GitHub Actions production deploy.
# The server must keep .env.production outside Git.

APP_DIR="${1:-/opt/principles-council}"
DEPLOY_REF="${DEPLOY_REF:-main}"
REPO_URL="${REPO_URL:-https://github.com/vudatdentist-ui/principles-council.git}"

install -d "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$DEPLOY_REF" --single-branch "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch --prune "$REPO_URL" "$DEPLOY_REF"
git checkout --detach "origin/$DEPLOY_REF"

test -f .env.production
test -f docker-compose.hostinger.yml
docker network inspect coolify >/dev/null
docker compose -f docker-compose.hostinger.yml up -d --build --remove-orphans
test "$(docker inspect -f '{{.State.Running}}' principles-web)" = "true"
docker compose -f docker-compose.hostinger.yml ps
