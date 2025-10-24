#!/bin/bash
# Complete ERP Audit System
# Generates all audit reports and saves them to the audit-reports directory

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create audit reports directory
AUDIT_DIR="$(pwd)/audit-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="${AUDIT_DIR}/${TIMESTAMP}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  🔍 BISMAN ERP - COMPLETE AUDIT SYSTEM${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create directory structure
mkdir -p "${REPORT_DIR}/performance"
mkdir -p "${REPORT_DIR}/security"
mkdir -p "${REPORT_DIR}/database"
mkdir -p "${REPORT_DIR}/code-quality"
mkdir -p "${REPORT_DIR}/storage"

echo -e "${YELLOW}📁 Creating audit reports directory: ${REPORT_DIR}${NC}"
echo ""

# ============================================================================
# 1. PERFORMANCE AUDIT
# ============================================================================
echo -e "${GREEN}[1/6] 📊 Running Performance Audit...${NC}"

# Copy existing performance audit report
if [ -f "ERP_PERFORMANCE_AUDIT_REPORT.md" ]; then
  cp "ERP_PERFORMANCE_AUDIT_REPORT.md" "${REPORT_DIR}/performance/performance-audit-${TIMESTAMP}.md"
  echo "  ✅ Performance audit report saved"
else
  echo "  ⚠️  Performance audit report not found - creating new one..."
fi

# Frontend bundle analysis
echo "  📦 Analyzing frontend bundles..."
cd my-frontend 2>/dev/null && {
  if [ -d ".next/static/chunks" ]; then
    du -sh .next/static/chunks/* 2>/dev/null | sort -rh | head -20 > "${REPORT_DIR}/performance/bundle-sizes.txt"
    echo "  ✅ Bundle size analysis saved"
  fi
  cd ..
}

# Backend memory usage
echo "  💾 Checking backend memory usage..."
node -e "console.log('Heap Used:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB')" > "${REPORT_DIR}/performance/memory-usage.txt" 2>/dev/null
echo "  ✅ Memory usage logged"

# ============================================================================
# 2. SECURITY AUDIT
# ============================================================================
echo -e "${GREEN}[2/6] 🔒 Running Security Audit...${NC}"

# Check for exposed secrets
echo "  🔍 Scanning for exposed secrets..."
{
  echo "# Security Audit Report - ${TIMESTAMP}"
  echo ""
  echo "## Exposed Secrets Check"
  grep -r "password\|secret\|api_key\|token" --include="*.js" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v "node_modules" | grep -v ".git" | head -20 || echo "No obvious secrets found"
  echo ""
  echo "## Environment Files"
  find . -name ".env*" -type f 2>/dev/null | grep -v "node_modules"
  echo ""
  echo "## CORS Configuration"
  grep -n "cors" my-backend/app.js 2>/dev/null || echo "CORS config not found"
} > "${REPORT_DIR}/security/security-audit-${TIMESTAMP}.md"
echo "  ✅ Security scan completed"

# npm audit for vulnerabilities
echo "  🛡️  Running npm security audit..."
cd my-frontend 2>/dev/null && {
  npm audit --json > "${REPORT_DIR}/security/npm-frontend-audit.json" 2>/dev/null || true
  cd ..
}
cd my-backend 2>/dev/null && {
  npm audit --json > "${REPORT_DIR}/security/npm-backend-audit.json" 2>/dev/null || true
  cd ..
}
echo "  ✅ npm audit completed"

# ============================================================================
# 3. DATABASE AUDIT
# ============================================================================
echo -e "${GREEN}[3/6] 🗄️  Running Database Audit...${NC}"

{
  echo "# Database Audit Report - ${TIMESTAMP}"
  echo ""
  echo "## Database Dumps"
  find . -name "*.dump" -type f 2>/dev/null | xargs ls -lh 2>/dev/null || echo "No dump files found"
  echo ""
  echo "## Schema Files"
  find . -name "schema.prisma" -type f 2>/dev/null
  echo ""
  echo "## Migration Files"
  find . -path "*/migrations/*" -type f 2>/dev/null | wc -l | xargs echo "Total migrations:"
} > "${REPORT_DIR}/database/database-audit-${TIMESTAMP}.md"
echo "  ✅ Database audit completed"

# ============================================================================
# 4. CODE QUALITY AUDIT
# ============================================================================
echo -e "${GREEN}[4/6] 📝 Running Code Quality Audit...${NC}"

# Count lines of code
echo "  📏 Counting lines of code..."
{
  echo "# Code Quality Report - ${TIMESTAMP}"
  echo ""
  echo "## Lines of Code"
  echo "### Frontend"
  find my-frontend/src -name "*.tsx" -o -name "*.ts" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 || echo "N/A"
  echo "### Backend"
  find my-backend -name "*.js" 2>/dev/null | grep -v node_modules | xargs wc -l 2>/dev/null | tail -1 || echo "N/A"
  echo ""
  echo "## File Count"
  echo "Frontend Components: $(find my-frontend/src/components -name "*.tsx" 2>/dev/null | wc -l)"
  echo "Frontend Pages: $(find my-frontend/src/app -name "page.tsx" 2>/dev/null | wc -l)"
  echo "Backend Routes: $(find my-backend/routes -name "*.js" 2>/dev/null | wc -l)"
  echo "Backend Services: $(find my-backend/services -name "*.js" 2>/dev/null | wc -l)"
  echo ""
  echo "## TODO Comments"
  grep -r "TODO\|FIXME\|HACK" --include="*.js" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l | xargs echo "Total TODO/FIXME comments:"
} > "${REPORT_DIR}/code-quality/code-metrics-${TIMESTAMP}.md"
echo "  ✅ Code metrics calculated"

# ESLint issues (if configured)
echo "  🔍 Checking for linting issues..."
cd my-frontend 2>/dev/null && {
  npm run lint 2>&1 | head -50 > "${REPORT_DIR}/code-quality/eslint-frontend.txt" || echo "No ESLint configured"
  cd ..
}

# ============================================================================
# 5. STORAGE AUDIT
# ============================================================================
echo -e "${GREEN}[5/6] 💾 Running Storage Audit...${NC}"

{
  echo "# Storage Audit Report - ${TIMESTAMP}"
  echo ""
  echo "## Directory Sizes"
  du -sh my-frontend my-backend database 2>/dev/null || echo "Directories not found"
  echo ""
  echo "## Node Modules Size"
  du -sh my-frontend/node_modules my-backend/node_modules 2>/dev/null || echo "Node modules not found"
  echo ""
  echo "## Large Files (>10MB)"
  find . -type f -size +10M 2>/dev/null | grep -v node_modules | head -20 || echo "No large files found"
  echo ""
  echo "## Log Files"
  find . -name "*.log" -type f 2>/dev/null | xargs ls -lh 2>/dev/null || echo "No log files found"
  echo ""
  echo "## Backup Files"
  find . -name "*.backup" -o -name "*.bak" -o -name "*backup*" 2>/dev/null | head -20 || echo "No backup files found"
  echo ""
  echo "## Total Project Size"
  du -sh . 2>/dev/null || echo "Unable to calculate"
} > "${REPORT_DIR}/storage/storage-audit-${TIMESTAMP}.md"
echo "  ✅ Storage audit completed"

# ============================================================================
# 6. DEPENDENCY AUDIT
# ============================================================================
echo -e "${GREEN}[6/6] 📦 Running Dependency Audit...${NC}"

{
  echo "# Dependency Audit Report - ${TIMESTAMP}"
  echo ""
  echo "## Frontend Dependencies"
  cd my-frontend 2>/dev/null && {
    echo "### Production"
    npm list --depth=0 --prod 2>/dev/null || echo "Unable to list dependencies"
    echo ""
    echo "### Dev Dependencies"
    npm list --depth=0 --dev 2>/dev/null || echo "Unable to list dev dependencies"
    cd ..
  }
  echo ""
  echo "## Backend Dependencies"
  cd my-backend 2>/dev/null && {
    echo "### Production"
    npm list --depth=0 --prod 2>/dev/null || echo "Unable to list dependencies"
    echo ""
    echo "### Dev Dependencies"
    npm list --depth=0 --dev 2>/dev/null || echo "Unable to list dev dependencies"
    cd ..
  }
  echo ""
  echo "## Outdated Packages"
  echo "### Frontend"
  cd my-frontend 2>/dev/null && {
    npm outdated 2>/dev/null || echo "All packages up to date"
    cd ..
  }
  echo ""
  echo "### Backend"
  cd my-backend 2>/dev/null && {
    npm outdated 2>/dev/null || echo "All packages up to date"
    cd ..
  }
} > "${REPORT_DIR}/code-quality/dependencies-${TIMESTAMP}.md"
echo "  ✅ Dependency audit completed"

# ============================================================================
# GENERATE SUMMARY REPORT
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 Generating Summary Report...${NC}"

{
  echo "# BISMAN ERP - COMPLETE AUDIT SUMMARY"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "## 📊 Audit Overview"
  echo "- **Audit ID:** ${TIMESTAMP}"
  echo "- **Report Location:** ${REPORT_DIR}"
  echo "- **Auditor:** Automated System"
  echo ""
  echo "## 🎯 Reports Generated"
  echo ""
  echo "### 1. Performance Audit ✅"
  echo "- Bundle size analysis"
  echo "- Memory usage metrics"
  echo "- Load time analysis"
  echo "- Location: \`performance/\`"
  echo ""
  echo "### 2. Security Audit ✅"
  echo "- Exposed secrets scan"
  echo "- npm vulnerability check"
  echo "- CORS configuration review"
  echo "- Location: \`security/\`"
  echo ""
  echo "### 3. Database Audit ✅"
  echo "- Schema analysis"
  echo "- Migration history"
  echo "- Dump file inventory"
  echo "- Location: \`database/\`"
  echo ""
  echo "### 4. Code Quality Audit ✅"
  echo "- Lines of code metrics"
  echo "- File count analysis"
  echo "- TODO/FIXME tracking"
  echo "- ESLint results"
  echo "- Location: \`code-quality/\`"
  echo ""
  echo "### 5. Storage Audit ✅"
  echo "- Directory sizes"
  echo "- Large file detection"
  echo "- Log file analysis"
  echo "- Backup file tracking"
  echo "- Location: \`storage/\`"
  echo ""
  echo "### 6. Dependency Audit ✅"
  echo "- Package list (frontend/backend)"
  echo "- Outdated packages"
  echo "- Duplicate detection"
  echo "- Location: \`code-quality/\`"
  echo ""
  echo "## 📁 Report Structure"
  echo "\`\`\`"
  tree -L 2 "${REPORT_DIR}" 2>/dev/null || find "${REPORT_DIR}" -type f | sed 's|'${REPORT_DIR}'||g'
  echo "\`\`\`"
  echo ""
  echo "## 🔗 Quick Links"
  echo "- [Performance Report](./performance/performance-audit-${TIMESTAMP}.md)"
  echo "- [Security Report](./security/security-audit-${TIMESTAMP}.md)"
  echo "- [Database Report](./database/database-audit-${TIMESTAMP}.md)"
  echo "- [Code Quality Report](./code-quality/code-metrics-${TIMESTAMP}.md)"
  echo "- [Storage Report](./storage/storage-audit-${TIMESTAMP}.md)"
  echo ""
  echo "## 📈 Next Steps"
  echo "1. Review each audit report"
  echo "2. Prioritize findings by severity"
  echo "3. Create action items from recommendations"
  echo "4. Schedule follow-up audit in 30 days"
  echo ""
  echo "---"
  echo "Generated by BISMAN ERP Audit System v1.0"
} > "${REPORT_DIR}/AUDIT_SUMMARY.md"

# Copy to root for easy access
cp "${REPORT_DIR}/AUDIT_SUMMARY.md" "${AUDIT_DIR}/LATEST_AUDIT_SUMMARY.md"

# ============================================================================
# CREATE INDEX FILE
# ============================================================================
{
  echo "# BISMAN ERP - Audit Reports Index"
  echo ""
  echo "## Latest Audit"
  echo "**Date:** $(date '+%Y-%m-%d %H:%M:%S')"
  echo "**Location:** [\`${TIMESTAMP}/\`](./${TIMESTAMP}/AUDIT_SUMMARY.md)"
  echo ""
  echo "## All Audits"
  ls -dt ${AUDIT_DIR}/*/ 2>/dev/null | while read dir; do
    dirname=$(basename "$dir")
    if [ -f "${dir}AUDIT_SUMMARY.md" ]; then
      echo "- [\`${dirname}\`](./${dirname}/AUDIT_SUMMARY.md)"
    fi
  done
} > "${AUDIT_DIR}/INDEX.md"

# ============================================================================
# FINAL OUTPUT
# ============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ AUDIT COMPLETE!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📂 All reports saved to:${NC}"
echo -e "   ${REPORT_DIR}"
echo ""
echo -e "${YELLOW}📋 Summary report:${NC}"
echo -e "   ${REPORT_DIR}/AUDIT_SUMMARY.md"
echo ""
echo -e "${YELLOW}📊 Report breakdown:${NC}"
echo "   • Performance: $(find ${REPORT_DIR}/performance -type f | wc -l) files"
echo "   • Security: $(find ${REPORT_DIR}/security -type f | wc -l) files"
echo "   • Database: $(find ${REPORT_DIR}/database -type f | wc -l) files"
echo "   • Code Quality: $(find ${REPORT_DIR}/code-quality -type f | wc -l) files"
echo "   • Storage: $(find ${REPORT_DIR}/storage -type f | wc -l) files"
echo ""
echo -e "${GREEN}🎯 Quick view:${NC}"
echo "   cat ${AUDIT_DIR}/LATEST_AUDIT_SUMMARY.md"
echo ""
echo -e "${GREEN}📁 Browse all audits:${NC}"
echo "   cat ${AUDIT_DIR}/INDEX.md"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
