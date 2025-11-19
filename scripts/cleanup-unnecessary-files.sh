#!/bin/bash
# Cleanup Script for BISMAN ERP - Remove Unnecessary Files
# This script removes log files, dumps, and other temporary files to free up space

echo "🧹 BISMAN ERP Cleanup Script"
echo "=============================="
echo ""

# Set the base directory
BASE_DIR="/Users/abhi/Desktop/BISMAN ERP"
cd "$BASE_DIR"

# Create a backup list
echo "📝 Creating file list before cleanup..."
mkdir -p cleanup-logs
CLEANUP_LOG="cleanup-logs/cleanup-$(date +%Y%m%d_%H%M%S).log"
echo "Cleanup Log - $(date)" > "$CLEANUP_LOG"
echo "===========================================" >> "$CLEANUP_LOG"

# Track total size
TOTAL_SIZE=0

# Function to safely remove files
remove_files() {
    local pattern=$1
    local description=$2
    
    echo ""
    echo "🔍 Searching for: $description"
    
    files=$(find . -type f $pattern -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/cleanup-logs/*" 2>/dev/null)
    
    if [ -z "$files" ]; then
        echo "   ✓ No files found"
        return
    fi
    
    echo "$files" | while read file; do
        if [ -f "$file" ]; then
            size=$(du -sh "$file" | awk '{print $1}')
            echo "   🗑️  $file ($size)" | tee -a "$CLEANUP_LOG"
            rm -f "$file"
        fi
    done
}

echo ""
echo "Starting cleanup..."
echo "===========================================" >> "$CLEANUP_LOG"

# 1. Remove log files
remove_files "-name '*.log'" "Log files (*.log)"

# 2. Remove dump files (database backups)
remove_files "-name '*.dump'" "Database dump files (*.dump)"

# 3. Remove SQL export files (keep migration files in database/migrations/)
find . -type f -name "*.sql" -not -path "*/database/migrations/*" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/prisma/migrations/*" | while read file; do
    size=$(du -sh "$file" | awk '{print $1}')
    echo "   🗑️  $file ($size)" | tee -a "$CLEANUP_LOG"
    rm -f "$file"
done

# 4. Remove backup files
remove_files "-name '*.bak' -o -name '*.backup' -o -name '*.old'" "Backup files (*.bak, *.backup, *.old)"

# 5. Remove temporary files
remove_files "-name '*.tmp' -o -name '*.temp'" "Temporary files (*.tmp, *.temp)"

# 6. Remove audit output files
remove_files "-name 'audit-output.log'" "Audit output files"

# 7. Clean up old webpack cache
if [ -d "my-frontend/.next/cache/webpack" ]; then
    echo ""
    echo "🔍 Cleaning webpack cache..."
    find my-frontend/.next/cache/webpack -name "*.old" -type f | while read file; do
        size=$(du -sh "$file" | awk '{print $1}')
        echo "   🗑️  $file ($size)" | tee -a "$CLEANUP_LOG"
        rm -f "$file"
    done
fi

# 8. Remove empty directories
echo ""
echo "🔍 Removing empty directories..."
find . -type d -empty -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | while read dir; do
    echo "   🗑️  $dir" | tee -a "$CLEANUP_LOG"
    rmdir "$dir" 2>/dev/null
done

echo ""
echo "===========================================" >> "$CLEANUP_LOG"
echo "Cleanup completed at: $(date)" >> "$CLEANUP_LOG"
echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "📊 Summary:"
echo "   Log file: $CLEANUP_LOG"
echo ""
echo "🔍 Current workspace size:"
du -sh "$BASE_DIR" 2>/dev/null

echo ""
echo "💡 Recommendation: Review the log file to see what was removed"
echo "   Location: $CLEANUP_LOG"
