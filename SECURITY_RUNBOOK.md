# BISMAN ERP Security Runbook

> Emergency procedures and operational guidelines for security incidents.

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Classification:** INTERNAL - Engineering Team Only

---

## Table of Contents

1. [Quick Reference Commands](#quick-reference-commands)
2. [Incident Response](#incident-response)
3. [Unauthorized Database Access](#unauthorized-database-access)
4. [Rotating Database Credentials](#rotating-database-credentials)
5. [Rotating Redis Caches](#rotating-redis-caches)
6. [Backup & Restore](#backup--restore)
7. [Testing RLS & Audit Triggers](#testing-rls--audit-triggers)
8. [Escalation Contacts](#escalation-contacts)

---

## Quick Reference Commands

### Health Checks

```bash
# Security smoke test
DATABASE_URL="$PROD_DB_URL" REDIS_URL="$PROD_REDIS_URL" \
  node tools/securitySmokeTest.js

# Verify migrations
psql $DATABASE_URL -f tools/verify_migrations.sql

# Check RLS status
psql $DATABASE_URL -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('users', 'payment_requests', 'clients');"

# Check audit log entries (last hour)
psql $DATABASE_URL -c "SELECT table_name, operation, COUNT(*) FROM audit_logs_dml WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY 1,2;"

# Check active sessions
redis-cli -u $REDIS_URL KEYS "session:user:*" | wc -l

# Check permission cache keys
redis-cli -u $REDIS_URL KEYS "perm:user:*" | wc -l
```

### Emergency Actions

```bash
# Invalidate ALL user sessions (forces re-login)
redis-cli -u $REDIS_URL KEYS "session:*" | xargs redis-cli -u $REDIS_URL DEL

# Invalidate ALL permission caches
redis-cli -u $REDIS_URL PUBLISH "permissions:invalidate" '{"type":"all","reason":"emergency"}'

# Disable specific user immediately
psql $DATABASE_URL -c "UPDATE users_enhanced SET is_active = false WHERE id = '<user_id>';"
psql $DATABASE_URL -c "UPDATE user_sessions SET is_active = false WHERE user_id = '<user_id>';"

# Force password reset for user
psql $DATABASE_URL -c "UPDATE users_enhanced SET must_reset_password = true WHERE id = '<user_id>';"
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **SEV1** | Active breach, data exfiltration | Immediate | CTO + Legal |
| **SEV2** | Unauthorized access detected | < 15 min | Security Lead |
| **SEV3** | Suspicious activity | < 1 hour | On-call Engineer |
| **SEV4** | Audit finding, potential issue | < 24 hours | Team Lead |

### Initial Response Checklist

- [ ] **ASSESS**: Determine severity and scope
- [ ] **CONTAIN**: Isolate affected systems if needed
- [ ] **DOCUMENT**: Start incident log with timestamps
- [ ] **NOTIFY**: Escalate per severity level
- [ ] **INVESTIGATE**: Gather evidence before making changes
- [ ] **REMEDIATE**: Apply fixes
- [ ] **VERIFY**: Confirm issue is resolved
- [ ] **POSTMORTEM**: Document lessons learned

---

## Unauthorized Database Access

### Detection

Check for signs of unauthorized access:

```bash
# Check recent failed login attempts
psql $DATABASE_URL << 'EOF'
SELECT 
    user_id,
    ip_address,
    user_agent,
    created_at,
    failure_reason
FROM login_attempts
WHERE success = false
    AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 50;
EOF

# Check unusual query patterns in audit logs
psql $DATABASE_URL << 'EOF'
SELECT 
    service_name,
    user_id,
    table_name,
    operation,
    COUNT(*) as count
FROM audit_logs_dml
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1, 2, 3, 4
HAVING COUNT(*) > 100
ORDER BY count DESC;
EOF

# Check for direct DB connections (bypassing app)
psql $DATABASE_URL << 'EOF'
SELECT 
    usename,
    client_addr,
    application_name,
    backend_start,
    state
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY backend_start DESC;
EOF
```

### Containment

```bash
# 1. Terminate suspicious connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = 'suspicious_user';"

# 2. Revoke access immediately
psql $DATABASE_URL << 'EOF'
REVOKE CONNECT ON DATABASE bisman FROM suspicious_user;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM suspicious_user;
ALTER USER suspicious_user NOLOGIN;
EOF

# 3. Force all sessions to re-authenticate
redis-cli -u $REDIS_URL FLUSHDB  # CAUTION: Clears all Redis data

# 4. Enable enhanced logging
psql $DATABASE_URL -c "ALTER SYSTEM SET log_statement = 'all';"
psql $DATABASE_URL -c "SELECT pg_reload_conf();"
```

### Investigation

```bash
# Export audit logs for analysis
psql $DATABASE_URL << 'EOF'
\COPY (
    SELECT * FROM audit_logs_dml 
    WHERE created_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at
) TO '/tmp/audit_export.csv' WITH CSV HEADER;
EOF

# Check what data was accessed
psql $DATABASE_URL << 'EOF'
SELECT 
    table_name,
    operation,
    row_id,
    user_id,
    ip_address,
    created_at
FROM audit_logs_dml
WHERE user_id = '<suspicious_user_id>'
ORDER BY created_at DESC
LIMIT 500;
EOF
```

---

## Rotating Database Credentials

### When to Rotate

- Scheduled rotation (every 90 days recommended)
- After personnel change
- After suspected compromise
- After security audit findings

### Rotation Procedure

#### Step 1: Generate New Credentials

```bash
# Generate secure passwords
NEW_BACKEND_PASS=$(openssl rand -base64 32)
NEW_FRONTEND_PASS=$(openssl rand -base64 32)
NEW_WORKER_PASS=$(openssl rand -base64 32)
NEW_MIGRATOR_PASS=$(openssl rand -base64 32)

echo "Backend:  $NEW_BACKEND_PASS"
echo "Frontend: $NEW_FRONTEND_PASS"
echo "Worker:   $NEW_WORKER_PASS"
echo "Migrator: $NEW_MIGRATOR_PASS"
```

#### Step 2: Update Database Roles

```sql
-- Run as superuser
ALTER USER bisman_backend WITH PASSWORD 'NEW_BACKEND_PASS';
ALTER USER bisman_frontend WITH PASSWORD 'NEW_FRONTEND_PASS';
ALTER USER bisman_worker WITH PASSWORD 'NEW_WORKER_PASS';
ALTER USER bisman_migrator WITH PASSWORD 'NEW_MIGRATOR_PASS';
```

#### Step 3: Update Secrets Manager

```bash
# HashiCorp Vault
vault kv put secret/bisman/production \
  DATABASE_URL="postgresql://bisman_backend:$NEW_BACKEND_PASS@host:5432/bisman" \
  WORKER_DATABASE_URL="postgresql://bisman_worker:$NEW_WORKER_PASS@host:5432/bisman"

# AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id bisman/production/database \
  --secret-string "{\"password\":\"$NEW_BACKEND_PASS\"}"

# Kubernetes Secret
kubectl create secret generic bisman-db-credentials \
  --from-literal=password="$NEW_BACKEND_PASS" \
  --dry-run=client -o yaml | kubectl apply -f -
```

#### Step 4: Rolling Restart

```bash
# Kubernetes
kubectl rollout restart deployment/bisman-backend
kubectl rollout restart deployment/bisman-worker

# PM2
pm2 reload all

# Docker Compose
docker-compose up -d --no-deps backend worker
```

#### Step 5: Verify

```bash
# Test new credentials
psql "postgresql://bisman_backend:$NEW_BACKEND_PASS@host:5432/bisman" -c "SELECT 1;"

# Check application health
curl -s https://api.example.com/health | jq .

# Monitor for errors
kubectl logs -f deployment/bisman-backend --tail=100 | grep -i error
```

---

## Rotating Redis Caches

### Full Cache Invalidation

```bash
# Option 1: Publish invalidation (graceful)
redis-cli -u $REDIS_URL PUBLISH "permissions:invalidate" '{"type":"all","reason":"rotation"}'
redis-cli -u $REDIS_URL PUBLISH "sessions:invalidate" '{"type":"all","reason":"rotation"}'
redis-cli -u $REDIS_URL PUBLISH "cache:invalidate" '{"type":"all","reason":"rotation"}'

# Option 2: Clear specific namespaces
redis-cli -u $REDIS_URL --scan --pattern "perm:*" | xargs -r redis-cli -u $REDIS_URL DEL
redis-cli -u $REDIS_URL --scan --pattern "session:*" | xargs -r redis-cli -u $REDIS_URL DEL
redis-cli -u $REDIS_URL --scan --pattern "cache:*" | xargs -r redis-cli -u $REDIS_URL DEL

# Option 3: Complete flush (DANGER - affects all data)
redis-cli -u $REDIS_URL FLUSHDB
```

### Rotating Redis Password

```bash
# 1. Update Redis password
redis-cli -u $REDIS_URL CONFIG SET requirepass "new_password"

# 2. Authenticate with new password
redis-cli -u "redis://:new_password@host:6379" PING

# 3. Update application config and restart
# Update REDIS_URL in secrets manager
# Rolling restart as shown above

# 4. Make password persistent
redis-cli -u "redis://:new_password@host:6379" CONFIG REWRITE
```

---

## Backup & Restore

### Create Backup

```bash
# Full database backup
pg_dump $DATABASE_URL \
  --format=custom \
  --compress=9 \
  --file="bisman_backup_$(date +%Y%m%d_%H%M%S).dump"

# Schema only (for verification)
pg_dump $DATABASE_URL --schema-only > schema_backup.sql

# Specific tables backup
pg_dump $DATABASE_URL \
  --format=custom \
  --table=users_enhanced \
  --table=user_sessions \
  --table=audit_logs_dml \
  --file="security_tables_$(date +%Y%m%d).dump"
```

### Verify Backup

```bash
# List backup contents
pg_restore --list bisman_backup_*.dump | head -50

# Test restore to temporary database
createdb bisman_restore_test
pg_restore -d bisman_restore_test bisman_backup_*.dump
psql -d bisman_restore_test -c "SELECT COUNT(*) FROM users_enhanced;"
dropdb bisman_restore_test
```

### Restore Procedure

```bash
# ⚠️  CAUTION: This will overwrite production data

# 1. Stop application
kubectl scale deployment bisman-backend --replicas=0

# 2. Create current state backup
pg_dump $DATABASE_URL -Fc -f "pre_restore_backup_$(date +%Y%m%d_%H%M%S).dump"

# 3. Restore from backup
pg_restore \
  --dbname=$DATABASE_URL \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  bisman_backup_YYYYMMDD.dump

# 4. Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users_enhanced;"
psql $DATABASE_URL -c "SELECT MAX(created_at) FROM audit_logs_dml;"

# 5. Clear Redis caches
redis-cli -u $REDIS_URL FLUSHDB

# 6. Restart application
kubectl scale deployment bisman-backend --replicas=3
```

---

## Testing RLS & Audit Triggers

### Quick RLS Verification

```bash
# Run automated RLS tests
DATABASE_URL=$DATABASE_URL npx jest tests/rls.test.js --runInBand

# Manual verification
psql $DATABASE_URL << 'EOF'
-- Check RLS is enabled
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN ('users', 'payment_requests', 'clients', 'invoices')
ORDER BY relname;

-- List all RLS policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
EOF
```

### Test RLS Isolation

```bash
# Create test scenario
psql $DATABASE_URL << 'EOF'
-- Set tenant context and verify isolation
BEGIN;

-- As tenant A
SELECT set_config('app.current_tenant', 'tenant-a-uuid', true);
SELECT COUNT(*) as tenant_a_sees FROM payment_requests;

-- As tenant B  
SELECT set_config('app.current_tenant', 'tenant-b-uuid', true);
SELECT COUNT(*) as tenant_b_sees FROM payment_requests;

ROLLBACK;
EOF
```

### Test Audit Triggers

```bash
# Verify triggers exist
psql $DATABASE_URL << 'EOF'
SELECT 
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%audit%'
ORDER BY event_object_table;
EOF

# Test trigger fires on insert
psql $DATABASE_URL << 'EOF'
BEGIN;

-- Set context
SELECT set_config('app.current_tenant', 'test-tenant', true);
SELECT set_config('app.service_name', 'manual-test', true);

-- Get current audit count
SELECT COUNT(*) as before_count FROM audit_logs_dml WHERE table_name = 'users_enhanced';

-- Perform test operation (will be rolled back)
INSERT INTO users_enhanced (id, email, name, tenant_id) 
VALUES (gen_random_uuid(), 'test@example.com', 'Test User', 'test-tenant'::uuid);

-- Check audit entry was created
SELECT COUNT(*) as after_count FROM audit_logs_dml WHERE table_name = 'users_enhanced';

ROLLBACK;
EOF
```

### Security Smoke Test

```bash
# Full security check
DATABASE_URL=$DATABASE_URL \
REDIS_URL=$REDIS_URL \
node tools/securitySmokeTest.js

# Verify migrations
psql $DATABASE_URL -f tools/verify_migrations.sql
```

---

## Escalation Contacts

### On-Call Rotation

| Role | Primary | Backup | Contact |
|------|---------|--------|---------|
| Security Lead | [Name] | [Name] | security@company.com |
| Infrastructure | [Name] | [Name] | infra@company.com |
| Database Admin | [Name] | [Name] | dba@company.com |
| CTO | [Name] | - | cto@company.com |

### External Contacts

| Service | Purpose | Contact |
|---------|---------|---------|
| AWS Support | Infrastructure issues | AWS Console → Support |
| Legal Counsel | Data breach notification | legal@company.com |
| Cyber Insurance | Incident claims | [Carrier contact] |

### Escalation Matrix

```
SEV1 (Active Breach):
  0 min  → Security Lead + On-call Engineer
  15 min → CTO + Legal
  30 min → Executive team
  
SEV2 (Unauthorized Access):
  0 min  → Security Lead
  30 min → CTO (if not contained)
  
SEV3 (Suspicious Activity):
  0 min  → On-call Engineer
  1 hour → Security Lead (if confirmed)
  
SEV4 (Audit Finding):
  24 hours → Team Lead
```

### Communication Templates

#### Initial Incident Notification

```
SUBJECT: [SEV-X] Security Incident - [Brief Description]

TIME DETECTED: YYYY-MM-DD HH:MM UTC
SEVERITY: SEV-X
STATUS: Investigating / Contained / Resolved

SUMMARY:
[1-2 sentence description]

IMPACT:
- Systems affected: [list]
- Users affected: [count/scope]
- Data at risk: [description]

CURRENT ACTIONS:
- [Action 1]
- [Action 2]

NEXT UPDATE: [time]

INCIDENT COMMANDER: [Name]
```

#### Status Update

```
SUBJECT: [SEV-X] UPDATE - Security Incident - [Brief Description]

UPDATE TIME: YYYY-MM-DD HH:MM UTC
STATUS: [Investigating / Contained / Monitoring / Resolved]

PROGRESS SINCE LAST UPDATE:
- [Action completed]
- [Findings]

CURRENT ACTIONS:
- [In progress]

NEXT STEPS:
- [Planned actions]

NEXT UPDATE: [time]
```

---

## Appendix: Common Queries

### Find All User Sessions

```sql
SELECT 
    u.email,
    s.created_at,
    s.expires_at,
    s.ip_address,
    s.user_agent,
    s.is_active
FROM user_sessions s
JOIN users_enhanced u ON s.user_id = u.id
WHERE s.is_active = true
ORDER BY s.created_at DESC;
```

### Recent Audit Activity by User

```sql
SELECT 
    table_name,
    operation,
    COUNT(*) as count,
    MAX(created_at) as last_action
FROM audit_logs_dml
WHERE user_id = '<user_id>'
    AND created_at > NOW() - INTERVAL '7 days'
GROUP BY table_name, operation
ORDER BY count DESC;
```

### Check Permission Cache Health

```bash
# Count keys by type
redis-cli -u $REDIS_URL --scan --pattern "perm:user:*" | wc -l
redis-cli -u $REDIS_URL --scan --pattern "perm:role:*" | wc -l

# Check TTLs
for key in $(redis-cli -u $REDIS_URL --scan --pattern "perm:user:*" | head -10); do
  ttl=$(redis-cli -u $REDIS_URL TTL "$key")
  echo "$key: TTL=$ttl"
done
```

---

*This runbook should be reviewed and updated quarterly. Report any outdated information to security@company.com.*
