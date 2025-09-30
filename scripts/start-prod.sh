#!/usr/bin/env bash
set -euo pipefail

# scripts/start-prod.sh
# Build frontend and backend, then start frontend (3001) and backend (3000).

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/my-frontend"
BACKEND_DIR="$ROOT_DIR"

FRONTEND_LOG="/tmp/bisman-frontend.log"
BACKEND_LOG="/tmp/bisman-backend.log"

echo "[start-prod] root=$ROOT_DIR"

echo "[start-prod] Building frontend..."
cd "$FRONTEND_DIR"
npm run build

echo "[start-prod] Building backend..."
cd "$BACKEND_DIR"
npm run build:backend

# Start frontend (next start) in background
echo "[start-prod] Starting frontend (next start) -> $FRONTEND_LOG"
cd "$FRONTEND_DIR"
nohup npm run start --silent -- -p 3001 &> "$FRONTEND_LOG" &
FRONTEND_PID=$!
sleep 0.5

echo "[start-prod] Starting backend (node dist) -> $BACKEND_LOG"
cd "$BACKEND_DIR"
nohup npm run start:backend &> "$BACKEND_LOG" &
BACKEND_PID=$!
sleep 1

echo "[start-prod] frontend pid=$FRONTEND_PID backend pid=$BACKEND_PID"
echo "[start-prod] waiting a moment for servers to warm up..."
sleep 1

echo "[start-prod] running smoke tests"
echo "-- GET /health --"
curl -sS -D - http://localhost:3000/health || true
echo "\n-- POST /api/login --"
curl -sS -D - -X POST http://localhost:3000/api/login -H 'Content-Type: application/json' -d '{"username":"a","password":"b"}' -c /tmp/bisman-cookie.txt || true
echo "\n-- GET /api/me (with cookie) --"
curl -sS -D - http://localhost:3000/api/me -b /tmp/bisman-cookie.txt || true

echo "[start-prod] logs: frontend=$FRONTEND_LOG backend=$BACKEND_LOG"
echo "[start-prod] done"

exit 0
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
