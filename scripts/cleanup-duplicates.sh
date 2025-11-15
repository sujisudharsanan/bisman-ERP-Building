#!/bin/bash

# BISMAN ERP - Duplicate and Incomplete Files Cleanup Script
# This script will remove backup files, temporary files, and duplicates

echo "🧹 Starting cleanup of duplicate and incomplete files..."
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for removed files
REMOVED_COUNT=0
FREED_SPACE=0

# Function to remove files safely
remove_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local size=$(du -sk "$file" | cut -f1)
        rm "$file"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
        FREED_SPACE=$((FREED_SPACE + size))
        echo -e "${GREEN}✓${NC} Removed: $file"
    fi
}

# Function to remove directory
remove_dir() {
    local dir="$1"
    if [ -d "$dir" ]; then
        local size=$(du -sk "$dir" | cut -f1)
        rm -rf "$dir"
        FREED_SPACE=$((FREED_SPACE + size))
        echo -e "${GREEN}✓${NC} Removed directory: $dir (freed ${size}KB)"
    fi
}

echo "📁 Removing backup directory (472 duplicate files)..."
remove_dir "backup/css-fix-1763024182770"
remove_dir "backup"

echo ""
echo "📄 Removing .backup files..."
find . -type f -name "*.backup" | while read file; do
    remove_file "$file"
done

echo ""
echo "📄 Removing .bak files..."
remove_file "docker-compose.yml.bak"
remove_file ".vercelignore.bak"
remove_file "docker-compose.override.yml.bak"

echo ""
echo "📄 Removing page-old-backup files..."
find my-frontend -type f -name "*-old-backup.tsx" | while read file; do
    remove_file "$file"
done

echo ""
echo "📄 Removing temporary/incomplete config backups..."
find my-frontend -type f -name "*.backup.*" | while read file; do
    remove_file "$file"
done

echo ""
echo "📄 Removing old module backup..."
find my-frontend -type f -name "page.backup.*.tsx" | while read file; do
    remove_file "$file"
done

echo ""
echo "📄 Checking for empty directories..."
find . -type d -empty -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null | while read dir; do
    if [ -d "$dir" ]; then
        rmdir "$dir" 2>/dev/null && echo -e "${GREEN}✓${NC} Removed empty directory: $dir"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  • Files removed: $REMOVED_COUNT"
echo "  • Space freed: ~$((FREED_SPACE / 1024)) MB"
echo ""
echo -e "${YELLOW}💡 Tip:${NC} Run 'git status' to see what was removed"
echo ""
