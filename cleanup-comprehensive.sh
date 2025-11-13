#!/bin/bash

# BISMAN ERP - Comprehensive Cleanup Script
# Removes duplicates, temporary files, and organizes documentation

echo "🧹 Starting comprehensive cleanup..."
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REMOVED_COUNT=0

# Function to remove file
remove_file() {
    if [ -f "$1" ]; then
        rm "$1"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
        echo -e "${GREEN}✓${NC} Removed: $1"
    fi
}

# Function to remove directory
remove_dir() {
    if [ -d "$1" ]; then
        rm -rf "$1"
        echo -e "${GREEN}✓${NC} Removed directory: $1"
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 1: Removing Temporary Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Remove temporary JS files
echo "📄 Removing temporary JavaScript files..."
remove_file ".tmp-post-login.js"
remove_dir "my-frontend/.tmp"

# Remove duplicate fix scripts (keep only if they're still needed)
echo ""
echo "📄 Removing old duplicate fix scripts..."
remove_file "fix-super-admin-duplicate.js"
remove_file "my-backend/remove-duplicate-roles.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 2: Organizing Documentation"  
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create docs directory if it doesn't exist
mkdir -p docs/archive

echo "📚 Moving old documentation to docs/archive..."

# List of documentation patterns that are likely outdated/duplicates
# Keep essential docs like README.md, DEPLOYMENT.md, etc.

# Move specific old documentation files
OLD_DOCS=(
    "*_FIX.md"
    "*_FIXED.md"
    "*_COMPLETE.md"
    "*_SUCCESS.md"
    "*_RESOLVED.md"
    "*_AUDIT*.md"
    "*_REPORT.md"
    "*_STATUS.md"
    "*_SUMMARY.md"
    "*_CHANGELOG.md"
    "*_BACKUP*.md"
    "*_OLD*.md"
    "BEFORE_AFTER*.md"
    "*COMPARISON*.md"
    "*VERIFICATION*.md"
    "*CHECKLIST*.md"
)

# Move to archive (don't delete, just organize)
for pattern in "${OLD_DOCS[@]}"; do
    find . -maxdepth 1 -name "$pattern" -type f | while read file; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            mv "$file" "docs/archive/$filename" 2>/dev/null
            echo -e "${BLUE}→${NC} Archived: $filename"
        fi
    done
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 3: Removing Database Dumps (Old)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "💾 Checking for old database dumps..."
# Only remove if they're older than 30 days
find . -maxdepth 1 -name "*.dump" -type f -mtime +30 | while read file; do
    remove_file "$file"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  STEP 4: Removing Empty Directories"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📁 Cleaning up empty directories..."
find . -type d -empty -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.next/*" 2>/dev/null | while read dir; do
    if [ -d "$dir" ]; then
        rmdir "$dir" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed empty: $dir"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Comprehensive Cleanup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  • Temporary files removed"
echo "  • Old documentation archived to docs/archive/"
echo "  • Empty directories cleaned"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "  1. Review docs/archive/ for any important documentation"
echo "  2. Update README.md with current project status"
echo "  3. Run 'git status' to see all changes"
echo ""
echo -e "${BLUE}💡 Tip:${NC} Keep only essential docs in root, move others to docs/"
echo ""
