#!/bin/bash
# ============================================================================
# BISMAN ERP - Page Sync CI/CD Guard
# ============================================================================
#
# This script runs during CI/CD to ensure page governance is maintained.
# It fails the build if:
#   1. New governed pages exist without RBAC configuration
#   2. Pages exist in filesystem but not in database
#
# Usage:
#   ./scripts/ci-page-sync.sh
#
# Environment Variables:
#   DATABASE_URL - PostgreSQL connection string (required)
#   SKIP_PAGE_SYNC - Set to "1" to skip (for hotfixes)
#
# Exit Codes:
#   0 - Success (all pages in sync)
#   1 - Failure (new pages need RBAC setup)
#   2 - Configuration error
#
# Date: 2025-01-19
# ============================================================================

set -e

echo "============================================================"
echo "BISMAN ERP - Page Sync CI/CD Guard"
echo "============================================================"
echo ""

# Check if we should skip
if [ "$SKIP_PAGE_SYNC" = "1" ]; then
  echo "⚠️  SKIP_PAGE_SYNC=1 - Skipping page sync check"
  echo "    This should only be used for emergency hotfixes!"
  exit 0
fi

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo "   Set DATABASE_URL to your PostgreSQL connection string"
  exit 2
fi

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "📂 Project root: $PROJECT_ROOT"
echo ""

# Check if sync script exists
if [ ! -f "scripts/sync-pages-master.js" ]; then
  echo "❌ ERROR: scripts/sync-pages-master.js not found"
  exit 2
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm ci --omit=dev
fi

# Ensure glob is installed (required by sync script)
if [ ! -d "node_modules/glob" ]; then
  echo "📦 Installing glob..."
  npm install glob --no-save
fi

echo ""
echo "🔍 Running page sync in CI mode..."
echo ""

# Run the sync script in CI mode
# --ci flag will fail if new governed pages need RBAC setup
node scripts/sync-pages-master.js --ci

SYNC_EXIT_CODE=$?

if [ $SYNC_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Page sync check FAILED!"
  echo ""
  echo "   To fix this:"
  echo "   1. Run locally: node scripts/sync-pages-master.js --apply"
  echo "   2. Commit the database changes"
  echo ""
  exit $SYNC_EXIT_CODE
fi

echo ""
echo "✅ Page sync check passed!"
echo ""
echo "🔍 Running RBAC integrity check..."
echo ""

# Run RBAC seeder in CI mode to check for missing RBAC mappings
node scripts/seed-role-page-access.js --ci

RBAC_EXIT_CODE=$?

if [ $RBAC_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ RBAC integrity check FAILED!"
  echo ""
  echo "   To fix this:"
  echo "   1. Run locally: node scripts/seed-role-page-access.js --apply"
  echo "   2. Or manually add RBAC mappings for new pages"
  echo ""
  exit $RBAC_EXIT_CODE
fi

echo ""
echo "✅ All governance checks passed!"
echo "   - Pages synced: OK"
echo "   - RBAC mappings: OK"
echo ""

exit 0
