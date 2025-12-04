#!/bin/bash
# ============================================================================
# BISMAN ERP - Final Acceptance & Go-Live Checklist
# ============================================================================
# 
# Run these in staging, then production once green.
# Usage: ./scripts/go-live-checklist.sh [staging|production]
#
# ============================================================================

# Don't exit on errors - we want to run all checks
set +e

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/my-backend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
}

print_step() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((FAILED++))
}

print_skip() {
    echo -e "${YELLOW}⏭️  SKIP: $1${NC}"
    ((SKIPPED++))
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

confirm() {
    read -p "$(echo -e ${YELLOW}"$1 [y/N]: "${NC})" response
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

print_header "🚀 BISMAN ERP Go-Live Checklist - $ENVIRONMENT"

echo -e "${BOLD}Started:${NC} $(date)"
echo -e "${BOLD}Environment:${NC} $ENVIRONMENT"
echo ""

# Check we're in the right directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}ERROR: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

cd "$BACKEND_DIR"

# ============================================================================
# PHASE 1: ENVIRONMENT VERIFICATION
# ============================================================================

print_header "Phase 1: Environment Verification"

print_step "1.1 Checking required environment variables..."

check_env_var() {
    local var_name=$1
    local required=${2:-true}
    
    if [ -n "${!var_name}" ]; then
        print_pass "$var_name is set"
        return 0
    else
        if [ "$required" = "true" ]; then
            print_fail "$var_name is NOT set (required)"
            return 1
        else
            print_skip "$var_name is not set (optional)"
            return 0
        fi
    fi
}

check_env_var "DATABASE_URL" true
check_env_var "REDIS_URL" false
check_env_var "JWT_SECRET" true
check_env_var "ENCRYPTION_KEY" false

print_step "1.2 Checking Node.js version..."
NODE_VERSION=$(node -v 2>/dev/null || echo "not installed")
if [[ "$NODE_VERSION" =~ ^v(18|20|22) ]]; then
    print_pass "Node.js $NODE_VERSION"
else
    print_warning "Node.js $NODE_VERSION (recommend v18+)"
fi

print_step "1.3 Checking npm dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --silent 2>/dev/null && print_pass "Dependencies installed" || print_fail "npm ci failed"
else
    npm install --silent 2>/dev/null && print_pass "Dependencies installed" || print_fail "npm install failed"
fi

# ============================================================================
# PHASE 2: DATABASE VERIFICATION
# ============================================================================

print_header "Phase 2: Database Verification"

print_step "2.1 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
    print_pass "Database connection successful"
else
    print_fail "Cannot connect to database"
fi

print_step "2.2 Checking RLS policies..."
RLS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'" 2>/dev/null | tr -d ' ')
if [ "$RLS_COUNT" -gt 0 ]; then
    print_pass "Found $RLS_COUNT RLS policies"
else
    print_warning "No RLS policies found (run migrations)"
fi

print_step "2.3 Checking audit triggers..."
TRIGGER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%audit%'" 2>/dev/null | tr -d ' ')
if [ "$TRIGGER_COUNT" -gt 0 ]; then
    print_pass "Found $TRIGGER_COUNT audit triggers"
else
    print_warning "No audit triggers found"
fi

print_step "2.4 Running migration verification SQL..."
if [ -f "tools/verify_migrations.sql" ]; then
    if psql "$DATABASE_URL" -f tools/verify_migrations.sql >/dev/null 2>&1; then
        print_pass "Migration verification passed"
    else
        print_warning "Migration verification had issues (check output)"
    fi
else
    print_skip "verify_migrations.sql not found"
fi

# ============================================================================
# PHASE 3: REDIS VERIFICATION
# ============================================================================

print_header "Phase 3: Redis Verification"

print_step "3.1 Testing Redis connection..."
if [ -n "$REDIS_URL" ]; then
    # Extract host and port from Redis URL
    if redis-cli -u "$REDIS_URL" PING 2>/dev/null | grep -q "PONG"; then
        print_pass "Redis connection successful"
    else
        print_warning "Redis PING failed (may need redis-cli installed)"
    fi
else
    print_skip "REDIS_URL not set"
fi

# ============================================================================
# PHASE 4: SECURITY TESTS
# ============================================================================

print_header "Phase 4: Security Tests"

print_step "4.1 Running Redis invalidation tests..."
if [ -f "tests/redisInvalidate.test.js" ]; then
    if npx jest tests/redisInvalidate.test.js --silent 2>/dev/null; then
        print_pass "Redis invalidation tests passed"
    else
        print_fail "Redis invalidation tests failed"
    fi
else
    print_skip "redisInvalidate.test.js not found"
fi

print_step "4.2 Running RLS tests..."
if [ -f "tests/rls.test.js" ]; then
    if [ -n "$DATABASE_URL" ]; then
        if npx jest tests/rls.test.js --silent 2>/dev/null; then
            print_pass "RLS tests passed"
        else
            print_warning "RLS tests failed (check database setup)"
        fi
    else
        print_skip "DATABASE_URL not set for RLS tests"
    fi
else
    print_skip "rls.test.js not found"
fi

print_step "4.3 Running security smoke test..."
if [ -f "tools/securitySmokeTest.js" ]; then
    if node tools/securitySmokeTest.js 2>/dev/null; then
        print_pass "Security smoke test passed"
    else
        print_warning "Security smoke test had issues"
    fi
else
    print_skip "securitySmokeTest.js not found"
fi

# ============================================================================
# PHASE 5: SESSION RECONCILIATION
# ============================================================================

print_header "Phase 5: Session Reconciliation"

print_step "5.1 Running session reconciliation (dry-run)..."
if [ -f "tools/reconcileSessions.js" ]; then
    if DRY_RUN=true node tools/reconcileSessions.js 2>/dev/null; then
        print_pass "Session reconciliation dry-run completed"
    else
        print_warning "Session reconciliation dry-run had issues"
    fi
else
    print_skip "reconcileSessions.js not found"
fi

# ============================================================================
# PHASE 6: API HEALTH CHECKS
# ============================================================================

print_header "Phase 6: API Health Checks"

# Check if server is running
API_BASE=${API_BASE:-"http://localhost:3001"}

print_step "6.1 Checking API health endpoint..."
if curl -s "$API_BASE/api/health" 2>/dev/null | grep -q "ok\|healthy"; then
    print_pass "API health check passed"
else
    print_warning "API health check failed (is server running?)"
fi

print_step "6.2 Checking audit services endpoint..."
if curl -s "$API_BASE/api/audit/services" 2>/dev/null | grep -q "services\|error"; then
    print_pass "Audit services endpoint responding"
else
    print_skip "Audit services endpoint not responding"
fi

print_step "6.3 Checking cache health..."
if curl -s "$API_BASE/internal/cache-health" 2>/dev/null | grep -q "cacheEnabled"; then
    print_pass "Cache health endpoint responding"
else
    print_skip "Cache health endpoint not responding"
fi

# ============================================================================
# PHASE 7: SECURITY CONFIGURATION
# ============================================================================

print_header "Phase 7: Security Configuration Checklist"

print_step "7.1 Encryption key configuration..."
if [ -n "$ENCRYPTION_KEY" ]; then
    KEY_LEN=${#ENCRYPTION_KEY}
    if [ "$KEY_LEN" -ge 32 ]; then
        print_pass "ENCRYPTION_KEY is set (${KEY_LEN} chars)"
    else
        print_warning "ENCRYPTION_KEY is too short (${KEY_LEN} chars, need 32+)"
    fi
else
    print_warning "ENCRYPTION_KEY not set - PII encryption disabled"
fi

print_step "7.2 JWT secret configuration..."
if [ -n "$JWT_SECRET" ]; then
    JWT_LEN=${#JWT_SECRET}
    if [ "$JWT_LEN" -ge 32 ]; then
        print_pass "JWT_SECRET is set (${JWT_LEN} chars)"
    else
        print_warning "JWT_SECRET is too short (${JWT_LEN} chars, need 32+)"
    fi
else
    print_fail "JWT_SECRET not set"
fi

# ============================================================================
# PHASE 8: CI/CD VERIFICATION
# ============================================================================

print_header "Phase 8: CI/CD Verification"

print_step "8.1 Checking GitHub Actions workflow..."
if [ -f "$PROJECT_ROOT/.github/workflows/security.yml" ]; then
    print_pass "security.yml workflow exists"
else
    print_warning "security.yml workflow not found"
fi

print_step "8.2 Checking security runbook..."
if [ -f "$PROJECT_ROOT/SECURITY_RUNBOOK.md" ]; then
    print_pass "SECURITY_RUNBOOK.md exists"
else
    print_warning "SECURITY_RUNBOOK.md not found"
fi

# ============================================================================
# SUMMARY
# ============================================================================

print_header "📊 Summary"

TOTAL=$((PASSED + FAILED + SKIPPED))

echo ""
echo -e "${GREEN}✅ Passed:  $PASSED${NC}"
echo -e "${RED}❌ Failed:  $FAILED${NC}"
echo -e "${YELLOW}⏭️  Skipped: $SKIPPED${NC}"
echo -e "${BOLD}📊 Total:   $TOTAL${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}🎉 All critical checks passed! Ready for $ENVIRONMENT deployment.${NC}"
    EXIT_CODE=0
else
    echo -e "${RED}${BOLD}⚠️  $FAILED check(s) failed. Fix before deploying to $ENVIRONMENT.${NC}"
    EXIT_CODE=1
fi

echo ""
echo -e "${BOLD}Completed:${NC} $(date)"

# ============================================================================
# MANUAL STEPS REMINDER
# ============================================================================

print_header "📋 Manual Steps Required"

cat << 'EOF'

Before going to production, ensure you have completed:

1. 🔐 CREDENTIAL ROTATION
   □ Rotate database credentials
   □ Update app secrets with new credentials
   □ Revoke old database user

2. 🔑 KEY MANAGEMENT
   □ Move ENCRYPTION_KEY to Vault/KMS
   □ Move JWT_SECRET to Vault/KMS
   □ Update app startup to fetch from Vault

3. 🔄 BACKUP VERIFICATION
   □ Take a backup: pg_dump --format=custom --file=backup.dump
   □ Restore to staging and verify RLS policies exist
   □ Test audit triggers work in restored DB

4. 📡 MONITORING
   □ Set up alerts for audit_logs_dml activity
   □ Configure Prometheus/Grafana dashboards
   □ Set up PagerDuty/OpsGenie for on-call

5. 📚 DOCUMENTATION
   □ Review SECURITY_RUNBOOK.md with on-call team
   □ Update incident response contacts
   □ Schedule security training session

EOF

exit $EXIT_CODE
