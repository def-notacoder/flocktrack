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

echo "==> Waiting for API health"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT:-3001}/api/health" >/dev/null 2>&1; then
    echo "Deploy complete — app is healthy on port ${PORT:-3001}"
    exit 0
  fi
  sleep 2
done

echo "error: app did not become healthy within 60s" >&2
"${COMPOSE[@]}" logs --tail=50 app || true
exit 1
