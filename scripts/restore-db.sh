#!/bin/bash

###############################################################################
# Database Restore Script for BISMAN ERP
#
# This script restores a PostgreSQL database from a backup file.
#
# Usage: ./restore-db.sh <backup-file>
# Example: ./restore-db.sh backups/db-backup-20251013_140530.dump
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check if backup file is provided
if [ -z "$1" ]; then
    error "❌ No backup file specified!"
    echo ""
    echo "Usage: ./restore-db.sh <backup-file>"
    echo ""
    echo "Available backups:"
    find ./backups -name "db-backup-*.dump" -type f -exec basename {} \; 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL environment variable is not set!"
    error "Please set it in .env file or export it before running this script."
    exit 1
fi

# Warning prompt
echo ""
warning "⚠️  WARNING: This will OVERWRITE the current database!"
warning "⚠️  All existing data will be REPLACED with the backup."
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "❌ Restore cancelled by user"
    exit 0
fi

# Verify backup integrity
log "🔍 Verifying backup integrity..."
if ! pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    error "❌ Backup file is corrupted or invalid!"
    exit 1
fi
success "✅ Backup file is valid"

# Create a pre-restore backup
log "📦 Creating pre-restore backup..."
PRE_RESTORE_BACKUP="./backups/pre-restore-$(date +%Y%m%d_%H%M%S).dump"
mkdir -p ./backups
if pg_dump "$DATABASE_URL" --format=custom --file="$PRE_RESTORE_BACKUP"; then
    success "✅ Pre-restore backup created: $PRE_RESTORE_BACKUP"
else
    error "❌ Failed to create pre-restore backup!"
    read -p "Continue anyway? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        exit 1
    fi
fi

# Perform restore
log "🔄 Starting database restore..."
log "📁 Source file: $BACKUP_FILE"

# Drop existing database and recreate (safer than --clean)
warning "⚠️  Dropping and recreating database..."

# Parse DATABASE_URL to get database name
# Format: postgresql://user:password@host:port/dbname
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

if [ -z "$DB_NAME" ]; then
    error "❌ Could not extract database name from DATABASE_URL"
    exit 1
fi

log "🗄️  Database name: $DB_NAME"

# Restore the backup
if pg_restore --verbose --clean --no-acl --no-owner --dbname="$DATABASE_URL" "$BACKUP_FILE"; then
    echo ""
    success "================================================"
    success " Database Restore Completed Successfully!"
    success "================================================"
    log "📁 Restored from: $BACKUP_FILE"
    log "🗄️  Database: $DB_NAME"
    log "📦 Pre-restore backup: $PRE_RESTORE_BACKUP"
    success "================================================"
    
    # Verify restore
    log ""
    log "🔍 Verifying database connection..."
    if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
        success "✅ Database is accessible and working!"
    else
        warning "⚠️  Database restored but connection test failed"
    fi
    
else
    error "❌ Database restore failed!"
    error "You can restore the pre-restore backup if needed:"
    error "  ./restore-db.sh $PRE_RESTORE_BACKUP"
    exit 1
fi

exit 0
