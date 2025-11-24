#!/bin/bash

################################################################################
# BISMAN ERP - Database Recovery Script
################################################################################
# Restore database from backup with point-in-time recovery support
#
# Usage:
#   ./scripts/database-restore.sh [backup_file]
#   ./scripts/database-restore.sh latest  # Restore from latest backup
#   ./scripts/database-restore.sh list    # List available backups
#
# Examples:
#   ./scripts/database-restore.sh latest
#   ./scripts/database-restore.sh backup_bisman_erp_20251124_020000.sql.gz
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# CONFIGURATION
# ============================================================================

if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-bisman_erp}"
DB_USER="${DATABASE_USER:-postgres}"
DB_PASSWORD="${DATABASE_PASSWORD}"
BACKUP_DIR="${BACKUP_DIR:-./backups/database}"
MANIFEST_FILE="${BACKUP_DIR}/backup_manifest.json"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"; }
log_error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"; }
log_warning() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"; }

# List available backups
list_backups() {
    log "Available backups:"
    echo ""
    
    if [ ! -f "$MANIFEST_FILE" ]; then
        log_error "No backup manifest found"
        exit 1
    fi
    
    echo -e "${BLUE}╔══════════╦═══════════════════════╦═══════════════╦═══════════╦══════════╗${NC}"
    echo -e "${BLUE}║   #      ║ Timestamp             ║ Database Size ║ Backup    ║ Verified ║${NC}"
    echo -e "${BLUE}╠══════════╬═══════════════════════╬═══════════════╬═══════════╬══════════╣${NC}"
    
    local count=1
    jq -r '.[] | [.timestamp, .database_size, .backup_size, .verified] | @tsv' "$MANIFEST_FILE" | \
    while IFS=$'\t' read -r timestamp db_size backup_size verified; do
        local status="❌"
        [ "$verified" = "true" ] && status="✅"
        printf "${BLUE}║${NC} %-8s ${BLUE}║${NC} %-21s ${BLUE}║${NC} %-13s ${BLUE}║${NC} %-9s ${BLUE}║${NC} %-8s ${BLUE}║${NC}\n" \
            "$count" "$timestamp" "$db_size" "$backup_size" "$status"
        ((count++))
    done
    
    echo -e "${BLUE}╚══════════╩═══════════════════════╩═══════════════╩═══════════╩══════════╝${NC}"
    echo ""
}

# Get latest backup file
get_latest_backup() {
    if [ ! -f "$MANIFEST_FILE" ]; then
        log_error "No backup manifest found"
        exit 1
    fi
    
    local latest_file=$(jq -r '.[-1].file' "$MANIFEST_FILE")
    echo "${BACKUP_DIR}/${latest_file}"
}

# Get backup by index
get_backup_by_index() {
    local index=$1
    local file=$(jq -r ".[$((index-1))].file" "$MANIFEST_FILE")
    
    if [ "$file" = "null" ]; then
        log_error "Backup #$index not found"
        exit 1
    fi
    
    echo "${BACKUP_DIR}/${file}"
}

# Verify backup file exists and is valid
verify_backup_file() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Verifying backup file..."
    if gzip -t "$backup_file" 2>/dev/null; then
        log_success "Backup file is valid"
    else
        log_error "Backup file is corrupted"
        exit 1
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    log_warning "Creating pre-restore backup of current database..."
    
    local pre_restore_file="${BACKUP_DIR}/pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --format=plain --no-owner --no-acl \
        "$DB_NAME" | gzip > "$pre_restore_file"; then
        log_success "Pre-restore backup created: $(basename $pre_restore_file)"
    else
        log_error "Failed to create pre-restore backup"
        exit 1
    fi
}

# Drop all connections to database
drop_connections() {
    log "Dropping active connections..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '$DB_NAME'
          AND pid <> pg_backend_pid();
    " &> /dev/null || true
    
    log_success "Connections dropped"
}

# Restore database
restore_database() {
    local backup_file=$1
    
    log "Starting database restore..."
    log "Backup file: $(basename $backup_file)"
    log "Target database: $DB_NAME"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    local start_time=$(date +%s)
    
    # Drop connections
    drop_connections
    
    # Restore from backup
    if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /tmp/restore.log; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_success "Database restored successfully in ${duration}s"
        return 0
    else
        log_error "Database restore failed"
        log_error "Check log: /tmp/restore.log"
        tail -20 /tmp/restore.log
        return 1
    fi
}

# Verify restore
verify_restore() {
    log "Verifying restored database..."
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check table count
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    
    log "Tables restored: $table_count"
    
    # Check if critical tables exist
    local critical_tables=("User" "Client" "Outlet")
    local missing_tables=()
    
    for table in "${critical_tables[@]}"; do
        local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" | xargs)
        
        if [ "$exists" -eq 0 ]; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        log_success "All critical tables verified"
        return 0
    else
        log_error "Missing critical tables: ${missing_tables[*]}"
        return 1
    fi
}

# Interactive restore
interactive_restore() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║     🔄 BISMAN ERP - Database Recovery                ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    list_backups
    
    echo ""
    read -p "Enter backup number to restore (or 'q' to quit): " choice
    
    if [ "$choice" = "q" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    local backup_file=$(get_backup_by_index "$choice")
    
    echo ""
    log_warning "⚠️  WARNING: This will restore the database to the selected backup"
    log_warning "⚠️  Current database will be backed up before restore"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi
    
    # Verify backup file
    verify_backup_file "$backup_file"
    
    # Create pre-restore backup
    create_pre_restore_backup
    
    # Restore database
    if restore_database "$backup_file"; then
        verify_restore
        log_success "✅ Database restore completed successfully!"
    else
        log_error "❌ Database restore failed!"
        exit 1
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    if [ $# -eq 0 ]; then
        # Interactive mode
        interactive_restore
    else
        case "$1" in
            list)
                list_backups
                ;;
            latest)
                local backup_file=$(get_latest_backup)
                log "Restoring from latest backup: $(basename $backup_file)"
                verify_backup_file "$backup_file"
                create_pre_restore_backup
                restore_database "$backup_file"
                verify_restore
                ;;
            *)
                # Restore from specific file
                local backup_file="${BACKUP_DIR}/$1"
                if [ ! -f "$backup_file" ]; then
                    backup_file="$1"
                fi
                verify_backup_file "$backup_file"
                create_pre_restore_backup
                restore_database "$backup_file"
                verify_restore
                ;;
        esac
    fi
}

main "$@"
