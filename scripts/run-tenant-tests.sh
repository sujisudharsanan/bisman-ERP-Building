#!/bin/bash

# Tenant Isolation Test Runner
# Runs automated tests for Phase 1 tenant filter fixes

echo "🧪 Running Tenant Isolation Tests"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Jest is installed
if ! npm list jest &> /dev/null; then
    echo -e "${YELLOW}⚠️  Jest not found. Installing test dependencies...${NC}"
    npm install --save-dev jest supertest @types/jest
    echo ""
fi

# Check if database is accessible
echo "🔍 Checking database connection..."
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL not set${NC}"
    echo "Please set DATABASE_URL environment variable"
    exit 1
fi
echo -e "${GREEN}✅ Database configured${NC}"
echo ""

# Run tests
echo "🏃 Running test suite..."
echo ""

# Option 1: Run all tenant tests
if [ "$1" = "all" ]; then
    npm test -- tenant-isolation.test.js
fi

# Option 2: Run specific test suite
if [ "$1" = "helpers" ]; then
    npm test -- tenant-isolation.test.js -t "TenantGuard Helper Functions"
fi

if [ "$1" = "users" ]; then
    npm test -- tenant-isolation.test.js -t "User Management Queries"
fi

if [ "$1" = "audit" ]; then
    npm test -- tenant-isolation.test.js -t "Audit Log Queries"
fi

if [ "$1" = "rbac" ]; then
    npm test -- tenant-isolation.test.js -t "RBAC Permission Queries"
fi

if [ "$1" = "modules" ]; then
    npm test -- tenant-isolation.test.js -t "Module Assignment Queries"
fi

if [ "$1" = "reports" ]; then
    npm test -- tenant-isolation.test.js -t "Report Endpoint Security"
fi

if [ "$1" = "edge" ]; then
    npm test -- tenant-isolation.test.js -t "Edge Cases"
fi

if [ "$1" = "performance" ]; then
    npm test -- tenant-isolation.test.js -t "Performance Impact"
fi

# Default: Run all tests
if [ -z "$1" ]; then
    npm test -- tenant-isolation.test.js --coverage
fi

echo ""
echo "=================================="
echo "✅ Test run complete"
echo ""

# Display coverage report if available
if [ -f "coverage/lcov-report/index.html" ]; then
    echo "📊 Coverage report available at: coverage/lcov-report/index.html"
fi
