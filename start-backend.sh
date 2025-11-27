#!/bin/sh
# Backend-only startup script for Railway
# Runs migrations and starts Express backend

echo "============================================"
echo "BACKEND SERVICE STARTUP"
echo "============================================"
echo "Time: $(date)"
echo "PID: $$"
echo "Working directory: $(pwd)"
echo "Node: $(node --version 2>/dev/null || echo 'missing')"
echo "============================================"

# Allow failures in migration block without stopping server startup
set +e

if [ -n "$DATABASE_URL" ]; then
  echo "[db] DATABASE_URL detected"
  echo "[db] Sanitized: $(echo "$DATABASE_URL" | sed 's/:[^@]*@/:***@/')"
  
  if [ -d /app/prisma/migrations ] && [ "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then
    echo "[db] Migrations found. Running prisma migrate deploy (30s timeout)..."
    if timeout 30 npx prisma migrate deploy 2>&1; then
      echo "[db] ✅ Migrations complete"
    else
      EXIT_CODE=$?
      echo "[db] ⚠️ migrate deploy failed (code $EXIT_CODE). Continuing anyway."
    fi
  else
    echo "[db] No migrations directory or empty. Skipping migrate deploy."
  fi
else
  echo "[db] No DATABASE_URL set. Skipping migrations."
fi

echo "============================================"
echo "[start] Launching backend: node index.js"
echo "============================================"
exec node index.js
