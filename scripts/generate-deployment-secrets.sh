#!/bin/bash

# 🚀 Bisman ERP - Deployment Configuration Helper
# This script helps you prepare environment variables for cloud deployment

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   🚀 Bisman ERP - Cloud Deployment Configuration Helper   ║"
echo "╔════════════════════════════════════════════════════════════╗"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate secrets
echo -e "${BLUE}📝 Generating secure secrets...${NC}"
echo ""

echo -e "${GREEN}1. JWT Secret (use this in Render):${NC}"
JWT_SECRET=$(openssl rand -base64 32)
echo "   JWT_SECRET=$JWT_SECRET"
echo ""

echo -e "${GREEN}2. Database Password (if creating manually):${NC}"
DB_PASSWORD=$(openssl rand -base64 24)
echo "   DB_PASSWORD=$DB_PASSWORD"
echo ""

echo -e "${GREEN}3. Session Secret (optional):${NC}"
SESSION_SECRET=$(openssl rand -base64 32)
echo "   SESSION_SECRET=$SESSION_SECRET"
echo ""

# Save to file
echo -e "${YELLOW}💾 Saving to deployment-secrets.txt (DO NOT COMMIT THIS FILE!)${NC}"
cat > deployment-secrets.txt <<EOF
# 🔐 Bisman ERP Deployment Secrets
# Generated: $(date)
# ⚠️  DO NOT COMMIT THIS FILE TO GIT!
# ⚠️  Copy these values to your cloud platform dashboards, then delete this file

═══════════════════════════════════════════════════════════════

RENDER (Backend) Environment Variables:
═══════════════════════════════════════════════════════════════

# Server
PORT=10000
NODE_ENV=production

# Database (get this from Render PostgreSQL dashboard)
DATABASE_URL=postgres://user:password@dpg-xxxxx.oregon-postgres.render.com/bisman_db

# JWT
JWT_SECRET=$JWT_SECRET

# Frontend CORS (update with your Vercel URL)
FRONTEND_URL=https://your-app-name.vercel.app
FRONTEND_URLS=https://your-app-name.vercel.app

# Optional: Session Secret
SESSION_SECRET=$SESSION_SECRET

═══════════════════════════════════════════════════════════════

VERCEL (Frontend) Environment Variables:
═══════════════════════════════════════════════════════════════

# Backend API (update with your Render URL)
NEXT_PUBLIC_API_URL=https://bisman-erp-backend.onrender.com

# Environment
NODE_ENV=production

═══════════════════════════════════════════════════════════════

STEPS TO DEPLOY:
═══════════════════════════════════════════════════════════════

1. Backend (Render):
   - Go to: https://dashboard.render.com
   - Create PostgreSQL database → Copy DATABASE_URL
   - Create Web Service → Connect GitHub repo
   - Set Root Directory: my-backend
   - Add environment variables from above
   - Deploy!

2. Frontend (Vercel):
   - Go to: https://vercel.com/dashboard
   - Import GitHub repo → Select my-frontend
   - Add environment variables from above
   - Deploy!

3. Connect them:
   - Update FRONTEND_URL in Render with your Vercel URL
   - Update NEXT_PUBLIC_API_URL in Vercel with your Render URL
   - Redeploy both

═══════════════════════════════════════════════════════════════

IMPORTANT:
- Delete this file after copying values to cloud dashboards
- Never commit this file to Git
- Keep these secrets secure

EOF

echo ""
echo -e "${GREEN}✅ Secrets saved to: deployment-secrets.txt${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "   1. Copy these values to Render and Vercel dashboards"
echo "   2. Delete deployment-secrets.txt after copying"
echo "   3. Never commit secrets to Git"
echo ""
echo -e "${BLUE}📖 For detailed instructions, see: CLOUD_DEPLOYMENT_GUIDE.md${NC}"
echo ""
