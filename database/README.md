# ERP Database Implementation Runbook

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation & Setup](#installation--setup)
4. [Backup & Restore](#backup--restore)
5. [Monitoring](#monitoring)
6. [Maintenance](#maintenance)
7. [Security](#security)
8. [Troubleshooting](#troubleshooting)
9. [Migration Management](#migration-management)

## Overview

This runbook provides complete operational procedures for the production-ready PostgreSQL ERP database system. The implementation includes:

- **Complete ERP Schema**: Financial, customer, vendor, product, and transaction management
- **Security**: Role-based access control (RBAC) with row-level security
- **Performance**: Optimized indexes and partitioned tables
- **Operations**: Automated backup, monitoring, and maintenance scripts
- **Audit**: Comprehensive audit logging with partitioning

## Architecture

### Database Structure
```
Database: erp_main
├── Schema: erp (main business schema)
├── Schema: public (legacy compatibility)
└── Extensions: uuid-ossp, pgcrypto, pg_stat_statements
```

### Core Tables
- **Master Data**: chart_of_accounts, currency, customers, vendors, products
- **Transactions**: sales_orders, purchase_orders, inventory_movements
- **System**: users, roles, user_sessions, audit_logs_new
- **Petrol Pump**: companies, departments, pumps, tanks, fuel_types

### Partitioned Tables
- `audit_logs_new` - Monthly partitions for audit trail
- `inventory_movements` - Monthly partitions for stock movements

## Installation & Setup

### Prerequisites
- PostgreSQL 13+ (tested with PostgreSQL 17)
- pgAdmin 4 (optional, for GUI management)
- Docker & Docker Compose (for containerized deployment)

### Initial Setup

1. **Start the database services:**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
docker-compose up -d postgres pgadmin
```

2. **Run the complete schema migration:**
```bash
# Apply main schema
PGPASSWORD="Suji@123" psql -h localhost -p 5432 -U erp_admin -d erp_main -f database/migrations/001_complete_erp_schema.sql

# Apply security setup
PGPASSWORD="Suji@123" psql -h localhost -p 5432 -U erp_admin -d erp_main -f database/migrations/002_security_rbac.sql
```

3. **Create initial partitions:**
```bash
./database/scripts/partition-management.sh create 12
```

4. **Verify installation:**
```bash
./database/scripts/verify-database.sh all
```

### Environment Variables
```bash
# Database Connection
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="erp_main"
export DB_USER="erp_admin"
export DB_PASSWORD="Suji@123"

# Backup Configuration
export BACKUP_DIR="/var/backups/postgresql"
export RETENTION_DAYS="30"
```

## Backup & Restore

### Automated Backup Schedule

#### Daily Backup (Recommended)
```bash
# Add to crontab for daily 2 AM backup
0 2 * * * /path/to/database/scripts/backup-restore.sh daily
```

#### Weekly Full Backup with Maintenance
```bash
# Add to crontab for weekly Sunday 1 AM maintenance
0 1 * * 0 /path/to/database/scripts/backup-restore.sh weekly
```

### Manual Backup Operations

#### Create Full Backup
```bash
./database/scripts/backup-restore.sh full
```

#### Create Schema-Only Backup
```bash
./database/scripts/backup-restore.sh schema
```

#### Create Data-Only Backup
```bash
./database/scripts/backup-restore.sh data
```

### Restore Operations

#### Restore from Full Backup
```bash
./database/scripts/backup-restore.sh restore /var/backups/postgresql/erp_full_20251003_120000.sql.gz CONFIRM
```

#### Quick Restore (Latest)
```bash
./database/scripts/backup-restore.sh restore /var/backups/postgresql/erp_latest_full.sql.gz CONFIRM
```

### Backup Verification
```bash
# Check backup status and disk usage
./database/scripts/backup-restore.sh status

# Monitor backup logs
tail -f /var/backups/postgresql/backup.log
```

## Monitoring

### Database Health Monitoring

#### Real-time Monitoring
```bash
./database/scripts/backup-restore.sh monitor
```

#### Performance Metrics
```sql
-- Connection monitoring
SELECT datname, usename, client_addr, state, query_start
FROM pg_stat_activity 
WHERE datname = 'erp_main';

-- Query performance (requires pg_stat_statements)
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements 
ORDER BY total_exec_time DESC LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'erp' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Partition Monitoring
```bash
# Analyze partition usage
./database/scripts/partition-management.sh analyze

# Check partition health
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size('erp.' || tablename)) as size
FROM pg_tables 
WHERE schemaname = 'erp' 
AND (tablename LIKE 'audit_logs_new_%' OR tablename LIKE 'inventory_movements_%')
ORDER BY tablename;
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Database Size | 80% of disk | 90% of disk |
| Connection Count | 80% of max | 95% of max |
| Query Duration | > 30 seconds | > 60 seconds |
| Partition Age | > 6 months | > 12 months |

## Maintenance

### Daily Maintenance Tasks

1. **Automated (via cron):**
   - Full database backup
   - Cleanup old backups
   - Partition creation (future months)

2. **Manual verification:**
```bash
# Check database integrity
./database/scripts/verify-database.sh schema

# Monitor active connections
./database/scripts/backup-restore.sh monitor
```

### Weekly Maintenance Tasks

1. **Automated (via cron):**
   - VACUUM and ANALYZE
   - Schema backup
   - Partition cleanup

2. **Manual tasks:**
```bash
# Run comprehensive verification
./database/scripts/verify-database.sh all

# Check index usage
./database/scripts/verify-database.sh indexes

# Review audit logs
SELECT table_name, action, count(*) 
FROM erp.audit_logs_new 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY table_name, action 
ORDER BY count(*) DESC;
```

### Monthly Maintenance Tasks

1. **Partition Management:**
```bash
# Create partitions for next 6 months
./database/scripts/partition-management.sh create 6

# Remove partitions older than 12 months
./database/scripts/partition-management.sh cleanup 12
```

2. **Performance Review:**
```bash
# Analyze query performance
./database/scripts/verify-database.sh performance

# Review slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 1000  -- queries taking more than 1 second
ORDER BY mean_exec_time DESC;
```

### Reindexing (Quarterly)
```bash
# Enable force reindex for maintenance
FORCE_REINDEX=true ./database/scripts/backup-restore.sh maintenance
```

## Security

### Role Management

#### Database Roles
- **erp_admin**: Full administrative access
- **erp_app**: Application role with CRUD access
- **erp_readonly**: Read-only access for reporting

#### Role Permissions
```sql
-- Check role permissions
SELECT r.rolname, r.rolcanlogin, r.rolcreatedb, r.rolcreaterole
FROM pg_roles r 
WHERE r.rolname LIKE 'erp_%';

-- Check table permissions
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'erp' AND grantee LIKE 'erp_%';
```

### Row Level Security (RLS)

#### Enabled Tables
- `erp.users` - Users can only see their own data or admin can see all
- `erp.user_sessions` - Session isolation
- `erp.audit_logs_new` - Admin/auditor only access

#### Security Context Setup
```sql
-- Set user context for audit trails
SELECT erp.set_app_context(
    'user-uuid-here'::UUID,
    'session-token-here',
    '192.168.1.100'::INET,
    'Mozilla/5.0...'
);
```

### Password Security
- Passwords stored as bcrypt hashes with salt
- Password change tracking in audit logs
- Account lockout after failed attempts

### SSL/TLS Configuration

#### Connection String (Production)
```
postgresql://erp_app:SecureAppPassword2025!@db.company.com:5432/erp_main?sslmode=require&sslcert=client.crt&sslkey=client.key&sslrootcert=ca.crt
```

#### PgBouncer Configuration
```ini
[databases]
erp_main = host=localhost port=5432 dbname=erp_main

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 25
server_check_delay = 30
```

## Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check connection
PGPASSWORD="Suji@123" psql -h localhost -p 5432 -U erp_admin -d erp_main -c "SELECT 1;"

# Check active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

#### Performance Issues
```bash
# Identify slow queries
./database/scripts/verify-database.sh performance

# Check for table bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables WHERE schemaname = 'erp'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Partition Issues
```bash
# Check partition constraint violations
SELECT conname, conrelid::regclass 
FROM pg_constraint 
WHERE contype = 'c' AND NOT convalidated;

# Verify partition pruning
EXPLAIN (ANALYZE, BUFFERS) 
SELECT count(*) FROM erp.audit_logs_new 
WHERE timestamp >= '2025-10-01';
```

#### Audit Issues
```bash
# Test audit triggers
./database/scripts/verify-database.sh audit

# Check audit log completeness
SELECT table_name, 
       count(*) as audit_entries,
       min(timestamp) as oldest,
       max(timestamp) as newest
FROM erp.audit_logs_new 
GROUP BY table_name 
ORDER BY count(*) DESC;
```

### Recovery Procedures

#### Database Corruption
1. Stop application connections
2. Run integrity check: `./database/scripts/verify-database.sh schema`
3. If corruption detected, restore from latest backup
4. Replay any missing transactions from WAL

#### Partition Problems
1. Check partition constraints: `./database/scripts/verify-database.sh partitions`
2. Recreate missing partitions: `./database/scripts/partition-management.sh create 1`
3. Move misplaced data if necessary

#### Performance Degradation
1. Update statistics: `ANALYZE;`
2. Check for missing indexes: `./database/scripts/verify-database.sh indexes`
3. Consider reindexing: `REINDEX DATABASE erp_main;`

## Migration Management

### Applying New Migrations

1. **Test in development first**
2. **Create backup before migration**
3. **Apply migration with rollback ready**

```bash
# Backup before migration
./database/scripts/backup-restore.sh full

# Apply migration
PGPASSWORD="Suji@123" psql -h localhost -p 5432 -U erp_admin -d erp_main -f database/migrations/new_migration.sql

# Verify migration
./database/scripts/verify-database.sh all
```

### Rollback Procedures

```bash
# Rollback security changes
PGPASSWORD="Suji@123" psql -h localhost -p 5432 -U erp_admin -d erp_main -f database/migrations/002_security_rbac_rollback.sql

# Rollback schema changes
PGPASSWORD="Suji@123" psql -h localhost -p 5432 -U erp_admin -d erp_main -f database/migrations/001_complete_erp_schema_rollback.sql

# Restore from backup if needed
./database/scripts/backup-restore.sh restore /var/backups/postgresql/erp_latest_full.sql.gz CONFIRM
```

### Version Control
- All migrations stored in `database/migrations/`
- Rollback scripts provided for each migration
- Migration log maintained in `database/migration_log.txt`

---

## Contact & Support

For database issues or questions:
- Review this runbook first
- Check monitoring dashboards
- Examine recent logs in `/var/backups/postgresql/backup.log`
- Use verification scripts for diagnostics

**Emergency Contacts:**
- Database Administrator: [Contact Info]
- Application Team: [Contact Info]
- Infrastructure Team: [Contact Info]
