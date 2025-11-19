#!/bin/bash

# 🔍 Production Deployment Diagnostic
# Tests current production deployment status

echo "════════════════════════════════════════════════════════════════"
echo "🔍 BISMAN ERP - Production Deployment Diagnostic"
echo "════════════════════════════════════════════════════════════════"
echo ""

BACKEND="https://bisman-erp-rr6f.onrender.com"
FRONTEND="https://bisman-erp-building.vercel.app"

echo "📍 Backend:  $BACKEND"
echo "📍 Frontend: $FRONTEND"
echo ""

# Test 1: Backend Reachability
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Backend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BACKEND/api/health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE=$(echo "$HEALTH" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Backend is reachable"
  echo "   Response: $RESPONSE"
else
  echo "❌ Backend health check failed"
  echo "   HTTP Code: $HTTP_CODE"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 2: CORS Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: CORS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CORS=$(curl -s -I -X OPTIONS \
  -H "Origin: $FRONTEND" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "$BACKEND/api/me" 2>/dev/null)

if echo "$CORS" | grep -q "access-control-allow-origin"; then
  echo "✅ CORS headers present"
  echo "$CORS" | grep -i "access-control" | sed 's/^/   /'
else
  echo "❌ CORS headers missing"
  echo "   This means FRONTEND_URL may not be configured in Render"
fi
echo ""

# Test 3: Authentication Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: /api/me Endpoint (Unauthenticated)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ME_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Origin: $FRONTEND" \
  "$BACKEND/api/me" 2>/dev/null)
ME_CODE=$(echo "$ME_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
ME_BODY=$(echo "$ME_RESPONSE" | grep -v "HTTP_CODE")

if [ "$ME_CODE" = "401" ]; then
  echo "✅ Returns 401 when not authenticated (expected)"
  echo "   Response: $ME_BODY"
else
  echo "⚠️  Unexpected status code: $ME_CODE"
  echo "   Response: $ME_BODY"
fi
echo ""

# Test 4: Login Endpoint Availability
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: /api/login Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGIN_TEST=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: $FRONTEND" \
  -d '{"email":"test","password":"test"}' \
  "$BACKEND/api/login" 2>/dev/null)
LOGIN_CODE=$(echo "$LOGIN_TEST" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$LOGIN_CODE" = "401" ] || [ "$LOGIN_CODE" = "400" ]; then
  echo "✅ Login endpoint is accessible"
  echo "   Returns $LOGIN_CODE for invalid credentials (expected)"
else
  echo "⚠️  Unexpected status code: $LOGIN_CODE"
fi
echo ""

# Test 5: /api/refresh Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: /api/refresh Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REFRESH_TEST=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Origin: $FRONTEND" \
  "$BACKEND/api/refresh" 2>/dev/null)
REFRESH_CODE=$(echo "$REFRESH_TEST" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$REFRESH_CODE" = "401" ]; then
  echo "✅ /api/refresh endpoint exists"
  echo "   Returns 401 without token (expected)"
else
  echo "⚠️  Unexpected status code: $REFRESH_CODE"
fi
echo ""

# Test 6: SSL/HTTPS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: SSL/HTTPS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
SSL_CHECK=$(curl -v "$BACKEND/api/health" 2>&1 | grep -i "SSL connection")
if [ -n "$SSL_CHECK" ]; then
  echo "✅ HTTPS/SSL is properly configured"
  echo "   $SSL_CHECK"
else
  echo "❌ SSL connection details not found"
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════"
echo "📋 Summary"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ "$HTTP_CODE" = "200" ] && echo "$CORS" | grep -q "access-control-allow-origin"; then
  echo "✅ Backend is deployed and CORS is configured correctly"
  echo ""
  echo "⚠️  If frontend still shows errors, check:"
  echo "   1. Vercel environment variable: NEXT_PUBLIC_API_URL"
  echo "   2. Render environment variables: NODE_ENV, FRONTEND_URL, JWT secrets"
  echo "   3. Wait for both platforms to finish redeploying"
  echo ""
  echo "📖 See PRODUCTION_FIX_GUIDE.md for detailed steps"
else
  echo "❌ Issues detected with backend deployment"
  echo ""
  echo "🔧 Required actions:"
  echo "   1. Check Render service is running"
  echo "   2. Configure environment variables in Render dashboard"
  echo "   3. Verify deployment logs in Render"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "Diagnostic complete at $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
