#!/usr/bin/env bash
set -euo pipefail

# Usage: bash setup-mattermost.sh [project-name]
APP_NAME=${1:-mattermost}

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1. Please install it first." >&2; exit 1; }; }

need railway

echo "[1/7] Linking project ($APP_NAME) and creating environment if needed"
railway init --name "$APP_NAME" >/dev/null 2>&1 || true
railway link || true

echo "[2/7] Ensuring Postgres service exists"
if ! railway add postgresql >/dev/null 2>&1; then
  echo "  Postgres may already exist; continuing"
fi

echo "[3/7] Reading Postgres variables"
KV=$(railway variables --kv || true)
PGHOST=$(echo "$KV" | awk -F= '/^PGHOST=/ {print $2}')
PGPORT=$(echo "$KV" | awk -F= '/^PGPORT=/ {print $2}')
PGDATABASE=$(echo "$KV" | awk -F= '/^PGDATABASE=/ {print $2}')
PGUSER=$(echo "$KV" | awk -F= '/^PGUSER=/ {print $2}')
PGPASSWORD=$(echo "$KV" | awk -F= '/^PGPASSWORD=/ {print $2}')

if [ -z "${PGHOST:-}" ] || [ -z "${PGPORT:-}" ] || [ -z "${PGDATABASE:-}" ] || [ -z "${PGUSER:-}" ] || [ -z "${PGPASSWORD:-}" ]; then
  echo "Could not read Postgres variables. Open Railway dashboard to add Postgres plugin, then re-run." >&2
  exit 1
fi

DSN="postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=disable&connect_timeout=10"

echo "[4/7] Setting Mattermost variables"
railway variables --set "MM_SERVICESETTINGS_SITEURL=https://${APP_NAME}.up.railway.app"
railway variables --set "MM_SQLSETTINGS_DRIVERNAME=postgres"
railway variables --set "MM_SQLSETTINGS_DATASOURCE=${DSN}"
railway variables --set "MM_FILESETTINGS_DRIVERNAME=local"
railway variables --set "MM_FILESETTINGS_DIRECTORY=/mattermost/data"
railway variables --set "MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true"
railway variables --set "MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true"
railway variables --set "MM_PLUGINSETTINGS_ENABLE=true"
railway variables --set "MM_TEAM_SLUG=erp"

echo "[5/7] Deploying (Dockerfile in this directory)"
railway up --detach

echo "[6/7] Tailing logs (press Ctrl+C to stop)"
railway logs --lines 200 || true

echo "[7/7] Open dashboard"
railway open || true

echo "Done. Hit: https://${APP_NAME}.up.railway.app"
