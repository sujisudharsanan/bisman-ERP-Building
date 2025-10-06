#!/bin/bash

# 🧩 React/Next.js Syntax Guard & Lint Enforcement Script
# Automatically audits all source files for invalid return usage, stray braces, JSX structure errors

echo "🔍 Starting Comprehensive Syntax Guard..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "════════════════════════════════════════"
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Initialize counters
TOTAL_ERRORS=0
SYNTAX_ERRORS=0
LINT_ERRORS=0
TYPE_ERRORS=0

print_section "1. File Structure Scan"

# Find all React/Next.js files
REACT_FILES=$(find src app -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" 2>/dev/null | grep -v node_modules | grep -v .next | wc -l)
echo "Found $REACT_FILES React/Next.js files to analyze"

print_section "2. ESLint Analysis (Strict Mode)"

# Run ESLint with strict rules
echo "Running ESLint with zero warnings tolerance..."
npm run lint:strict > .syntax-guard.log 2>&1
LINT_EXIT_CODE=$?

if [ $LINT_EXIT_CODE -eq 0 ]; then
    print_status 0 "ESLint passed - No syntax or lint errors"
else
    print_status 1 "ESLint failed - Found issues"
    echo -e "${YELLOW}📝 ESLint Issues:${NC}"
    cat .syntax-guard.log
    LINT_ERRORS=1
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

print_section "3. TypeScript Compilation Check"

# Run TypeScript compilation check
echo "Running TypeScript compilation check..."
npm run type-check > .type-check.log 2>&1
TYPE_EXIT_CODE=$?

if [ $TYPE_EXIT_CODE -eq 0 ]; then
    print_status 0 "TypeScript compilation passed"
else
    print_status 1 "TypeScript compilation failed"
    echo -e "${YELLOW}📝 TypeScript Issues:${NC}"
    cat .type-check.log
    TYPE_ERRORS=1
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

print_section "4. React Hooks Validation"

# Check for hooks outside component scope
echo "Checking for React hooks outside component scope..."
HOOK_VIOLATIONS=$(grep -rn "use[A-Z]" src app --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null | grep -v "function\|const.*=" | grep -v "export.*function" | wc -l)

if [ $HOOK_VIOLATIONS -eq 0 ]; then
    print_status 0 "React hooks properly scoped"
else
    print_status 1 "Found $HOOK_VIOLATIONS potential hook violations"
    echo -e "${YELLOW}📝 Hook Violations:${NC}"
    grep -rn "use[A-Z]" src app --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null | grep -v "function\|const.*=" | head -10
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

print_section "5. JSX Structure Validation"

# Check for common JSX issues
echo "Checking for JSX structure issues..."
JSX_ISSUES=0

# Check for unclosed JSX tags
UNCLOSED_TAGS=$(grep -rn "<[^/>]*[^>]$" src app --include="*.tsx" --include="*.jsx" 2>/dev/null | wc -l)
if [ $UNCLOSED_TAGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $UNCLOSED_TAGS potential unclosed JSX tags${NC}"
    JSX_ISSUES=$((JSX_ISSUES + 1))
fi

# Check for return statements outside functions
INVALID_RETURNS=$(grep -rn "return.*(" src app --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null | grep -v "function\|=>" | grep -v "const.*=" | wc -l)
if [ $INVALID_RETURNS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $INVALID_RETURNS potential return statements outside function scope${NC}"
    JSX_ISSUES=$((JSX_ISSUES + 1))
fi

if [ $JSX_ISSUES -eq 0 ]; then
    print_status 0 "JSX structure validation passed"
else
    print_status 1 "JSX structure issues found"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

print_section "6. Import/Export Validation"

# Check for missing imports/exports
echo "Checking for import/export issues..."
IMPORT_ISSUES=$(grep -rn "Cannot find module\|Module not found" .next/cache 2>/dev/null | wc -l)

if [ $IMPORT_ISSUES -eq 0 ]; then
    print_status 0 "Import/export validation passed"
else
    print_status 1 "Found $IMPORT_ISSUES import/export issues"
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

print_section "7. Format Check"

# Check code formatting
echo "Checking code formatting..."
npm run format:check > .format-check.log 2>&1
FORMAT_EXIT_CODE=$?

if [ $FORMAT_EXIT_CODE -eq 0 ]; then
    print_status 0 "Code formatting is consistent"
else
    print_status 1 "Code formatting issues found"
    echo -e "${YELLOW}📝 Run 'npm run format' to fix formatting${NC}"
fi

print_section "🧠 SYNTAX GUARD SUMMARY"

echo "| Component | Status | Issues |"
echo "|-----------|--------|--------|"
echo "| ESLint | $([ $LINT_ERRORS -eq 0 ] && echo "✅ Passed" || echo "❌ Failed") | $([ $LINT_ERRORS -eq 0 ] && echo "0" || echo "Multiple") |"
echo "| TypeScript | $([ $TYPE_ERRORS -eq 0 ] && echo "✅ Passed" || echo "❌ Failed") | $([ $TYPE_ERRORS -eq 0 ] && echo "0" || echo "Multiple") |"
echo "| React Hooks | $([ $HOOK_VIOLATIONS -eq 0 ] && echo "✅ Passed" || echo "❌ Failed") | $HOOK_VIOLATIONS |"
echo "| JSX Structure | $([ $JSX_ISSUES -eq 0 ] && echo "✅ Passed" || echo "❌ Failed") | $JSX_ISSUES |"
echo "| Imports/Exports | $([ $IMPORT_ISSUES -eq 0 ] && echo "✅ Passed" || echo "❌ Failed") | $IMPORT_ISSUES |"
echo "| Formatting | $([ $FORMAT_EXIT_CODE -eq 0 ] && echo "✅ Passed" || echo "⚠ Needs Fix") | $([ $FORMAT_EXIT_CODE -eq 0 ] && echo "0" || echo "Multiple") |"

echo -e "\n📊 FINAL RESULT:"
if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All syntax guards passed! Code is ready for commit.${NC}"
    exit 0
else
    echo -e "${RED}🚨 Found $TOTAL_ERRORS categories with issues. Please fix before committing.${NC}"
    echo -e "\n🔧 QUICK FIXES:"
    echo "• Run 'npm run lint:fix' to auto-fix ESLint issues"
    echo "• Run 'npm run format' to fix formatting"
    echo "• Check the logs above for specific issues to resolve"
    exit 1
fi
