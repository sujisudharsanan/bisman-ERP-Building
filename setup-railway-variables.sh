#!/bin/bash

# 🚀 Railway Variables Setup Script
# This script will set all required environment variables for your Railway services

echo "🚀 Railway Variables Setup for BISMAN ERP"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Your service URLs
BACKEND_URL="https://bisman-erp-backend-production.up.railway.app"
FRONTEND_URL="https://bisman-erp-frontend-production.up.railway.app"

echo -e "${YELLOW}Step 1: Login to Railway${NC}"
echo "Running: railway login --browserless"
railway login --browserless

echo ""
echo -e "${YELLOW}Step 2: Link to your project${NC}"
echo "Running: railway link"
railway link

echo ""
echo -e "${YELLOW}Step 3: Select Backend Service${NC}"
echo "Please select: bisman-ERP-Backend"
railway service

echo ""
echo -e "${YELLOW}Step 4: Setting Backend Variables${NC}"

# Backend variables
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

echo -e "${GREEN}✅ Backend variables set!${NC}"

echo ""
echo -e "${YELLOW}Step 5: Select Frontend Service${NC}"
echo "Please select: bisman-ERP-frontend"
railway service

echo ""
echo -e "${YELLOW}Step 6: Setting Frontend Variables${NC}"

# Frontend variables
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set RAILWAY=1
railway variables set NEXT_TELEMETRY_DISABLED=1
railway variables set NEXT_PUBLIC_ENABLE_CHAT=true
railway variables set NEXT_PUBLIC_ENV=production
railway variables set NEXT_PUBLIC_API_URL=$BACKEND_URL
railway variables set NEXT_PUBLIC_API_BASE=$BACKEND_URL
railway variables set NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL

echo -e "${GREEN}✅ Frontend variables set!${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "✅ All variables have been set!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Redeploy backend: railway service (select backend) → railway up"
echo "2. Redeploy frontend: railway service (select frontend) → railway up"
echo ""
echo "Or use Railway Dashboard → Service → Deployments → Deploy button"
echo ""
echo -e "${GREEN}🎉 Configuration Complete!${NC}"
