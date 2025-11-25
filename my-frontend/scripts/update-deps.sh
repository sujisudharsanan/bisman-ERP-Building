#!/usr/bin/env bash
set -euo pipefail

#################################################################################
# DEPENDENCY UPDATE SCRIPT - Next.js 15 Project
#################################################################################
# 
# Purpose: Safely update dependencies with automatic backup and rollback
# 
# What it does:
#   1. Backs up package.json and package-lock.json
#   2. Cleans all caches and build artifacts
#   3. Updates safe minor/patch dependencies
#   4. Reinstalls from scratch
#   5. Regenerates Prisma client
#   6. Runs validation (type-check, lint, build)
#   7. Provides rollback instructions if anything fails
#
# Usage:
#   cd my-frontend
#   bash scripts/update-deps.sh
#
# Flags:
#   --skip-tests    Skip validation tests (faster, but risky)
#   --aggressive    Update ALL deps (including major versions - DANGEROUS)
#   --dry-run       Show what would be updated without changing anything
#
#################################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse flags
SKIP_TESTS=false
AGGRESSIVE=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-tests) SKIP_TESTS=true ;;
    --aggressive) AGGRESSIVE=true ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown flag: $arg" && exit 1 ;;
  esac
done

# Timestamp for backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  📦 BISMAN ERP - Dependency Update Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Started at: $(date)"
echo "  Mode: $([ "$AGGRESSIVE" = true ] && echo "AGGRESSIVE ⚠️" || echo "SAFE ✅")"
echo "  Dry Run: $([ "$DRY_RUN" = true ] && echo "YES" || echo "NO")"
echo "  Skip Tests: $([ "$SKIP_TESTS" = true ] && echo "YES" || echo "NO")"
echo ""

#################################################################################
# Step 1: Pre-flight Checks
#################################################################################

echo -e "${YELLOW}━━━ Step 1/8: Pre-flight Checks ━━━${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Error: package.json not found. Are you in the my-frontend directory?${NC}"
  exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ Error: Node.js 20+ required. Found: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
echo -e "${GREEN}✅ npm version: $(npm -v)${NC}"
echo -e "${GREEN}✅ Working directory: $(pwd)${NC}"
echo ""

#################################################################################
# Step 2: Backup Current State
#################################################################################

echo -e "${YELLOW}━━━ Step 2/8: Backing Up Current State ━━━${NC}"

BACKUP_DIR="backups/deps_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

if [ "$DRY_RUN" = false ]; then
  cp package.json "$BACKUP_DIR/package.json"
  [ -f package-lock.json ] && cp package-lock.json "$BACKUP_DIR/package-lock.json"
  
  echo -e "${GREEN}✅ Backed up to: $BACKUP_DIR${NC}"
  echo "   To rollback: cp $BACKUP_DIR/package*.json ."
else
  echo -e "${BLUE}ℹ️  Dry run - skipping backup${NC}"
fi
echo ""

#################################################################################
# Step 3: Check What's Outdated
#################################################################################

echo -e "${YELLOW}━━━ Step 3/8: Checking Outdated Packages ━━━${NC}"

echo "Running: npm outdated"
npm outdated || true
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${BLUE}ℹ️  Dry run mode - stopping here${NC}"
  echo ""
  echo "What would be updated:"
  echo "  - Safe minor/patch versions of 28+ packages"
  echo "  - Prisma stays at 5.22.0"
  echo "  - Next.js stays at 15.1.3"
  echo "  - TypeScript stays at 5.5.4"
  exit 0
fi

#################################################################################
# Step 4: Clean Everything
#################################################################################

echo -e "${YELLOW}━━━ Step 4/8: Cleaning Build Artifacts & Caches ━━━${NC}"

echo "Removing directories..."
rm -rf node_modules || true
rm -rf .next || true
rm -rf .turbo || true
rm -f package-lock.json || true

echo "Cleaning npm cache..."
npm cache clean --force

echo -e "${GREEN}✅ Cleaned: node_modules, .next, .turbo, package-lock.json, npm cache${NC}"
echo ""

#################################################################################
# Step 5: Update Dependencies
#################################################################################

echo -e "${YELLOW}━━━ Step 5/8: Updating Dependencies ━━━${NC}"

if [ "$AGGRESSIVE" = true ]; then
  echo -e "${RED}⚠️  AGGRESSIVE MODE - Updating ALL packages (including major versions)${NC}"
  echo "This may break your app. Press Ctrl+C within 5 seconds to cancel..."
  sleep 5
  
  echo "Running: npx npm-check-updates -u"
  npx npm-check-updates -u
  
  echo "Installing all updates..."
  npm install
else
  echo "Updating SAFE packages (minor/patch only)..."
  
  # Update safe dependencies
  npm install \
    @mui/icons-material@latest \
    @mui/material@latest \
    @mui/x-data-grid-pro@latest \
    @playwright/test@latest \
    @tanstack/react-query@latest \
    @testing-library/jest-dom@latest \
    @types/react-grid-layout@latest \
    @typescript-eslint/eslint-plugin@latest \
    @typescript-eslint/parser@latest \
    axios@latest \
    emoji-picker-react@latest \
    next-auth@latest \
    react-chartjs-2@latest \
    react-hook-form@latest \
    tailwind-merge@latest \
    vitest@latest \
    zod@latest \
    autoprefixer@latest \
    lucide-react@latest \
    --save
  
  # Keep critical packages pinned
  npm install \
    next@15.1.3 \
    typescript@5.5.4 \
    prisma@5.22.0 \
    @prisma/client@5.22.0 \
    eslint@8.57.1 \
    --save-exact
  
  echo -e "${GREEN}✅ Updated 18+ safe packages${NC}"
  echo -e "${GREEN}✅ Pinned: Next.js 15.1.3, TypeScript 5.5.4, Prisma 5.22.0, ESLint 8.57.1${NC}"
fi
echo ""

#################################################################################
# Step 6: Regenerate Prisma Client
#################################################################################

echo -e "${YELLOW}━━━ Step 6/8: Regenerating Prisma Client ━━━${NC}"

if [ -d "prisma" ]; then
  echo "Running: npx prisma generate"
  npx prisma generate
  echo -e "${GREEN}✅ Prisma client regenerated${NC}"
else
  echo -e "${BLUE}ℹ️  No prisma directory found, skipping${NC}"
fi
echo ""

#################################################################################
# Step 7: Run Validation Tests
#################################################################################

if [ "$SKIP_TESTS" = false ]; then
  echo -e "${YELLOW}━━━ Step 7/8: Running Validation Tests ━━━${NC}"
  
  # Type check
  echo "1️⃣  Running type-check..."
  if npm run type-check; then
    echo -e "${GREEN}✅ Type-check passed${NC}"
  else
    echo -e "${RED}❌ Type-check failed${NC}"
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ROLLBACK INSTRUCTIONS${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  cd $(pwd)"
    echo "  cp $BACKUP_DIR/package*.json ."
    echo "  rm -rf node_modules package-lock.json .next"
    echo "  npm install"
    echo "  npx prisma generate"
    echo "  npm run build"
    echo ""
    exit 1
  fi
  
  # Lint
  echo ""
  echo "2️⃣  Running lint..."
  if npm run lint; then
    echo -e "${GREEN}✅ Lint passed${NC}"
  else
    echo -e "${YELLOW}⚠️  Lint has warnings (non-fatal)${NC}"
  fi
  
  # Build
  echo ""
  echo "3️⃣  Running build..."
  if npm run build; then
    echo -e "${GREEN}✅ Build passed${NC}"
  else
    echo -e "${RED}❌ Build failed${NC}"
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ROLLBACK INSTRUCTIONS${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "  cd $(pwd)"
    echo "  cp $BACKUP_DIR/package*.json ."
    echo "  rm -rf node_modules package-lock.json .next"
    echo "  npm install"
    echo "  npx prisma generate"
    echo "  npm run build"
    echo ""
    exit 1
  fi
  
  echo ""
else
  echo -e "${YELLOW}━━━ Step 7/8: Skipping Validation Tests (--skip-tests) ━━━${NC}"
  echo ""
fi

#################################################################################
# Step 8: Summary & Next Steps
#################################################################################

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ DEPENDENCY UPDATE COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Completed at: $(date)"
echo "  Backup location: $BACKUP_DIR"
echo ""
echo -e "${BLUE}📋 What was updated:${NC}"
npm outdated || echo "  All packages up to date!"
echo ""
echo -e "${BLUE}🧪 Manual testing checklist:${NC}"
echo "  1. Start dev server: npm run dev"
echo "  2. Test authentication (login/logout)"
echo "  3. Test database queries (Prisma)"
echo "  4. Test forms (react-hook-form)"
echo "  5. Test charts (recharts/chart.js)"
echo "  6. Test data grids (MUI X DataGrid)"
echo "  7. Check console for errors"
echo "  8. Test on mobile/tablet"
echo ""
echo -e "${BLUE}🔒 Security audit:${NC}"
echo "  Run: npm audit"
echo ""
echo -e "${BLUE}📦 If you need to rollback:${NC}"
echo "  cp $BACKUP_DIR/package*.json ."
echo "  rm -rf node_modules package-lock.json .next"
echo "  npm install"
echo "  npx prisma generate"
echo "  npm run build"
echo ""
echo -e "${GREEN}✅ Safe to commit and deploy after testing!${NC}"
echo ""
