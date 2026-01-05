#!/bin/bash
# ============================================================================
# USER MODEL GUARD - CI ENFORCEMENT SCRIPT
# ============================================================================
# 
# This script enforces the USER_MODEL_LOCK.md rules by failing the build
# if any prohibited patterns are detected.
#
# Location: scripts/ci/user-model-guard.sh
# Usage: bash scripts/ci/user-model-guard.sh
#
# Exit codes:
#   0 - All checks passed
#   1 - Violations detected (blocks merge)
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_DIR="my-backend"
VIOLATIONS_FOUND=0

echo "=============================================="
echo "  USER MODEL GUARD - CI ENFORCEMENT"
echo "=============================================="
echo ""

# ============================================================================
# CHECK 1: UserService exists
# ============================================================================
echo -n "[CHECK 1] UserService exists... "
if [ -f "$BACKEND_DIR/services/userService.js" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "  ERROR: services/userService.js is missing!"
    echo "  The canonical user service must exist."
    VIOLATIONS_FOUND=1
fi

# ============================================================================
# CHECK 2: Direct prisma.user.create() calls (outside UserService)
# ============================================================================
echo -n "[CHECK 2] No direct prisma.user.create() calls... "

# Find all occurrences, excluding UserService, scripts, tests, and examples
DIRECT_CREATE=$(grep -rn "prisma\.user\.create(" \
    --include="*.js" --include="*.ts" \
    "$BACKEND_DIR/routes" \
    "$BACKEND_DIR/src/routes" \
    "$BACKEND_DIR/services" \
    2>/dev/null | grep -v "userService.js" | grep -v "# DEPRECATED" || true)

if [ -z "$DIRECT_CREATE" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "  ERROR: Direct prisma.user.create() calls found outside UserService:"
    echo "$DIRECT_CREATE" | while read -r line; do
        echo "    $line"
    done
    echo ""
    echo "  FIX: Replace with UserService.createUser()"
    echo "  See: docs/USER_MODEL_LOCK.md"
    VIOLATIONS_FOUND=1
fi

# ============================================================================
# CHECK 3: Direct prisma.user.update() calls (outside UserService)
# ============================================================================
echo -n "[CHECK 3] No direct prisma.user.update() calls... "

DIRECT_UPDATE=$(grep -rn "prisma\.user\.update(" \
    --include="*.js" --include="*.ts" \
    "$BACKEND_DIR/routes" \
    "$BACKEND_DIR/src/routes" \
    "$BACKEND_DIR/services" \
    2>/dev/null | grep -v "userService.js" | grep -v "# DEPRECATED" || true)

if [ -z "$DIRECT_UPDATE" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "  ERROR: Direct prisma.user.update() calls found outside UserService:"
    echo "$DIRECT_UPDATE" | while read -r line; do
        echo "    $line"
    done
    echo ""
    echo "  FIX: Replace with UserService.updateUser()"
    echo "  See: docs/USER_MODEL_LOCK.md"
    VIOLATIONS_FOUND=1
fi

# ============================================================================
# CHECK 4: Deprecated field references (manager_id on users)
# ============================================================================
echo -n "[CHECK 4] No deprecated manager_id references... "

# Look for manager_id in user context (not hub_manager_id or creator_manager_id)
DEPRECATED_MANAGER=$(grep -rn "\.manager_id\|user\.manager_id\|req\.body\.manager_id" \
    --include="*.js" --include="*.ts" \
    "$BACKEND_DIR/routes" \
    "$BACKEND_DIR/src/routes" \
    "$BACKEND_DIR/services" \
    2>/dev/null | grep -v "hub_manager_id" | grep -v "creator_manager_id" | grep -v "DEPRECATED" || true)

if [ -z "$DEPRECATED_MANAGER" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC}"
    echo "  WARNING: Possible deprecated manager_id references found:"
    echo "$DEPRECATED_MANAGER" | head -5 | while read -r line; do
        echo "    $line"
    done
    echo "  Review and replace with reports_to if referring to user manager."
    # Not failing build for this - just warning
fi

# ============================================================================
# CHECK 5: Deprecated reporting_manager_id references
# ============================================================================
echo -n "[CHECK 5] No deprecated reporting_manager_id references... "

DEPRECATED_REPORTING=$(grep -rn "reporting_manager_id" \
    --include="*.js" --include="*.ts" \
    "$BACKEND_DIR/routes" \
    "$BACKEND_DIR/src/routes" \
    "$BACKEND_DIR/services" \
    2>/dev/null | grep -v "DEPRECATED" | grep -v "fallback" || true)

if [ -z "$DEPRECATED_REPORTING" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${YELLOW}WARN${NC}"
    echo "  WARNING: Deprecated reporting_manager_id references found:"
    echo "$DEPRECATED_REPORTING" | head -5 | while read -r line; do
        echo "    $line"
    done
    echo "  Replace with reports_to."
    # Not failing build for this - just warning
fi

# ============================================================================
# CHECK 6: USER_MODEL_LOCK.md exists
# ============================================================================
echo -n "[CHECK 6] USER_MODEL_LOCK.md exists... "
if [ -f "docs/USER_MODEL_LOCK.md" ]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo "  ERROR: docs/USER_MODEL_LOCK.md is missing!"
    VIOLATIONS_FOUND=1
fi

# ============================================================================
# FINAL RESULT
# ============================================================================
echo ""
echo "=============================================="
if [ $VIOLATIONS_FOUND -eq 0 ]; then
    echo -e "  ${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo "  User model integrity verified."
    echo "=============================================="
    exit 0
else
    echo -e "  ${RED}❌ VIOLATIONS DETECTED${NC}"
    echo "  User model lock has been violated."
    echo "  See: docs/USER_MODEL_LOCK.md"
    echo "=============================================="
    exit 1
fi
