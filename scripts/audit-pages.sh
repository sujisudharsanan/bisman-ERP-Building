#!/bin/bash
# ============================================================================
# PAGE GOVERNANCE AUDIT GUARD
# ============================================================================
# This script ensures all filesystem pages are registered in the page registry.
# Run in CI to prevent unregistered pages from being deployed.
#
# Exit codes:
#   0 = All pages are registered or whitelisted
#   1 = Unregistered pages found (FAILS CI)
# ============================================================================

set -e

FRONTEND_DIR="my-frontend"
REGISTRY_FILE="$FRONTEND_DIR/src/common/config/page-registry.ts"

# ============================================================================
# WHITELIST - Pages that don't need registry entries
# ============================================================================
WHITELIST=(
  # Auth pages - no sidebar needed
  "auth/login"
  "auth/admin-login"
  "auth/hub-incharge-login"
  "auth/standard-login"
  "auth/forgot-password"
  "auth/reset-password"
  "auth/portals"
  "login"
  "signup"
  
  # Error/System pages
  "access-denied"
  "unauthorized"
  "status"
  "trace"
  "get-started"
  
  # Public pages
  "(public)/landing"
  
  # Onboarding flow
  "onboarding/trial"
  "onboarding/trial/quick"
  "onboarding/trial/resume/[token]"
  "onboarding/clients/new"
  
  # Root page (landing/redirect page)
  ""
  "page.tsx"
  
  # QA/Testing pages (not for production navigation)
  "qa/login"
  
  # Settings pages (typically accessible via profile menu, not sidebar)
  "settings"
  "settings/security"
  
  # Dynamic child routes (inherit from parent)
  # Pattern: any path containing [id], [taskId], etc.
)

# ============================================================================
# FUNCTIONS
# ============================================================================

is_whitelisted() {
  local page="$1"
  
  # Check exact match
  for w in "${WHITELIST[@]}"; do
    if [[ "$page" == "$w" ]]; then
      return 0
    fi
  done
  
  # Check dynamic route pattern (contains [)
  if [[ "$page" == *"["* ]]; then
    return 0
  fi
  
  return 1
}

# ============================================================================
# MAIN AUDIT
# ============================================================================

echo "=============================================="
echo "PAGE GOVERNANCE AUDIT"
echo "=============================================="
echo ""

# Get all app pages
APP_PAGES=$(find "$FRONTEND_DIR/src/app" -name "page.tsx" -type f | \
  sed "s|$FRONTEND_DIR/src/app/||" | \
  sed 's|/page.tsx||' | \
  sort)

# Get all registered paths
REGISTRY_PATHS=$(grep -oE "path: '[^']+'" "$REGISTRY_FILE" | \
  sed "s/path: '//g" | \
  sed "s/'//g" | \
  sed 's|^/||' | \
  sort | uniq)

# Find orphans
ORPHANS=()
REGISTERED_COUNT=0
WHITELISTED_COUNT=0

for page in $APP_PAGES; do
  # Check if registered
  if echo "$REGISTRY_PATHS" | grep -q "^${page}$"; then
    ((REGISTERED_COUNT++))
    continue
  fi
  
  # Check if whitelisted
  if is_whitelisted "$page"; then
    ((WHITELISTED_COUNT++))
    continue
  fi
  
  # It's an orphan
  ORPHANS+=("$page")
done

# ============================================================================
# REPORT
# ============================================================================

TOTAL_PAGES=$(echo "$APP_PAGES" | wc -l | tr -d ' ')
ORPHAN_COUNT=${#ORPHANS[@]}

echo "📊 SUMMARY"
echo "-------------------------------------------"
echo "Total App Pages:     $TOTAL_PAGES"
echo "Registered:          $REGISTERED_COUNT"
echo "Whitelisted:         $WHITELISTED_COUNT"
echo "Orphans (ERRORS):    $ORPHAN_COUNT"
echo ""

if [[ $ORPHAN_COUNT -gt 0 ]]; then
  echo "❌ UNREGISTERED PAGES DETECTED"
  echo "-------------------------------------------"
  echo "The following pages are not in the registry:"
  echo ""
  for orphan in "${ORPHANS[@]}"; do
    echo "  ⚠️  /$orphan"
  done
  echo ""
  echo "ACTION REQUIRED:"
  echo "  1. Add these pages to page-registry.ts"
  echo "  2. OR add them to the whitelist in this script"
  echo ""
  echo "=============================================="
  echo "❌ AUDIT FAILED"
  echo "=============================================="
  exit 1
else
  echo "=============================================="
  echo "✅ AUDIT PASSED"
  echo "=============================================="
  exit 0
fi
