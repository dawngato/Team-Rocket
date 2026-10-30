#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=== HimVote Preflight Deployment Check ==="

# 1. Environment validation
if [ -f ".env" ]; then
  echo "[+] Validating .env configuration..."
  python3 scripts/validate_env.py ".env"
else
  echo "[!] .env not found in root. Checking system environment..."
  python3 scripts/validate_env.py
fi

# 2. Docker compose configuration syntax check
echo "[+] Validating Docker Compose configuration..."
if [ -f "compose.yaml" ]; then
  docker compose config --quiet
  echo "[+] Docker Compose syntax valid."
fi

# 3. File permission sanity check
echo "[+] Validating security permissions..."
if [ -f ".env" ]; then
  chmod 600 .env 2>/dev/null || true
fi

echo "=== All Preflight Checks Passed Successfully ==="
