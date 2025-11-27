#!/bin/bash

# 🚀 Railway Variables Setup - Step by Step
# Run each section one at a time

echo "🚀 Railway Variables Setup for BISMAN ERP"
echo "=========================================="
echo ""

# Your service URLs
BACKEND_URL="https://bisman-erp-backend-production.up.railway.app"
FRONTEND_URL="https://bisman-erp-frontend-production.up.railway.app"

echo "📋 STEP 1: Login to Railway"
echo "----------------------------"
echo "Run: railway login --browserless"
echo ""
read -p "Press Enter after you've logged in successfully..."

echo ""
echo "📋 STEP 2: Link to Project"
echo "----------------------------"
echo "Run: railway link"
echo ""
read -p "Press Enter after linking..."

echo ""
echo "📋 STEP 3: Set Backend Variables"
echo "----------------------------"
echo "First, select the BACKEND service:"
railway service

echo ""
echo "Now setting backend variables..."
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set FRONTEND_URL=$FRONTEND_URL
railway variables set FRONTEND_URLS=$FRONTEND_URL
railway variables set CORS_ORIGIN=$FRONTEND_URL
railway variables set ALLOW_LOCALHOST=0
railway variables set DATABASE_POOL_MIN=2
railway variables set DATABASE_POOL_MAX=10
railway variables set LOG_LEVEL=info
railway variables set JWT_SECRET="bisman-erp-jwt-secret-change-this-$(date +%s)"
railway variables set SESSION_SECRET="bisman-erp-session-secret-change-this-$(date +%s)"

echo "✅ Backend variables set!"

echo ""
echo "📋 STEP 4: Set Frontend Variables"
echo "----------------------------"
echo "Now, select the FRONTEND service:"
railway service

echo ""
echo "Setting frontend variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set RAILWAY=1
railway variables set NEXT_TELEMETRY_DISABLED=1
railway variables set NEXT_PUBLIC_ENABLE_CHAT=true
railway variables set NEXT_PUBLIC_ENV=production
railway variables set NEXT_PUBLIC_API_URL=$BACKEND_URL
railway variables set NEXT_PUBLIC_API_BASE=$BACKEND_URL
railway variables set NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL

echo "✅ Frontend variables set!"

echo ""
echo "🎉 All Done!"
echo "=========================================="
echo ""
echo "Next: Redeploy both services in Railway Dashboard"
