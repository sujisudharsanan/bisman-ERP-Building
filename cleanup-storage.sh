#!/bin/bash

# ERP Storage Cleanup Script
# Removes logs, uploads, and temporary files older than 30 days
# Run as cron job: 0 2 * * 0 (every Sunday at 2 AM)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/Users/abhi/Desktop/BISMAN ERP"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🧹 ERP Storage Cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Started: $(date)"
echo "Project: $PROJECT_ROOT"
echo ""

# Track sizes
INITIAL_SIZE=0
FINAL_SIZE=0
DELETED_COUNT=0

# Calculate initial size
if [ -d "$PROJECT_ROOT" ]; then
  INITIAL_SIZE=$(du -sh "$PROJECT_ROOT" 2>/dev/null | awk '{print $1}')
  echo "📊 Current project size: $INITIAL_SIZE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🗑️  Cleaning Old Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Remove old log files (>30 days)
echo "1️⃣  Removing log files older than 30 days..."
LOG_COUNT=0
if [ -d "$PROJECT_ROOT/my-backend/logs" ]; then
  LOG_COUNT=$(find "$PROJECT_ROOT/my-backend/logs" -name "*.log" -type f -mtime +30 2>/dev/null | wc -l | tr -d ' ')
  if [ "$LOG_COUNT" -gt 0 ]; then
    find "$PROJECT_ROOT/my-backend/logs" -name "*.log" -type f -mtime +30 -delete
    echo "   ✅ Deleted $LOG_COUNT log files"
    DELETED_COUNT=$((DELETED_COUNT + LOG_COUNT))
  else
    echo "   ℹ️  No old log files found"
  fi
else
  echo "   ℹ️  Logs directory not found"
fi

# 2. Remove old database dumps (>30 days)
echo ""
echo "2️⃣  Removing database dumps older than 30 days..."
DUMP_COUNT=0
if [ -d "$PROJECT_ROOT" ]; then
  DUMP_COUNT=$(find "$PROJECT_ROOT" -maxdepth 1 -name "*.dump" -type f -mtime +30 2>/dev/null | wc -l | tr -d ' ')
  if [ "$DUMP_COUNT" -gt 0 ]; then
    find "$PROJECT_ROOT" -maxdepth 1 -name "*.dump" -type f -mtime +30 -delete
    echo "   ✅ Deleted $DUMP_COUNT database dumps"
    DELETED_COUNT=$((DELETED_COUNT + DUMP_COUNT))
  else
    echo "   ℹ️  No old database dumps found"
  fi
else
  echo "   ℹ️  Project root not found"
fi

# 3. Remove old uploads (>30 days)
echo ""
echo "3️⃣  Removing uploads older than 30 days..."
UPLOAD_COUNT=0
if [ -d "$PROJECT_ROOT/my-backend/uploads" ]; then
  UPLOAD_COUNT=$(find "$PROJECT_ROOT/my-backend/uploads" -type f -mtime +30 2>/dev/null | wc -l | tr -d ' ')
  if [ "$UPLOAD_COUNT" -gt 0 ]; then
    find "$PROJECT_ROOT/my-backend/uploads" -type f -mtime +30 -delete
    echo "   ✅ Deleted $UPLOAD_COUNT old uploads"
    DELETED_COUNT=$((DELETED_COUNT + UPLOAD_COUNT))
  else
    echo "   ℹ️  No old uploads found"
  fi
else
  echo "   ℹ️  Uploads directory not found"
fi

# 4. Clean Next.js cache (keep last 7 days)
echo ""
echo "4️⃣  Cleaning Next.js cache..."
if [ -d "$PROJECT_ROOT/my-frontend/.next/cache" ]; then
  CACHE_COUNT=$(find "$PROJECT_ROOT/my-frontend/.next/cache" -type f -mtime +7 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CACHE_COUNT" -gt 0 ]; then
    find "$PROJECT_ROOT/my-frontend/.next/cache" -type f -mtime +7 -delete 2>/dev/null || true
    echo "   ✅ Cleaned $CACHE_COUNT cache files"
    DELETED_COUNT=$((DELETED_COUNT + CACHE_COUNT))
  else
    echo "   ℹ️  No old cache files found"
  fi
else
  echo "   ℹ️  Next.js cache not found"
fi

# 5. Remove temporary files
echo ""
echo "5️⃣  Removing temporary files..."
TEMP_COUNT=0
if [ -d "$PROJECT_ROOT" ]; then
  TEMP_COUNT=$(find "$PROJECT_ROOT" -name "*.tmp" -o -name "*.temp" -o -name ".DS_Store" -type f 2>/dev/null | wc -l | tr -d ' ')
  if [ "$TEMP_COUNT" -gt 0 ]; then
    find "$PROJECT_ROOT" -name "*.tmp" -o -name "*.temp" -o -name ".DS_Store" -type f -delete 2>/dev/null || true
    echo "   ✅ Deleted $TEMP_COUNT temporary files"
    DELETED_COUNT=$((DELETED_COUNT + TEMP_COUNT))
  else
    echo "   ℹ️  No temporary files found"
  fi
fi

# 6. Remove old audit reports (keep last 10)
echo ""
echo "6️⃣  Cleaning old audit reports (keeping last 10)..."
if [ -d "$PROJECT_ROOT/audit-reports" ]; then
  AUDIT_COUNT=$(find "$PROJECT_ROOT/audit-reports" -maxdepth 1 -type d -name "2025*" | sort -r | tail -n +11 | wc -l | tr -d ' ')
  if [ "$AUDIT_COUNT" -gt 0 ]; then
    find "$PROJECT_ROOT/audit-reports" -maxdepth 1 -type d -name "2025*" | sort -r | tail -n +11 | xargs rm -rf
    echo "   ✅ Removed $AUDIT_COUNT old audit reports"
  else
    echo "   ℹ️  No old audit reports to remove"
  fi
fi

# Calculate final size
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 Cleanup Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -d "$PROJECT_ROOT" ]; then
  FINAL_SIZE=$(du -sh "$PROJECT_ROOT" 2>/dev/null | awk '{print $1}')
  echo "Before:       $INITIAL_SIZE"
  echo "After:        $FINAL_SIZE"
  echo "Files deleted: $DELETED_COUNT"
fi

echo ""
echo "✅ Cleanup completed at $(date)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Log to file
LOG_DIR="$PROJECT_ROOT/cleanup-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/cleanup-$(date +%Y%m%d).log"
{
  echo "Cleanup run: $(date)"
  echo "Files deleted: $DELETED_COUNT"
  echo "Size before: $INITIAL_SIZE"
  echo "Size after: $FINAL_SIZE"
  echo "---"
} >> "$LOG_FILE"

echo "📝 Log saved to: $LOG_FILE"
