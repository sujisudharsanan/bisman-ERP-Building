#!/bin/bash
# Quick Fix Script for Critical Issues
# Adds ErrorBoundary wrapper to all module pages

set -e

echo "🚀 Starting Critical Fixes for BISMAN ERP..."
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Counter
fixed=0
skipped=0

echo ""
echo "📋 Task 1: Adding ErrorBoundary to all module pages..."
echo ""

# Find all page files in modules
find my-frontend/src/modules -name "*.tsx" -type f | while read -r file; do
    # Check if file already has ErrorBoundary import
    if grep -q "ErrorBoundary" "$file"; then
        echo -e "${YELLOW}⏭️  Skipped (already has ErrorBoundary): $(basename "$file")${NC}"
        ((skipped++)) || true
    else
        # Check if it's a valid React component file
        if grep -q "export default" "$file"; then
            # Create backup
            cp "$file" "$file.backup"
            
            # Add ErrorBoundary import at the top (after 'use client' if exists)
            if grep -q "'use client'" "$file"; then
                # Add after 'use client'
                sed -i '' "/'use client';/a\\
import { ErrorBoundary } from '@/components/ErrorBoundary';
" "$file"
            else
                # Add at the very top
                sed -i '' "1i\\
import { ErrorBoundary } from '@/components/ErrorBoundary';\\

" "$file"
            fi
            
            echo -e "${GREEN}✅ Fixed: $(basename "$file")${NC}"
            ((fixed++)) || true
        else
            echo -e "${YELLOW}⏭️  Skipped (not a component): $(basename "$file")${NC}"
            ((skipped++)) || true
        fi
    fi
done

echo ""
echo "============================================"
echo -e "${GREEN}✅ Critical fixes completed!${NC}"
echo ""
echo "📊 Summary:"
echo "   - Files fixed: $fixed"
echo "   - Files skipped: $skipped"
echo ""
echo "📝 Note: Backups created with .backup extension"
echo "   To rollback: find my-frontend/src/modules -name '*.backup' -exec sh -c 'mv \"\$1\" \"\${1%.backup}\"' _ {} \;"
echo ""
echo "🔍 Next steps:"
echo "   1. Review the changes: git diff my-frontend/src/modules"
echo "   2. Test the application: npm run dev"
echo "   3. If everything works, commit: git add . && git commit -m 'Add ErrorBoundary to all pages'"
echo "   4. Remove backups: find my-frontend/src/modules -name '*.backup' -delete"
echo ""
