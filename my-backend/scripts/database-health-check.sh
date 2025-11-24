#!/bin/bash

################################################################################
# BISMAN ERP - Database Health Check System
################################################################################
# Comprehensive database health monitoring and alerting
#
# Features:
# - Connection health
# - Performance metrics
# - Disk usage monitoring
# - Query performance
# - Replication lag (if configured)
# - Table bloat detection
# - Index health
#
# Usage:
#   ./scripts/database-health-check.sh
#   ./scripts/database-health-check.sh --json  # JSON output
#   ./scripts/database-health-check.sh --alert # Send alerts if unhealthy
#
# Cron setup (every 5 minutes):
#   */5 * * * * /path/to/database-health-check.sh --alert >> /var/log/db-health.log 2>&1
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

# Health check thresholds
MAX_CONNECTIONS_PCT=80
MAX_DISK_USAGE_PCT=85
MAX_CACHE_HIT_RATIO_PCT=90
MAX_ACTIVE_CONNECTIONS=50
MAX_IDLE_IN_TRANSACTION_SEC=300
MAX_TABLE_BLOAT_PCT=30

# Output format
OUTPUT_JSON=false
SEND_ALERTS=false
HEALTH_STATUS="HEALTHY"
HEALTH_ISSUES=()

# Parse arguments
for arg in "$@"; do
    case $arg in
        --json) OUTPUT_JSON=true ;;
        --alert) SEND_ALERTS=true ;;
    esac
done

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log() { 
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    fi
}

log_success() { 
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
    fi
}

log_error() { 
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
    fi
}

log_warning() { 
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1"
    fi
}

add_issue() {
    HEALTH_STATUS="UNHEALTHY"
    HEALTH_ISSUES+=("$1")
    log_error "$1"
}

# Execute SQL query
execute_query() {
    local query=$1
    export PGPASSWORD="$DB_PASSWORD"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$query" 2>/dev/null | xargs || echo "ERROR"
}

# ============================================================================
# HEALTH CHECKS
# ============================================================================

# Check 1: Database connectivity
check_connectivity() {
    log "Checking database connectivity..."
    
    if execute_query "SELECT 1;" &> /dev/null; then
        log_success "Database is reachable"
        return 0
    else
        add_issue "Cannot connect to database"
        return 1
    fi
}

# Check 2: Database size and disk usage
check_disk_usage() {
    log "Checking disk usage..."
    
    local db_size=$(execute_query "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    local db_size_bytes=$(execute_query "SELECT pg_database_size('$DB_NAME');")
    
    log "Database size: $db_size"
    
    # Check available disk space (macOS compatible)
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt "$MAX_DISK_USAGE_PCT" ]; then
        add_issue "Disk usage too high: ${disk_usage}%"
    else
        log_success "Disk usage OK: ${disk_usage}%"
    fi
    
    echo "$db_size|$db_size_bytes|$disk_usage"
}

# Check 3: Connection pool status
check_connections() {
    log "Checking connection pool..."
    
    local max_connections=$(execute_query "SHOW max_connections;")
    local active_connections=$(execute_query "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';")
    local idle_connections=$(execute_query "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle';")
    local total_connections=$(execute_query "SELECT COUNT(*) FROM pg_stat_activity;")
    
    local connection_pct=$((total_connections * 100 / max_connections))
    
    log "Connections: $total_connections / $max_connections ($connection_pct%)"
    log "Active: $active_connections, Idle: $idle_connections"
    
    if [ "$connection_pct" -gt "$MAX_CONNECTIONS_PCT" ]; then
        add_issue "Connection pool usage too high: ${connection_pct}%"
    else
        log_success "Connection pool OK"
    fi
    
    if [ "$active_connections" -gt "$MAX_ACTIVE_CONNECTIONS" ]; then
        add_issue "Too many active connections: $active_connections"
    fi
    
    echo "$max_connections|$total_connections|$active_connections|$idle_connections|$connection_pct"
}

# Check 4: Cache hit ratio
check_cache_performance() {
    log "Checking cache performance..."
    
    local cache_hit_ratio=$(execute_query "
        SELECT ROUND(
            (sum(blks_hit) / NULLIF(sum(blks_hit + blks_read), 0) * 100)::numeric, 2
        )
        FROM pg_stat_database
        WHERE datname = '$DB_NAME';
    ")
    
    if [ "$cache_hit_ratio" = "ERROR" ] || [ -z "$cache_hit_ratio" ]; then
        cache_hit_ratio=0
    fi
    
    log "Cache hit ratio: ${cache_hit_ratio}%"
    
    if (( $(echo "$cache_hit_ratio < $MAX_CACHE_HIT_RATIO_PCT" | bc -l) )); then
        add_issue "Cache hit ratio too low: ${cache_hit_ratio}%"
    else
        log_success "Cache performance OK"
    fi
    
    echo "$cache_hit_ratio"
}

# Check 5: Long-running queries
check_long_queries() {
    log "Checking for long-running queries..."
    
    local long_queries=$(execute_query "
        SELECT COUNT(*)
        FROM pg_stat_activity
        WHERE state = 'active'
          AND query NOT LIKE '%pg_stat_activity%'
          AND (now() - query_start) > interval '5 minutes';
    ")
    
    if [ "$long_queries" -gt 0 ]; then
        add_issue "Found $long_queries long-running queries (>5min)"
        
        # Get details of long queries
        execute_query "
            SELECT pid, (now() - query_start) as duration, query
            FROM pg_stat_activity
            WHERE state = 'active'
              AND query NOT LIKE '%pg_stat_activity%'
              AND (now() - query_start) > interval '5 minutes'
            LIMIT 5;
        " | while read -r line; do
            log_warning "Long query: $line"
        done
    else
        log_success "No long-running queries"
    fi
    
    echo "$long_queries"
}

# Check 6: Idle in transaction
check_idle_in_transaction() {
    log "Checking for idle transactions..."
    
    local idle_in_tx=$(execute_query "
        SELECT COUNT(*)
        FROM pg_stat_activity
        WHERE state = 'idle in transaction'
          AND (now() - state_change) > interval '$MAX_IDLE_IN_TRANSACTION_SEC seconds';
    ")
    
    if [ "$idle_in_tx" -gt 0 ]; then
        add_issue "Found $idle_in_tx idle transactions"
    else
        log_success "No stuck idle transactions"
    fi
    
    echo "$idle_in_tx"
}

# Check 7: Table bloat
check_table_bloat() {
    log "Checking table bloat..."
    
    local bloated_tables=$(execute_query "
        SELECT COUNT(*)
        FROM pg_stat_user_tables
        WHERE n_dead_tup > (n_live_tup * 0.3);
    ")
    
    if [ "$bloated_tables" -gt 0 ]; then
        add_issue "Found $bloated_tables tables with high bloat"
        log_warning "Run VACUUM ANALYZE to clean up"
    else
        log_success "Table bloat within acceptable limits"
    fi
    
    echo "$bloated_tables"
}

# Check 8: Index usage
check_index_usage() {
    log "Checking index usage..."
    
    local unused_indexes=$(execute_query "
        SELECT COUNT(*)
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND schemaname = 'public';
    ")
    
    if [ "$unused_indexes" -gt 0 ]; then
        log_warning "Found $unused_indexes unused indexes"
    else
        log_success "All indexes are being used"
    fi
    
    echo "$unused_indexes"
}

# Check 9: Replication lag (if configured)
check_replication() {
    log "Checking replication status..."
    
    local replication_count=$(execute_query "
        SELECT COUNT(*) FROM pg_stat_replication;
    ")
    
    if [ "$replication_count" -gt 0 ]; then
        local max_lag=$(execute_query "
            SELECT COALESCE(EXTRACT(EPOCH FROM MAX(now() - backend_start)), 0)
            FROM pg_stat_replication;
        ")
        log "Replication lag: ${max_lag}s"
        
        if (( $(echo "$max_lag > 60" | bc -l) )); then
            add_issue "Replication lag too high: ${max_lag}s"
        else
            log_success "Replication OK"
        fi
    else
        log "No replication configured"
        max_lag=0
    fi
    
    echo "$max_lag"
}

# Check 10: Transaction ID wraparound
check_transaction_wraparound() {
    log "Checking transaction ID wraparound..."
    
    local oldest_tx=$(execute_query "
        SELECT age(datfrozenxid) 
        FROM pg_database 
        WHERE datname = '$DB_NAME';
    ")
    
    local max_age=2000000000  # 2 billion
    local warning_age=1500000000  # 1.5 billion
    
    if [ "$oldest_tx" -gt "$warning_age" ]; then
        add_issue "Transaction ID approaching wraparound: $oldest_tx"
        log_warning "Run VACUUM FREEZE soon!"
    else
        log_success "Transaction ID OK: $oldest_tx"
    fi
    
    echo "$oldest_tx"
}

# ============================================================================
# OUTPUT FUNCTIONS
# ============================================================================

output_json() {
    local db_info=$1
    local conn_info=$2
    local cache_hit=$3
    local long_queries=$4
    local idle_tx=$5
    local bloated=$6
    local unused_idx=$7
    local repl_lag=$8
    local tx_age=$9
    
    IFS='|' read -r db_size db_size_bytes disk_usage <<< "$db_info"
    IFS='|' read -r max_conn total_conn active_conn idle_conn conn_pct <<< "$conn_info"
    
    local issues_json=$(printf '%s\n' "${HEALTH_ISSUES[@]}" | jq -R . | jq -s .)
    
    cat <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "$HEALTH_STATUS",
  "issues": $issues_json,
  "metrics": {
    "database": {
      "name": "$DB_NAME",
      "size": "$db_size",
      "size_bytes": $db_size_bytes,
      "disk_usage_pct": $disk_usage
    },
    "connections": {
      "max": $max_conn,
      "total": $total_conn,
      "active": $active_conn,
      "idle": $idle_conn,
      "usage_pct": $conn_pct
    },
    "performance": {
      "cache_hit_ratio_pct": $cache_hit,
      "long_running_queries": $long_queries,
      "idle_in_transaction": $idle_tx
    },
    "maintenance": {
      "bloated_tables": $bloated,
      "unused_indexes": $unused_idx,
      "transaction_age": $tx_age
    },
    "replication": {
      "lag_seconds": $repl_lag
    }
  }
}
EOF
}

output_text() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     📊 DATABASE HEALTH REPORT                        ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [ "$HEALTH_STATUS" = "HEALTHY" ]; then
        echo -e "${GREEN}Status: ✓ HEALTHY${NC}"
    else
        echo -e "${RED}Status: ✗ UNHEALTHY${NC}"
        echo ""
        echo -e "${RED}Issues found:${NC}"
        for issue in "${HEALTH_ISSUES[@]}"; do
            echo -e "${RED}  • $issue${NC}"
        done
    fi
    
    echo ""
    echo -e "${BLUE}Timestamp:${NC} $(date)"
    echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    if [ "$OUTPUT_JSON" = false ]; then
        echo -e "${BLUE}"
        echo "╔═══════════════════════════════════════════════════════╗"
        echo "║     🏥 BISMAN ERP - Database Health Check           ║"
        echo "╚═══════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo ""
    fi
    
    # Run all health checks
    check_connectivity || exit 1
    
    local db_info=$(check_disk_usage)
    local conn_info=$(check_connections)
    local cache_hit=$(check_cache_performance)
    local long_queries=$(check_long_queries)
    local idle_tx=$(check_idle_in_transaction)
    local bloated=$(check_table_bloat)
    local unused_idx=$(check_index_usage)
    local repl_lag=$(check_replication)
    local tx_age=$(check_transaction_wraparound)
    
    # Output results
    if [ "$OUTPUT_JSON" = true ]; then
        output_json "$db_info" "$conn_info" "$cache_hit" "$long_queries" \
            "$idle_tx" "$bloated" "$unused_idx" "$repl_lag" "$tx_age"
    else
        output_text
    fi
    
    # Send alerts if configured
    if [ "$SEND_ALERTS" = true ] && [ "$HEALTH_STATUS" = "UNHEALTHY" ]; then
        # TODO: Implement alerting (email, Slack, etc.)
        log_warning "Alerts would be sent (not implemented yet)"
    fi
    
    # Exit with appropriate code
    if [ "$HEALTH_STATUS" = "HEALTHY" ]; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
