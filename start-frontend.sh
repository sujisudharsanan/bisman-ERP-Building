#!/bin/sh
# Frontend-only startup script for Railway
# Starts Next.js frontend in production mode

echo "============================================"
echo "FRONTEND SERVICE STARTUP"
echo "============================================"
echo "Time: $(date)"
echo "PID: $$"
echo "Working directory: $(pwd)"
echo "Node: $(node --version 2>/dev/null || echo 'missing')"
echo "============================================"

# Check if we're in standalone mode
if [ -f /app/frontend/.next/standalone/server.js ]; then
  echo "[frontend] Running Next.js in standalone mode"
  cd /app/frontend/.next/standalone
  exec node server.js
elif [ -d /app/frontend/.next ]; then
  echo "[frontend] Running Next.js start command"
  cd /app/frontend
  exec npm start
else
  echo "[ERROR] No Next.js build found!"
  echo "Expected: /app/frontend/.next/standalone/server.js or /app/frontend/.next"
  ls -la /app/frontend/ || echo "Frontend directory not found"
  exit 1
fi
