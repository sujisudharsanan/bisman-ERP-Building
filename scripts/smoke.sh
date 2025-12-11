#!/usr/bin/env bash
#===============================================================================
# BISMAN ERP - Smoke Test Suite
# Lightweight post-deploy verification that mirrors CI validation
#===============================================================================
set -euo pipefail

# Configuration
API_BASE="${API_BASE:-http://localhost:5000}"
TIMEOUT="${TIMEOUT:-5}"
TEST_EMAIL="${TEST_EMAIL:-arun.kumar@bisman.demo}"
TEST_PASSWORD="${TEST_PASSWORD:-Demo@123}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $*"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $*"; ((FAILED++)); }
log_skip() { echo -e "${YELLOW}[SKIP]${NC} $*"; ((SKIPPED++)); }
log_header() { echo -e "\n${BLUE}━━━ $* ━━━${NC}"; }

# HTTP request helper
http_get() {
  local url="$1"
  local token="${2:-}"
  local headers=(-H "Content-Type: application/json")
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  curl -sS --max-time "$TIMEOUT" "${headers[@]}" "$url"
}

http_post() {
  local url="$1"
  local data="$2"
  local token="${3:-}"
  local headers=(-H "Content-Type: application/json")
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  curl -sS --max-time "$TIMEOUT" "${headers[@]}" -X POST -d "$data" "$url"
}

http_patch() {
  local url="$1"
  local data="$2"
  local token="${3:-}"
  local headers=(-H "Content-Type: application/json")
  [[ -n "$token" ]] && headers+=(-H "Authorization: Bearer $token")
  curl -sS --max-time "$TIMEOUT" "${headers[@]}" -X PATCH -d "$data" "$url"
}

# Check if a JSON response contains expected field
json_has_field() {
  local json="$1"
  local field="$2"
  if echo "$json" | jq -e ".$field" >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Get JSON field value
json_get() {
  local json="$1"
  local field="$2"
  echo "$json" | jq -r ".$field"
}

#-------------------------------------------------------------------------------
# Test Cases
#-------------------------------------------------------------------------------
test_health_endpoint() {
  log_header "Health Check"
  
  local response
  response=$(http_get "$API_BASE/api/health" 2>/dev/null) || {
    log_fail "Health endpoint unreachable"
    return 1
  }
  
  if json_has_field "$response" "status"; then
    local status
    status=$(json_get "$response" "status")
    if [[ "$status" == "healthy" || "$status" == "ok" ]]; then
      log_pass "Health endpoint returns healthy status"
    else
      log_fail "Health status is '$status', expected 'healthy' or 'ok'"
    fi
  else
    log_fail "Health response missing 'status' field"
  fi
}

test_auth_login() {
  log_header "Authentication"
  
  local response
  response=$(http_post "$API_BASE/api/auth/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>/dev/null) || {
    log_fail "Login endpoint unreachable"
    return 1
  }
  
  if json_has_field "$response" "accessToken"; then
    TOKEN=$(json_get "$response" "accessToken")
    log_pass "Login successful, token received"
    export TOKEN
  elif json_has_field "$response" "token"; then
    TOKEN=$(json_get "$response" "token")
    log_pass "Login successful, token received (legacy field)"
    export TOKEN
  else
    log_fail "Login failed: $(echo "$response" | jq -c .)"
    return 1
  fi
}

test_me_endpoint() {
  log_header "User Profile (/me)"
  
  if [[ -z "${TOKEN:-}" ]]; then
    log_skip "Skipping /me test - no auth token"
    return 0
  fi
  
  local response
  response=$(http_get "$API_BASE/api/auth/me" "$TOKEN" 2>/dev/null) || {
    log_fail "/me endpoint unreachable"
    return 1
  }
  
  if json_has_field "$response" "user" || json_has_field "$response" "id"; then
    log_pass "/me endpoint returns user data"
  else
    log_fail "/me response missing user data"
  fi
}

test_task_crud() {
  log_header "Task CRUD Operations"
  
  if [[ -z "${TOKEN:-}" ]]; then
    log_skip "Skipping task tests - no auth token"
    return 0
  fi
  
  # Create task
  local timestamp
  timestamp=$(date +%s)
  local create_response
  create_response=$(http_post "$API_BASE/api/v2/tasks" \
    "{\"title\":\"Smoke Test Task $timestamp\",\"status\":\"OPEN\",\"priority\":\"MEDIUM\"}" \
    "$TOKEN" 2>/dev/null) || {
    log_fail "Create task endpoint unreachable"
    return 1
  }
  
  # Handle both { id: ... } and { success: true, data: { id: ... } } formats
  if json_has_field "$create_response" "id"; then
    TASK_ID=$(json_get "$create_response" "id")
    log_pass "Task created with ID: $TASK_ID"
    export TASK_ID
  elif json_has_field "$create_response" "data"; then
    TASK_ID=$(echo "$create_response" | jq -r '.data.id // empty')
    if [[ -n "$TASK_ID" ]]; then
      log_pass "Task created with ID: $TASK_ID"
      export TASK_ID
    else
      log_fail "Task creation failed: data.id missing"
      return 1
    fi
  else
    log_fail "Task creation failed: $(echo "$create_response" | jq -c .)"
    return 1
  fi
  
  # Get task
  local get_response
  get_response=$(http_get "$API_BASE/api/v2/tasks/$TASK_ID" "$TOKEN" 2>/dev/null) || {
    log_fail "Get task endpoint unreachable"
    return 1
  }
  
  if json_has_field "$get_response" "id" || json_has_field "$get_response" "data"; then
    log_pass "Task retrieved successfully"
  else
    log_fail "Task retrieval failed"
  fi
}

test_task_status_transition() {
  log_header "Task Status Transitions"
  
  if [[ -z "${TASK_ID:-}" ]]; then
    log_skip "Skipping status transition tests - no task ID"
    return 0
  fi
  
  # Valid transition: OPEN → IN_PROGRESS
  local response
  response=$(http_patch "$API_BASE/api/v2/tasks/$TASK_ID/status" \
    '{"status":"IN_PROGRESS"}' "$TOKEN" 2>/dev/null) || {
    log_fail "Status transition endpoint unreachable"
    return 1
  }
  
  # Handle both { id, status } and { success, data: { status } } formats
  local new_status=""
  if json_has_field "$response" "id"; then
    new_status=$(json_get "$response" "status")
  elif json_has_field "$response" "data"; then
    new_status=$(echo "$response" | jq -r '.data.status // empty')
  fi
  
  if [[ "$new_status" == "IN_PROGRESS" ]]; then
    log_pass "OPEN → IN_PROGRESS transition successful"
  elif [[ -n "$new_status" ]]; then
    log_fail "Expected IN_PROGRESS status, got $new_status"
  else
    log_fail "Status transition failed: $(echo "$response" | jq -c .)"
  fi
  
  # Invalid transition: IN_PROGRESS → OPEN (should fail with 409)
  local invalid_response
  local http_code
  http_code=$(curl -sS --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -X PATCH -d '{"status":"OPEN"}' \
    "$API_BASE/api/v2/tasks/$TASK_ID/status" 2>/dev/null) || true
  
  if [[ "$http_code" == "409" ]]; then
    log_pass "Invalid transition (IN_PROGRESS → OPEN) correctly returns 409"
  elif [[ "$http_code" == "400" ]]; then
    log_pass "Invalid transition returns 400 (acceptable alternative)"
  else
    log_fail "Invalid transition returned HTTP $http_code, expected 409"
  fi
}

test_kanban_endpoint() {
  log_header "Kanban Board"
  
  if [[ -z "${TOKEN:-}" ]]; then
    log_skip "Skipping kanban test - no auth token"
    return 0
  fi
  
  local response
  response=$(http_get "$API_BASE/api/v2/tasks/kanban" "$TOKEN" 2>/dev/null) || {
    log_fail "Kanban endpoint unreachable"
    return 1
  }
  
  # Check for expected kanban columns or task array
  if echo "$response" | jq -e 'type == "object" or type == "array"' >/dev/null 2>&1; then
    log_pass "Kanban endpoint returns valid response"
  else
    log_fail "Kanban response invalid"
  fi
}

test_database_connection() {
  log_header "Database Connection"
  
  local response
  response=$(http_get "$API_BASE/api/health" 2>/dev/null) || {
    log_fail "Cannot check database status"
    return 0
  }
  
  # Check for database status in health response
  if json_has_field "$response" "database"; then
    local db_status
    db_status=$(json_get "$response" "database")
    if [[ "$db_status" == "connected" || "$db_status" == "healthy" || "$db_status" == "ok" ]]; then
      log_pass "Database connection healthy"
    else
      log_fail "Database status: $db_status"
    fi
  elif json_has_field "$response" "db"; then
    log_pass "Database status field present"
  else
    log_skip "Health endpoint doesn't include database status"
  fi
  return 0
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------
main() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║           BISMAN ERP - Smoke Test Suite                        ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  log_info "Target: $API_BASE"
  log_info "Timeout: ${TIMEOUT}s per request"
  
  # Check prerequisites
  if ! command -v jq &>/dev/null; then
    echo -e "${RED}Error: jq is required but not installed${NC}"
    echo "Install with: brew install jq"
    exit 1
  fi
  
  # Run tests
  test_health_endpoint || true
  test_database_connection || true
  test_auth_login || true
  test_me_endpoint || true
  test_task_crud || true
  test_task_status_transition || true
  test_kanban_endpoint || true
  
  # Summary
  log_header "Summary"
  echo -e "  ${GREEN}Passed:${NC}  $PASSED"
  echo -e "  ${RED}Failed:${NC}  $FAILED"
  echo -e "  ${YELLOW}Skipped:${NC} $SKIPPED"
  echo ""
  
  if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}❌ Smoke tests FAILED${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ All smoke tests PASSED${NC}"
    exit 0
  fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--url)
      API_BASE="$2"
      shift 2
      ;;
    -t|--timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    -e|--email)
      TEST_EMAIL="$2"
      shift 2
      ;;
    -p|--password)
      TEST_PASSWORD="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -u, --url URL        API base URL (default: http://localhost:5000)"
      echo "  -t, --timeout SECS   Request timeout (default: 5)"
      echo "  -e, --email EMAIL    Test user email"
      echo "  -p, --password PASS  Test user password"
      echo "  -h, --help           Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

main
