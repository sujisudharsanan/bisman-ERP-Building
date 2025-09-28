#!/usr/bin/env bash
set -euo pipefail

echo "=== Starting full production deploy ==="

# --- Step 0: Repo-local npm cache fallback ---
TMP_NPM_CACHE=$(mktemp -d)
echo "Using temporary npm cache at $TMP_NPM_CACHE"
npm install --cache "$TMP_NPM_CACHE" || {
  echo "Fallback: npm install retry with temporary cache"
  npm install --cache "$TMP_NPM_CACHE"
}

# --- Step 1: Build backend ---
echo "Building backend..."
npm run build:backend

# --- Step 2: Build frontend ---
echo "Building frontend..."
npm --prefix ./my-frontend run build

# --- Step 3: Start PM2-managed services ---
echo "Starting PM2 services..."
npx pm2 start ecosystem.config.js --only bisman-next,bisman-api

# Quiet cleanup to suppress messages if PM2 is used
cleanup() {
  if ! npx pm2 pid bisman-api > /dev/null 2>&1; then
    echo "Stopping child processes..."
    pkill -P $$ || true
  fi
}
trap cleanup EXIT

# Allow a few seconds for services to warm up
sleep 5

# --- Step 4: Run PM2-aware smoke test ---
echo "Running smoke tests..."
bash scripts/smoke-test-pm2.sh

echo "=== Production deploy complete ✅ ==="
echo "bisman-api (Nest) on port 3000"
echo "bisman-next (Next) on port 3001, proxied by Nest"
echo "Smoke tests passed; services running under PM2"
