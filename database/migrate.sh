#!/bin/bash
# Migration Runner Script
# Purpose: Apply database migrations safely with logging and rollback capability
# Author: System
# Date: 2025-10-03

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-erp_main}"
DB_USER="${DB_USER:-erp_admin}"
DB_PASSWORD="${DB_PASSWORD:-Suji@123}"
MIGRATION_DIR="$(dirname "$0")/migrations"
LOG_FILE="${LOG_FILE:-$(dirname "$0")/migration.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

# Function to execute SQL safely
execute_sql() {
    local sql_file="$1"
    local description="$2"
    
    log_info "Applying $description"
    log_info "File: $sql_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$sql_file" >> "$LOG_FILE" 2>&1; then
        log_success "$description applied successfully"
        return 0
    else
        log_error "$description failed"
        return 1
    fi
}

# Function to create backup before migration
create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="/tmp/erp_pre_migration_${timestamp}.sql"
    
    log_info "Creating backup before migration: $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --schema=erp --verbose --clean --create --if-exists \
        --format=plain --no-owner --no-privileges \
        > "$backup_file" 2>>"$LOG_FILE"; then
        log_success "Backup created: $backup_file"
        echo "$backup_file"
        return 0
    else
        log_error "Backup creation failed"
        return 1
    fi
}

# Function to check if migration is already applied
migration_applied() {
    local migration_name="$1"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if migration tracking table exists
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'migration_history'
        );
    " 2>/dev/null | grep -q "t"; then
        # Create migration tracking table
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            CREATE TABLE IF NOT EXISTS public.migration_history (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                applied_by VARCHAR(100) DEFAULT CURRENT_USER,
                backup_file TEXT,
                checksum TEXT
            );
        " >> "$LOG_FILE" 2>&1
    fi
    
    # Check if this migration was already applied
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT EXISTS (
            SELECT 1 FROM public.migration_history 
            WHERE migration_name = '$migration_name'
        );
    " 2>/dev/null | grep -q "t"; then
        return 0  # Already applied
    else
        return 1  # Not applied
    fi
}

# Function to record migration
record_migration() {
    local migration_name="$1"
    local backup_file="$2"
    local checksum="$3"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        INSERT INTO public.migration_history (migration_name, backup_file, checksum)
        VALUES ('$migration_name', '$backup_file', '$checksum');
    " >> "$LOG_FILE" 2>&1
}

# Function to apply a single migration
apply_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    # Check if already applied
    if migration_applied "$migration_name"; then
        log_warning "Migration $migration_name already applied, skipping"
        return 0
    fi
    
    log_info "Applying migration: $migration_name"
    
    # Create backup
    local backup_file
    if ! backup_file=$(create_backup); then
        log_error "Failed to create backup for migration $migration_name"
        return 1
    fi
    
    # Calculate checksum
    local checksum
    if command -v sha256sum >/dev/null; then
        checksum=$(sha256sum "$migration_file" | cut -d' ' -f1)
    elif command -v shasum >/dev/null; then
        checksum=$(shasum -a 256 "$migration_file" | cut -d' ' -f1)
    else
        checksum="unknown"
    fi
    
    # Apply migration
    if execute_sql "$migration_file" "Migration $migration_name"; then
        # Record successful migration
        record_migration "$migration_name" "$backup_file" "$checksum"
        log_success "Migration $migration_name completed successfully"
        return 0
    else
        log_error "Migration $migration_name failed"
        return 1
    fi
}

# Function to apply all migrations
apply_all_migrations() {
    log_info "Starting migration process"
    log_info "Migration directory: $MIGRATION_DIR"
    
    if [[ ! -d "$MIGRATION_DIR" ]]; then
        log_error "Migration directory not found: $MIGRATION_DIR"
        return 1
    fi
    
    local migration_files=($(find "$MIGRATION_DIR" -name "*.sql" -not -name "*rollback*" | sort))
    
    if [[ ${#migration_files[@]} -eq 0 ]]; then
        log_warning "No migration files found"
        return 0
    fi
    
    log_info "Found ${#migration_files[@]} migration files"
    
    local failed_migrations=()
    
    for migration_file in "${migration_files[@]}"; do
        if ! apply_migration "$migration_file"; then
            failed_migrations+=("$(basename "$migration_file")")
        fi
    done
    
    if [[ ${#failed_migrations[@]} -eq 0 ]]; then
        log_success "All migrations applied successfully"
        return 0
    else
        log_error "Failed migrations: ${failed_migrations[*]}"
        return 1
    fi
}

# Function to rollback a migration
rollback_migration() {
    local migration_name="$1"
    local rollback_file="$MIGRATION_DIR/${migration_name}_rollback.sql"
    
    if [[ ! -f "$rollback_file" ]]; then
        log_error "Rollback file not found: $rollback_file"
        return 1
    fi
    
    log_warning "Rolling back migration: $migration_name"
    
    # Create backup before rollback
    local backup_file
    if ! backup_file=$(create_backup); then
        log_error "Failed to create backup before rollback"
        return 1
    fi
    
    # Apply rollback
    if execute_sql "$rollback_file" "Rollback $migration_name"; then
        # Remove from migration history
        export PGPASSWORD="$DB_PASSWORD"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            DELETE FROM public.migration_history WHERE migration_name = '$migration_name';
        " >> "$LOG_FILE" 2>&1
        
        log_success "Rollback $migration_name completed successfully"
        return 0
    else
        log_error "Rollback $migration_name failed"
        return 1
    fi
}

# Function to show migration status
show_status() {
    log_info "Migration Status"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Check if migration table exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'migration_history'
        );
    " 2>/dev/null | grep -q "t"; then
        
        echo "Applied Migrations:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            SELECT 
                migration_name,
                applied_at,
                applied_by
            FROM public.migration_history 
            ORDER BY applied_at;
        "
    else
        echo "No migration history found"
    fi
    
    echo ""
    echo "Available Migration Files:"
    if [[ -d "$MIGRATION_DIR" ]]; then
        find "$MIGRATION_DIR" -name "*.sql" -not -name "*rollback*" | sort | while read -r file; do
            echo "- $(basename "$file")"
        done
    else
        echo "Migration directory not found: $MIGRATION_DIR"
    fi
}

# Main function
main() {
    local action="${1:-help}"
    local migration_name="${2:-}"
    
    # Create log file directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    echo "======================================="
    echo "ERP Database Migration Runner"
    echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
    echo "Log File: $LOG_FILE"
    echo "======================================="
    
    case "$action" in
        "apply")
            if [[ -n "$migration_name" ]]; then
                apply_migration "$MIGRATION_DIR/${migration_name}.sql"
            else
                apply_all_migrations
            fi
            ;;
        "rollback")
            if [[ -z "$migration_name" ]]; then
                log_error "Migration name required for rollback"
                exit 1
            fi
            rollback_migration "$migration_name"
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            echo "Usage: $0 {apply|rollback|status} [migration_name]"
            echo ""
            echo "Commands:"
            echo "  apply [name]    - Apply specific migration or all pending migrations"
            echo "  rollback <name> - Rollback specific migration"
            echo "  status          - Show migration status"
            echo ""
            echo "Environment Variables:"
            echo "  DB_HOST      - Database host (default: localhost)"
            echo "  DB_PORT      - Database port (default: 5432)"
            echo "  DB_NAME      - Database name (default: erp_main)"
            echo "  DB_USER      - Database user (default: erp_admin)"
            echo "  DB_PASSWORD  - Database password (default: Suji@123)"
            echo "  LOG_FILE     - Migration log file (default: ./migration.log)"
            echo ""
            echo "Examples:"
            echo "  $0 apply                           # Apply all pending migrations"
            echo "  $0 apply 001_complete_erp_schema   # Apply specific migration"
            echo "  $0 rollback 001_complete_erp_schema # Rollback specific migration"
            echo "  $0 status                          # Show migration status"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
