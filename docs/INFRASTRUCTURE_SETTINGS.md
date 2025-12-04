# Infrastructure & DB Operational Settings

> International standard recommendations for production BISMAN ERP deployment.

## 1. Database Roles & Least Privilege

### Role Hierarchy

| Role | Purpose | Permissions |
|------|---------|-------------|
| `bisman_readonly` | Reports, analytics | SELECT only |
| `bisman_app` | Web/mobile app | SELECT, INSERT, UPDATE, DELETE on app tables |
| `bisman_admin` | Admin operations | All on app tables, limited on system tables |
| `bisman_dba` | Database admin | Superuser for migrations, maintenance |
| `svc_*` | Service accounts | Specific tables for each microservice |

### SQL Setup

```sql
-- Read-only role for reports
CREATE ROLE bisman_readonly LOGIN PASSWORD 'rotate-me';
GRANT CONNECT ON DATABASE bisman TO bisman_readonly;
GRANT USAGE ON SCHEMA public TO bisman_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO bisman_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO bisman_readonly;

-- App role for web/mobile
CREATE ROLE bisman_app LOGIN PASSWORD 'rotate-me';
GRANT CONNECT ON DATABASE bisman TO bisman_app;
GRANT USAGE ON SCHEMA public TO bisman_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bisman_app;
REVOKE ALL ON TABLE audit_logs_dml, security_events FROM bisman_app;
GRANT INSERT ON audit_logs_dml, security_events TO bisman_app;

-- Admin role
CREATE ROLE bisman_admin LOGIN PASSWORD 'rotate-me';
GRANT bisman_app TO bisman_admin;
GRANT DELETE ON audit_logs_dml TO bisman_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO bisman_admin;

-- Service-specific roles
CREATE ROLE svc_payments LOGIN PASSWORD 'rotate-me';
GRANT SELECT, INSERT, UPDATE ON payment_requests, payments TO svc_payments;
GRANT INSERT ON audit_logs_dml TO svc_payments;
```

### Credential Rotation

```bash
# Use HashiCorp Vault for secrets
vault kv put secret/bisman/db \
  readonly_password="$(openssl rand -base64 32)" \
  app_password="$(openssl rand -base64 32)" \
  admin_password="$(openssl rand -base64 32)"

# Rotate every 90 days
vault write database/rotate-root/bisman
```

---

## 2. Network Security

### Database Access

```yaml
# Only allow app subnets
# PostgreSQL pg_hba.conf
hostssl bisman  bisman_app     10.0.1.0/24    scram-sha-256
hostssl bisman  bisman_readonly 10.0.2.0/24   scram-sha-256
hostssl all     all            0.0.0.0/0      reject

# Kubernetes NetworkPolicy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-access
spec:
  podSelector:
    matchLabels:
      app: postgres
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: bisman-app
        - podSelector:
            matchLabels:
              app: bisman-backend
      ports:
        - port: 5432
```

### TLS Required

```sql
-- Force SSL connections
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/private/server.key';

-- Require SSL for all connections
-- In pg_hba.conf use 'hostssl' not 'host'
```

---

## 3. Encryption

### At-Rest Encryption

```yaml
# AWS RDS
aws rds modify-db-instance \
  --db-instance-identifier bisman-prod \
  --storage-encrypted \
  --kms-key-id alias/bisman-db-key

# GCP Cloud SQL
gcloud sql instances patch bisman-prod \
  --disk-encryption-key=projects/bisman/locations/global/keyRings/db/cryptoKeys/main

# Self-hosted: Use LUKS for disk encryption
cryptsetup luksFormat /dev/sdb
cryptsetup luksOpen /dev/sdb pg_data
```

### In-Transit Encryption

```javascript
// Node.js connection with SSL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt')
  }
});
```

---

## 4. Auditing & Logging

### pgAudit (if available)

```sql
-- Enable pgaudit
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Log all DML for app users
ALTER ROLE bisman_app SET pgaudit.log = 'write';
ALTER ROLE bisman_admin SET pgaudit.log = 'all';

-- Configure log settings
ALTER SYSTEM SET pgaudit.log_catalog = off;
ALTER SYSTEM SET pgaudit.log_parameter = on;
```

### DML Triggers (always enabled)

```sql
-- See migration 011_p2_auditing_monitoring.sql
-- Triggers capture:
-- - Table name, action (INSERT/UPDATE/DELETE)
-- - Old/new row data as JSONB
-- - DB user, app user ID
-- - Service name, client IP
-- - Query text
```

### Centralized Logging

```yaml
# Fluent Bit config for PostgreSQL logs
[INPUT]
    Name tail
    Path /var/log/postgresql/*.log
    Tag postgres

[OUTPUT]
    Name elasticsearch
    Match postgres
    Host elasticsearch.logging.svc
    Index postgres-logs
```

---

## 5. Backups & Recovery

### Backup Strategy

| Type | Frequency | Retention | Tool |
|------|-----------|-----------|------|
| Full backup | Daily | 30 days | pg_dump or pg_basebackup |
| WAL streaming | Continuous | 7 days | pg_receivewal |
| Point-in-time | On-demand | 90 days | pgBackRest |

### Backup Commands

```bash
# Daily full backup
pg_dump -Fc -f /backups/bisman_$(date +%Y%m%d).dump bisman

# Continuous WAL archiving
# In postgresql.conf
archive_mode = on
archive_command = 'pgbackrest --stanza=bisman archive-push %p'

# Test restore monthly
pg_restore -d bisman_test /backups/bisman_latest.dump
```

### Recovery Testing

```bash
#!/bin/bash
# Monthly restore test script

# Create test database
createdb bisman_restore_test

# Restore latest backup
pg_restore -d bisman_restore_test /backups/bisman_latest.dump

# Run verification queries
psql bisman_restore_test -c "SELECT COUNT(*) FROM clients"
psql bisman_restore_test -c "SELECT COUNT(*) FROM payment_requests"

# Drop test database
dropdb bisman_restore_test

echo "Restore test completed successfully"
```

---

## 6. High Availability

### Primary + Replicas

```yaml
# Docker Compose for local HA testing
services:
  postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./init-primary.sh:/docker-entrypoint-initdb.d/init.sh
    
  postgres-replica:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      REPLICATE_FROM: postgres-primary
    depends_on:
      - postgres-primary
```

### Read Replica Usage

```javascript
// Use replica for read-heavy queries
const readPool = new Pool({
  connectionString: process.env.DATABASE_REPLICA_URL,
  ssl: { rejectUnauthorized: true }
});

// Reports/analytics go to replica
async function getReportData() {
  return readPool.query('SELECT * FROM v_sales_summary');
}

// Writes go to primary
async function createPayment(data) {
  return primaryPool.query('INSERT INTO payments...');
}
```

---

## 7. Rate Limiting & WAF

### API Gateway Throttling

```yaml
# Kong rate limiting
plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: redis
      redis_host: redis
      
  - name: ip-restriction
    config:
      allow:
        - 10.0.0.0/8
        - 192.168.0.0/16
```

### WAF Rules

```yaml
# AWS WAF rules
Rules:
  - Name: SQLInjection
    Statement:
      SqliMatchStatement:
        FieldToMatch:
          Body: {}
        TextTransformations:
          - Priority: 0
            Type: URL_DECODE
    Action:
      Block: {}
      
  - Name: RateLimitAuth
    Statement:
      RateBasedStatement:
        Limit: 100
        AggregateKeyType: IP
        ScopeDownStatement:
          ByteMatchStatement:
            FieldToMatch:
              UriPath: {}
            PositionalConstraint: STARTS_WITH
            SearchString: "/api/auth"
    Action:
      Block: {}
```

---

## 8. Monitoring

### PostgreSQL Metrics

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Slow query detection
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Replication lag
SELECT client_addr, state, sent_lsn, write_lsn, 
       pg_wal_lsn_diff(sent_lsn, write_lsn) AS replication_lag
FROM pg_stat_replication;

-- Autovacuum stats
SELECT schemaname, relname, last_vacuum, last_autovacuum,
       vacuum_count, autovacuum_count
FROM pg_stat_user_tables
ORDER BY last_autovacuum DESC NULLS LAST;
```

### Prometheus Metrics

```yaml
# postgres_exporter config
DATA_SOURCE_NAME: "postgresql://monitor:password@localhost:5432/bisman?sslmode=require"

# Alert rules
groups:
  - name: postgres
    rules:
      - alert: HighReplicationLag
        expr: pg_replication_lag > 30
        for: 5m
        labels:
          severity: warning
          
      - alert: TooManyConnections
        expr: pg_stat_activity_count > 100
        for: 5m
        labels:
          severity: warning
          
      - alert: SlowQueries
        expr: pg_stat_statements_mean_exec_time_seconds > 1
        for: 10m
        labels:
          severity: warning
```

---

## 9. Checklist

### Pre-Production

- [ ] All DB roles created with least privilege
- [ ] Credentials in Vault, not in code
- [ ] SSL/TLS enforced for all connections
- [ ] Network policies restrict DB access
- [ ] Backup schedule configured and tested
- [ ] Monitoring and alerting enabled
- [ ] WAF rules deployed

### Ongoing

- [ ] Rotate credentials every 90 days
- [ ] Test backup restore monthly
- [ ] Review slow query logs weekly
- [ ] Check replication lag daily
- [ ] Review audit logs for anomalies
- [ ] Update security patches promptly

### Incident Response

- [ ] Unexpected DB user → Rotate all credentials
- [ ] Suspicious queries → Check audit logs, block IP
- [ ] Replication failure → Promote replica, investigate
- [ ] High connection count → Check for connection leaks

---

## 10. Files Reference

| File | Purpose |
|------|---------|
| `database/migrations/013_service_name_tracking.sql` | Service context tracking |
| `my-backend/routes/serviceTableUsage.js` | Service-table usage API |
| `my-backend/cache/services/permissionInvalidator.js` | Safe cache invalidation |
| `my-backend/jobs/cleanupJobs.js` | Background cleanup tasks |
| `database/scripts/bypass_detection_queries.sql` | Security audit queries |
