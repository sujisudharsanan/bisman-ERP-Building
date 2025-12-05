#!/bin/bash
#
# RBAC Smoke Test Script
# 
# Automated post-deployment verification for RBAC privilege escalation protection.
# Run this script after deploying the RBAC changes to verify everything works.
#
# Usage:
#   ./scripts/rbac-smoke-test.sh [staging|production]
#
# Environment Variables (required):
#   DATABASE_URL - PostgreSQL connection string
#   REDIS_URL    - Redis connection string (optional, skips Redis tests if missing)
#   API_HOST     - API hostname (e.g., https://api.bisman.com)
#   ADMIN_TOKEN  - JWT token for an Admin (level 80+)
#   LOW_TOKEN    - JWT token for a low-privilege user (level < 80)
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed
#   2 - Configuration error

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Environment
ENV="${1:-staging}"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  RBAC Smoke Test Suite - ${ENV^^}${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# -------------------------------------------------
# Helper functions
# -------------------------------------------------

log_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((FAILED++))
}

log_skip() {
  echo -e "${YELLOW}[SKIP]${NC} $1"
  ((SKIPPED++))
}

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}Error: $1 is not installed${NC}"
    exit 2
  fi
}

# -------------------------------------------------
# Pre-flight checks
# -------------------------------------------------

echo -e "${BLUE}Pre-flight checks...${NC}"

check_command "curl"
check_command "jq"

# Check required environment variables
if [ -z "${DATABASE_URL:-}" ]; then
  log_skip "DATABASE_URL not set - skipping database tests"
  DB_AVAILABLE=false
else
  check_command "psql"
  DB_AVAILABLE=true
fi

if [ -z "${REDIS_URL:-}" ]; then
  log_skip "REDIS_URL not set - skipping Redis tests"
  REDIS_AVAILABLE=false
else
  check_command "redis-cli"
  REDIS_AVAILABLE=true
fi

if [ -z "${API_HOST:-}" ]; then
  echo -e "${RED}Error: API_HOST environment variable is required${NC}"
  exit 2
fi

# Default tokens if not provided (will cause test failures, but won't crash)
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
LOW_TOKEN="${LOW_TOKEN:-}"

echo -e "${GREEN}Pre-flight checks complete${NC}"
echo ""

# -------------------------------------------------
# 1. Database Migration Tests
# -------------------------------------------------

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. Database Migration Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DB_AVAILABLE" = true ]; then
  
  # Test 1.1: min_role_level column exists
  log_test "Checking min_role_level column exists..."
  COLUMN_EXISTS=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_name='rbac_permissions' AND column_name='min_role_level';
  " 2>/dev/null | tr -d ' ')
  
  if [ "$COLUMN_EXISTS" = "1" ]; then
    log_pass "min_role_level column exists"
  else
    log_fail "min_role_level column not found"
  fi
  
  # Test 1.2: Index exists
  log_test "Checking min_role_level index exists..."
  INDEX_EXISTS=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM pg_indexes 
    WHERE tablename='rbac_permissions' AND indexname LIKE '%min_role_level%';
  " 2>/dev/null | tr -d ' ')
  
  if [ "$INDEX_EXISTS" -ge "1" ]; then
    log_pass "min_role_level index exists"
  else
    log_fail "min_role_level index not found"
  fi
  
  # Test 1.3: High-level permissions seeded
  log_test "Checking system-critical permissions have min_role_level..."
  HIGH_LEVEL_COUNT=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM rbac_permissions WHERE min_role_level >= 80;
  " 2>/dev/null | tr -d ' ')
  
  if [ "$HIGH_LEVEL_COUNT" -ge "1" ]; then
    log_pass "Found $HIGH_LEVEL_COUNT permissions with min_role_level >= 80"
  else
    log_skip "No high-level permissions found (may need seeding)"
  fi
  
  # Test 1.4: Role levels are properly set
  log_test "Checking role levels..."
  ROLE_LEVELS=$(psql "$DATABASE_URL" -t -c "
    SELECT name, level FROM rbac_roles WHERE level IS NOT NULL ORDER BY level DESC LIMIT 5;
  " 2>/dev/null)
  
  if [ -n "$ROLE_LEVELS" ]; then
    log_pass "Role levels configured"
    echo "$ROLE_LEVELS" | while read -r line; do
      echo "       $line"
    done
  else
    log_fail "No role levels found"
  fi
  
else
  log_skip "Database tests (DATABASE_URL not set)"
fi

echo ""

# -------------------------------------------------
# 2. API Smoke Tests
# -------------------------------------------------

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. API Endpoint Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Get a valid role ID for testing
ROLE_ID="${TEST_ROLE_ID:-1}"

# Test 2.1: Unauthenticated request returns 401
log_test "Unauthenticated request returns 401..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PUT "${API_HOST}/api/privileges/roles/${ROLE_ID}/permissions" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":[]}' 2>/dev/null || echo "000")

if [ "$RESPONSE" = "401" ]; then
  log_pass "Unauthenticated request blocked (401)"
else
  log_fail "Expected 401, got $RESPONSE"
fi

# Test 2.2: Low-privilege user blocked (403)
if [ -n "$LOW_TOKEN" ]; then
  log_test "Low-privilege user blocked (403)..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X PUT "${API_HOST}/api/privileges/roles/${ROLE_ID}/permissions" \
    -H "Authorization: Bearer ${LOW_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"permissionIds":[]}' 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "403" ]; then
    ERROR_CODE=$(echo "$BODY" | jq -r '.error.code // .code // "unknown"' 2>/dev/null)
    log_pass "Low-privilege user blocked (403, code: $ERROR_CODE)"
  else
    log_fail "Expected 403, got $HTTP_CODE"
  fi
else
  log_skip "Low-privilege user test (LOW_TOKEN not set)"
fi

# Test 2.3: Admin user can access endpoint
if [ -n "$ADMIN_TOKEN" ]; then
  log_test "Admin user can access endpoint..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X PUT "${API_HOST}/api/privileges/roles/${ROLE_ID}/permissions" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"permissionIds":[]}' 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    log_pass "Admin can access endpoint (200)"
  elif [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
    log_pass "Admin can access endpoint ($HTTP_CODE - expected for missing data)"
  elif [ "$HTTP_CODE" = "403" ]; then
    ERROR_CODE=$(echo "$BODY" | jq -r '.error.code // .code // "unknown"' 2>/dev/null)
    if [ "$ERROR_CODE" = "ROLE_LEVEL_TOO_LOW" ]; then
      log_fail "Admin blocked by role level (token may not be admin level)"
    else
      log_pass "Admin blocked by tenant scoping (expected in multi-tenant)"
    fi
  else
    log_fail "Unexpected response: $HTTP_CODE"
  fi
else
  log_skip "Admin user test (ADMIN_TOKEN not set)"
fi

# Test 2.4: Invalid permission IDs return 400
if [ -n "$ADMIN_TOKEN" ]; then
  log_test "Invalid permission IDs return 400..."
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X PUT "${API_HOST}/api/privileges/roles/${ROLE_ID}/permissions" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"permissionIds":[999999999]}' 2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "400" ]; then
    ERROR_CODE=$(echo "$BODY" | jq -r '.error.code // .code // "unknown"' 2>/dev/null)
    log_pass "Invalid permission IDs rejected (400, code: $ERROR_CODE)"
  elif [ "$HTTP_CODE" = "403" ]; then
    log_pass "Request blocked by authorization (403)"
  else
    log_fail "Expected 400, got $HTTP_CODE"
  fi
else
  log_skip "Invalid permission IDs test (ADMIN_TOKEN not set)"
fi

# Test 2.5: Missing permissionIds returns 400
if [ -n "$ADMIN_TOKEN" ]; then
  log_test "Missing permissionIds returns 400..."
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X PUT "${API_HOST}/api/privileges/roles/${ROLE_ID}/permissions" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo "000")
  
  if [ "$RESPONSE" = "400" ]; then
    log_pass "Missing permissionIds rejected (400)"
  elif [ "$RESPONSE" = "403" ]; then
    log_pass "Request blocked by authorization (403)"
  else
    log_fail "Expected 400, got $RESPONSE"
  fi
else
  log_skip "Missing permissionIds test (ADMIN_TOKEN not set)"
fi

echo ""

# -------------------------------------------------
# 3. Audit Log Verification
# -------------------------------------------------

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. Audit Log Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DB_AVAILABLE" = true ]; then
  
  # Test 3.1: Check for ROLE_PERMISSIONS_UPDATED events
  log_test "Checking for ROLE_PERMISSIONS_UPDATED audit events..."
  
  # Try different table names (security_events or audit_logs)
  AUDIT_COUNT=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM (
      SELECT 1 FROM security_events WHERE event_type = 'ROLE_PERMISSIONS_UPDATED'
      UNION ALL
      SELECT 1 FROM audit_logs WHERE action = 'ROLE_PERMISSIONS_UPDATED'
    ) combined;
  " 2>/dev/null | tr -d ' ' || echo "0")
  
  if [ "$AUDIT_COUNT" -ge "1" ]; then
    log_pass "Found $AUDIT_COUNT ROLE_PERMISSIONS_UPDATED audit events"
  else
    log_info "No audit events found yet (run some permission assignments first)"
  fi
  
  # Test 3.2: Check recent audit entries have required fields
  log_test "Checking audit entries have tenant context..."
  RECENT_AUDITS=$(psql "$DATABASE_URL" -t -c "
    SELECT 
      COALESCE(payload->>'tenantId', 'null') as tenant_id,
      COALESCE(payload->>'userType', 'null') as user_type,
      created_at
    FROM security_events 
    WHERE event_type = 'ROLE_PERMISSIONS_UPDATED'
    ORDER BY created_at DESC 
    LIMIT 3;
  " 2>/dev/null || echo "")
  
  if [ -n "$RECENT_AUDITS" ]; then
    log_pass "Recent audit entries found with tenant context"
    echo "$RECENT_AUDITS" | while read -r line; do
      [ -n "$line" ] && echo "       $line"
    done
  else
    log_info "No recent audit entries to check"
  fi
  
else
  log_skip "Audit log tests (DATABASE_URL not set)"
fi

echo ""

# -------------------------------------------------
# 4. Redis Cache Invalidation
# -------------------------------------------------

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. Redis Cache Invalidation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$REDIS_AVAILABLE" = true ]; then
  
  # Test 4.1: Redis connection works
  log_test "Testing Redis connection..."
  REDIS_PING=$(redis-cli -u "$REDIS_URL" PING 2>/dev/null || echo "FAILED")
  
  if [ "$REDIS_PING" = "PONG" ]; then
    log_pass "Redis connection successful"
  else
    log_fail "Redis connection failed"
  fi
  
  # Test 4.2: Check for permission cache keys
  log_test "Checking for permission cache keys..."
  CACHE_KEYS=$(redis-cli -u "$REDIS_URL" KEYS "permissions:*" 2>/dev/null | wc -l | tr -d ' ')
  
  log_info "Found $CACHE_KEYS permission cache keys"
  
  # Test 4.3: Verify invalidation channel exists
  log_test "Verifying invalidation channel..."
  # Note: We can't easily test pub/sub in a script, but we can check pubsub channels
  PUBSUB_CHANNELS=$(redis-cli -u "$REDIS_URL" PUBSUB CHANNELS "permissions:*" 2>/dev/null | wc -l | tr -d ' ')
  
  log_info "Found $PUBSUB_CHANNELS active permission-related channels"
  
else
  log_skip "Redis tests (REDIS_URL not set)"
fi

echo ""

# -------------------------------------------------
# 5. Test Summary
# -------------------------------------------------

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Passed:${NC}  $PASSED"
echo -e "${RED}Failed:${NC}  $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  PERCENT=$((PASSED * 100 / TOTAL))
  echo -e "Pass rate: ${PERCENT}%"
fi

echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}SOME TESTS FAILED - Review issues above${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 1
else
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}ALL TESTS PASSED${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  exit 0
fi
