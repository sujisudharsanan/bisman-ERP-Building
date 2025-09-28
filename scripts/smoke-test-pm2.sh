#!/usr/bin/env bash
set -euo pipefail

# PM2-aware smoke test script
# Defaults tailored to this repo: Next (frontend) on 3001, Nest (api) on 3000

# --- Configuration ---
NEXT_PORT=${NEXT_PORT:-3001}
NEST_PORT=${NEST_PORT:-3000}

NEXT_URL="http://localhost:${NEXT_PORT}"
NEST_URL="http://localhost:${NEST_PORT}"

echo "=== Starting production services via pm2 (if not already) ==="

# prefer global pm2, fall back to npx pm2
if command -v pm2 >/dev/null 2>&1; then
  PM2_CMD=pm2
else
  PM2_CMD="npx pm2"
fi

# Start apps via pm2 (idempotent)
${PM2_CMD} start ecosystem.config.js --only bisman-next,bisman-api || true

# Quiet cleanup trap to prevent messages when pm2 is used
cleanup() {
  if ! ${PM2_CMD} pid bisman-api > /dev/null 2>&1; then
    echo "Stopping child processes..."
    pkill -P $$ || true
  fi
}
trap cleanup EXIT

# Optional: give services a few seconds to warm up
sleep 5

# --- Smoke Test Function ---
PASSED=0
FAILED=0

retry_curl() {
  local url=$1
  local name=$2
  local retries=10
  local delay=3

  for i in $(seq 1 $retries); do
    if curl -fsS "$url" > /dev/null; then
      echo "[OK] $name responded at $url"
      PASSED=$((PASSED+1))
      return 0
    fi
    echo "[Retry $i/$retries] $name not ready at $url, waiting ${delay}s..."
    sleep $delay
  done

  echo "[FAIL] $name did not respond at $url after $retries attempts"
  FAILED=$((FAILED+1))
  return 1
}

echo "=== Running smoke tests ==="

# Backend (NestJS)
retry_curl "${NEST_URL}/health" "NestJS health"
if curl -fsS "${NEST_URL}/health" | grep -q "status"; then
  echo "[OK] NestJS health payload includes 'status'"
  PASSED=$((PASSED+1))
else
  echo "[FAIL] NestJS health payload incorrect"
  FAILED=$((FAILED+1))
fi

# Frontend via Nest proxy (single-origin)
retry_curl "${NEST_URL}/" "Frontend (via Nest proxy)"
# pick a stable chunk file that exists in the built .next output
CHUNK="117-46c53b54c8b6f547.js"
retry_curl "${NEST_URL}/_next/static/chunks/${CHUNK}" "Frontend static asset (via Nest proxy)"

# --- Summary ---
echo "=== Smoke test summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ "$FAILED" -gt 0 ]; then
  echo "Smoke tests FAILED ❌"
  exit 1
else
  echo "All smoke tests PASSED ✅"
  exit 0
fi
