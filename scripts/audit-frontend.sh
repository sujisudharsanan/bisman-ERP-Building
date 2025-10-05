#!/bin/bash

# ERP Frontend Audit Script
# Checks all page.tsx files for proper React component exports

echo "🔍 ERP FRONTEND AUDIT REPORT"
echo "================================"
echo "Generated: $(date)"
echo ""

APP_DIR="/Users/abhi/Desktop/BISMAN ERP/my-frontend/src/app"
TOTAL_PAGES=0
VALID_EXPORTS=0
INVALID_EXPORTS=0

echo "📁 SCANNING DIRECTORY STRUCTURE"
echo "--------------------------------"

# Find all page.tsx files
PAGES=$(find "$APP_DIR" -name "page.tsx" | sort)

echo "Found page.tsx files:"
for page in $PAGES; do
    RELATIVE_PATH=${page#$APP_DIR/}
    echo "  📄 $RELATIVE_PATH"
    ((TOTAL_PAGES++))
done

echo ""
echo "📊 EXPORT VALIDATION"
echo "--------------------"

for page in $PAGES; do
    RELATIVE_PATH=${page#$APP_DIR/}
    
    # Check for default export
    if grep -q "export default" "$page"; then
        # Check if it's a function or component
        if grep -q "export default function\|export default.*Component\|export default.*Page" "$page"; then
            echo "✅ $RELATIVE_PATH - Valid React component export"
            ((VALID_EXPORTS++))
        else
            # Check for variable assignment
            if grep -q "export default [A-Za-z]" "$page"; then
                echo "⚠️  $RELATIVE_PATH - Variable export (check if React component)"
                ((VALID_EXPORTS++))
            else
                echo "❌ $RELATIVE_PATH - Invalid or missing React component export"
                ((INVALID_EXPORTS++))
            fi
        fi
    else
        echo "❌ $RELATIVE_PATH - No default export found"
        ((INVALID_EXPORTS++))
    fi
done

echo ""
echo "🗂️ ROUTE CONFLICTS ANALYSIS"
echo "---------------------------"

# Check for route conflicts
echo "Checking for potential route conflicts..."

# Check (dashboard) vs /dashboard conflict
if [[ -f "$APP_DIR/(dashboard)/page.tsx" && -f "$APP_DIR/dashboard/page.tsx" ]]; then
    echo "⚠️  CONFLICT: Both (dashboard)/page.tsx and dashboard/page.tsx exist"
    echo "   - (dashboard)/page.tsx maps to: /"
    echo "   - dashboard/page.tsx maps to: /dashboard"
fi

# Check for duplicate routes in route groups
DASHBOARD_ROUTES=$(find "$APP_DIR/(dashboard)" -name "page.tsx" 2>/dev/null | grep -v "/(dashboard)/page.tsx" || true)
if [[ -n "$DASHBOARD_ROUTES" ]]; then
    echo ""
    echo "📍 Route group (dashboard) contains:"
    for route in $DASHBOARD_ROUTES; do
        ROUTE_NAME=$(dirname "$route" | sed 's|.*/||')
        echo "   - /$ROUTE_NAME"
    done
fi

echo ""
echo "📈 SUMMARY"
echo "----------"
echo "Total page.tsx files: $TOTAL_PAGES"
echo "Valid exports: $VALID_EXPORTS"
echo "Invalid exports: $INVALID_EXPORTS"
echo "Success rate: $(( VALID_EXPORTS * 100 / TOTAL_PAGES ))%"

if [[ $INVALID_EXPORTS -gt 0 ]]; then
    echo ""
    echo "🚨 ACTION REQUIRED: $INVALID_EXPORTS file(s) need attention"
    exit 1
else
    echo ""
    echo "✅ ALL PAGE FILES HAVE VALID EXPORTS"
    exit 0
fi
