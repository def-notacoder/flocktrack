#!/usr/bin/env bash
# Run on the deploy server after git sync (via scripts/deploy.ps1 or scripts/deploy.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is not installed or not on PATH" >&2
  exit 1
fi

COMPOSE=(docker compose)
if ! docker compose version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    echo "error: docker compose is not available" >&2
    exit 1
  fi
fi

echo "==> Building and starting stack"
"${COMPOSE[@]}" up -d --build

echo "==> Waiting for app container health"
# Production compose.yml on the server uses nginx and does not publish app ports to the host.
for _ in $(seq 1 60); do
  health="$("${COMPOSE[@]}" ps --format '{{.Health}}' app 2>/dev/null | head -1 || true)"
  if [ "$health" = "healthy" ]; then
    if [ -f nginx.conf ] && docker ps --format '{{.Names}}' | grep -qx nginx; then
      echo "==> Recreating nginx container (bind-mounted conf file changes)"
      NGINX_COMPOSE="/servers/nginx/compose.yml"
      if [ -f "$NGINX_COMPOSE" ]; then
        docker compose -f "$NGINX_COMPOSE" up -d --force-recreate nginx
      else
        echo "warning: $NGINX_COMPOSE not found; falling back to docker restart nginx" >&2
        docker exec nginx nginx -t
        docker restart nginx
      fi
    fi
    echo "Deploy complete — app container is healthy"
    exit 0
  fi
  sleep 2
done

echo "error: app did not become healthy within 120s" >&2
"${COMPOSE[@]}" logs --tail=50 app || true
exit 1
