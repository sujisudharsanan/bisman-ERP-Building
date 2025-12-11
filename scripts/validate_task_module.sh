#!/usr/bin/env bash
#===============================================================================
# BISMAN ERP - Task Module Validation Script
# Comprehensive validation for task module database schema, APIs, and transitions
#===============================================================================
# Relaxed error handling - we want to complete all checks even if some fail
set -uo pipefail

# Configuration
DB_NAME="${DB_NAME:-BISMAN}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
API_BASE="${API_BASE:-http://localhost:5000}"
TEST_EMAIL="${TEST_EMAIL:-arun.kumar@bisman.demo}"
TEST_PASSWORD="${TEST_PASSWORD:-Demo@123}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
log_section() { echo -e "\n${CYAN}══════════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"; }
log_check() { echo -e "${BLUE}[CHECK]${NC} $*"; }
log_pass() { echo -e "${GREEN}  ✓${NC} $*"; ((CHECKS_PASSED++)); }
log_fail() { echo -e "${RED}  ✗${NC} $*"; ((CHECKS_FAILED++)); }
log_warn() { echo -e "${YELLOW}  ⚠${NC} $*"; ((WARNINGS++)); }
log_info() { echo -e "${BLUE}  ℹ${NC} $*"; }

# PostgreSQL query helper
psql_query() {
  local query="$1"
  PGPASSWORD="${DB_PASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$query" 2>/dev/null
}

# Check if table exists
table_exists() {
  local table="$1"
  local result
  result=$(psql_query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');") || return 1
  if [[ "$result" == "t" ]]; then
    return 0
  else
    return 1
  fi
}

# Get column info
column_exists() {
  local table="$1"
  local column="$2"
  local result
  result=$(psql_query "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column');") || return 1
  if [[ "$result" == "t" ]]; then
    return 0
  else
    return 1
  fi
}

# Get column type
get_column_type() {
  local table="$1"
  local column="$2"
  psql_query "SELECT data_type FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$column';" || echo "unknown"
}

# Check foreign key exists
fk_exists() {
  local table="$1"
  local column="$2"
  local result
  result=$(psql_query "SELECT EXISTS (SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND kcu.table_name = '$table' AND kcu.column_name = '$column');") || return 1
  if [[ "$result" == "t" ]]; then
    return 0
  else
    return 1
  fi
}

# Check index exists
index_exists() {
  local table="$1"
  local index_name="$2"
  local result
  result=$(psql_query "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = '$table' AND indexname = '$index_name');") || return 1
  if [[ "$result" == "t" ]]; then
    return 0
  else
    return 1
  fi
}

#-------------------------------------------------------------------------------
# Database Schema Validation
#-------------------------------------------------------------------------------
validate_database_schema() {
  log_section "Database Schema Validation"
  
  # Check required tables
  log_check "Required tables exist"
  local required_tables=("workflow_tasks" "task_messages" "task_attachments" "task_audit_logs")
  for table in "${required_tables[@]}"; do
    if table_exists "$table"; then
      log_pass "Table '$table' exists"
    else
      log_fail "Table '$table' is missing"
    fi
  done
  
  # Validate workflow_tasks columns
  log_check "workflow_tasks columns"
  local workflow_columns=("id" "title" "description" "status" "priority" "tenant_id" "created_by" "assigned_to" "position" "is_archived" "archived_at" "actual_hours" "tags" "created_at" "updated_at")
  for col in "${workflow_columns[@]}"; do
    if column_exists "workflow_tasks" "$col"; then
      log_pass "workflow_tasks.$col exists"
    else
      log_fail "workflow_tasks.$col is missing"
    fi
  done
  
  # Validate task_messages columns
  log_check "task_messages columns"
  if column_exists "task_messages" "content"; then
    log_pass "task_messages.content exists (correct name)"
  elif column_exists "task_messages" "message_text"; then
    log_warn "task_messages.message_text exists (legacy name, should be renamed to 'content')"
  else
    log_fail "task_messages message column missing"
  fi
  
  # Validate column types
  log_check "Column type consistency"
  
  # tenant_id should be UUID everywhere
  local tenant_tables=("workflow_tasks" "task_messages" "task_attachments" "task_audit_logs")
  for table in "${tenant_tables[@]}"; do
    if table_exists "$table" && column_exists "$table" "tenant_id"; then
      local type
      type=$(get_column_type "$table" "tenant_id")
      if [[ "$type" == "uuid" ]]; then
        log_pass "$table.tenant_id is UUID"
      else
        log_fail "$table.tenant_id is '$type', expected UUID"
      fi
    fi
  done
  
  # id columns should be integer (for workflow_tasks, task_messages, task_attachments)
  for table in "workflow_tasks" "task_messages" "task_attachments"; do
    if table_exists "$table" && column_exists "$table" "id"; then
      local type
      type=$(get_column_type "$table" "id")
      if [[ "$type" == "integer" || "$type" == "bigint" ]]; then
        log_pass "$table.id is INTEGER"
      else
        log_warn "$table.id is '$type' (expected integer)"
      fi
    fi
  done
  
  # Validate foreign keys
  log_check "Foreign key constraints"
  if fk_exists "task_messages" "task_id"; then
    log_pass "task_messages.task_id has FK constraint"
  else
    log_warn "task_messages.task_id missing FK constraint"
  fi
  
  if fk_exists "task_attachments" "task_id"; then
    log_pass "task_attachments.task_id has FK constraint"
  else
    log_warn "task_attachments.task_id missing FK constraint"
  fi
  
  # Check indexes
  log_check "Performance indexes"
  local expected_indexes=(
    "workflow_tasks:idx_workflow_tasks_tenant_id"
    "workflow_tasks:idx_workflow_tasks_status"
    "workflow_tasks:idx_workflow_tasks_assigned_to"
    "task_messages:idx_task_messages_task_id"
  )
  for idx_def in "${expected_indexes[@]}"; do
    local table="${idx_def%%:*}"
    local idx="${idx_def##*:}"
    if table_exists "$table"; then
      if index_exists "$table" "$idx"; then
        log_pass "Index $idx exists"
      else
        log_warn "Index $idx missing (recommended for performance)"
      fi
    fi
  done
}

#-------------------------------------------------------------------------------
# API Endpoint Validation
#-------------------------------------------------------------------------------
validate_api_endpoints() {
  log_section "API Endpoint Validation"
  
  # Check if server is running
  log_check "Server connectivity"
  if curl -sS --max-time 5 "$API_BASE/api/health" >/dev/null 2>&1; then
    log_pass "API server is reachable at $API_BASE"
  else
    log_fail "API server is not reachable at $API_BASE"
    log_info "Skipping remaining API tests"
    return 1
  fi
  
  # Login to get token
  log_check "Authentication"
  local login_response
  login_response=$(curl -sS --max-time 10 -X POST "$API_BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" 2>/dev/null) || {
    log_fail "Login request failed"
    return 1
  }
  
  local token
  token=$(echo "$login_response" | jq -r '.accessToken // .token // empty')
  if [[ -n "$token" ]]; then
    log_pass "Login successful"
  else
    log_fail "Login failed: $(echo "$login_response" | jq -c .)"
    return 1
  fi
  
  # Test CRUD endpoints
  log_check "Task CRUD endpoints"
  
  # GET /api/v2/tasks
  local list_code
  list_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $token" \
    "$API_BASE/api/v2/tasks" 2>/dev/null)
  if [[ "$list_code" == "200" ]]; then
    log_pass "GET /api/v2/tasks returns 200"
  else
    log_fail "GET /api/v2/tasks returns $list_code"
  fi
  
  # POST /api/v2/tasks
  local create_response
  create_response=$(curl -sS --max-time 10 -X POST \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d '{"title":"Validation Test Task","status":"OPEN","priority":"LOW"}' \
    "$API_BASE/api/v2/tasks" 2>/dev/null)
  
  # Handle both { id: ... } and { success: true, data: { id: ... } } formats
  local task_id
  task_id=$(echo "$create_response" | jq -r '.id // .data.id // empty')
  if [[ -n "$task_id" ]]; then
    log_pass "POST /api/v2/tasks creates task (ID: $task_id)"
  else
    log_fail "POST /api/v2/tasks failed: $(echo "$create_response" | jq -c .)"
    return 1
  fi
  
  # GET /api/v2/tasks/:id
  local get_code
  get_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $token" \
    "$API_BASE/api/v2/tasks/$task_id" 2>/dev/null)
  if [[ "$get_code" == "200" ]]; then
    log_pass "GET /api/v2/tasks/:id returns 200"
  else
    log_fail "GET /api/v2/tasks/:id returns $get_code"
  fi
  
  # GET /api/v2/tasks/kanban
  local kanban_code
  kanban_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $token" \
    "$API_BASE/api/v2/tasks/kanban" 2>/dev/null)
  if [[ "$kanban_code" == "200" ]]; then
    log_pass "GET /api/v2/tasks/kanban returns 200"
  else
    log_fail "GET /api/v2/tasks/kanban returns $kanban_code"
  fi
  
  # Validate status transitions
  log_check "Status transition validation"
  
  # Valid: OPEN → IN_PROGRESS
  local transition_code
  transition_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -X PATCH -d '{"status":"IN_PROGRESS"}' \
    "$API_BASE/api/v2/tasks/$task_id/status" 2>/dev/null)
  if [[ "$transition_code" == "200" ]]; then
    log_pass "Valid transition OPEN→IN_PROGRESS returns 200"
  else
    log_fail "Valid transition OPEN→IN_PROGRESS returns $transition_code"
  fi
  
  # Invalid: IN_PROGRESS → OPEN
  local invalid_code
  invalid_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -X PATCH -d '{"status":"OPEN"}' \
    "$API_BASE/api/v2/tasks/$task_id/status" 2>/dev/null)
  if [[ "$invalid_code" == "409" ]]; then
    log_pass "Invalid transition IN_PROGRESS→OPEN returns 409"
  elif [[ "$invalid_code" == "400" ]]; then
    log_pass "Invalid transition IN_PROGRESS→OPEN returns 400 (acceptable)"
  else
    log_warn "Invalid transition returns $invalid_code (expected 409)"
  fi
  
  # Valid: IN_PROGRESS → DONE
  local complete_code
  complete_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -X PATCH -d '{"status":"DONE"}' \
    "$API_BASE/api/v2/tasks/$task_id/status" 2>/dev/null)
  if [[ "$complete_code" == "200" ]]; then
    log_pass "Valid transition IN_PROGRESS→DONE returns 200"
  else
    log_fail "Valid transition IN_PROGRESS→DONE returns $complete_code"
  fi
  
  # Cleanup: Archive or delete test task
  log_info "Test task $task_id created (cleanup manually if needed)"
}

#-------------------------------------------------------------------------------
# Controller Code Validation
#-------------------------------------------------------------------------------
validate_controller_code() {
  log_section "Controller Code Validation"
  
  local controller_path="my-backend/controllers/taskControllerV2.js"
  
  if [[ ! -f "$controller_path" ]]; then
    log_fail "Controller file not found: $controller_path"
    return 1
  fi
  
  log_check "Status transition map"
  if grep -q "validTransitions" "$controller_path"; then
    log_pass "validTransitions map exists"
  else
    log_fail "validTransitions map not found"
  fi
  
  log_check "HTTP 409 for invalid transitions"
  if grep -q "409" "$controller_path"; then
    log_pass "409 status code used for conflicts"
  else
    log_warn "409 status code not found (may use 400 instead)"
  fi
  
  log_check "Legacy status aliases"
  if grep -qE "TODO|PENDING" "$controller_path"; then
    log_pass "Legacy status aliases (TODO, PENDING) supported"
  else
    log_warn "Legacy status aliases not found"
  fi
  
  log_check "Audit logging"
  if grep -qE "audit|Audit|AUDIT" "$controller_path"; then
    log_pass "Audit logging present"
  else
    log_warn "Audit logging not detected"
  fi
  
  log_check "Tenant isolation"
  if grep -q "tenant_id" "$controller_path"; then
    log_pass "Tenant isolation (tenant_id) present"
  else
    log_fail "Tenant isolation not found - SECURITY RISK"
  fi
}

#-------------------------------------------------------------------------------
# Documentation Validation
#-------------------------------------------------------------------------------
validate_documentation() {
  log_section "Documentation Validation"
  
  log_check "Workflow transition documentation"
  if [[ -f "docs/TASK_WORKFLOW_TRANSITIONS.md" ]]; then
    log_pass "docs/TASK_WORKFLOW_TRANSITIONS.md exists"
    
    # Check for key sections
    if grep -q "OPEN" "docs/TASK_WORKFLOW_TRANSITIONS.md" && \
       grep -q "IN_PROGRESS" "docs/TASK_WORKFLOW_TRANSITIONS.md" && \
       grep -q "DONE" "docs/TASK_WORKFLOW_TRANSITIONS.md"; then
      log_pass "Documentation covers all status states"
    else
      log_warn "Documentation may be incomplete"
    fi
    
    if grep -q "mermaid" "docs/TASK_WORKFLOW_TRANSITIONS.md"; then
      log_pass "Documentation includes Mermaid diagram"
    else
      log_info "No Mermaid diagram found (optional)"
    fi
  else
    log_warn "Workflow documentation missing at docs/TASK_WORKFLOW_TRANSITIONS.md"
  fi
  
  log_check "API documentation"
  local api_docs=("docs/API.md" "my-backend/README.md" "docs/PAGES_MODULES_REPORT.md")
  local found_api_doc=false
  for doc in "${api_docs[@]}"; do
    if [[ -f "$doc" ]]; then
      found_api_doc=true
      log_pass "API docs found: $doc"
      break
    fi
  done
  if ! $found_api_doc; then
    log_warn "No API documentation found"
  fi
}

#-------------------------------------------------------------------------------
# Test Infrastructure Validation
#-------------------------------------------------------------------------------
validate_test_infrastructure() {
  log_section "Test Infrastructure Validation"
  
  log_check "Jest configuration"
  if [[ -f "my-backend/jest.config.cjs" ]]; then
    log_pass "my-backend/jest.config.cjs exists"
    
    if grep -q "uuid" "my-backend/jest.config.cjs"; then
      log_pass "UUID mock configured in Jest"
    else
      log_warn "UUID mock may not be configured"
    fi
  else
    log_fail "Jest config missing"
  fi
  
  log_check "UUID mock for ESM"
  if [[ -f "my-backend/__mocks__/uuid.js" ]]; then
    log_pass "UUID mock exists at __mocks__/uuid.js"
  else
    log_warn "UUID mock missing (may cause ESM errors)"
  fi
  
  log_check "Cypress E2E tests"
  if [[ -f "my-frontend/cypress/e2e/task-flow.cy.ts" ]]; then
    log_pass "Task flow E2E tests exist"
    
    if grep -q "cross-tenant" "my-frontend/cypress/e2e/task-flow.cy.ts"; then
      log_pass "Cross-tenant test cases present"
    else
      log_warn "Cross-tenant tests not found"
    fi
  else
    log_warn "Cypress E2E tests for tasks not found"
  fi
  
  log_check "CI/CD workflow"
  if [[ -f ".github/workflows/validate-and-deploy.yml" ]]; then
    log_pass "CI/CD workflow exists"
  else
    log_warn "CI/CD workflow missing"
  fi
  
  log_check "Smoke test script"
  if [[ -f "scripts/smoke.sh" ]]; then
    log_pass "Smoke test script exists"
    if [[ -x "scripts/smoke.sh" ]]; then
      log_pass "Smoke test script is executable"
    else
      log_warn "Smoke test script is not executable"
    fi
  else
    log_warn "Smoke test script missing"
  fi
}

#-------------------------------------------------------------------------------
# Security Validation
#-------------------------------------------------------------------------------
validate_security() {
  log_section "Security Validation"
  
  log_check "Authentication middleware"
  if [[ -f "my-backend/middleware/auth.js" ]]; then
    log_pass "Auth middleware exists"
    
    if grep -qE "authenticate|requireRole|authMiddleware" "my-backend/middleware/auth.js"; then
      log_pass "Auth exports found"
    else
      log_warn "Auth middleware may have non-standard exports"
    fi
  else
    log_fail "Auth middleware missing"
  fi
  
  log_check "Task routes use authentication"
  if [[ -f "my-backend/routes/tasksV2.js" ]]; then
    if grep -qE "authenticate|authMiddleware" "my-backend/routes/tasksV2.js"; then
      log_pass "Task routes use authentication"
    else
      log_fail "Task routes may not use authentication"
    fi
  fi
  
  log_check "Rate limiting"
  if [[ -f "my-backend/middleware/rateLimiter.js" ]]; then
    log_pass "Rate limiter middleware exists"
  else
    log_warn "Rate limiter not found"
  fi
  
  log_check "Input validation"
  if grep -rq "express-validator\|joi\|zod\|yup" my-backend/package.json 2>/dev/null; then
    log_pass "Input validation library found"
  else
    log_warn "No input validation library detected"
  fi
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------
main() {
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║         BISMAN ERP - Task Module Validation                    ║${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  log_info "Database: $DB_NAME@$DB_HOST:$DB_PORT"
  log_info "API: $API_BASE"
  
  # Change to project root if needed
  if [[ -d "my-backend" ]]; then
    : # Already in project root
  elif [[ -f "app.js" ]] && [[ -d "../my-backend" ]]; then
    cd ..
  fi
  
  # Run validations
  validate_database_schema
  validate_api_endpoints || true
  validate_controller_code
  validate_documentation
  validate_test_infrastructure
  validate_security
  
  # Summary
  log_section "Validation Summary"
  echo ""
  echo -e "  ${GREEN}Passed:${NC}   $CHECKS_PASSED"
  echo -e "  ${RED}Failed:${NC}   $CHECKS_FAILED"
  echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
  echo ""
  
  if [[ $CHECKS_FAILED -gt 0 ]]; then
    echo -e "${RED}❌ Validation FAILED - $CHECKS_FAILED critical issues${NC}"
    exit 1
  elif [[ $WARNINGS -gt 5 ]]; then
    echo -e "${YELLOW}⚠️  Validation PASSED with warnings - $WARNINGS items to review${NC}"
    exit 0
  else
    echo -e "${GREEN}✅ Validation PASSED${NC}"
    exit 0
  fi
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --db-name) DB_NAME="$2"; shift 2;;
    --db-host) DB_HOST="$2"; shift 2;;
    --db-port) DB_PORT="$2"; shift 2;;
    --db-user) DB_USER="$2"; shift 2;;
    --api-url) API_BASE="$2"; shift 2;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Database Options:"
      echo "  --db-name NAME   Database name (default: BISMAN)"
      echo "  --db-host HOST   Database host (default: localhost)"
      echo "  --db-port PORT   Database port (default: 5432)"
      echo "  --db-user USER   Database user (default: postgres)"
      echo ""
      echo "API Options:"
      echo "  --api-url URL    API base URL (default: http://localhost:5000)"
      echo ""
      echo "Environment Variables:"
      echo "  DB_PASSWORD      Database password"
      echo "  TEST_EMAIL       Test user email"
      echo "  TEST_PASSWORD    Test user password"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1;;
  esac
done

main
