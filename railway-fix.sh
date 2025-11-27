#!/bin/bash
# Railway Deployment Fix Script
# Run this after: railway link

echo "============================================"
echo "🚀 RAILWAY DEPLOYMENT FIX SCRIPT"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Checking current Railway configuration..."
echo ""

# Check if linked to Railway
if ! railway status &> /dev/null; then
    echo -e "${RED}❌ Not linked to Railway project${NC}"
    echo "Please run: railway link"
    exit 1
fi

echo -e "${GREEN}✅ Linked to Railway project${NC}"
echo ""

# Show current status
echo "📊 Current Project Status:"
railway status
echo ""

# Check existing variables
echo "🔍 Checking environment variables..."
echo ""
railway variables > /tmp/railway_vars.txt

# Check for required variables
echo "Required Variables Status:"
echo ""

if grep -q "DATABASE_URL" /tmp/railway_vars.txt; then
    echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
else
    echo -e "${RED}❌ DATABASE_URL is missing${NC}"
    echo "   💡 Add PostgreSQL: railway add --database postgres"
fi

if grep -q "FRONTEND_URL" /tmp/railway_vars.txt; then
    echo -e "${GREEN}✅ FRONTEND_URL is set${NC}"
else
    echo -e "${RED}❌ FRONTEND_URL is missing${NC}"
    echo "   💡 Will prompt to set it below"
    NEED_FRONTEND_URL=true
fi

if grep -q "JWT_SECRET" /tmp/railway_vars.txt; then
    echo -e "${GREEN}✅ JWT_SECRET is set${NC}"
else
    echo -e "${RED}❌ JWT_SECRET is missing${NC}"
    echo "   💡 Will generate and set it below"
    NEED_JWT_SECRET=true
fi

if grep -q "SESSION_SECRET" /tmp/railway_vars.txt; then
    echo -e "${GREEN}✅ SESSION_SECRET is set${NC}"
else
    echo -e "${RED}❌ SESSION_SECRET is missing${NC}"
    echo "   💡 Will generate and set it below"
    NEED_SESSION_SECRET=true
fi

echo ""
echo "============================================"
echo "🔧 FIX MISSING VARIABLES"
echo "============================================"
echo ""

# Set FRONTEND_URL if missing
if [ "$NEED_FRONTEND_URL" = true ]; then
    echo "Enter your frontend URL (e.g., https://my-frontend.railway.app):"
    read -r FRONTEND_URL
    if [ -n "$FRONTEND_URL" ]; then
        echo "Setting FRONTEND_URL..."
        railway variables --set FRONTEND_URL="$FRONTEND_URL"
        echo -e "${GREEN}✅ FRONTEND_URL set${NC}"
    fi
    echo ""
fi

# Set JWT_SECRET if missing
if [ "$NEED_JWT_SECRET" = true ]; then
    echo "Generating JWT_SECRET..."
    JWT_SECRET=$(openssl rand -base64 48)
    railway variables --set JWT_SECRET="$JWT_SECRET"
    echo -e "${GREEN}✅ JWT_SECRET generated and set${NC}"
    echo ""
fi

# Set SESSION_SECRET if missing
if [ "$NEED_SESSION_SECRET" = true ]; then
    echo "Generating SESSION_SECRET..."
    SESSION_SECRET=$(openssl rand -base64 48)
    railway variables --set SESSION_SECRET="$SESSION_SECRET"
    echo -e "${GREEN}✅ SESSION_SECRET generated and set${NC}"
    echo ""
fi

echo "============================================"
echo "📦 DATABASE SETUP"
echo "============================================"
echo ""

if ! grep -q "DATABASE_URL" /tmp/railway_vars.txt; then
    echo "Do you want to add PostgreSQL database? (y/n)"
    read -r ADD_DB
    if [ "$ADD_DB" = "y" ] || [ "$ADD_DB" = "Y" ]; then
        echo "Adding PostgreSQL..."
        railway add --database postgres
        echo -e "${GREEN}✅ PostgreSQL added${NC}"
        echo ""
        echo "⏳ Wait 30 seconds for database to provision..."
        sleep 30
    fi
fi

# Optional: Add Redis
echo "Do you want to add Redis for rate limiting? (y/n)"
read -r ADD_REDIS
if [ "$ADD_REDIS" = "y" ] || [ "$ADD_REDIS" = "Y" ]; then
    echo "Adding Redis..."
    railway add --database redis
    echo -e "${GREEN}✅ Redis added${NC}"
    echo ""
fi

echo "============================================"
echo "🔄 DEPLOYMENT"
echo "============================================"
echo ""

echo "Variables have been updated. Railway will auto-redeploy."
echo ""
echo "Do you want to watch the deployment logs? (y/n)"
read -r WATCH_LOGS
if [ "$WATCH_LOGS" = "y" ] || [ "$WATCH_LOGS" = "Y" ]; then
    echo ""
    echo "📊 Watching logs (Press Ctrl+C to exit)..."
    echo ""
    railway logs --follow
fi

echo ""
echo "============================================"
echo "✅ SETUP COMPLETE"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. View all variables: railway variables"
echo "2. Check deployment: railway logs"
echo "3. Run migrations: railway run npx prisma migrate deploy"
echo "4. Open dashboard: railway open"
echo "5. Test health: curl https://your-app.railway.app/api/health"
echo ""

# Cleanup
rm /tmp/railway_vars.txt

