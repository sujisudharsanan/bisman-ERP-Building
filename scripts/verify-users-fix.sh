#!/bin/bash
# Quick verification script for Users by Role fix

echo "=================================="
echo "Users by Role - Verification Test"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "1. Checking if backend is running..."
if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "   Please start backend: cd my-backend && npm run dev"
    exit 1
fi

# Check if frontend is running
echo ""
echo "2. Checking if frontend is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend is not running (optional)${NC}"
    echo "   You can start it: cd my-frontend && npm run dev"
fi

# Get auth token (you need to login first)
echo ""
echo "3. Testing API endpoints..."
echo "   Note: You need to be logged in for these tests to work"
echo ""

# Test roles endpoint
echo "   Testing GET /api/privileges/roles..."
ROLES_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5001/api/privileges/roles \
    -H "Cookie: access_token=${ACCESS_TOKEN}")
ROLES_CODE=$(echo "$ROLES_RESPONSE" | tail -n1)
ROLES_BODY=$(echo "$ROLES_RESPONSE" | sed '$d')

if [ "$ROLES_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Roles endpoint working${NC}"
    echo "   Response preview:"
    echo "$ROLES_BODY" | jq -r '.data[] | "   - \(.name): \(.user_count // 0) users"' 2>/dev/null || echo "   (Install jq for formatted output)"
else
    echo -e "${RED}✗ Roles endpoint failed (HTTP $ROLES_CODE)${NC}"
    echo "   You may need to login first"
fi

echo ""
echo "   Testing GET /api/privileges/users?role=1..."
USERS_RESPONSE=$(curl -s -w "\n%{http_code}" "http://localhost:5001/api/privileges/users?role=1" \
    -H "Cookie: access_token=${ACCESS_TOKEN}")
USERS_CODE=$(echo "$USERS_RESPONSE" | tail -n1)
USERS_BODY=$(echo "$USERS_RESPONSE" | sed '$d')

if [ "$USERS_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Users by role endpoint working${NC}"
    USER_COUNT=$(echo "$USERS_BODY" | jq '.data | length' 2>/dev/null || echo "?")
    echo "   Found $USER_COUNT users for role ID 1"
    echo "   User list:"
    echo "$USERS_BODY" | jq -r '.data[] | "   - \(.username) (\(.email)) - Role: \(.role_id)"' 2>/dev/null || echo "   (Install jq for formatted output)"
else
    echo -e "${RED}✗ Users by role endpoint failed (HTTP $USERS_CODE)${NC}"
    echo "   You may need to login first"
fi

# Database check
echo ""
echo "4. Checking database directly..."
cd "$(dirname "$0")/my-backend" 2>/dev/null || cd my-backend 2>/dev/null || true

if [ -f "prisma/schema.prisma" ]; then
    echo "   Querying users table..."
    npx prisma db execute --stdin <<EOF 2>/dev/null | head -20
SELECT COUNT(*) as total_users FROM users;
SELECT role, COUNT(*) as user_count FROM users GROUP BY role ORDER BY user_count DESC;
EOF
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database query successful${NC}"
    else
        echo -e "${YELLOW}⚠ Could not query database (may require setup)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Prisma not found${NC}"
fi

echo ""
echo "=================================="
echo "Verification Complete"
echo "=================================="
echo ""
echo "To manually test:"
echo "1. Login at http://localhost:3000/auth/login"
echo "2. Use credentials: super@bisman.local / changeme"
echo "3. Navigate to /super-admin?tab=users"
echo "4. Check if user counts display correctly"
echo "5. Navigate to /super-admin?tab=privileges"
echo "6. Select a role and verify users appear"
echo ""
echo "For detailed logs, check backend console output"
echo ""
