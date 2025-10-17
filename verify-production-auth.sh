#!/bin/bash

# 🎯 Quick Production Verification Script
# Tests if authentication is working after environment variable configuration

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   🔍 BISMAN ERP - Production Authentication Verification      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BACKEND="https://bisman-erp-rr6f.onrender.com"
FRONTEND="https://bisman-erp-building.vercel.app"

echo "📍 Testing URLs:"
echo "   Backend:  $BACKEND"
echo "   Frontend: $FRONTEND"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
ALL_PASSED=true

# Test 1: Backend Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Backend Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND/api/health" 2>/dev/null)
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HEALTH_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Backend is reachable"
    echo "   Response: $HEALTH_BODY"
else
    echo -e "${RED}❌ FAIL${NC} - Backend health check returned $HEALTH_CODE"
    echo "   Response: $HEALTH_BODY"
    ALL_PASSED=false
fi
echo ""

# Test 2: CORS Headers
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: CORS Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CORS_RESPONSE=$(curl -s -I -X OPTIONS \
  -H "Origin: $FRONTEND" \
  -H "Access-Control-Request-Method: GET" \
  "$BACKEND/api/me" 2>/dev/null)

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-credentials: true"; then
    echo -e "${GREEN}✅ PASS${NC} - CORS credentials enabled"
    
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin: $FRONTEND"; then
        echo -e "${GREEN}✅ PASS${NC} - Frontend origin allowed"
    else
        echo -e "${YELLOW}⚠️  WARN${NC} - Origin header may need verification"
        echo "   Expected: $FRONTEND"
        echo "   Got: $(echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin" || echo "Not found")"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - CORS not configured correctly"
    echo "   Missing: access-control-allow-credentials"
    ALL_PASSED=false
fi
echo ""

# Test 3: /api/me Endpoint (unauthenticated)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Authentication Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ME_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Origin: $FRONTEND" \
  "$BACKEND/api/me" 2>/dev/null)
ME_CODE=$(echo "$ME_RESPONSE" | tail -n 1)
ME_BODY=$(echo "$ME_RESPONSE" | head -n -1)

if [ "$ME_CODE" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Returns 401 when not authenticated (expected)"
    echo "   Response: $ME_BODY"
else
    echo -e "${RED}❌ FAIL${NC} - Unexpected status code: $ME_CODE"
    echo "   Expected: 401"
    echo "   Response: $ME_BODY"
    ALL_PASSED=false
fi
echo ""

# Test 4: Token Refresh Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Token Refresh Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Origin: $FRONTEND" \
  "$BACKEND/api/token/refresh" 2>/dev/null)
REFRESH_CODE=$(echo "$REFRESH_RESPONSE" | tail -n 1)

if [ "$REFRESH_CODE" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Refresh endpoint exists and requires token"
else
    echo -e "${YELLOW}⚠️  WARN${NC} - Unexpected status: $REFRESH_CODE"
fi

# Also test /api/refresh alias
REFRESH_ALIAS=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Origin: $FRONTEND" \
  "$BACKEND/api/refresh" 2>/dev/null)
REFRESH_ALIAS_CODE=$(echo "$REFRESH_ALIAS" | tail -n 1)

if [ "$REFRESH_ALIAS_CODE" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} - /api/refresh alias working"
else
    echo -e "${YELLOW}⚠️  WARN${NC} - /api/refresh alias returned: $REFRESH_ALIAS_CODE"
fi
echo ""

# Test 5: Frontend Accessibility
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Frontend Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND" 2>/dev/null)
FRONTEND_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n 1)

if [ "$FRONTEND_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Frontend is accessible"
else
    echo -e "${RED}❌ FAIL${NC} - Frontend returned: $FRONTEND_CODE"
    ALL_PASSED=false
fi
echo ""

# Summary
echo "════════════════════════════════════════════════════════════════"
echo "                         📊 SUMMARY                             "
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ "$ALL_PASSED" = true ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    echo "Your production deployment is ready! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Open: $FRONTEND/auth/login"
    echo "2. Login with your credentials"
    echo "3. Check browser DevTools → Network tab"
    echo "4. Verify cookies are set after login"
    echo ""
    echo "Expected after login:"
    echo "  ✅ POST /api/login → 200 OK"
    echo "  ✅ Set-Cookie headers visible"
    echo "  ✅ GET /api/me → 200 OK with user data"
    echo "  ✅ Dashboard loads without errors"
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Action required:"
    echo ""
    echo "1. Check environment variables in Render:"
    echo "   • NODE_ENV=production"
    echo "   • FRONTEND_URL=$FRONTEND"
    echo "   • ACCESS_TOKEN_SECRET=<your-secret>"
    echo "   • REFRESH_TOKEN_SECRET=<your-secret>"
    echo "   • JWT_SECRET=<your-secret>"
    echo ""
    echo "2. Check environment variables in Vercel:"
    echo "   • NEXT_PUBLIC_API_URL=$BACKEND"
    echo ""
    echo "3. Wait 5 minutes after adding variables for redeployment"
    echo ""
    echo "4. Check deployment logs:"
    echo "   • Render: https://dashboard.render.com/"
    echo "   • Vercel: https://vercel.com/dashboard"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Verification completed at $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
