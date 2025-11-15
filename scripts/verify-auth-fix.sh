#!/bin/bash

# 🔍 Authentication & CORS Verification Script
# Tests backend configuration for production deployment

echo "🔍 BISMAN ERP - Authentication & CORS Verification"
echo "=================================================="
echo ""

BACKEND_URL="${1:-https://bisman-erp-rr6f.onrender.com}"
FRONTEND_URL="${2:-https://bisman-erp-building.vercel.app}"

echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH=$(curl -s "$BACKEND_URL/api/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ Backend is reachable"
else
  echo "❌ Backend health check failed"
  echo "Response: $HEALTH"
fi
echo ""

# Test 2: CORS Preflight
echo "Test 2: CORS Preflight"
echo "----------------------"
CORS_RESPONSE=$(curl -s -I -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "$BACKEND_URL/api/me")

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo "✅ CORS headers present"
  echo "$CORS_RESPONSE" | grep "Access-Control"
else
  echo "❌ CORS headers missing"
fi
echo ""

# Test 3: /api/me (Unauthenticated)
echo "Test 3: /api/me (Unauthenticated)"
echo "---------------------------------"
ME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND_URL/api/me")
HTTP_CODE=$(echo "$ME_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ Returns 401 when unauthenticated (expected)"
else
  echo "⚠️  Unexpected status code: $HTTP_CODE"
fi
echo ""

# Test 4: Check for /api/refresh route
echo "Test 4: /api/refresh endpoint"
echo "-----------------------------"
REFRESH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BACKEND_URL/api/refresh")
REFRESH_CODE=$(echo "$REFRESH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$REFRESH_CODE" = "401" ]; then
  echo "✅ /api/refresh exists and returns 401 without token (expected)"
else
  echo "⚠️  Unexpected status code: $REFRESH_CODE"
fi
echo ""

# Test 5: Cookie Configuration (via login test)
echo "Test 5: Cookie Configuration"
echo "---------------------------"
echo "To test cookies, try logging in via the frontend at:"
echo "$FRONTEND_URL"
echo ""
echo "Then check browser DevTools:"
echo "  1. Application → Cookies"
echo "  2. Look for 'access_token' and 'refresh_token'"
echo "  3. Verify attributes: Secure=Yes, HttpOnly=Yes, SameSite=None"
echo ""

# Test 6: Environment Check
echo "Test 6: Environment Variables"
echo "-----------------------------"
echo "⚠️  Verify in Render Dashboard:"
echo "  - NODE_ENV=production"
echo "  - FRONTEND_URL=$FRONTEND_URL"
echo "  - ACCESS_TOKEN_SECRET=<set>"
echo "  - REFRESH_TOKEN_SECRET=<set>"
echo "  - DATABASE_URL=<set>"
echo ""

# Test 7: Frontend Environment
echo "Test 7: Frontend Configuration"
echo "------------------------------"
echo "⚠️  Verify in Vercel Dashboard:"
echo "  - NEXT_PUBLIC_API_URL=$BACKEND_URL"
echo ""

# Summary
echo "=================================================="
echo "📋 Verification Complete"
echo "=================================================="
echo ""
echo "If all tests pass, proceed with deployment."
echo "If any tests fail, check AUTH_FIX_DEPLOYMENT_GUIDE.md"
echo ""
