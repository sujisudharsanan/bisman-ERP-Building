#!/bin/bash
# Railway Frontend Deployment Check
# This script helps diagnose dashboard visibility issues

echo "🔍 RAILWAY DEPLOYMENT DIAGNOSTICS"
echo "=================================="
echo ""

# Check Railway services
echo "📦 Railway Services:"
railway status 2>/dev/null || echo "❌ Railway CLI not available or not linked"
echo ""

# Check if frontend is deployed
echo "🌐 Checking Frontend Deployment:"
echo ""
echo "Option 1: Is frontend deployed to Railway?"
echo "  Run: railway service list"
echo "  Expected: bisman-erp-frontend service should exist"
echo ""

echo "Option 2: Is frontend on a different platform?"
echo "  - Vercel"
echo "  - Netlify"  
echo "  - Other"
echo ""

# Check environment variables
echo "🔐 Backend Environment Variables (Railway):"
railway variables --service bisman-erp-backend 2>/dev/null | grep -E "JWT|FRONTEND|COOKIE|CORS" || echo "Unable to fetch"
echo ""

# Test backend API
echo "🧪 Testing Backend API:"
BACKEND_URL=$(railway variables --service bisman-erp-backend 2>/dev/null | grep "RAILWAY_PUBLIC_DOMAIN" | awk '{print $3}')
if [ -n "$BACKEND_URL" ]; then
  echo "Backend URL: https://$BACKEND_URL"
  echo ""
  echo "Testing /api/health:"
  curl -s "https://$BACKEND_URL/api/health" | head -5
  echo ""
else
  echo "❌ Could not determine backend URL"
fi
echo ""

# Check for common issues
echo "⚠️ COMMON ISSUES & SOLUTIONS:"
echo ""
echo "Issue 1: Frontend not deployed"
echo "  Solution: Deploy frontend to Railway"
echo "    railway service create"
echo "    railway up --service bisman-erp-frontend"
echo ""

echo "Issue 2: Cookie domain mismatch"
echo "  Solution: Set COOKIE_DOMAIN environment variable"
echo "    railway variables --service bisman-erp-backend set COOKIE_DOMAIN=.railway.app"
echo ""

echo "Issue 3: CORS issues"
echo "  Solution: Set FRONTEND_URL environment variable"
echo "    railway variables --service bisman-erp-backend set FRONTEND_URL=https://your-frontend.railway.app"
echo ""

echo "Issue 4: Server-side layout blocking client auth"
echo "  ✅ FIXED: Super admin layout now uses client-side auth"
echo ""

echo "📝 NEXT STEPS:"
echo "1. Verify frontend is deployed (or deploy it)"
echo "2. Update environment variables if needed"
echo "3. Test login at your frontend URL"
echo "4. Check browser console for errors"
echo ""

echo "🔗 Useful Commands:"
echo "  railway logs --service bisman-erp-backend"
echo "  railway logs --service bisman-erp-frontend"
echo "  railway open --service bisman-erp-backend"
echo ""
