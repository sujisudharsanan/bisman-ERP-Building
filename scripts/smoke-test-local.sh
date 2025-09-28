#!/usr/bin/env bash
set -euo pipefail

NEXT_PORT=3001
NEXT_URL="http://localhost:${NEXT_PORT}"
NEST_PORT=3000
NEST_URL="http://localhost:${NEST_PORT}"

echo "=== Running PM2-aware smoke tests ==="

PASSED=0
FAILED=0

retry_curl() {
  local url=$1
  local name=$2
  local retries=10
  local delay=5

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

echo "--- Testing NestJS backend ---"
retry_curl "${NEST_URL}/health" "NestJS health"
if curl -fsS "${NEST_URL}/health" | grep -q '"status":"ok"'; then
  echo "[OK] NestJS health payload correct"
  PASSED=$((PASSED+1))
else
  echo "[FAIL] NestJS health payload incorrect"
  FAILED=$((FAILED+1))
fi

echo "--- Testing Next.js frontend ---"
retry_curl "${NEXT_URL}/" "Next.js homepage"

# Dynamic chunk detection
CHUNK_FILE=$(ls ./my-frontend/.next/static/chunks/main*.js | head -n1 | xargs -n1 basename)
retry_curl "${NEXT_URL}/_next/static/chunks/$CHUNK_FILE" "Next.js static assets"

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
