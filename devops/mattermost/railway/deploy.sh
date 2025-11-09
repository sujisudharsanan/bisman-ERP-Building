#!/usr/bin/env bash
set -euo pipefail

# Mattermost Railway Deployment Script
# Uses external Neon PostgreSQL database

echo "🚀 Deploying Mattermost to Railway with Neon PostgreSQL"

# Check Railway CLI
if ! command -v railway >/dev/null 2>&1; then
  echo "❌ Railway CLI not found. Installing..."
  npm install -g @railway/cli
fi

# Neon Database URL
NEON_DB_URL="postgres://bisman-erp-db:Suji@335960@ep-cool-host.ap-southeast-1.aws.neon.tech:5432/mattermost?sslmode=require&connect_timeout=10"

echo "📋 Step 1: Link Railway project"
railway link || {
  echo "⚠️  Not linked. Please run 'railway link' interactively first."
  exit 1
}

echo "📋 Step 2: Setting environment variables"
railway variables --set "MM_SERVICESETTINGS_SITEURL=https://mattermost-production.up.railway.app"
railway variables --set "MM_SQLSETTINGS_DRIVERNAME=postgres"
railway variables --set "MM_SQLSETTINGS_DATASOURCE=${NEON_DB_URL}"
railway variables --set "MM_FILESETTINGS_DRIVERNAME=local"
railway variables --set "MM_FILESETTINGS_DIRECTORY=/mattermost/data"
railway variables --set "MM_PLUGINSETTINGS_ENABLE=true"
railway variables --set "MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true"
railway variables --set "MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true"
railway variables --set "MM_TEAM_SLUG=erp"

echo "📋 Step 3: Deploying to Railway"
railway up --detach

echo "📋 Step 4: Checking deployment status"
sleep 5
railway status

echo "📋 Step 5: Viewing logs"
railway logs --lines 100

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Next steps:"
echo "   1. Get your Railway URL: railway domain"
echo "   2. Update MM_SERVICESETTINGS_SITEURL with actual domain"
echo "   3. Test: curl https://your-domain.up.railway.app/api/v4/system/ping"
echo "   4. Open: railway open"
echo ""
