#!/bin/bash

# Railway HR User Deployment Script
# Usage: ./deploy-hr-to-railway.sh

echo "🚀 Railway HR User Deployment"
echo "=============================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it with:"
    echo "   npm i -g @railway/cli"
    echo ""
    echo "Or run manually with:"
    echo "   RAILWAY_DATABASE_URL='your-db-url' node railway-hr-deployment.js"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Check if logged in
echo "🔐 Checking Railway login..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Running 'railway login'..."
    railway login
fi

echo "✅ Logged in to Railway"
echo ""

# Get DATABASE_URL from Railway
echo "🔍 Fetching DATABASE_URL from Railway..."
export RAILWAY_DATABASE_URL=$(railway variables get DATABASE_URL 2>/dev/null)

if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo "❌ Could not fetch DATABASE_URL from Railway"
    echo ""
    echo "Please run manually:"
    echo "   1. Get your DATABASE_URL from Railway dashboard"
    echo "   2. Run: RAILWAY_DATABASE_URL='your-url' node railway-hr-deployment.js"
    exit 1
fi

echo "✅ DATABASE_URL retrieved"
echo ""

# Run deployment script
echo "🚀 Running deployment script..."
echo ""
node railway-hr-deployment.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Go to your Railway deployment URL"
    echo "  2. Login with: demo_hr@bisman.demo / hr123"
    echo "  3. Check sidebar for 'Create New User' option"
else
    echo ""
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
