#!/bin/bash

# ============================================================================
# SIMPLE TENANT ISOLATION TEST
# ============================================================================
# Quick test to verify tenant isolation is working
# Usage: ./simple-test.sh <YOUR_AUTH_TOKEN>
# ============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: ./simple-test.sh <YOUR_AUTH_TOKEN>"
    echo ""
    echo "To get a token, login to your app and copy it from:"
    echo "  - Browser DevTools > Application > Local Storage"
    echo "  - Or from the login API response"
    exit 1
fi

TOKEN="$1"
API_URL="http://localhost:5000"

echo -e "${CYAN}🧪 Testing Tenant Isolation${NC}"
echo "================================"
echo ""

# Test 1: Get users
echo "1️⃣ Testing User List (GET /api/users)..."
echo ""
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL/api/users")
STATUS=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Status: 200 OK${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""
    
    # Check tenant isolation
    TENANT_COUNT=$(echo "$BODY" | jq -r '.users[]?.tenant_id // .data[]?.tenant_id // empty' | sort | uniq | wc -l | tr -d ' ')
    
    if [ "$TENANT_COUNT" -eq 1 ]; then
        echo -e "${GREEN}✅ PASS: Only one tenant's data visible${NC}"
    elif [ "$TENANT_COUNT" -eq 0 ]; then
        echo -e "${CYAN}ℹ️  No tenant_id found in response (might be in different location)${NC}"
    else
        echo -e "${RED}❌ FAIL: Multiple tenants visible ($TENANT_COUNT)${NC}"
    fi
else
    echo -e "${RED}❌ Status: $STATUS${NC}"
    echo "Response: $BODY"
fi

echo ""
echo "================================"
echo ""

# Test 2: Report endpoint authentication
echo "2️⃣ Testing Report Authentication (GET /api/reports/roles-users)..."
echo ""

# Without auth
UNAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/reports/roles-users")
echo "Without auth: $UNAUTH_STATUS"

if [ "$UNAUTH_STATUS" -eq 401 ] || [ "$UNAUTH_STATUS" -eq 403 ]; then
    echo -e "${GREEN}✅ PASS: Authentication required${NC}"
else
    echo -e "${RED}❌ FAIL: Reports accessible without auth${NC}"
fi

# With auth
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL/api/reports/roles-users")
echo "With auth: $AUTH_STATUS"

if [ "$AUTH_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ PASS: Authenticated access works${NC}"
else
    echo -e "${RED}⚠️  Status: $AUTH_STATUS (expected 200)${NC}"
fi

echo ""
echo "================================"
echo -e "${CYAN}✅ Quick test complete${NC}"
echo ""
echo "For comprehensive testing, run: ./manual-tenant-test.sh"
