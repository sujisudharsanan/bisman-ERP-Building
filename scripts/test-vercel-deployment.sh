#!/bin/bash

# Vercel Deployment Diagnostic Tool
# Tests all critical endpoints and checks configuration

echo "🔍 BISMAN ERP - Vercel Deployment Diagnostics"
echo "=============================================="
echo ""

# Configuration
FRONTEND_URL="https://bisman-erp-building-git-diployment-sujis-projects-dfb64252.vercel.app"
BACKEND_URL="https://bisman-erp-xr6f.onrender.com"
WRONG_BACKEND_URL="https://bisman-erp-rr6f.onrender.com"

echo "📋 Configuration:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""

# Test 1: Backend Health
echo "🏥 Test 1: Backend Health Check"
echo "   Testing: $BACKEND_URL/api/health"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
if [ "$HEALTH_STATUS" = "200" ]; then
    echo "   ✅ Backend is healthy (200 OK)"
    HEALTH_BODY=$(curl -s "$BACKEND_URL/api/health")
    echo "   Response: $HEALTH_BODY"
else
    echo "   ❌ Backend health check failed (Status: $HEALTH_STATUS)"
fi
echo ""

# Test 2: Wrong Backend (should fail)
echo "🚫 Test 2: Wrong Backend URL (should fail)"
echo "   Testing: $WRONG_BACKEND_URL/api/health"
WRONG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WRONG_BACKEND_URL/api/health")
if [ "$WRONG_STATUS" = "404" ] || [ "$WRONG_STATUS" = "000" ]; then
    echo "   ✅ Confirmed: Wrong URL ($WRONG_BACKEND_URL) is not accessible"
    echo "      (This is expected - we fixed vercel.json to use xr6f)"
else
    echo "   ⚠️  Wrong URL returned status: $WRONG_STATUS"
fi
echo ""

# Test 3: CORS Preflight
echo "🌐 Test 3: CORS Preflight (OPTIONS request)"
CORS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Content-Type" \
    "$BACKEND_URL/api/me")

if [ "$CORS_STATUS" = "200" ] || [ "$CORS_STATUS" = "204" ]; then
    echo "   ✅ CORS preflight successful (Status: $CORS_STATUS)"
else
    echo "   ❌ CORS preflight failed (Status: $CORS_STATUS)"
fi
echo ""

# Test 4: Unauthenticated /api/me (should return 401)
echo "🔐 Test 4: Unauthenticated /api/me (should return 401)"
ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: $FRONTEND_URL" \
    "$BACKEND_URL/api/me")

if [ "$ME_STATUS" = "401" ]; then
    echo "   ✅ Correctly returns 401 Unauthorized (expected without token)"
else
    echo "   ⚠️  Unexpected status: $ME_STATUS (expected 401)"
fi
echo ""

# Test 5: Test Login Endpoint
echo "🔑 Test 5: Login Endpoint (POST /api/login)"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Origin: $FRONTEND_URL" \
    -d '{"email":"super@bisman.local","password":"password"}' \
    "$BACKEND_URL/api/login")

LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)
LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -n 1)

if [ "$LOGIN_STATUS" = "200" ]; then
    echo "   ✅ Login endpoint working (200 OK)"
    echo "   Response: $LOGIN_BODY" | head -c 100
    echo "..."
else
    echo "   ❌ Login failed (Status: $LOGIN_STATUS)"
    echo "   Response: $LOGIN_BODY"
fi
echo ""

# Test 6: Frontend Accessibility
echo "🌍 Test 6: Frontend Accessibility"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "   ✅ Frontend is accessible (200 OK)"
else
    echo "   ❌ Frontend returned status: $FRONTEND_STATUS"
fi
echo ""

# Test 7: Check vercel.json Backend URL
echo "📄 Test 7: Verify vercel.json Configuration"
if [ -f "vercel.json" ]; then
    BACKEND_IN_CONFIG=$(grep -o 'bisman-erp-[a-z0-9]*\.onrender\.com' vercel.json | head -1)
    if [ "$BACKEND_IN_CONFIG" = "bisman-erp-xr6f.onrender.com" ]; then
        echo "   ✅ vercel.json uses correct backend: $BACKEND_IN_CONFIG"
    else
        echo "   ❌ vercel.json has wrong backend: $BACKEND_IN_CONFIG"
        echo "      Should be: bisman-erp-xr6f.onrender.com"
    fi
else
    echo "   ⚠️  vercel.json not found in current directory"
fi
echo ""

# Summary
echo "=============================================="
echo "📊 DIAGNOSTIC SUMMARY"
echo "=============================================="
echo ""

ALL_PASS=true

if [ "$HEALTH_STATUS" != "200" ]; then
    echo "❌ Backend health check failed"
    ALL_PASS=false
fi

if [ "$CORS_STATUS" != "200" ] && [ "$CORS_STATUS" != "204" ]; then
    echo "❌ CORS configuration issue"
    ALL_PASS=false
fi

if [ "$LOGIN_STATUS" != "200" ]; then
    echo "❌ Login endpoint not working"
    ALL_PASS=false
fi

if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "❌ Frontend not accessible"
    ALL_PASS=false
fi

if [ "$ALL_PASS" = true ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Verify NEXT_PUBLIC_API_URL is set in Vercel dashboard"
    echo "   2. Push updated vercel.json to trigger redeployment"
    echo "   3. Hard refresh browser (Cmd+Shift+R)"
    echo "   4. Check browser console for errors"
else
    echo ""
    echo "⚠️  Some tests failed. Review the output above."
    echo ""
    echo "🔧 Common Fixes:"
    echo "   - Ensure backend is running on Render"
    echo "   - Verify CORS allowlist includes Vercel domain"
    echo "   - Check vercel.json uses correct backend URL"
    echo "   - Add NEXT_PUBLIC_API_URL in Vercel settings"
fi

echo ""
echo "=============================================="
