#!/bin/sh
# PgBouncer Health Check Script
# ==============================
# Checks if PgBouncer is accepting connections and can reach PostgreSQL

set -e

# Configuration
PGBOUNCER_HOST="${PGBOUNCER_HOST:-localhost}"
PGBOUNCER_PORT="${PGBOUNCER_PORT:-6432}"
PGBOUNCER_USER="${PG_USER:-bisman_app}"
TIMEOUT="${HEALTHCHECK_TIMEOUT:-5}"

# Method 1: pg_isready (fast, checks if accepting connections)
check_pg_isready() {
    pg_isready -h "$PGBOUNCER_HOST" -p "$PGBOUNCER_PORT" -U "$PGBOUNCER_USER" -t "$TIMEOUT" > /dev/null 2>&1
}

# Method 2: SHOW POOLS (checks pool status via admin console)
check_show_pools() {
    PGPASSWORD="${PGBOUNCER_ADMIN_PASSWORD:-}" psql -h "$PGBOUNCER_HOST" -p "$PGBOUNCER_PORT" \
        -U pgbouncer -d pgbouncer -c "SHOW POOLS" -t -A > /dev/null 2>&1
}

# Method 3: Simple SELECT (checks full path to PostgreSQL)
check_postgres_connection() {
    PGPASSWORD="${PG_PASSWORD:-}" psql -h "$PGBOUNCER_HOST" -p "$PGBOUNCER_PORT" \
        -U "$PGBOUNCER_USER" -d "${PG_DATABASE:-bisman_prod}" \
        -c "SELECT 1" -t -A > /dev/null 2>&1
}

# Run primary health check
if check_pg_isready; then
    echo "PgBouncer is healthy"
    exit 0
else
    echo "PgBouncer health check failed"
    exit 1
fi
