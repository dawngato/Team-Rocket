#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/himvote"
cd "$APP_DIR"

while true; do
  git fetch origin main --quiet 2>/dev/null || true
  LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
  REMOTE_HASH=$(git rev-parse origin/main 2>/dev/null || echo "")

  if [ -n "$REMOTE_HASH" ] && [ "$LOCAL_HASH" != "$REMOTE_HASH" ]; then
    echo "[$(date -u)] Detected new commit on origin/main ($REMOTE_HASH). Deploying..."
    git reset --hard origin/main
    docker compose -f compose.yaml -f compose.dev.yaml up -d --build --remove-orphans
    echo "[$(date -u)] Deployment complete."
  fi

  sleep 20
done
