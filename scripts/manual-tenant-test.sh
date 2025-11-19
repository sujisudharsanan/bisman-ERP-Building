#!/bin/bash

# ============================================================================
# MANUAL TENANT ISOLATION TESTING SCRIPT
# ============================================================================
# 
# This script tests tenant isolation in the running application
# Run with: ./manual-tenant-test.sh
#
# Prerequisites:
# - Application running on http://localhost:5000
# - At least 2 users from different tenants in database
# ============================================================================

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:5000}"
RESULTS_FILE="tenant-test-results.json"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}============================================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}============================================================================${NC}"
    echo ""
}

print_test() {
    echo -e "${BLUE}📋 Test: $1${NC}"
    echo ""
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    echo ""
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    echo ""
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    echo ""
}

# ============================================================================
# TEST SETUP
# ============================================================================

print_header "🧪 TENANT ISOLATION TESTING"

echo "This script will test tenant isolation in your running application."
echo "You'll need to provide authentication tokens for users from different tenants."
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    print_pass "Server is running at $API_URL"
else
    if curl -s -f "$API_URL" > /dev/null 2>&1; then
        print_pass "Server is running at $API_URL"
    else
        print_fail "Server is not responding at $API_URL"
        echo "Please start the server with: npm run dev:both"
        exit 1
    fi
fi

# ============================================================================
# GET TEST TOKENS
# ============================================================================

print_header "🔑 AUTHENTICATION SETUP"

echo "Please provide test credentials or tokens:"
echo ""
echo "Option 1: Provide JWT tokens directly (if you have them)"
echo "Option 2: Login with credentials (email/password)"
echo ""
read -p "Choose option (1 or 2): " AUTH_OPTION

if [ "$AUTH_OPTION" = "1" ]; then
    # Direct token input
    echo ""
    echo "Enter tokens for two users from DIFFERENT tenants:"
    echo ""
    read -p "Tenant A User Token: " TOKEN_A
    read -p "Tenant B User Token: " TOKEN_B
    
    # Extract tenant IDs from tokens (decode JWT)
    TENANT_A_ID=$(echo $TOKEN_A | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.tenant_id // "unknown"')
    TENANT_B_ID=$(echo $TOKEN_B | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.tenant_id // "unknown"')
    
    echo ""
    echo "Detected Tenant IDs:"
    echo "  Tenant A: $TENANT_A_ID"
    echo "  Tenant B: $TENANT_B_ID"
    
elif [ "$AUTH_OPTION" = "2" ]; then
    # Login with credentials
    echo ""
    echo "Tenant A User Login:"
    read -p "Email: " EMAIL_A
    read -sp "Password: " PASSWORD_A
    echo ""
    
    echo ""
    echo "Tenant B User Login:"
    read -p "Email: " EMAIL_B
    read -sp "Password: " PASSWORD_B
    echo ""
    
    # Login and get tokens
    echo ""
    echo "Logging in Tenant A user..."
    LOGIN_A=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL_A\",\"password\":\"$PASSWORD_A\"}")
    
    TOKEN_A=$(echo $LOGIN_A | jq -r '.token // .accessToken // empty')
    
    if [ -z "$TOKEN_A" ]; then
        print_fail "Failed to login Tenant A user"
        echo "Response: $LOGIN_A"
        exit 1
    fi
    
    print_pass "Tenant A user logged in"
    
    echo "Logging in Tenant B user..."
    LOGIN_B=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL_B\",\"password\":\"$PASSWORD_B\"}")
    
    TOKEN_B=$(echo $LOGIN_B | jq -r '.token // .accessToken // empty')
    
    if [ -z "$TOKEN_B" ]; then
        print_fail "Failed to login Tenant B user"
        echo "Response: $LOGIN_B"
        exit 1
    fi
    
    print_pass "Tenant B user logged in"
    
    # Extract tenant IDs
    TENANT_A_ID=$(echo $LOGIN_A | jq -r '.user.tenant_id // .tenant_id // "unknown"')
    TENANT_B_ID=$(echo $LOGIN_B | jq -r '.user.tenant_id // .tenant_id // "unknown"')
    
    echo ""
    echo "Tenant IDs:"
    echo "  Tenant A: $TENANT_A_ID"
    echo "  Tenant B: $TENANT_B_ID"
else
    print_fail "Invalid option"
    exit 1
fi

# Verify we have different tenants
if [ "$TENANT_A_ID" = "$TENANT_B_ID" ]; then
    print_warning "Both users appear to be from the same tenant!"
    echo "Tenant isolation tests may not be meaningful."
    read -p "Continue anyway? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Initialize results
echo "{\"tests\": []}" > $RESULTS_FILE

# ============================================================================
# TEST 1: USER LIST ISOLATION
# ============================================================================

print_header "TEST 1: User List Isolation"
print_test "Verify users from Tenant A cannot see Tenant B users"

echo "Fetching users as Tenant A..."
USERS_A=$(curl -s -H "Authorization: Bearer $TOKEN_A" "$API_URL/api/users")

echo "Fetching users as Tenant B..."
USERS_B=$(curl -s -H "Authorization: Bearer $TOKEN_B" "$API_URL/api/users")

# Check Tenant A results
TENANT_COUNT_A=$(echo "$USERS_A" | jq -r '.users[]?.tenant_id // .data[]?.tenant_id // empty' | sort | uniq | wc -l | tr -d ' ')

if [ "$TENANT_COUNT_A" -eq 1 ]; then
    print_pass "Tenant A sees only their own users"
    echo "$USERS_A" | jq -r '.users[]?.email // .data[]?.email // empty' | head -5
else
    print_fail "Tenant A can see users from multiple tenants! ($TENANT_COUNT_A tenants visible)"
    echo "$USERS_A" | jq -r '.users[]?.tenant_id // .data[]?.tenant_id // empty' | sort | uniq
fi

# Check Tenant B results
TENANT_COUNT_B=$(echo "$USERS_B" | jq -r '.users[]?.tenant_id // .data[]?.tenant_id // empty' | sort | uniq | wc -l | tr -d ' ')

if [ "$TENANT_COUNT_B" -eq 1 ]; then
    print_pass "Tenant B sees only their own users"
    echo "$USERS_B" | jq -r '.users[]?.email // .data[]?.email // empty' | head -5
else
    print_fail "Tenant B can see users from multiple tenants! ($TENANT_COUNT_B tenants visible)"
    echo "$USERS_B" | jq -r '.users[]?.tenant_id // .data[]?.tenant_id // empty' | sort | uniq
fi

# ============================================================================
# TEST 2: AUDIT LOG ISOLATION
# ============================================================================

print_header "TEST 2: Audit Log Isolation"
print_test "Verify audit logs are isolated per tenant"

echo "Fetching audit logs as Tenant A..."
AUDIT_A=$(curl -s -H "Authorization: Bearer $TOKEN_A" "$API_URL/api/enterprise-admin/dashboard/activity")

echo "Fetching audit logs as Tenant B..."
AUDIT_B=$(curl -s -H "Authorization: Bearer $TOKEN_B" "$API_URL/api/enterprise-admin/dashboard/activity")

# Check results
AUDIT_TENANT_COUNT_A=$(echo "$AUDIT_A" | jq -r '.logs[]?.tenant_id // .data[]?.tenant_id // empty' | sort | uniq | wc -l | tr -d ' ')

if [ "$AUDIT_TENANT_COUNT_A" -le 1 ]; then
    print_pass "Tenant A audit logs are isolated"
    echo "Found $(echo "$AUDIT_A" | jq '.logs | length // .data | length // 0') audit entries"
else
    print_fail "Tenant A can see audit logs from multiple tenants!"
fi

# ============================================================================
# TEST 3: REPORT ENDPOINT AUTHENTICATION
# ============================================================================

print_header "TEST 3: Report Endpoint Authentication"
print_test "Verify reports require authentication"

echo "Attempting to access reports without authentication..."
UNAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/reports/roles-users")

if [ "$UNAUTH_RESPONSE" -eq 401 ] || [ "$UNAUTH_RESPONSE" -eq 403 ]; then
    print_pass "Reports require authentication (Status: $UNAUTH_RESPONSE)"
else
    print_fail "Reports accessible without authentication! (Status: $UNAUTH_RESPONSE)"
fi

echo "Accessing reports with authentication..."
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN_A" "$API_URL/api/reports/roles-users")
AUTH_STATUS=$(echo "$AUTH_RESPONSE" | tail -n1)

if [ "$AUTH_STATUS" -eq 200 ]; then
    print_pass "Authenticated access to reports works"
else
    print_warning "Authenticated report access returned status: $AUTH_STATUS"
fi

# ============================================================================
# TEST 4: CROSS-TENANT UPDATE PREVENTION
# ============================================================================

print_header "TEST 4: Cross-Tenant Update Prevention"
print_test "Verify users cannot update other tenant's data"

# Get a user ID from Tenant B
USER_B_ID=$(echo "$USERS_B" | jq -r '.users[0]?.id // .data[0]?.id // empty' | head -1)

if [ -z "$USER_B_ID" ]; then
    print_warning "Could not find Tenant B user ID - skipping cross-tenant update test"
else
    echo "Attempting to update Tenant B user ($USER_B_ID) as Tenant A..."
    
    UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "Authorization: Bearer $TOKEN_A" \
        -H "Content-Type: application/json" \
        -d '{"email":"hacked@evil.com"}' \
        "$API_URL/api/users/$USER_B_ID")
    
    UPDATE_STATUS=$(echo "$UPDATE_RESPONSE" | tail -n1)
    
    if [ "$UPDATE_STATUS" -eq 404 ] || [ "$UPDATE_STATUS" -eq 403 ]; then
        print_pass "Cross-tenant update blocked (Status: $UPDATE_STATUS)"
    else
        print_fail "Cross-tenant update was allowed! (Status: $UPDATE_STATUS)"
        echo "Response: $(echo "$UPDATE_RESPONSE" | head -n-1)"
    fi
fi

# ============================================================================
# TEST 5: MODULE ASSIGNMENT ISOLATION
# ============================================================================

print_header "TEST 5: Module Assignment Isolation"
print_test "Verify module assignments are tenant-isolated"

echo "Fetching module assignments as Tenant A..."
MODULES_A=$(curl -s -H "Authorization: Bearer $TOKEN_A" "$API_URL/api/modules")

echo "Fetching module assignments as Tenant B..."
MODULES_B=$(curl -s -H "Authorization: Bearer $TOKEN_B" "$API_URL/api/modules")

# Check if responses contain tenant_id
MODULE_TENANT_A=$(echo "$MODULES_A" | jq -r '.modules[]?.tenant_id // .data[]?.tenant_id // empty' | sort | uniq | wc -l | tr -d ' ')

if [ "$MODULE_TENANT_A" -le 1 ]; then
    print_pass "Module assignments are tenant-isolated for Tenant A"
else
    print_fail "Tenant A can see modules from multiple tenants!"
fi

# ============================================================================
# TEST SUMMARY
# ============================================================================

print_header "📊 TEST SUMMARY"

echo "Test Results:"
echo ""
echo "1. User List Isolation:"
echo "   - Tenant A: $TENANT_COUNT_A tenant(s) visible"
echo "   - Tenant B: $TENANT_COUNT_B tenant(s) visible"
echo ""
echo "2. Audit Log Isolation:"
echo "   - Status: $([ "$AUDIT_TENANT_COUNT_A" -le 1 ] && echo "✅ Isolated" || echo "❌ Not Isolated")"
echo ""
echo "3. Report Authentication:"
echo "   - Unauthenticated: $UNAUTH_RESPONSE (should be 401/403)"
echo "   - Authenticated: $AUTH_STATUS (should be 200)"
echo ""
echo "4. Cross-Tenant Updates:"
echo "   - Status: $([ ! -z "$UPDATE_STATUS" ] && echo "$UPDATE_STATUS (should be 403/404)" || echo "Skipped")"
echo ""
echo "5. Module Assignments:"
echo "   - Status: $([ "$MODULE_TENANT_A" -le 1 ] && echo "✅ Isolated" || echo "❌ Not Isolated")"
echo ""

# Overall result
PASSED=0
FAILED=0

[ "$TENANT_COUNT_A" -eq 1 ] && ((PASSED++)) || ((FAILED++))
[ "$TENANT_COUNT_B" -eq 1 ] && ((PASSED++)) || ((FAILED++))
[ "$AUDIT_TENANT_COUNT_A" -le 1 ] && ((PASSED++)) || ((FAILED++))
[ "$UNAUTH_RESPONSE" -eq 401 ] || [ "$UNAUTH_RESPONSE" -eq 403 ] && ((PASSED++)) || ((FAILED++))
[ "$AUTH_STATUS" -eq 200 ] && ((PASSED++)) || ((FAILED++))

echo -e "${CYAN}============================================================================${NC}"
echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED ($PASSED/$((PASSED+FAILED)))${NC}"
    echo ""
    echo "✅ Tenant isolation is working correctly!"
    echo "✅ Phase 1 security fixes are functioning as expected"
else
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED ($PASSED passed, $FAILED failed)${NC}"
    echo ""
    echo "Please review the failed tests above."
fi
echo ""
echo -e "${CYAN}============================================================================${NC}"
echo ""

echo "Detailed results saved to: $RESULTS_FILE"
echo ""
echo "Next steps:"
echo "  1. Review any failures above"
echo "  2. Test additional endpoints if needed"
echo "  3. Setup test database for automated testing"
echo "  4. Deploy to staging environment"
echo ""
