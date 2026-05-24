#!/usr/bin/env bash
# Deploy from your machine via SSH. Usage: ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DEPLOY_USER="${DEPLOY_USER:-rewen}"
DEPLOY_HOST="${DEPLOY_HOST:-192.168.2.10}"
DEPLOY_PATH="${DEPLOY_PATH:-/servers/flocklog}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_GIT_REMOTE="${DEPLOY_GIT_REMOTE:-origin}"

SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"
SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${DEPLOY_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$DEPLOY_SSH_KEY")
fi

echo "Deploying ${DEPLOY_GIT_REMOTE}/${DEPLOY_BRANCH} to ${SSH_TARGET}:${DEPLOY_PATH} ..."
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "export DEPLOY_BRANCH='${DEPLOY_BRANCH}' DEPLOY_GIT_REMOTE='${DEPLOY_GIT_REMOTE}'; cd '${DEPLOY_PATH}' && bash scripts/deploy-remote.sh"

echo "Done."
