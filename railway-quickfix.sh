#!/bin/bash
# Railway Quick Fix - Run this script
# chmod +x railway-quickfix.sh && ./railway-quickfix.sh

echo "============================================"
echo "🚀 RAILWAY DEPLOYMENT QUICK FIX"
echo "============================================"
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first."
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Your generated secrets
JWT_SECRET="s7E1PmgB4QO6lbIXETkJH7buEAy235TYBDouaGV5qbQf6A0FtkQFICVLq2WGQ4ua"
SESSION_SECRET="d/vzFiPNGEaIFN0oGweZWt7nqK14ZPFeZjF9kcPIaoj72VbQ265Oss0PDUY4iG70"

# Prompt for frontend URL
echo "============================================"
echo "📝 FRONTEND URL SETUP"
echo "============================================"
echo ""
echo "Enter your frontend URL (e.g., https://bisman-erp-frontend-production.up.railway.app):"
echo ""
echo "Common options:"
echo "  1. https://bisman-erp-frontend-production.up.railway.app"
echo "  2. https://app.bisman-erp.com"
echo "  3. http://localhost:3000 (for testing only)"
echo ""
read -p "Frontend URL: " FRONTEND_URL

if [ -z "$FRONTEND_URL" ]; then
    echo "❌ Frontend URL is required!"
    exit 1
fi

echo ""
echo "✅ Using frontend URL: $FRONTEND_URL"
echo ""

# Set environment variables
echo "============================================"
echo "🔧 SETTING ENVIRONMENT VARIABLES"
echo "============================================"
echo ""

echo "Setting FRONTEND_URL..."
railway variables set FRONTEND_URL="$FRONTEND_URL"
if [ $? -eq 0 ]; then
    echo "✅ FRONTEND_URL set"
else
    echo "⚠️ Trying with --set flag..."
    railway variables --set FRONTEND_URL="$FRONTEND_URL"
fi
echo ""

echo "Setting JWT_SECRET..."
railway variables set JWT_SECRET="$JWT_SECRET"
if [ $? -eq 0 ]; then
    echo "✅ JWT_SECRET set"
else
    echo "⚠️ Trying with --set flag..."
    railway variables --set JWT_SECRET="$JWT_SECRET"
fi
echo ""

echo "Setting SESSION_SECRET..."
railway variables set SESSION_SECRET="$SESSION_SECRET"
if [ $? -eq 0 ]; then
    echo "✅ SESSION_SECRET set"
else
    echo "⚠️ Trying with --set flag..."
    railway variables --set SESSION_SECRET="$SESSION_SECRET"
fi
echo ""

# Verify variables
echo "============================================"
echo "🔍 VERIFYING VARIABLES"
echo "============================================"
echo ""

railway variables > /tmp/railway_vars_check.txt

if grep -q "DATABASE_URL" /tmp/railway_vars_check.txt; then
    echo "✅ DATABASE_URL is set"
else
    echo "❌ DATABASE_URL is missing!"
    echo "   Run: railway add"
    echo "   Then select PostgreSQL"
fi

if grep -q "FRONTEND_URL" /tmp/railway_vars_check.txt; then
    echo "✅ FRONTEND_URL is set"
else
    echo "❌ FRONTEND_URL not found"
fi

if grep -q "JWT_SECRET" /tmp/railway_vars_check.txt; then
    echo "✅ JWT_SECRET is set"
else
    echo "❌ JWT_SECRET not found"
fi

if grep -q "SESSION_SECRET" /tmp/railway_vars_check.txt; then
    echo "✅ SESSION_SECRET is set"
else
    echo "❌ SESSION_SECRET not found"
fi

echo ""

# Wait for deployment
echo "============================================"
echo "⏳ WAITING FOR DEPLOYMENT"
echo "============================================"
echo ""
echo "Railway is redeploying with new variables..."
echo "Waiting 10 seconds..."
sleep 10

# Show logs
echo ""
echo "============================================"
echo "📊 DEPLOYMENT LOGS"
echo "============================================"
echo ""
echo "Watching logs (Press Ctrl+C to exit)..."
echo ""

railway logs --follow

# Cleanup
rm -f /tmp/railway_vars_check.txt

