#!/bin/bash

###############################################################################
# Database Backup Script for BISMAN ERP
# 
# This script creates automated PostgreSQL database backups with:
# - Timestamped backup files
# - 30-day retention policy
# - Backup verification
# - Error notifications
#
# Usage: ./backup-db.sh
# Cron: 0 2 * * * /path/to/backup-db.sh >> /var/log/db-backup.log 2>&1
###############################################################################

set -e  # Exit on error

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="db-backup-${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set!"
    error "Please set it in .env file or export it before running this script."
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
log "📁 Backup directory: $BACKUP_DIR"

# Start backup
log "🔄 Starting database backup..."
log "📦 Backup file: $BACKUP_FILE"

# Perform backup using pg_dump
if pg_dump "$DATABASE_URL" --format=custom --file="${BACKUP_DIR}/${BACKUP_FILE}"; then
    success "✅ Database backup completed successfully!"
    
    # Get file size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "📊 Backup size: $BACKUP_SIZE"
    
    # Verify backup
    log "🔍 Verifying backup integrity..."
    if pg_restore --list "${BACKUP_DIR}/${BACKUP_FILE}" > /dev/null 2>&1; then
        success "✅ Backup integrity verified!"
    else
        error "❌ Backup verification failed!"
        exit 1
    fi
    
else
    error "❌ Database backup failed!"
    exit 1
fi

# Cleanup old backups (retention policy)
log "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "db-backup-*.dump" -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    log "🗑️  Deleted $DELETED_COUNT old backup(s)"
else
    log "✨ No old backups to delete"
fi

# List current backups
CURRENT_BACKUPS=$(find "$BACKUP_DIR" -name "db-backup-*.dump" -type f | wc -l)
log "📂 Current backups: $CURRENT_BACKUPS file(s)"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "💾 Total backup size: $TOTAL_SIZE"

# Success summary
echo ""
success "================================================"
success " Database Backup Completed Successfully!"
success "================================================"
log "📝 Backup file: ${BACKUP_DIR}/${BACKUP_FILE}"
log "📊 Backup size: $BACKUP_SIZE"
log "📂 Total backups: $CURRENT_BACKUPS"
log "💾 Total size: $TOTAL_SIZE"
log "🕒 Retention: $RETENTION_DAYS days"
success "================================================"

exit 0
