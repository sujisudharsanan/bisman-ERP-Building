#!/usr/bin/env bash
set -e

echo "🚀 Deploying Mattermost to ERP Railway Project"
echo ""

# Neon Database URL
NEON_DB="postgres://bisman-erp-db:Suji@335960@ep-cool-host.ap-southeast-1.aws.neon.tech:5432/mattermost?sslmode=require&connect_timeout=10"

# Navigate to deployment directory
cd "$(dirname "$0")"

echo "📋 Step 1: Check Railway status"
railway status || {
  echo "❌ Not linked to a Railway project."
  echo "   Run: railway link"
  echo "   Then select your ERP project (discerning-creativity)"
  exit 1
}

echo ""
echo "📋 Step 2: Setting Mattermost environment variables..."

# Set variables individually (Railway CLI syntax)
railway variables --set "MM_SERVICESETTINGS_SITEURL=https://mattermost.up.railway.app" && echo "✓ Set SITEURL"
railway variables --set "MM_SQLSETTINGS_DRIVERNAME=postgres" && echo "✓ Set DRIVERNAME"
railway variables --set "MM_SQLSETTINGS_DATASOURCE=${NEON_DB}" && echo "✓ Set DATASOURCE"
railway variables --set "MM_FILESETTINGS_DRIVERNAME=local" && echo "✓ Set FILE DRIVER"
railway variables --set "MM_FILESETTINGS_DIRECTORY=/mattermost/data" && echo "✓ Set FILE DIR"
railway variables --set "MM_PLUGINSETTINGS_ENABLE=true" && echo "✓ Set PLUGINS"
railway variables --set "MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true" && echo "✓ Set PAT"
railway variables --set "MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true" && echo "✓ Set UAT"
railway variables --set "MM_TEAM_SLUG=erp" && echo "✓ Set TEAM_SLUG"

echo ""
echo "📋 Step 3: Deploying Mattermost Docker container..."
railway up --detach

echo ""
echo "📋 Step 4: Getting deployment info..."
sleep 3
railway status

echo ""
echo "📋 Step 5: Getting Railway domain..."
DOMAIN=$(railway domain 2>&1 | grep -o 'https://[^[:space:]]*' | head -1 || echo "")

if [ -n "$DOMAIN" ]; then
  echo "   🌐 Mattermost URL: $DOMAIN"
else
  echo "   ⚠️  No domain yet. Generate one with: railway domain"
fi

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📍 Next steps:"
echo "   1. Check logs: railway logs --lines 100"
echo "   2. Wait 2-3 minutes for Mattermost to start"
echo "   3. Test: curl $DOMAIN/api/v4/system/ping"
echo "   4. Open: railway open"
echo ""
