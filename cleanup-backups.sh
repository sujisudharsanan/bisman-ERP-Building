#!/bin/bash

# 🧹 Backup Files Cleanup Script
# Date: October 26, 2025
# Purpose: Remove old backup files that are no longer needed

cd "/Users/abhi/Desktop/BISMAN ERP"

echo "🧹 Starting cleanup of backup files..."
echo ""

# Count files to be deleted
count=0

# Backend service backups
if [ -f "my-backend/services/superAdminService.local-backup-20251009-205128.js" ]; then
    echo "  🗑️  Removing: services/superAdminService.local-backup-20251009-205128.js"
    rm -f "my-backend/services/superAdminService.local-backup-20251009-205128.js"
    ((count++))
fi

# Route backups
for file in my-backend/routes/pagesRoutes.js.backup.*; do
    if [ -f "$file" ]; then
        echo "  🗑️  Removing: $(basename $file)"
        rm -f "$file"
        ((count++))
    fi
done

# Dockerfile backup
if [ -f "my-backend/Dockerfile.backup" ]; then
    echo "  🗑️  Removing: Dockerfile.backup"
    rm -f "my-backend/Dockerfile.backup"
    ((count++))
fi

# Environment file backups
if [ -f ".env.bak" ]; then
    echo "  🗑️  Removing: .env.bak"
    rm -f ".env.bak"
    ((count++))
fi

if [ -f "my-backend/.env.bak" ]; then
    echo "  🗑️  Removing: my-backend/.env.bak"
    rm -f "my-backend/.env.bak"
    ((count++))
fi

echo ""
echo "✅ Cleanup complete!"
echo "📊 Removed $count backup file(s)"
echo "💾 Estimated space saved: ~1-2 MB"
echo ""
echo "Your system is now cleaner! 🎉"
