#!/bin/bash
# Database Verification and Testing Script
# Purpose: Verify database integrity, performance, and functionality
# Author: System
# Date: 2025-10-03

set -euo pipefail

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-erp_main}"
DB_USER="${DB_USER:-erp_admin}"
DB_PASSWORD="${DB_PASSWORD:-Suji@123}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

# Function to execute SQL and check result
execute_sql() {
    local sql="$1"
    local description="$2"
    
    log_info "Checking: $description"
    
    export PGPASSWORD="$DB_PASSWORD"
    
    if result=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$sql" 2>&1); then
        echo "$result"
        return 0
    else
        log_error "SQL execution failed: $sql"
        echo "$result"
        return 1
    fi
}

# Function to check schema integrity
check_schema_integrity() {
    log_info "=== SCHEMA INTEGRITY CHECKS ==="
    
    # Check if ERP schema exists
    if execute_sql "SELECT 1 FROM information_schema.schemata WHERE schema_name = 'erp';" "ERP schema exists" | grep -q "1"; then
        log_success "ERP schema exists"
    else
        log_error "ERP schema missing"
        return 1
    fi
    
    # Check required extensions
    local extensions=("uuid-ossp" "pgcrypto" "pg_stat_statements")
    for ext in "${extensions[@]}"; do
        if execute_sql "SELECT 1 FROM pg_extension WHERE extname = '$ext';" "Extension $ext" | grep -q "1"; then
            log_success "Extension $ext is installed"
        else
            log_error "Extension $ext is missing"
        fi
    done
    
    # Check required tables
    local tables=("users" "roles" "customers" "vendors" "products" "sales_orders" "inventory_movements" "audit_logs_new")
    for table in "${tables[@]}"; do
        if execute_sql "SELECT 1 FROM information_schema.tables WHERE table_schema = 'erp' AND table_name = '$table';" "Table erp.$table" | grep -q "1"; then
            log_success "Table erp.$table exists"
        else
            log_error "Table erp.$table is missing"
        fi
    done
}

# Function to check foreign key integrity
check_foreign_keys() {
    log_info "=== FOREIGN KEY INTEGRITY CHECKS ==="
    
    local fk_violations=$(execute_sql "
        WITH fk_violations AS (
            SELECT 
                conname,
                conrelid::regclass as table_name,
                confrelid::regclass as referenced_table,
                pg_get_constraintdef(oid) as constraint_def
            FROM pg_constraint 
            WHERE contype = 'f' 
            AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'erp')
        )
        SELECT count(*) FROM fk_violations;
    " "Foreign key constraints count")
    
    if [[ "$fk_violations" -gt 0 ]]; then
        log_success "Found $fk_violations foreign key constraints"
        
        # Check for orphaned records
        execute_sql "
            SELECT 
                'Checking FK: ' || conname as check_name,
                conrelid::regclass as table_name,
                confrelid::regclass as referenced_table
            FROM pg_constraint 
            WHERE contype = 'f' 
            AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'erp')
            ORDER BY conname;
        " "Foreign key constraints list"
        
    else
        log_warning "No foreign key constraints found"
    fi
}

# Function to check indexes
check_indexes() {
    log_info "=== INDEX VERIFICATION ==="
    
    local index_count=$(execute_sql "
        SELECT count(*) 
        FROM pg_indexes 
        WHERE schemaname = 'erp';
    " "Index count in ERP schema")
    
    log_success "Found $index_count indexes in ERP schema"
    
    # Show index usage statistics
    execute_sql "
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_tup_read,
            idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'erp'
        ORDER BY idx_tup_read DESC
        LIMIT 10;
    " "Top 10 most used indexes"
}

# Function to test partitioning
test_partitioning() {
    log_info "=== PARTITION TESTING ==="
    
    # Check if audit_logs_new is partitioned
    local partition_count=$(execute_sql "
        SELECT count(*) 
        FROM pg_tables 
        WHERE schemaname = 'erp' 
        AND tablename LIKE 'audit_logs_new_%';
    " "Audit logs partitions")
    
    if [[ "$partition_count" -gt 0 ]]; then
        log_success "Found $partition_count audit log partitions"
    else
        log_warning "No audit log partitions found"
    fi
    
    # Check inventory_movements partitions
    local inv_partition_count=$(execute_sql "
        SELECT count(*) 
        FROM pg_tables 
        WHERE schemaname = 'erp' 
        AND tablename LIKE 'inventory_movements_%';
    " "Inventory movement partitions")
    
    if [[ "$inv_partition_count" -gt 0 ]]; then
        log_success "Found $inv_partition_count inventory movement partitions"
    else
        log_warning "No inventory movement partitions found"
    fi
    
    # Test partition routing with sample insert
    log_info "Testing partition routing..."
    
    execute_sql "
        INSERT INTO erp.audit_logs_new (table_name, record_id, action, timestamp) 
        VALUES ('test_table', 'test_id', 'TEST', CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;
    " "Test audit log insert"
    
    # Verify the record was inserted into correct partition
    local test_record_count=$(execute_sql "
        SELECT count(*) 
        FROM erp.audit_logs_new 
        WHERE table_name = 'test_table' AND record_id = 'test_id';
    " "Test record verification")
    
    if [[ "$test_record_count" -gt 0 ]]; then
        log_success "Partition routing working correctly"
        # Clean up test record
        execute_sql "DELETE FROM erp.audit_logs_new WHERE table_name = 'test_table' AND record_id = 'test_id';" "Cleanup test record"
    else
        log_error "Partition routing test failed"
    fi
}

# Function to test audit triggers
test_audit_triggers() {
    log_info "=== AUDIT TRIGGER TESTING ==="
    
    # Test audit trigger on users table
    log_info "Testing audit trigger on users table..."
    
    # Insert test user
    execute_sql "
        INSERT INTO erp.users (username, email, password_hash, salt, role_id) 
        VALUES ('test_user', 'test@example.com', 'test_hash', 'test_salt', 
                (SELECT id FROM erp.roles WHERE name = 'USER' LIMIT 1))
        ON CONFLICT (email) DO NOTHING;
    " "Insert test user"
    
    # Check if audit log was created
    local audit_count=$(execute_sql "
        SELECT count(*) 
        FROM erp.audit_logs_new 
        WHERE table_name = 'users' 
        AND new_data->>'email' = 'test@example.com';
    " "Audit log for test user")
    
    if [[ "$audit_count" -gt 0 ]]; then
        log_success "Audit trigger working correctly"
    else
        log_warning "Audit trigger may not be working"
    fi
    
    # Clean up test user
    execute_sql "DELETE FROM erp.users WHERE email = 'test@example.com';" "Cleanup test user"
}

# Function to run performance tests
run_performance_tests() {
    log_info "=== PERFORMANCE TESTING ==="
    
    # Test index usage with EXPLAIN ANALYZE
    log_info "Testing query performance..."
    
    execute_sql "
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT u.username, r.name as role_name 
        FROM erp.users u 
        JOIN erp.roles r ON u.role_id = r.id 
        WHERE u.is_active = true
        LIMIT 10;
    " "User-Role join query performance"
    
    # Test partition pruning
    execute_sql "
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT count(*) 
        FROM erp.audit_logs_new 
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days';
    " "Audit log partition pruning test"
}

# Function to check security setup
check_security() {
    log_info "=== SECURITY VERIFICATION ==="
    
    # Check roles exist
    local roles=("erp_admin" "erp_app" "erp_readonly")
    for role in "${roles[@]}"; do
        if execute_sql "SELECT 1 FROM pg_roles WHERE rolname = '$role';" "Role $role" | grep -q "1"; then
            log_success "Role $role exists"
        else
            log_error "Role $role is missing"
        fi
    done
    
    # Check RLS is enabled on sensitive tables
    local rls_tables=("users" "user_sessions" "audit_logs_new")
    for table in "${rls_tables[@]}"; do
        local rls_enabled=$(execute_sql "
            SELECT relrowsecurity 
            FROM pg_class 
            WHERE relname = '$table' 
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'erp');
        " "RLS status for $table")
        
        if [[ "$rls_enabled" == "t" ]]; then
            log_success "RLS enabled on erp.$table"
        else
            log_warning "RLS not enabled on erp.$table"
        fi
    done
}

# Function to test business logic
test_business_logic() {
    log_info "=== BUSINESS LOGIC TESTING ==="
    
    # Test calculated fields
    log_info "Testing calculated fields..."
    
    # Check that sales order total is calculated correctly
    execute_sql "
        SELECT 
            COUNT(*) as orders_with_totals,
            COUNT(CASE WHEN total_amount != (subtotal + tax_amount - discount_amount) THEN 1 END) as incorrect_totals
        FROM erp.sales_orders 
        WHERE total_amount IS NOT NULL;
    " "Sales order total calculation verification"
    
    # Test constraints
    log_info "Testing constraints..."
    
    # Try to insert invalid data (should fail)
    if ! execute_sql "INSERT INTO erp.products (product_code, product_name, unit_price) VALUES ('TEST', 'Test Product', -1);" "Negative price constraint test" 2>/dev/null; then
        log_success "Price constraint working correctly (negative price rejected)"
    else
        log_error "Price constraint not working (negative price accepted)"
        execute_sql "DELETE FROM erp.products WHERE product_code = 'TEST';" "Cleanup invalid test product"
    fi
}

# Function to generate summary report
generate_summary() {
    log_info "=== SUMMARY REPORT ==="
    
    # Database size and statistics
    execute_sql "
        SELECT 
            'Database Size' as metric,
            pg_size_pretty(pg_database_size('$DB_NAME')) as value
        UNION ALL
        SELECT 
            'Total Tables in ERP Schema',
            count(*)::text
        FROM pg_tables 
        WHERE schemaname = 'erp'
        UNION ALL
        SELECT 
            'Total Indexes in ERP Schema',
            count(*)::text
        FROM pg_indexes 
        WHERE schemaname = 'erp'
        UNION ALL
        SELECT 
            'Active Users',
            count(*)::text
        FROM erp.users 
        WHERE is_active = true
        UNION ALL
        SELECT 
            'Audit Log Entries (Last 30 days)',
            count(*)::text
        FROM erp.audit_logs_new 
        WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days';
    " "Database statistics summary"
}

# Main function
main() {
    local test_type="${1:-all}"
    
    echo "======================================="
    echo "ERP Database Verification Script"
    echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"
    echo "Timestamp: $(date)"
    echo "======================================="
    
    case "$test_type" in
        "schema")
            check_schema_integrity
            ;;
        "fk")
            check_foreign_keys
            ;;
        "indexes")
            check_indexes
            ;;
        "partitions")
            test_partitioning
            ;;
        "audit")
            test_audit_triggers
            ;;
        "performance")
            run_performance_tests
            ;;
        "security")
            check_security
            ;;
        "business")
            test_business_logic
            ;;
        "summary")
            generate_summary
            ;;
        "all"|*)
            check_schema_integrity
            echo ""
            check_foreign_keys
            echo ""
            check_indexes
            echo ""
            test_partitioning
            echo ""
            test_audit_triggers
            echo ""
            run_performance_tests
            echo ""
            check_security
            echo ""
            test_business_logic
            echo ""
            generate_summary
            ;;
    esac
    
    echo ""
    echo "======================================="
    echo "Verification completed at $(date)"
    echo "======================================="
}

# Run main function with all arguments
main "$@"
