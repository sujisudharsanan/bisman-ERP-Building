#!/bin/bash
# Backup and Restore Script for ERP Database
# Purpose: Automated backup, restore, and maintenance operations
# Author: System
# Date: 2025-10-03

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-erp_main}"
DB_USER="${DB_USER:-erp_admin}"
DB_PASSWORD="${DB_PASSWORD:-Suji@123}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$BACKUP_DIR/backup.log"
}

# Function to create full database backup
create_full_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/erp_full_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    log "Starting full database backup to $backup_file"
    
    # Export password to avoid prompts
    export PGPASSWORD="$DB_PASSWORD"
    
    # Create backup
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --create --if-exists \
        --format=plain --no-owner --no-privileges \
        > "$backup_file"; then
        
        # Compress backup
        gzip "$backup_file"
        
        # Calculate size
        local size=$(du -h "$compressed_file" | cut -f1)
        log "Full backup completed successfully: $compressed_file ($size)"
        
        # Create latest symlink
        ln -sf "$(basename "$compressed_file")" "$BACKUP_DIR/erp_latest_full.sql.gz"
        
        return 0
    else
        log "ERROR: Full backup failed"
        rm -f "$backup_file"
        return 1
    fi
}

# Function to create schema-only backup
create_schema_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/erp_schema_${timestamp}.sql"
    
    log "Starting schema backup to $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --schema-only --verbose --clean --create --if-exists \
        --format=plain --no-owner --no-privileges \
        > "$backup_file"; then
        
        log "Schema backup completed successfully: $backup_file"
        ln -sf "$(basename "$backup_file")" "$BACKUP_DIR/erp_latest_schema.sql"
        return 0
    else
        log "ERROR: Schema backup failed"
        rm -f "$backup_file"
        return 1
    fi
}

# Function to create data-only backup
create_data_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/erp_data_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    log "Starting data backup to $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --data-only --verbose \
        --format=plain --no-owner --no-privileges \
        --exclude-table="erp.audit_logs*" \
        --exclude-table="erp.user_sessions" \
        > "$backup_file"; then
        
        gzip "$backup_file"
        local size=$(du -h "$compressed_file" | cut -f1)
        log "Data backup completed successfully: $compressed_file ($size)"
        ln -sf "$(basename "$compressed_file")" "$BACKUP_DIR/erp_latest_data.sql.gz"
        return 0
    else
        log "ERROR: Data backup failed"
        rm -f "$backup_file"
        return 1
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    local confirm="${2:-false}"
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR: Backup file not found: $backup_file"
        return 1
    fi
    
    if [[ "$confirm" != "CONFIRM" ]]; then
        log "WARNING: This will overwrite the existing database!"
        log "To confirm, run: $0 restore \"$backup_file\" CONFIRM"
        return 1
    fi
    
    log "Starting database restore from $backup_file"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Determine if file is compressed
    if [[ "$backup_file" == *.gz ]]; then
        if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres; then
            log "Database restore completed successfully"
            return 0
        else
            log "ERROR: Database restore failed"
            return 1
        fi
    else
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -f "$backup_file"; then
            log "Database restore completed successfully"
            return 0
        else
            log "ERROR: Database restore failed"
            return 1
        fi
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"
    
    find "$BACKUP_DIR" -name "erp_*.sql*" -type f -mtime +$RETENTION_DAYS -delete
    
    local remaining=$(find "$BACKUP_DIR" -name "erp_*.sql*" -type f | wc -l)
    log "Cleanup completed. Remaining backup files: $remaining"
}

# Function to run database maintenance
run_maintenance() {
    log "Starting database maintenance"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    # Update statistics
    log "Updating table statistics (ANALYZE)"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE;"
    
    # Vacuum tables
    log "Running VACUUM on all tables"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM (VERBOSE, ANALYZE);"
    
    # Reindex if needed (be careful with this in production)
    if [[ "${FORCE_REINDEX:-false}" == "true" ]]; then
        log "Reindexing database (REINDEX)"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;"
    fi
    
    # Check for bloat
    log "Checking for table bloat"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables 
        WHERE schemaname = 'erp' 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    "
    
    log "Database maintenance completed"
}

# Function to show backup status
show_status() {
    log "Backup Status Report"
    echo "===================="
    echo "Backup Directory: $BACKUP_DIR"
    echo "Retention Policy: $RETENTION_DAYS days"
    echo ""
    
    if [[ -d "$BACKUP_DIR" ]]; then
        echo "Recent Backups:"
        ls -lah "$BACKUP_DIR"/erp_*.sql* 2>/dev/null | tail -10 || echo "No backups found"
        echo ""
        
        echo "Latest Symlinks:"
        ls -la "$BACKUP_DIR"/erp_latest_* 2>/dev/null || echo "No latest symlinks found"
        echo ""
        
        echo "Disk Usage:"
        du -sh "$BACKUP_DIR" 2>/dev/null || echo "Cannot determine disk usage"
    else
        echo "Backup directory does not exist"
    fi
}

# Function for monitoring queries
monitoring_queries() {
    log "Running monitoring queries"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    echo "=== Database Size ==="
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            pg_database.datname,
            pg_size_pretty(pg_database_size(pg_database.datname)) AS size
        FROM pg_database
        WHERE datname = '$DB_NAME';
    "
    
    echo "=== Top 10 Largest Tables ==="
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables 
        WHERE schemaname IN ('erp', 'public')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    "
    
    echo "=== Active Connections ==="
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            datname,
            usename,
            client_addr,
            state,
            query_start,
            state_change
        FROM pg_stat_activity 
        WHERE datname = '$DB_NAME'
        ORDER BY query_start DESC;
    "
    
    echo "=== Top Queries by Total Time ==="
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            rows
        FROM pg_stat_statements 
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = '$DB_NAME')
        ORDER BY total_exec_time DESC 
        LIMIT 10;
    " 2>/dev/null || echo "pg_stat_statements extension not available"
}

# Main function
main() {
    local action="${1:-help}"
    
    case "$action" in
        "full")
            create_full_backup
            ;;
        "schema")
            create_schema_backup
            ;;
        "data")
            create_data_backup
            ;;
        "restore")
            local backup_file="${2:-}"
            local confirm="${3:-false}"
            restore_backup "$backup_file" "$confirm"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "maintenance")
            run_maintenance
            ;;
        "status")
            show_status
            ;;
        "monitor")
            monitoring_queries
            ;;
        "daily")
            log "Running daily backup routine"
            create_full_backup && cleanup_old_backups
            ;;
        "weekly")
            log "Running weekly maintenance routine"
            create_full_backup && create_schema_backup && run_maintenance && cleanup_old_backups
            ;;
        "help"|*)
            echo "Usage: $0 {full|schema|data|restore|cleanup|maintenance|status|monitor|daily|weekly}"
            echo ""
            echo "Commands:"
            echo "  full                     - Create full database backup"
            echo "  schema                   - Create schema-only backup"
            echo "  data                     - Create data-only backup"
            echo "  restore <file> [CONFIRM] - Restore from backup file"
            echo "  cleanup                  - Remove old backup files"
            echo "  maintenance              - Run database maintenance (VACUUM, ANALYZE)"
            echo "  status                   - Show backup status and disk usage"
            echo "  monitor                  - Run monitoring queries"
            echo "  daily                    - Daily routine (backup + cleanup)"
            echo "  weekly                   - Weekly routine (full backup + maintenance)"
            echo ""
            echo "Environment Variables:"
            echo "  DB_HOST         - Database host (default: localhost)"
            echo "  DB_PORT         - Database port (default: 5432)"
            echo "  DB_NAME         - Database name (default: erp_main)"
            echo "  DB_USER         - Database user (default: erp_admin)"
            echo "  DB_PASSWORD     - Database password (default: Suji@123)"
            echo "  BACKUP_DIR      - Backup directory (default: /var/backups/postgresql)"
            echo "  RETENTION_DAYS  - Backup retention in days (default: 30)"
            echo "  FORCE_REINDEX   - Force reindex during maintenance (default: false)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
