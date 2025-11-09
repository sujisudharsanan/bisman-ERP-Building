#!/bin/bash
set -e

echo "🔧 Updating Mattermost to use Railway PostgreSQL Database"
echo ""
echo "⚠️  You need to provide your Railway database credentials:"
echo ""
echo "Railway Database Host: crossover.proxy.rlwy.net:32852"
echo ""
read -p "Enter Railway database username (usually 'postgres'): " DB_USER
read -sp "Enter Railway database password: " DB_PASSWORD
echo ""
read -p "Enter Railway database name (usually 'railway'): " DB_NAME
echo ""

# Construct the connection string
DB_CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@crossover.proxy.rlwy.net:32852/${DB_NAME}?sslmode=require&connect_timeout=10"

echo ""
echo "📋 Setting Railway environment variables..."
echo ""

# Update the database connection string
railway variables --set "MM_SQLSETTINGS_DATASOURCE=${DB_CONNECTION_STRING}"

echo ""
echo "✅ Database connection updated!"
echo ""
echo "🚀 Redeploying Mattermost..."
railway up --detach

echo ""
echo "⏳ Waiting 60 seconds for deployment..."
sleep 60

echo ""
echo "🔍 Testing deployment..."
RESPONSE=$(curl -s https://mattermost-production.up.railway.app/api/v4/system/ping)

if echo "$RESPONSE" | grep -q "OK\|ok"; then
    echo "✅ Mattermost is running!"
    echo ""
    echo "🌐 Access your Mattermost at:"
    echo "   https://mattermost-production.up.railway.app"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Open the URL in your browser"
    echo "   2. Create the first admin account"
    echo "   3. Generate a Personal Access Token"
    echo "   4. Update my-frontend/.env.local with:"
    echo "      MM_BASE_URL=https://mattermost-production.up.railway.app"
    echo "      MM_ADMIN_TOKEN=<your-token>"
else
    echo "❌ Mattermost not responding yet"
    echo "Response: $RESPONSE"
    echo ""
    echo "Check logs: railway logs --lines 100"
fi
