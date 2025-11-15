#!/bin/bash
# Test Logout Fix - Run this script to verify logout works correctly

set -e

ROOT="/Users/abhi/Desktop/BISMAN ERP"
TEST_DIR="/tmp/bisman_logout_test"

echo "==================================="
echo "BISMAN ERP - Logout Test Script"
echo "==================================="

# Clean test directory
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo ""
echo "Step 1: Check if backend is running..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3001"
else
    echo "❌ Backend not responding. Start it with:"
    echo "   cd $ROOT/my-backend && PORT=3001 node index.js"
    exit 1
fi

echo ""
echo "Step 2: Check if frontend is running..."
if curl -s -I http://localhost:3000 | grep -q "200\|301\|302\|307"; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend not responding. Start it with:"
    echo "   cd $ROOT/my-frontend && npm run dev"
    exit 1
fi

echo ""
echo "Step 3: Login test..."
LOGIN_RESPONSE=$(curl -s -i -X POST 'http://localhost:3001/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@business.com","password":"password"}' \
  -c "$TEST_DIR/cookies.txt" 2>&1)

echo "$LOGIN_RESPONSE" | head -n 20

if echo "$LOGIN_RESPONSE" | grep -q "Set-Cookie.*access_token"; then
    echo "✅ Login successful - cookies set"
else
    echo "❌ Login failed or cookies not set"
    echo "Response:"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo "Step 4: Verify cookies in jar..."
if [ -f "$TEST_DIR/cookies.txt" ]; then
    echo "Cookie jar contents:"
    cat "$TEST_DIR/cookies.txt"
    if grep -q "access_token" "$TEST_DIR/cookies.txt"; then
        echo "✅ access_token found in cookie jar"
    else
        echo "⚠️  access_token not in jar (may be HttpOnly)"
    fi
else
    echo "❌ Cookie jar file not created"
    exit 1
fi

echo ""
echo "Step 5: Access protected route with cookies..."
PROTECTED_RESPONSE=$(curl -s -i 'http://localhost:3000/super-admin' \
  -b "$TEST_DIR/cookies.txt" 2>&1 | head -n 30)

echo "Response headers:"
echo "$PROTECTED_RESPONSE" | head -n 15

if echo "$PROTECTED_RESPONSE" | grep -q "HTTP.*200\|Content-Type.*html"; then
    echo "✅ Protected route accessible with cookies"
elif echo "$PROTECTED_RESPONSE" | grep -q "Location.*auth"; then
    echo "⚠️  Redirected to auth (middleware may require valid token)"
else
    echo "Response:"
    echo "$PROTECTED_RESPONSE"
fi

echo ""
echo "Step 6: Logout..."
LOGOUT_RESPONSE=$(curl -s -i -X POST 'http://localhost:3001/api/logout' \
  -H 'Content-Type: application/json' \
  -b "$TEST_DIR/cookies.txt" \
  -c "$TEST_DIR/cookies_after_logout.txt" 2>&1)

echo "$LOGOUT_RESPONSE" | head -n 30

if echo "$LOGOUT_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Logout API returned success"
else
    echo "❌ Logout API did not return success"
    echo "$LOGOUT_RESPONSE"
fi

# Check if cookies were expired in response
if echo "$LOGOUT_RESPONSE" | grep -qi "Set-Cookie.*access_token.*expires="; then
    echo "✅ Backend sent cookie expiration headers"
else
    echo "⚠️  No cookie expiration headers in response"
fi

echo ""
echo "Step 7: Check cookies after logout..."
if [ -f "$TEST_DIR/cookies_after_logout.txt" ]; then
    echo "Cookie jar after logout:"
    cat "$TEST_DIR/cookies_after_logout.txt"
    
    if grep -q "access_token" "$TEST_DIR/cookies_after_logout.txt"; then
        # Check if expired
        if grep "access_token" "$TEST_DIR/cookies_after_logout.txt" | grep -q "expires=.*1970\|Expires=.*1970"; then
            echo "✅ access_token expired (cleared)"
        else
            echo "⚠️  access_token still in jar and not expired"
        fi
    else
        echo "✅ access_token not in cookie jar (cleared)"
    fi
else
    echo "No cookies_after_logout file"
fi

echo ""
echo "Step 8: Try accessing protected route after logout..."
AFTER_LOGOUT_RESPONSE=$(curl -s -i 'http://localhost:3000/super-admin' \
  -b "$TEST_DIR/cookies_after_logout.txt" 2>&1 | head -n 30)

echo "Response:"
echo "$AFTER_LOGOUT_RESPONSE" | head -n 15

if echo "$AFTER_LOGOUT_RESPONSE" | grep -qi "Location.*auth.*login\|Location: /auth"; then
    echo "✅ PASS - Redirected to login page after logout"
    echo ""
    echo "============================================"
    echo "✅ LOGOUT TEST PASSED!"
    echo "============================================"
    exit 0
elif echo "$AFTER_LOGOUT_RESPONSE" | grep -q "HTTP.*401\|HTTP.*403"; then
    echo "✅ PASS - Access denied (401/403) after logout"
    echo ""
    echo "============================================"
    echo "✅ LOGOUT TEST PASSED!"
    echo "============================================"
    exit 0
elif echo "$AFTER_LOGOUT_RESPONSE" | grep -q "HTTP.*200.*html"; then
    echo "❌ FAIL - Still able to access protected page after logout"
    echo ""
    echo "============================================"
    echo "❌ LOGOUT TEST FAILED"
    echo "============================================"
    echo ""
    echo "Possible causes:"
    echo "1. Cookies not being cleared properly"
    echo "2. Middleware not checking revoked tokens"
    echo "3. Frontend using cached data"
    echo ""
    echo "Check backend logs:"
    echo "   tail -f $ROOT/logs/backend-out.log"
    exit 1
else
    echo "⚠️  Unexpected response after logout"
    echo "$AFTER_LOGOUT_RESPONSE"
fi

echo ""
echo "Test directory: $TEST_DIR"
echo "Inspect files: ls -la $TEST_DIR"
