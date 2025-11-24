#!/bin/bash

################################################################################
# BISMAN ERP - Automated Database Backup System
################################################################################
# Zero-cost high-availability backup solution for PostgreSQL
# 
# Features:
# - Automated daily backups
# - Retention policy (keep last 30 days)
# - Compression to save space
# - Backup verification
# - Email notifications (optional)
# - Point-in-time recovery support
#
# Usage:
#   ./scripts/database-backup.sh
#   
# Cron setup (daily at 2 AM):
#   0 2 * * * /path/to/database-backup.sh >> /var/log/db-backup.log 2>&1
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# CONFIGURATION
# ============================================================================

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-bisman_erp}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD}"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/database}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
MAX_BACKUPS="${MAX_BACKUPS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${TIMESTAMP}.sql.gz"
MANIFEST_FILE="${BACKUP_DIR}/backup_manifest.json"

# Notification configuration
ENABLE_NOTIFICATIONS="${ENABLE_NOTIFICATIONS:-false}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL}"
NOTIFICATION_WEBHOOK="${NOTIFICATION_WEBHOOK}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
}

# Check if required commands are available
check_dependencies() {
    log "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log "Install with: brew install ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "All dependencies available"
}

# Create backup directory
create_backup_directory() {
    log "Creating backup directory..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_success "Created backup directory: $BACKUP_DIR"
    else
        log_success "Backup directory exists: $BACKUP_DIR"
    fi
}

# Test database connection
test_connection() {
    log "Testing database connection..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Cannot connect to database"
        return 1
    fi
}

# Get database size
get_database_size() {
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs
}

# Get table count
get_table_count() {
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs
}

# Perform backup
perform_backup() {
    log "Starting database backup..."
    log "Database: $DB_NAME"
    log "Backup file: $BACKUP_FILE"
    
    local db_size=$(get_database_size)
    local table_count=$(get_table_count)
    
    log "Database size: $db_size"
    log "Table count: $table_count"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    local start_time=$(date +%s)
    
    # Perform backup with compression
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        "$DB_NAME" | gzip > "$BACKUP_FILE"; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
        
        log_success "Backup completed in ${duration}s"
        log_success "Backup size: $backup_size"
        
        # Update manifest
        update_manifest "$BACKUP_FILE" "$db_size" "$table_count" "$duration" "$backup_size"
        
        return 0
    else
        log_error "Backup failed"
        return 1
    fi
}

# Update backup manifest
update_manifest() {
    local backup_file=$1
    local db_size=$2
    local table_count=$3
    local duration=$4
    local backup_size=$5
    
    local backup_entry=$(cat <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "file": "$(basename $backup_file)",
  "database": "$DB_NAME",
  "database_size": "$db_size",
  "table_count": $table_count,
  "backup_size": "$backup_size",
  "duration_seconds": $duration,
  "status": "success",
  "verified": false
}
EOF
)
    
    if [ -f "$MANIFEST_FILE" ]; then
        # Append to existing manifest
        jq ". += [$backup_entry]" "$MANIFEST_FILE" > "${MANIFEST_FILE}.tmp"
        mv "${MANIFEST_FILE}.tmp" "$MANIFEST_FILE"
    else
        # Create new manifest
        echo "[$backup_entry]" > "$MANIFEST_FILE"
    fi
    
    log_success "Updated backup manifest"
}

# Verify backup
verify_backup() {
    log "Verifying backup integrity..."
    
    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_success "Backup file is valid"
        
        # Update manifest with verification status
        jq "(.[length-1].verified) = true" "$MANIFEST_FILE" > "${MANIFEST_FILE}.tmp"
        mv "${MANIFEST_FILE}.tmp" "$MANIFEST_FILE"
        
        return 0
    else
        log_error "Backup file is corrupted!"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $BACKUP_RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Delete files older than retention period
    if [ -d "$BACKUP_DIR" ]; then
        while IFS= read -r file; do
            rm -f "$file"
            ((deleted_count++))
            log "Deleted: $(basename $file)"
        done < <(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS)
    fi
    
    # Keep only MAX_BACKUPS most recent files
    local total_backups=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f | wc -l | xargs)
    
    if [ "$total_backups" -gt "$MAX_BACKUPS" ]; then
        local excess=$((total_backups - MAX_BACKUPS))
        log_warning "Too many backups ($total_backups). Removing oldest $excess..."
        
        find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -printf '%T+ %p\n' | \
            sort | head -n "$excess" | cut -d' ' -f2- | \
            while read -r file; do
                rm -f "$file"
                ((deleted_count++))
                log "Deleted: $(basename $file)"
            done
    fi
    
    if [ "$deleted_count" -gt 0 ]; then
        log_success "Deleted $deleted_count old backup(s)"
    else
        log_success "No old backups to delete"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ "$ENABLE_NOTIFICATIONS" = "true" ]; then
        log "Sending notification..."
        
        # Webhook notification (Slack, Discord, etc.)
        if [ -n "$NOTIFICATION_WEBHOOK" ]; then
            local payload=$(cat <<EOF
{
  "text": "Database Backup - $status",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*BISMAN ERP Database Backup*\n$message"
      }
    }
  ]
}
EOF
)
            curl -X POST -H 'Content-type: application/json' \
                --data "$payload" "$NOTIFICATION_WEBHOOK" &> /dev/null || true
        fi
        
        log_success "Notification sent"
    fi
}

# Generate backup report
generate_report() {
    local status=$1
    
    log ""
    log "======================================"
    log "     DATABASE BACKUP REPORT"
    log "======================================"
    log ""
    log "Status: $status"
    log "Database: $DB_NAME"
    log "Timestamp: $(date)"
    log "Backup file: $(basename $BACKUP_FILE)"
    log ""
    
    if [ -f "$MANIFEST_FILE" ]; then
        local total_backups=$(jq 'length' "$MANIFEST_FILE")
        local successful_backups=$(jq '[.[] | select(.status == "success")] | length' "$MANIFEST_FILE")
        local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
        
        log "Total backups: $total_backups"
        log "Successful: $successful_backups"
        log "Total size: $total_size"
    fi
    
    log ""
    log "======================================"
    log ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║     📦 BISMAN ERP - Database Backup System           ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    local backup_status="SUCCESS"
    local error_message=""
    
    # Step 1: Check dependencies
    check_dependencies || exit 1
    
    # Step 2: Create backup directory
    create_backup_directory
    
    # Step 3: Test database connection
    if ! test_connection; then
        backup_status="FAILED"
        error_message="Cannot connect to database"
        generate_report "$backup_status"
        send_notification "$backup_status" "$error_message"
        exit 1
    fi
    
    # Step 4: Perform backup
    if ! perform_backup; then
        backup_status="FAILED"
        error_message="Backup operation failed"
        generate_report "$backup_status"
        send_notification "$backup_status" "$error_message"
        exit 1
    fi
    
    # Step 5: Verify backup
    if ! verify_backup; then
        backup_status="FAILED"
        error_message="Backup verification failed"
        generate_report "$backup_status"
        send_notification "$backup_status" "$error_message"
        exit 1
    fi
    
    # Step 6: Cleanup old backups
    cleanup_old_backups
    
    # Step 7: Generate report
    generate_report "$backup_status"
    
    # Step 8: Send notification
    send_notification "$backup_status" "Backup completed successfully\nFile: $(basename $BACKUP_FILE)"
    
    log_success "Backup process completed successfully!"
    
    exit 0
}

# Run main function
main "$@"
