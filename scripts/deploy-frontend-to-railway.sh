#!/bin/bash
# Deploy BISMAN ERP Frontend to Railway
# This script deploys the Next.js frontend to Railway

set -e

echo "🚀 BISMAN ERP Frontend Deployment to Railway"
echo "=============================================="
echo ""

# Step 1: Check if railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found!"
    echo "Install it first: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Step 2: Get backend URL
echo "📡 Getting backend URL..."
BACKEND_URL=$(railway variables --service bisman-erp-backend 2>/dev/null | grep "RAILWAY_PUBLIC_DOMAIN" | awk '{print $3}' || echo "")

if [ -z "$BACKEND_URL" ]; then
    echo "⚠️  Could not auto-detect backend URL"
    echo "Please enter your Railway backend URL manually:"
    read -p "Backend URL (e.g., bisman-erp-backend.railway.app): " BACKEND_URL
fi

BACKEND_URL="https://$BACKEND_URL"
echo "Backend URL: $BACKEND_URL"
echo ""

# Step 3: Change to frontend directory
cd "$(dirname "$0")/my-frontend"
echo "📂 Changed to frontend directory: $(pwd)"
echo ""

# Step 4: Create .env.production file
echo "📝 Creating .env.production..."
cat > .env.production << EOF
# Railway Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_API_URL=$BACKEND_URL
NEXT_PUBLIC_API_BASE_URL=$BACKEND_URL
NEXT_PUBLIC_API_BASE=$BACKEND_URL

# Disable telemetry
NEXT_TELEMETRY_DISABLED=1
EOF

echo "✅ .env.production created"
echo ""

# Step 5: Build the frontend locally first (optional verification)
echo "🔨 Testing build locally..."
npm run build || {
    echo "❌ Build failed! Fix errors before deploying."
    exit 1
}
echo "✅ Local build successful"
echo ""

# Step 6: Link to Railway project (if not already linked)
echo "🔗 Checking Railway connection..."
railway status || {
    echo "Not linked to Railway project. Linking now..."
    railway link
}
echo ""

# Step 7: Create frontend service if it doesn't exist
echo "📦 Creating Railway frontend service..."
railway service create bisman-erp-frontend 2>/dev/null || echo "Service already exists"
echo ""

# Step 8: Set environment variables on Railway
echo "🔐 Setting environment variables on Railway..."
railway variables --service bisman-erp-frontend set \
  NODE_ENV=production \
  NEXT_PUBLIC_API_URL="$BACKEND_URL" \
  NEXT_PUBLIC_API_BASE_URL="$BACKEND_URL" \
  NEXT_PUBLIC_API_BASE="$BACKEND_URL" \
  NEXT_TELEMETRY_DISABLED=1

echo "✅ Environment variables set"
echo ""

# Step 9: Deploy to Railway
echo "🚀 Deploying to Railway..."
echo "This may take 5-10 minutes..."
railway up --service bisman-erp-frontend

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📋 POST-DEPLOYMENT STEPS:"
echo "1. Get your frontend URL:"
echo "   railway open --service bisman-erp-frontend"
echo ""
echo "2. Update backend CORS to allow frontend URL:"
echo "   railway variables --service bisman-erp-backend set FRONTEND_URL=https://your-frontend-url.railway.app"
echo ""
echo "3. Test login with demo users:"
echo "   - enterprise@bisman.erp / enterprise123"
echo "   - business_superadmin@bisman.demo / Super@123"
echo ""
echo "4. Check logs if issues occur:"
echo "   railway logs --service bisman-erp-frontend"
echo ""
