#!/usr/bin/env bash
set -euo pipefail

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found. Install: npm i -g @railway/cli" >&2
  exit 1
fi

APP_NAME=${1:-mattermost}
TEAM_SLUG=${MM_TEAM_SLUG:-erp}

echo "[railway] Creating project (if missing): $APP_NAME";
railway init --name "$APP_NAME" >/dev/null 2>&1 || true
railway link --name "$APP_NAME"

echo "[railway] Ensuring Postgres service";
PG_SERVICE_ID=$(railway service:list --json | jq -r '.services[] | select(.name=="postgres" or .plugins[]?.name=="postgres") | .id' || true)
if [ -z "$PG_SERVICE_ID" ]; then
  railway service:create --name postgres --plugin postgresql
  PG_SERVICE_ID=$(railway service:list --json | jq -r '.services[] | select(.name=="postgres" or .plugins[]?.name=="postgres") | .id')
fi

echo "[railway] Setting Mattermost env vars";
railway variables set \
  MM_SERVICESETTINGS_SITEURL="https://$APP_NAME.up.railway.app" \
  MM_SQLSETTINGS_DRIVERNAME=postgres \
  MM_SQLSETTINGS_DATASOURCE="$(railway variables | awk -F= '/PGHOST/ {h=$2} /PGPORT/ {p=$2} /PGDATABASE/ {d=$2} /PGUSER/ {u=$2} /PGPASSWORD/ {pw=$2} END {print "postgres://"u":"pw"@"h":"p"/"d"?sslmode=disable&connect_timeout=10"}')" \
  MM_FILESETTINGS_DRIVERNAME=local \
  MM_FILESETTINGS_DIRECTORY=/mattermost/data \
  MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true \
  MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true \
  MM_PLUGINSETTINGS_ENABLE=true \
  MM_TEAM_SLUG="$TEAM_SLUG"

echo "[railway] Deploying container"
railway up --service "$APP_NAME" --detached

echo "[railway] Provisioning complete. Verify logs: railway logs --service $APP_NAME"
