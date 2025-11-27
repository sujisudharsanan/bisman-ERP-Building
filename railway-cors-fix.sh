#!/bin/bash

# Railway Quick Fix Script - Set Missing Environment Variables
# Run this script to fix CORS and frontend connectivity issues

echo "================================================="
echo "🚀 RAILWAY QUICK FIX - Setting Environment Variables"
echo "================================================="
echo ""

# Step 1: Link to project (if not already linked)
echo "Step 1: Linking to Railway project..."
railway link
echo ""

# Step 2: Set FRONTEND_URL for backend service
echo "Step 2: Setting FRONTEND_URL for backend..."
echo "This will fix CORS configuration"
echo ""
echo "Please select: bisman-ERP-Backend"
echo ""
railway variables --set FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
echo ""
echo "✅ FRONTEND_URL set for backend"
echo ""

# Step 3: Set NEXT_PUBLIC_API_URL for frontend service
echo "Step 3: Setting NEXT_PUBLIC_API_URL for frontend..."
echo "This tells frontend where to find the backend API"
echo ""
echo "Please select: bisman-ERP-frontend"
echo ""
railway variables --set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
echo ""
echo "✅ NEXT_PUBLIC_API_URL set for frontend"
echo ""

# Step 4: Redeploy backend
echo "Step 4: Redeploying backend service..."
echo "Please select: bisman-ERP-Backend"
echo ""
railway redeploy
echo ""
echo "✅ Backend redeployment triggered"
echo ""

# Step 5: Redeploy frontend
echo "Step 5: Redeploying frontend service..."
echo "Please select: bisman-ERP-frontend"
echo ""
railway redeploy
echo ""
echo "✅ Frontend redeployment triggered"
echo ""

echo "================================================="
echo "🎉 FIX COMMANDS COMPLETED"
echo "================================================="
echo ""
echo "⏳ Wait 5-10 minutes for redeployment to complete"
echo ""
echo "Then verify:"
echo "  1. Backend logs: railway logs (select backend)"
echo "  2. Frontend logs: railway logs (select frontend)"
echo "  3. Open: https://bisman-erp-frontend-production.up.railway.app"
echo ""
echo "Expected result:"
echo "  ✅ Frontend loads successfully"
echo "  ✅ Backend CORS shows correct frontend URL"
echo "  ✅ Login page works"
echo ""
