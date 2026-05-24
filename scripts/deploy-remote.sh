#!/usr/bin/env bash
# Run on the deploy server from the repo root (via scripts/deploy.ps1 or scripts/deploy.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_GIT_REMOTE:-origin}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: $ROOT is not a git repository" >&2
  exit 1
fi

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

echo "==> Fetching latest from $REMOTE/$BRANCH"
git fetch "$REMOTE" "$BRANCH"
git checkout "$BRANCH" 2>/dev/null || git checkout -B "$BRANCH" "$REMOTE/$BRANCH"
git reset --hard "$REMOTE/$BRANCH"

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
