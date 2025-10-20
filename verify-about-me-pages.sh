#!/bin/bash

echo "🔍 Verifying About Me Page Implementation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for stats
TOTAL_FILES=0
FOUND_FILES=0
MISSING_FILES=0

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    TOTAL_FILES=$((TOTAL_FILES + 1))
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description"
        FOUND_FILES=$((FOUND_FILES + 1))
        return 0
    else
        echo -e "${RED}❌${NC} $description"
        echo -e "   ${YELLOW}Missing: $file${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
        return 1
    fi
}

echo "📦 Core Component:"
check_file "my-frontend/src/common/components/AboutMePage.tsx" "Reusable AboutMePage component"

echo ""
echo "📄 Module Pages (5 pages):"
check_file "my-frontend/src/modules/system/pages/about-me.tsx" "System Module - About Me"
check_file "my-frontend/src/modules/finance/pages/about-me.tsx" "Finance Module - About Me"
check_file "my-frontend/src/modules/procurement/pages/about-me.tsx" "Procurement Module - About Me"
check_file "my-frontend/src/modules/operations/pages/about-me.tsx" "Operations Module - About Me"
check_file "my-frontend/src/modules/compliance/pages/about-me.tsx" "Compliance Module - About Me"

echo ""
echo "📚 Documentation:"
check_file "ABOUT_ME_IMPLEMENTATION.md" "Implementation Guide"
check_file "ABOUT_ME_COMPLETE_SUMMARY.md" "Complete Summary"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 Implementation Statistics:"
echo "═══════════════════════════════════════════════════════════"
echo -e "✅ Files Created: ${GREEN}$FOUND_FILES${NC}"
echo -e "❌ Files Missing: ${RED}$MISSING_FILES${NC}"
echo -e "📁 Total Expected: $TOTAL_FILES"
echo ""

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✨ SUCCESS!${NC} All About Me pages are in place!"
    echo ""
    echo "🎯 Next Steps:"
    echo "   1. Create App Router routes (e.g., app/system/about-me/page.tsx)"
    echo "   2. Add navigation links to module dashboards"
    echo "   3. Test profile picture upload endpoint"
    echo "   4. Verify RBAC permissions for each module"
    echo ""
    echo "📚 Documentation:"
    echo "   - ABOUT_ME_IMPLEMENTATION.md (Detailed guide)"
    echo "   - ABOUT_ME_COMPLETE_SUMMARY.md (Quick reference)"
    echo ""
    echo "🚀 Status: Ready for route integration!"
else
    echo -e "${RED}⚠️  WARNING!${NC} Some files are missing."
    echo "   Please review the output above and create missing files."
fi

echo "═══════════════════════════════════════════════════════════"
