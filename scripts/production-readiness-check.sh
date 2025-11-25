#!/bin/bash

# Production Readiness Script for BISMAN ERP
# This script prepares the application for production deployment

# Don't exit on errors - we want to collect all issues
set +e

echo "=================================================="
echo "🚀 BISMAN ERP - Production Readiness Check"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
WARNINGS=0
ERRORS=0
PASSED=0

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ "$1" = "pass" ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    elif [ "$1" = "warn" ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
        ((WARNINGS++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((ERRORS++))
    fi
}

echo "1️⃣  Checking Prerequisites..."
echo "----------------------------"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_status "pass" "Node.js installed: $NODE_VERSION"
else
    print_status "error" "Node.js not found"
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_status "pass" "npm installed: $NPM_VERSION"
else
    print_status "error" "npm not found"
fi

# Check Git
if command_exists git; then
    print_status "pass" "Git installed"
else
    print_status "warn" "Git not found (optional)"
fi

echo ""
echo "2️⃣  Checking Environment Files..."
echo "----------------------------"

# Check frontend .env
if [ -f "my-frontend/.env.local" ] || [ -f "my-frontend/.env.production" ]; then
    print_status "pass" "Frontend environment file exists"
else
    print_status "error" "Frontend .env.local or .env.production not found"
fi

# Check backend .env
if [ -f "my-backend/.env" ]; then
    print_status "pass" "Backend environment file exists"
else
    print_status "error" "Backend .env not found"
fi

echo ""
echo "3️⃣  Checking for Console Statements..."
echo "----------------------------"

FRONTEND_CONSOLE_COUNT=$(grep -r "console\.\(log\|error\|warn\)" my-frontend/src --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')
BACKEND_CONSOLE_COUNT=$(grep -r "console\.\(log\|error\|warn\)" my-backend --exclude="*.md" --exclude-dir=node_modules 2>/dev/null | wc -l | tr -d ' ')

if [ "$FRONTEND_CONSOLE_COUNT" -gt 0 ]; then
    print_status "warn" "Found $FRONTEND_CONSOLE_COUNT console statements in frontend"
else
    print_status "pass" "No console statements in frontend"
fi

if [ "$BACKEND_CONSOLE_COUNT" -gt 0 ]; then
    print_status "warn" "Found $BACKEND_CONSOLE_COUNT console statements in backend"
else
    print_status "pass" "No console statements in backend"
fi

echo ""
echo "4️⃣  Checking Dependencies..."
echo "----------------------------"

# Frontend dependencies
if [ -d "my-frontend/node_modules" ]; then
    print_status "pass" "Frontend dependencies installed"
else
    print_status "error" "Frontend dependencies not installed (run: cd my-frontend && npm install)"
fi

# Backend dependencies
if [ -d "my-backend/node_modules" ]; then
    print_status "pass" "Backend dependencies installed"
else
    print_status "error" "Backend dependencies not installed (run: cd my-backend && npm install)"
fi

echo ""
echo "5️⃣  Running TypeScript Check..."
echo "----------------------------"

cd my-frontend
if npm run type-check > /dev/null 2>&1; then
    print_status "pass" "Frontend TypeScript check passed"
else
    print_status "error" "Frontend TypeScript errors found (run: npm run type-check)"
fi
cd ..

echo ""
echo "6️⃣  Testing Production Build..."
echo "----------------------------"

# Test frontend build
cd my-frontend
echo "Building frontend (this may take a minute)..."
if npm run build > /tmp/frontend-build.log 2>&1; then
    print_status "pass" "Frontend production build successful"
else
    print_status "error" "Frontend build failed (check /tmp/frontend-build.log)"
fi
cd ..

echo ""
echo "7️⃣  Security Checks..."
echo "----------------------------"

# Check for common security issues
if grep -r "hardcoded.*password\|password.*=.*['\"]" my-backend --exclude-dir=node_modules --exclude="*.md" > /dev/null 2>&1; then
    print_status "warn" "Possible hardcoded passwords found - please review"
else
    print_status "pass" "No obvious hardcoded passwords"
fi

# Check for TODO/FIXME comments
TODO_COUNT=$(grep -r "TODO\|FIXME" my-frontend/src my-backend --exclude-dir=node_modules --exclude="*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$TODO_COUNT" -gt 0 ]; then
    print_status "warn" "Found $TODO_COUNT TODO/FIXME comments - review before production"
else
    print_status "pass" "No TODO/FIXME comments"
fi

echo ""
echo "8️⃣  Database Check..."
echo "----------------------------"

# Check Prisma schema exists
if [ -f "my-backend/prisma/schema.prisma" ]; then
    print_status "pass" "Prisma schema file exists"
else
    print_status "error" "Prisma schema file not found"
fi

# Check if Prisma client is generated
if [ -d "my-backend/node_modules/@prisma/client" ]; then
    print_status "pass" "Prisma client generated"
else
    print_status "warn" "Prisma client may need regeneration (run: cd my-backend && npx prisma generate)"
fi

echo ""
echo "=================================================="
echo "📊 Production Readiness Summary"
echo "=================================================="
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Errors: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}🚫 NOT READY FOR PRODUCTION${NC}"
    echo "Please fix the errors above before deploying."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  READY WITH WARNINGS${NC}"
    echo "Review warnings above before deploying."
    exit 0
else
    echo -e "${GREEN}✅ READY FOR PRODUCTION${NC}"
    echo "All checks passed!"
    exit 0
fi
