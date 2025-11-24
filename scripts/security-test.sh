#!/bin/bash

# 🔐 BISMAN ERP - Automated Security Testing Suite
# 
# This script runs comprehensive security tests including:
# - Dependency vulnerability scanning
# - Secret detection
# - SAST (Static Application Security Testing)
# - Container security scanning
# - License compliance checking
#
# Usage: ./security-test.sh [--fix] [--report]
#   --fix    : Attempt to auto-fix vulnerabilities
#   --report : Generate detailed HTML reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="my-backend"
FRONTEND_DIR="my-frontend"
REPORT_DIR="security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
AUTO_FIX=false
GENERATE_REPORT=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      AUTO_FIX=true
      shift
      ;;
    --report)
      GENERATE_REPORT=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--fix] [--report]"
      exit 1
      ;;
  esac
done

# Create report directory
if [ "$GENERATE_REPORT" = true ]; then
  mkdir -p "$REPORT_DIR/$TIMESTAMP"
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🔐 BISMAN ERP Security Testing Suite                  ║${NC}"
echo -e "${BLUE}║         Comprehensive Security Analysis                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. DEPENDENCY VULNERABILITY SCANNING
# ============================================================================
echo -e "${BLUE}[1/7] 📦 Dependency Vulnerability Scanning${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for dir in "$BACKEND_DIR" "$FRONTEND_DIR"; do
  echo -e "${YELLOW}Scanning $dir...${NC}"
  
  cd "$dir"
  
  # npm audit
  echo "  Running npm audit..."
  if [ "$AUTO_FIX" = true ]; then
    npm audit fix --force || true
  else
    npm audit --audit-level=moderate || true
  fi
  
  if [ "$GENERATE_REPORT" = true ]; then
    npm audit --json > "../$REPORT_DIR/$TIMESTAMP/npm-audit-$dir.json" || true
  fi
  
  cd ..
done

echo -e "${GREEN}✓ Dependency scanning completed${NC}"
echo ""

# ============================================================================
# 2. SECRET DETECTION
# ============================================================================
echo -e "${BLUE}[2/7] 🔍 Secret Detection${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if gitleaks is installed
if command -v gitleaks &> /dev/null; then
  echo "  Running gitleaks..."
  gitleaks detect --source . --verbose --report-path "$REPORT_DIR/$TIMESTAMP/gitleaks-report.json" || true
else
  echo -e "${YELLOW}  ⚠️  gitleaks not installed. Install with: brew install gitleaks${NC}"
fi

# Check for common secret patterns manually
echo "  Checking for hardcoded secrets..."
SECRET_PATTERNS=(
  "password.*=.*['\"].*['\"]"
  "api_key.*=.*['\"].*['\"]"
  "secret.*=.*['\"].*['\"]"
  "token.*=.*['\"].*['\"]"
  "AWS_ACCESS_KEY"
  "PRIVATE_KEY.*=.*['\"]"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
  matches=$(grep -r -I --exclude-dir={node_modules,.git,dist,build} -E "$pattern" . | grep -v "security-test.sh" | wc -l)
  if [ "$matches" -gt 0 ]; then
    echo -e "${RED}    ⚠️  Found $matches potential secrets matching: $pattern${NC}"
    SECRETS_FOUND=$((SECRETS_FOUND + matches))
  fi
done

if [ "$SECRETS_FOUND" -eq 0 ]; then
  echo -e "${GREEN}  ✓ No obvious hardcoded secrets found${NC}"
else
  echo -e "${RED}  ✗ Found $SECRETS_FOUND potential secrets - REVIEW REQUIRED${NC}"
fi

echo ""

# ============================================================================
# 3. STATIC APPLICATION SECURITY TESTING (SAST)
# ============================================================================
echo -e "${BLUE}[3/7] 🔬 Static Application Security Testing (SAST)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Semgrep (if installed)
if command -v semgrep &> /dev/null; then
  echo "  Running Semgrep..."
  semgrep --config=auto --json --output="$REPORT_DIR/$TIMESTAMP/semgrep-results.json" . || true
  semgrep --config=auto . || true
else
  echo -e "${YELLOW}  ⚠️  Semgrep not installed. Install with: brew install semgrep${NC}"
fi

# ESLint security scan (frontend)
echo "  Running ESLint security scan..."
cd "$FRONTEND_DIR"
if [ -f "package.json" ]; then
  npx eslint . --ext .js,.jsx,.ts,.tsx || true
fi
cd ..

echo -e "${GREEN}✓ SAST completed${NC}"
echo ""

# ============================================================================
# 4. JWT SECRET VALIDATION
# ============================================================================
echo -e "${BLUE}[4/7] 🔑 JWT Secret Security Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env files
ENV_FILES=(.env .env.local .env.production my-backend/.env my-frontend/.env)

for env_file in "${ENV_FILES[@]}"; do
  if [ -f "$env_file" ]; then
    echo "  Checking $env_file..."
    
    # Check JWT secrets
    if grep -q "JWT_SECRET" "$env_file"; then
      secret=$(grep "JWT_SECRET" "$env_file" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
      secret_length=${#secret}
      
      if [ "$secret_length" -lt 32 ]; then
        echo -e "${RED}    ✗ JWT_SECRET too short: $secret_length chars (minimum 32)${NC}"
      else
        echo -e "${GREEN}    ✓ JWT_SECRET length: $secret_length chars${NC}"
      fi
      
      # Check for weak patterns
      weak_patterns=("dev" "test" "secret" "password" "123" "changeme")
      for pattern in "${weak_patterns[@]}"; do
        if echo "$secret" | grep -qi "$pattern"; then
          echo -e "${RED}    ✗ JWT_SECRET contains weak pattern: $pattern${NC}"
        fi
      done
    else
      echo -e "${YELLOW}    ⚠️  JWT_SECRET not found in $env_file${NC}"
    fi
  fi
done

echo ""

# ============================================================================
# 5. AUTHENTICATION CODE ANALYSIS
# ============================================================================
echo -e "${BLUE}[5/7] 🔐 Authentication Security Analysis${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "  Checking for hardcoded credentials..."
hardcoded_creds=$(grep -r -I --exclude-dir={node_modules,.git,dist,build} -E "(password|passwd).*=.*['\"][^$]" . | grep -v "security-test.sh" | wc -l)

if [ "$hardcoded_creds" -gt 0 ]; then
  echo -e "${RED}    ✗ Found $hardcoded_creds potential hardcoded credentials${NC}"
else
  echo -e "${GREEN}    ✓ No obvious hardcoded credentials${NC}"
fi

echo "  Checking for weak bcrypt rounds..."
weak_bcrypt=$(grep -r -I --exclude-dir={node_modules,.git,dist,build} "bcrypt.*\(.*,[[:space:]]*[0-9]\)" . | grep -v "security-test.sh" | grep -E "bcrypt.*\(.*,[[:space:]]*([0-9]|1[01])\)" | wc -l)

if [ "$weak_bcrypt" -gt 0 ]; then
  echo -e "${RED}    ✗ Found bcrypt with weak rounds (< 12)${NC}"
else
  echo -e "${GREEN}    ✓ bcrypt rounds appear adequate${NC}"
fi

echo "  Checking for JWT algorithm enforcement..."
no_algorithm=$(grep -r -I --exclude-dir={node_modules,.git,dist,build} "jwt\.verify" . | grep -v "algorithms:" | wc -l)

if [ "$no_algorithm" -gt 0 ]; then
  echo -e "${YELLOW}    ⚠️  Found $no_algorithm jwt.verify() without algorithm enforcement${NC}"
else
  echo -e "${GREEN}    ✓ JWT verification includes algorithm enforcement${NC}"
fi

echo ""

# ============================================================================
# 6. CONTAINER SECURITY SCAN
# ============================================================================
echo -e "${BLUE}[6/7] 🐳 Container Security Scan${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v trivy &> /dev/null; then
  if [ -f "Dockerfile" ]; then
    echo "  Running Trivy filesystem scan..."
    trivy fs --severity HIGH,CRITICAL . || true
    
    if [ "$GENERATE_REPORT" = true ]; then
      trivy fs --format json --output "$REPORT_DIR/$TIMESTAMP/trivy-fs.json" . || true
    fi
  fi
else
  echo -e "${YELLOW}  ⚠️  Trivy not installed. Install with: brew install trivy${NC}"
fi

echo ""

# ============================================================================
# 7. LICENSE COMPLIANCE CHECK
# ============================================================================
echo -e "${BLUE}[7/7] 📜 License Compliance Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for dir in "$BACKEND_DIR" "$FRONTEND_DIR"; do
  echo -e "${YELLOW}Checking licenses in $dir...${NC}"
  cd "$dir"
  
  if command -v npx &> /dev/null; then
    npx license-checker --summary || true
    
    if [ "$GENERATE_REPORT" = true ]; then
      npx license-checker --json --out "../$REPORT_DIR/$TIMESTAMP/licenses-$dir.json" || true
    fi
  fi
  
  cd ..
done

echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    📊 Security Test Summary                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$SECRETS_FOUND" -gt 0 ]; then
  echo -e "${RED}[✗] CRITICAL: Potential secrets found in code${NC}"
fi

echo -e "${GREEN}[✓] Security scan completed${NC}"

if [ "$GENERATE_REPORT" = true ]; then
  echo -e "${GREEN}[✓] Reports generated in: $REPORT_DIR/$TIMESTAMP${NC}"
fi

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review all warnings and errors above"
echo "  2. Fix critical vulnerabilities immediately"
echo "  3. Update dependencies with: npm audit fix"
echo "  4. Check Railway environment variables"
echo "  5. Run again with --report for detailed analysis"
echo ""

if [ "$SECRETS_FOUND" -gt 0 ]; then
  echo -e "${RED}⚠️  WARNING: Secrets found - DO NOT DEPLOY until fixed${NC}"
  exit 1
fi
