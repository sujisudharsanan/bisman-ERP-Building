#!/bin/bash
# Deploy Frontend to Railway

echo "🚀 Deploying Frontend to Railway..."
echo "================================================"

cd "/Users/abhi/Desktop/BISMAN ERP"

echo ""
echo "Step 1: Setting Railway environment variables for frontend..."
echo "================================================"

# Set environment variables for frontend service
railway variables set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app --service frontend || echo "Note: Use Railway dashboard to set variables"
railway variables set NODE_ENV=production --service frontend || echo "Note: Use Railway dashboard to set variables"
railway variables set PORT=3000 --service frontend || echo "Note: Use Railway dashboard to set variables"

echo ""
echo "Step 2: Deploying frontend..."
echo "================================================"

# Deploy the frontend
railway up --service frontend

echo ""
echo "Step 3: Checking deployment status..."
echo "================================================"

railway status --service frontend

echo ""
echo "✅ Frontend deployment initiated!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Check Railway dashboard for deployment progress"
echo "2. Get your frontend URL from Railway dashboard"
echo "3. Update backend CORS with frontend URL"
echo "4. Test login at: https://your-frontend.up.railway.app/auth/login"
