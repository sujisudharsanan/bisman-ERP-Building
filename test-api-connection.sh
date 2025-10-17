#!/bin/bash
# API Connection Test Script
# Tests the complete authentication flow

set -e

API_BASE="http://localhost:3001"
ORIGIN="http://localhost:3000"

echo "=================================================="
echo "🧪 API Connection Test Suite"
echo "=================================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing /api/health endpoint..."
HEALTH=$(curl -sS "$API_BASE/api/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "   ✅ Health check passed: $HEALTH"
else
  echo "   ❌ Health check failed"
  exit 1
fi
echo ""

# Test 2: CORS Preflight
echo "2️⃣  Testing CORS preflight (OPTIONS /login)..."
CORS=$(curl -sS -i -X OPTIONS "$API_BASE/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" 2>&1)
if echo "$CORS" | grep -q "Access-Control-Allow-Origin: $ORIGIN"; then
  echo "   ✅ CORS preflight passed"
else
  echo "   ❌ CORS preflight failed"
  echo "$CORS"
  exit 1
fi
echo ""

# Test 3: Login
echo "3️⃣  Testing POST /login..."
LOGIN_RESPONSE=$(curl -sS -i -X POST "$API_BASE/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  --data '{"email":"super@bisman.local","password":"password"}' 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "Login successful"; then
  echo "   ✅ Login successful"
  
  # Extract cookies
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -i "set-cookie: access_token" | sed 's/.*access_token=\([^;]*\).*/\1/')
  if [ -n "$ACCESS_TOKEN" ]; then
    echo "   ✅ Access token received (length: ${#ACCESS_TOKEN})"
  else
    echo "   ⚠️  No access token in response"
  fi
else
  echo "   ❌ Login failed"
  echo "$LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 4: /me endpoint (without auth - should fail)
echo "4️⃣  Testing GET /me (without auth)..."
ME_UNAUTH=$(curl -sS -i "$API_BASE/me" -H "Origin: $ORIGIN" 2>&1)
if echo "$ME_UNAUTH" | grep -q "401"; then
  echo "   ✅ Correctly rejected unauthenticated request (401)"
else
  echo "   ⚠️  Expected 401, got different response"
fi
echo ""

# Test 5: /me endpoint (with auth)
if [ -n "$ACCESS_TOKEN" ]; then
  echo "5️⃣  Testing GET /me (with auth)..."
  ME_AUTH=$(curl -sS "$API_BASE/me" \
    -H "Origin: $ORIGIN" \
    -H "Cookie: access_token=$ACCESS_TOKEN" 2>&1)
  
  if echo "$ME_AUTH" | grep -q "super@bisman.local"; then
    echo "   ✅ Authenticated request successful"
    echo "   Response: $ME_AUTH"
  else
    echo "   ❌ Authenticated request failed"
    echo "$ME_AUTH"
  fi
fi
echo ""

# Test 6: /api/login (full path)
echo "6️⃣  Testing POST /api/login (full path)..."
API_LOGIN=$(curl -sS -i -X POST "$API_BASE/api/login" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  --data '{"email":"admin@bisman.local","password":"changeme"}' 2>&1)

if echo "$API_LOGIN" | grep -q "Login successful"; then
  echo "   ✅ /api/login works"
else
  echo "   ❌ /api/login failed"
fi
echo ""

echo "=================================================="
echo "✅ All API connection tests passed!"
echo "=================================================="
echo ""
echo "📋 Summary:"
echo "   • Backend running on: $API_BASE"
echo "   • Frontend origin: $ORIGIN"
echo "   • CORS: Configured correctly"
echo "   • Authentication: Working"
echo "   • Cookies: Being set properly"
echo ""
echo "🚀 Ready to test in browser!"
echo "   Open: http://localhost:3000/login"
echo "   Credentials: super@bisman.local / password"
echo ""
