#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Checking Mattermost Railway Deployment"
echo ""

# Get Railway domain
echo "📍 Getting Railway domain..."
DOMAIN=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1 || echo "")

if [ -z "$DOMAIN" ]; then
  echo "⚠️  No domain found. Generating one..."
  railway domain
  DOMAIN=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1)
fi

echo "   Domain: $DOMAIN"
echo ""

# Check deployment status
echo "📊 Deployment Status:"
railway status
echo ""

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready (max 2 minutes)..."
MAX_ATTEMPTS=24
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${DOMAIN}/api/v4/system/ping" || echo "000")
  
  if [ "$RESPONSE" = "200" ]; then
    echo "✅ Mattermost is UP and running!"
    echo ""
    echo "📍 URLs:"
    echo "   Web UI:  $DOMAIN"
    echo "   Health:  ${DOMAIN}/api/v4/system/ping"
    echo ""
    echo "🧪 Testing health endpoint:"
    curl -s "${DOMAIN}/api/v4/system/ping" | jq . || curl -s "${DOMAIN}/api/v4/system/ping"
    echo ""
    echo ""
    echo "✅ Next steps:"
    echo "   1. Open: railway open"
    echo "   2. Create admin account in Mattermost UI"
    echo "   3. Generate Personal Access Token"
    echo "   4. Update .env.local:"
    echo "      MM_BASE_URL=${DOMAIN}"
    echo "      MM_ADMIN_TOKEN=<your-token>"
    echo "      NEXT_PUBLIC_MM_TEAM_SLUG=erp"
    exit 0
  fi
  
  echo "   Attempt $((ATTEMPT + 1))/$MAX_ATTEMPTS - Status: $RESPONSE - Retrying in 5s..."
  sleep 5
  ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "❌ Deployment did not become ready in time."
echo ""
echo "🔍 Check logs:"
echo "   railway logs --lines 200"
echo ""
echo "🌐 Check build:"
echo "   railway open"

exit 1
