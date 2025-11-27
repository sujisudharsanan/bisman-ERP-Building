#!/bin/bash

# ============================================
# Railway Environment Variables Setup Script
# ============================================

echo "🚀 Setting up Railway environment variables..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed"
    echo ""
fi

# Login to Railway (if not already logged in)
echo "🔐 Logging in to Railway..."
railway login
echo ""

# Link to project (if not already linked)
echo "🔗 Linking to Railway project..."
railway link
echo ""

# Set required environment variables
echo "📝 Setting environment variables..."
echo ""

# Critical variables
echo "Setting DATABASE_URL..."
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'

echo "Setting JWT_SECRET..."
railway variables set JWT_SECRET='bisman_erp_production_secure_jwt_secret_key_2025_railway_v1'

echo "Setting FRONTEND_URL..."
read -p "Enter your Railway frontend URL (e.g., https://your-app.railway.app): " FRONTEND_URL
railway variables set FRONTEND_URL="$FRONTEND_URL"

echo "Setting NODE_ENV..."
railway variables set NODE_ENV='production'

echo "Setting OTP_HASH_SECRET..."
railway variables set OTP_HASH_SECRET='bisman_erp_production_otp_hash_secret_key_2025_secure'

echo "Setting FRONTEND_URLS..."
railway variables set FRONTEND_URLS="$FRONTEND_URL,https://bisman-erp-backend-production.up.railway.app"

echo "Setting DISABLE_RATE_LIMIT..."
railway variables set DISABLE_RATE_LIMIT='false'

echo ""
echo "✅ All environment variables set successfully!"
echo ""
echo "📊 Verifying variables..."
railway variables
echo ""
echo "🚀 Railway will automatically redeploy with new variables"
echo "⏳ Check deployment logs: railway logs"
echo ""
