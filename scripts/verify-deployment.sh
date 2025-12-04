#!/usr/bin/env bash
#
# BISMAN ERP - Deployment Verification Script
# 
# Runs all verification checks and outputs JSON summary.
# Exit codes:
#   0 = All checks passed (GO)
#   1 = Critical failures (NO-GO)
#   2 = Warnings only (CONDITIONAL GO)
#
# Usage:
#   ./scripts/verify-deployment.sh [staging|production]
#   ./scripts/verify-deployment.sh staging --json-only
#

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/my-backend"
FRONTEND_DIR="$PROJECT_ROOT/my-frontend"

# Arguments
ENVIRONMENT="${1:-staging}"
JSON_ONLY="${2:-}"

# Results tracking
declare -A RESULTS
PASSED=0
FAILED=0
WARNINGS=0
START_TIME=$(date +%s)

# Colors (disabled for JSON-only mode)
if [[ "$JSON_ONLY" != "--json-only" ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

log() {
  [[ "$JSON_ONLY" != "--json-only" ]] && echo -e "$1"
}

log_header() {
  log "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  log "${BLUE}  $1${NC}"
  log "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

record_result() {
  local name="$1"
  local status="$2"
  local details="$3"
  
  RESULTS["$name"]="$status|$details"
  
  if [[ "$status" == "PASS" ]]; then
    ((PASSED++))
    log "${GREEN}✅ PASS${NC}: $name"
  elif [[ "$status" == "WARN" ]]; then
    ((WARNINGS++))
    log "${YELLOW}⚠️  WARN${NC}: $name - $details"
  else
    ((FAILED++))
    log "${RED}❌ FAIL${NC}: $name - $details"
  fi
}

# ============================================================================
# CHECK FUNCTIONS
# ============================================================================

check_environment_vars() {
  log_header "Environment Variables"
  
  local required_vars=(
    "DATABASE_URL"
    "REDIS_URL"
    "JWT_SECRET"
    "ACCESS_TOKEN_SECRET"
  )
  
  local missing=()
  for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      missing+=("$var")
    fi
  done
  
  if [[ ${#missing[@]} -eq 0 ]]; then
    record_result "env_vars_required" "PASS" "All required vars set"
  else
    record_result "env_vars_required" "FAIL" "Missing: ${missing[*]}"
  fi
  
  # Check optional but recommended
  local recommended_vars=(
    "SLACK_WEBHOOK_URL"
    "SENTRY_DSN"
  )
  
  local missing_recommended=()
  for var in "${recommended_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      missing_recommended+=("$var")
    fi
  done
  
  if [[ ${#missing_recommended[@]} -eq 0 ]]; then
    record_result "env_vars_recommended" "PASS" "All recommended vars set"
  else
    record_result "env_vars_recommended" "WARN" "Missing: ${missing_recommended[*]}"
  fi
}

check_database_connection() {
  log_header "Database Connection"
  
  cd "$BACKEND_DIR" || return
  
  # Test connection
  local result
  result=$(node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    pool.query('SELECT 1 as ok').then(r => {
      console.log(JSON.stringify({ ok: true }));
      pool.end();
    }).catch(e => {
      console.log(JSON.stringify({ ok: false, error: e.message }));
      pool.end();
    });
  " 2>&1)
  
  if echo "$result" | grep -q '"ok":true'; then
    record_result "db_connection" "PASS" "Connected successfully"
  else
    record_result "db_connection" "FAIL" "Connection failed"
    return
  fi
  
  # Check RLS policies exist
  local rls_count
  rls_count=$(node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query(\"SELECT COUNT(*) as cnt FROM pg_policies WHERE schemaname = 'public'\").then(r => {
      console.log(r.rows[0].cnt);
      pool.end();
    }).catch(e => {
      console.log('0');
      pool.end();
    });
  " 2>&1)
  
  if [[ "$rls_count" -gt 0 ]]; then
    record_result "rls_policies" "PASS" "$rls_count policies found"
  else
    record_result "rls_policies" "WARN" "No RLS policies found"
  fi
  
  # Check audit triggers
  local trigger_count
  trigger_count=$(node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query(\"SELECT COUNT(*) as cnt FROM information_schema.triggers WHERE trigger_name LIKE '%audit%'\").then(r => {
      console.log(r.rows[0].cnt);
      pool.end();
    }).catch(e => {
      console.log('0');
      pool.end();
    });
  " 2>&1)
  
  if [[ "$trigger_count" -gt 0 ]]; then
    record_result "audit_triggers" "PASS" "$trigger_count triggers found"
  else
    record_result "audit_triggers" "WARN" "No audit triggers found"
  fi
}

check_redis_connection() {
  log_header "Redis Connection"
  
  cd "$BACKEND_DIR" || return
  
  local result
  result=$(node -e "
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 5000, lazyConnect: true });
    redis.connect().then(() => redis.ping()).then(r => {
      console.log(JSON.stringify({ ok: true, pong: r }));
      redis.quit();
    }).catch(e => {
      console.log(JSON.stringify({ ok: false, error: e.message }));
      redis.quit();
    });
  " 2>&1)
  
  if echo "$result" | grep -q '"ok":true'; then
    record_result "redis_connection" "PASS" "PONG received"
  else
    local error=$(echo "$result" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    record_result "redis_connection" "FAIL" "${error:-Connection failed}"
  fi
}

run_unit_tests() {
  log_header "Unit Tests"
  
  cd "$BACKEND_DIR" || return
  
  # Redis tests
  local redis_result
  redis_result=$(npx jest tests/redisInvalidate.test.js --json --silent 2>/dev/null || echo '{"success":false}')
  
  if echo "$redis_result" | grep -q '"success":true'; then
    local passed=$(echo "$redis_result" | grep -o '"numPassedTests":[0-9]*' | grep -o '[0-9]*')
    record_result "test_redis" "PASS" "$passed tests passed"
  else
    record_result "test_redis" "FAIL" "Tests failed"
  fi
  
  # RLS tests (may fail if DB not migrated)
  local rls_result
  rls_result=$(npx jest tests/rls.test.js --json --silent 2>/dev/null || echo '{"success":false}')
  
  if echo "$rls_result" | grep -q '"success":true'; then
    local passed=$(echo "$rls_result" | grep -o '"numPassedTests":[0-9]*' | grep -o '[0-9]*')
    record_result "test_rls" "PASS" "$passed tests passed"
  else
    record_result "test_rls" "WARN" "RLS tests failed (DB migration needed?)"
  fi
}

run_smoke_tests() {
  log_header "Smoke Tests"
  
  local api_url="${API_URL:-http://localhost:3001}"
  
  # Health check
  local health_result
  health_result=$(curl -sS -w "\n%{http_code}" "$api_url/api/health" 2>/dev/null | tail -1)
  
  if [[ "$health_result" == "200" ]]; then
    record_result "smoke_health" "PASS" "Health endpoint OK"
  else
    record_result "smoke_health" "FAIL" "Health endpoint returned $health_result"
  fi
  
  # Auth endpoint exists
  local auth_result
  auth_result=$(curl -sS -w "\n%{http_code}" -X POST "$api_url/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' 2>/dev/null | tail -1)
  
  if [[ "$auth_result" == "401" || "$auth_result" == "400" ]]; then
    record_result "smoke_auth" "PASS" "Auth endpoint responding"
  else
    record_result "smoke_auth" "WARN" "Auth endpoint returned $auth_result"
  fi
  
  # Metrics endpoint
  local metrics_result
  metrics_result=$(curl -sS -w "\n%{http_code}" "$api_url/metrics" 2>/dev/null | tail -1)
  
  if [[ "$metrics_result" == "200" ]]; then
    record_result "smoke_metrics" "PASS" "Metrics endpoint OK"
  else
    record_result "smoke_metrics" "WARN" "Metrics endpoint returned $metrics_result"
  fi
  
  # Cache health
  local cache_result
  cache_result=$(curl -sS "$api_url/internal/cache-health" 2>/dev/null)
  
  if echo "$cache_result" | grep -q '"pong":"PONG"'; then
    record_result "smoke_cache" "PASS" "Cache health OK"
  else
    record_result "smoke_cache" "WARN" "Cache not responding"
  fi
}

verify_audit_logs() {
  log_header "Audit Log Verification"
  
  cd "$BACKEND_DIR" || return
  
  # Check if audit_logs table exists and has recent entries
  local audit_check
  audit_check=$(node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    pool.query(\"
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_logs') as table_exists,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour') as recent_count
    \").then(r => {
      console.log(JSON.stringify(r.rows[0]));
      pool.end();
    }).catch(e => {
      console.log(JSON.stringify({ error: e.message }));
      pool.end();
    });
  " 2>&1)
  
  if echo "$audit_check" | grep -q '"table_exists":"1"'; then
    record_result "audit_table" "PASS" "audit_logs table exists"
    
    local recent=$(echo "$audit_check" | grep -o '"recent_count":"[0-9]*"' | grep -o '[0-9]*')
    if [[ "$recent" -gt 0 ]]; then
      record_result "audit_recent" "PASS" "$recent entries in last hour"
    else
      record_result "audit_recent" "WARN" "No recent audit entries"
    fi
  else
    record_result "audit_table" "WARN" "audit_logs table not found"
  fi
}

check_security_files() {
  log_header "Security Infrastructure Files"
  
  local required_files=(
    "$BACKEND_DIR/middleware/rbacMiddleware.js"
    "$BACKEND_DIR/middleware/tenantGuard.js"
    "$BACKEND_DIR/middleware/securityAlerting.js"
    "$BACKEND_DIR/cache/services/sessionCache.js"
    "$BACKEND_DIR/cron/securityMonitor.js"
  )
  
  local missing=()
  for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
      missing+=("$(basename "$file")")
    fi
  done
  
  if [[ ${#missing[@]} -eq 0 ]]; then
    record_result "security_files" "PASS" "All security files present"
  else
    record_result "security_files" "FAIL" "Missing: ${missing[*]}"
  fi
}

check_frontend_build() {
  log_header "Frontend Build"
  
  cd "$FRONTEND_DIR" || return
  
  # Type check
  if npm run type-check --silent 2>/dev/null; then
    record_result "frontend_types" "PASS" "TypeScript check passed"
  else
    record_result "frontend_types" "WARN" "TypeScript errors present"
  fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  log_header "BISMAN ERP Deployment Verification"
  log "Environment: $ENVIRONMENT"
  log "Started: $(date -Iseconds)"
  
  # Run all checks
  check_environment_vars
  check_database_connection
  check_redis_connection
  run_unit_tests
  run_smoke_tests
  verify_audit_logs
  check_security_files
  # check_frontend_build  # Uncomment if needed
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  # Determine overall status
  local status="GO"
  local exit_code=0
  
  if [[ $FAILED -gt 0 ]]; then
    status="NO-GO"
    exit_code=1
  elif [[ $WARNINGS -gt 0 ]]; then
    status="CONDITIONAL-GO"
    exit_code=2
  fi
  
  # Generate JSON summary
  local json_results="{"
  json_results+="\"environment\":\"$ENVIRONMENT\","
  json_results+="\"timestamp\":\"$(date -Iseconds)\","
  json_results+="\"duration_seconds\":$DURATION,"
  json_results+="\"status\":\"$status\","
  json_results+="\"summary\":{\"passed\":$PASSED,\"failed\":$FAILED,\"warnings\":$WARNINGS},"
  json_results+="\"checks\":{"
  
  local first=true
  for name in "${!RESULTS[@]}"; do
    IFS='|' read -r check_status details <<< "${RESULTS[$name]}"
    [[ "$first" != "true" ]] && json_results+=","
    json_results+="\"$name\":{\"status\":\"$check_status\",\"details\":\"$details\"}"
    first=false
  done
  
  json_results+="}}"
  
  # Output results
  log_header "VERIFICATION COMPLETE"
  log ""
  log "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}, ${YELLOW}$WARNINGS warnings${NC}"
  log "Duration: ${DURATION}s"
  log ""
  
  if [[ "$status" == "GO" ]]; then
    log "${GREEN}╔═══════════════════════════════════════╗${NC}"
    log "${GREEN}║       ✅ DEPLOYMENT: GO               ║${NC}"
    log "${GREEN}╚═══════════════════════════════════════╝${NC}"
  elif [[ "$status" == "CONDITIONAL-GO" ]]; then
    log "${YELLOW}╔═══════════════════════════════════════╗${NC}"
    log "${YELLOW}║    ⚠️  DEPLOYMENT: CONDITIONAL GO     ║${NC}"
    log "${YELLOW}║    Review warnings before proceeding  ║${NC}"
    log "${YELLOW}╚═══════════════════════════════════════╝${NC}"
  else
    log "${RED}╔═══════════════════════════════════════╗${NC}"
    log "${RED}║       ❌ DEPLOYMENT: NO-GO            ║${NC}"
    log "${RED}║    Fix critical issues first          ║${NC}"
    log "${RED}╚═══════════════════════════════════════╝${NC}"
  fi
  
  log ""
  log "JSON Summary:"
  echo "$json_results" | python3 -m json.tool 2>/dev/null || echo "$json_results"
  
  # Save JSON to file
  echo "$json_results" > "$PROJECT_ROOT/verification-result.json"
  log ""
  log "Results saved to: verification-result.json"
  
  exit $exit_code
}

main "$@"
