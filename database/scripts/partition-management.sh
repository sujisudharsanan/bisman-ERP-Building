#!/bin/bash
# Partition Management Script
# Purpose: Create and manage monthly partitions for audit_logs and inventory_movements
# Author: System
# Date: 2025-10-03

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-erp_main}"
DB_USER="${DB_USER:-erp_admin}"
DB_PASSWORD="${DB_PASSWORD:-Suji@123}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Function to create partition for a given table and date range
create_partition() {
    local table_name="$1"
    local year_month="$2"
    local start_date="$3"
    local end_date="$4"
    
    local partition_name="${table_name}_${year_month}"
    
    log "Creating partition: $partition_name"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS erp.${partition_name} PARTITION OF erp.${table_name}
        FOR VALUES FROM ('${start_date}') TO ('${end_date}');
        
        COMMENT ON TABLE erp.${partition_name} IS 'Partition for ${year_month}';
    "
    
    log "Successfully created partition: $partition_name"
}

# Function to create partitions for next N months
create_future_partitions() {
    local months_ahead="${1:-6}"
    
    log "Creating partitions for next $months_ahead months"
    
    for i in $(seq 0 $months_ahead); do
        # Calculate year and month
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS date command
            year_month=$(date -v+${i}m '+%Y_%m')
            start_date=$(date -v+${i}m '+%Y-%m-01')
            if [ $i -eq $months_ahead ]; then
                end_date=$(date -v+$((i+1))m '+%Y-%m-01')
            else
                end_date=$(date -v+$((i+1))m '+%Y-%m-01')
            fi
        else
            # Linux date command
            year_month=$(date -d "+${i} month" '+%Y_%m')
            start_date=$(date -d "+${i} month" '+%Y-%m-01')
            end_date=$(date -d "+$((i+1)) month" '+%Y-%m-01')
        fi
        
        # Create partitions for both tables
        create_partition "audit_logs_new" "$year_month" "$start_date" "$end_date"
        create_partition "inventory_movements" "$year_month" "$start_date" "$end_date"
    done
}

# Function to drop old partitions (older than N months)
cleanup_old_partitions() {
    local months_to_keep="${1:-12}"
    
    log "Cleaning up partitions older than $months_to_keep months"
    
    # Calculate cutoff date
    if [[ "$OSTYPE" == "darwin"* ]]; then
        cutoff_date=$(date -v-${months_to_keep}m '+%Y-%m-01')
        cutoff_year_month=$(date -v-${months_to_keep}m '+%Y_%m')
    else
        cutoff_date=$(date -d "-${months_to_keep} month" '+%Y-%m-01')
        cutoff_year_month=$(date -d "-${months_to_keep} month" '+%Y_%m')
    fi
    
    log "Cutoff date: $cutoff_date (${cutoff_year_month})"
    
    # Find and drop old partitions
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT 'DROP TABLE IF EXISTS erp.' || tablename || ';'
        FROM pg_tables 
        WHERE schemaname = 'erp' 
        AND (tablename LIKE 'audit_logs_new_%' OR tablename LIKE 'inventory_movements_%')
        AND tablename < 'audit_logs_new_${cutoff_year_month}'
        OR tablename < 'inventory_movements_${cutoff_year_month}';
    " | while read -r drop_statement; do
        if [[ -n "$drop_statement" && "$drop_statement" != " " ]]; then
            log "Executing: $drop_statement"
            PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$drop_statement"
        fi
    done
}

# Function to analyze partition usage
analyze_partitions() {
    log "Analyzing partition usage"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size('erp.' || tablename)) as size,
            (SELECT count(*) FROM pg_tables WHERE schemaname = 'erp' AND tablename LIKE tablename || '_%') as partition_count
        FROM pg_tables 
        WHERE schemaname = 'erp' 
        AND tablename IN ('audit_logs_new', 'inventory_movements')
        
        UNION ALL
        
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size('erp.' || tablename)) as size,
            0 as partition_count
        FROM pg_tables 
        WHERE schemaname = 'erp' 
        AND (tablename LIKE 'audit_logs_new_%' OR tablename LIKE 'inventory_movements_%')
        ORDER BY tablename;
    "
}

# Main function
main() {
    local action="${1:-help}"
    
    case "$action" in
        "create")
            local months="${2:-6}"
            create_future_partitions "$months"
            ;;
        "cleanup")
            local retention="${2:-12}"
            cleanup_old_partitions "$retention"
            ;;
        "analyze")
            analyze_partitions
            ;;
        "daily")
            # Daily maintenance routine
            log "Running daily partition maintenance"
            create_future_partitions 6
            cleanup_old_partitions 12
            analyze_partitions
            ;;
        "help"|*)
            echo "Usage: $0 {create|cleanup|analyze|daily} [params]"
            echo ""
            echo "Commands:"
            echo "  create [months]     - Create partitions for next N months (default: 6)"
            echo "  cleanup [retention] - Remove partitions older than N months (default: 12)"
            echo "  analyze            - Show partition usage statistics"
            echo "  daily              - Run daily maintenance (create + cleanup + analyze)"
            echo ""
            echo "Environment Variables:"
            echo "  DB_HOST     - Database host (default: localhost)"
            echo "  DB_PORT     - Database port (default: 5432)"
            echo "  DB_NAME     - Database name (default: erp_main)"
            echo "  DB_USER     - Database user (default: erp_admin)"
            echo "  DB_PASSWORD - Database password (default: Suji@123)"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
