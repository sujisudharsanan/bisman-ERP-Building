#!/usr/bin/env bash
set -euo pipefail

# Cleanly stop any existing API processes and start one backend instance with DB configured.
# Usage: ./scripts/clean_start_backend.sh

LOG=/tmp/clean_backend.log
PIDFILE=/tmp/clean_backend.pid
DBURL="postgresql://erp_admin:StrongPassword123@127.0.0.1:5432/bisman"
PORT=${PORT:-3000}

echo "[CLEAN START] killing any processes listening on port $PORT"
PIDS=$(lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t || true)
if [ -n "$PIDS" ]; then
  echo "killing: $PIDS"
  echo "$PIDS" | xargs -r -n1 kill -9 || true
  sleep 1
else
  echo "no listener on ${PORT}"
fi

# Also kill any ts-node or dist main variants to be safe
CAND=$(ps aux | egrep "apps/api/src/main.ts|dist/apps/api/src/main.js" | egrep -v egrep | awk '{print $2}' || true)
if [ -n "$CAND" ]; then
  echo "killing candidate pids: $CAND"
  echo "$CAND" | xargs -r -n1 kill -9 || true
  sleep 1
fi

rm -f "$LOG" "$PIDFILE" || true

echo "[CLEAN START] starting backend (logs -> $LOG)"
# Start using npx ts-node to avoid npm wrapper races
echo $! > "$PIDFILE"

sleep 3

echo "[CLEAN START] started pid=$(cat $PIDFILE)"

echo "[CLEAN START] recent log output (tail):"
tail -n 300 "$LOG" || true

echo "[CLEAN START] checking endpoints"
echo "- /health"
curl -sS -D - http://127.0.0.1:${PORT}/health -o /tmp/clean_h1 || true; sed -n '1,200p' /tmp/clean_h1 || true

echo "- /api/health/db"
curl -sS -D - http://127.0.0.1:${PORT}/api/health/db -o /tmp/clean_h2 || true; sed -n '1,200p' /tmp/clean_h2 || true

echo "[CLEAN START] done"
