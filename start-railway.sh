#!/bin/sh
# Root wrapper to ensure Railway build context always has startup script even if scripts/ excluded.
# Delegates to scripts/start-railway.sh if present; otherwise minimal fallback to start backend.

set -e

if [ -f /app/scripts/start-railway.sh ]; then
  echo "[wrapper] Delegating to /app/scripts/start-railway.sh"
  exec /app/scripts/start-railway.sh
fi

echo "[wrapper] WARNING: /app/scripts/start-railway.sh missing; running fallback"
# Fallback: run migrations lightly if prisma exists
if [ -d /app/prisma ]; then
  echo "[wrapper] Attempting prisma migrate deploy (30s timeout)"
  timeout 30 npx prisma migrate deploy || echo "[wrapper] migrate deploy failed or timed out"
fi
echo "[wrapper] Starting node index.js"
exec node index.js
