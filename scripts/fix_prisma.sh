#!/usr/bin/env bash
set -euo pipefail

echo "cwd=$(pwd)"

DBURL="postgresql://erp_admin:StrongPassword123@127.0.0.1:5432/bisman?schema=public"

echo "[1] check erp_admin role"
psql -U postgres -At -c "SELECT rolname||'|'||rolcreatedb FROM pg_roles WHERE rolname='erp_admin';" || true

echo "[2] ensure erp_admin CREATEDB"
psql -U postgres -c "ALTER ROLE erp_admin CREATEDB;" || true

if [ -f my-backend/package.json ]; then
  echo "[3] installing node deps in my-backend"
  (cd my-backend && npm ci --no-audit --no-fund) || (cd my-backend && npm install --no-audit --no-fund) || true
else
  echo "[3] my-backend/package.json not found, skipping npm install"
fi

if [ -f my-backend/prisma/schema.prisma ]; then
  echo "[4] prisma generate"
  (cd my-backend && env DATABASE_URL="$DBURL" npx --yes prisma generate) || true

  echo "[5] prisma migrate deploy"
  (cd my-backend && env DATABASE_URL="$DBURL" npx --yes prisma migrate deploy) || true
else
  echo "[4/5] prisma schema not found, skipping"
fi

echo "done"
