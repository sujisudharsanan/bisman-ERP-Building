#!/bin/bash
# ============================================================================
# BISMAN ERP - Quick Operational Commands
# ============================================================================
# 
# Copy/paste these commands as needed for operations.
# See SECURITY_RUNBOOK.md for full incident response procedures.
#
# ============================================================================

# ============================================================================
# 1. CREDENTIAL ROTATION
# ============================================================================

# Step 1: Create new DB user (run in psql as superuser)
cat << 'SQL'
-- Create new application user
CREATE USER bisman_app_v2 WITH PASSWORD 'new-secure-password-here';

-- Grant same privileges as current user
GRANT CONNECT ON DATABASE bisman_erp TO bisman_app_v2;
GRANT USAGE ON SCHEMA public TO bisman_app_v2;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bisman_app_v2;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bisman_app_v2;

-- For RLS bypass (if app needs it)
ALTER USER bisman_app_v2 SET row_security = off;
SQL

# Step 2: Update app secret (Railway/Render/etc)
# railway variables set DATABASE_URL="postgresql://bisman_app_v2:new-password@host:5432/db"

# Step 3: Restart app
# railway up --detach

# Step 4: Revoke old user (after confirming new works)
cat << 'SQL'
-- Revoke old user access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM bisman_app_old;
REVOKE ALL ON SCHEMA public FROM bisman_app_old;
DROP USER bisman_app_old;
SQL

# ============================================================================
# 2. ENCRYPTION KEY ROTATION
# ============================================================================

# Generate new 256-bit key
openssl rand -hex 32

# Store in Vault (example)
# vault kv put secret/bisman/encryption key="$(openssl rand -hex 32)"

# ============================================================================
# 3. RUN TESTS
# ============================================================================

# Full test suite
cd my-backend
npm ci
npm test tests/rls.test.js
npm test tests/redisInvalidate.test.js
node tools/securitySmokeTest.js

# Database verification
psql "$DATABASE_URL" -f tools/verify_migrations.sql

# ============================================================================
# 4. SESSION MANAGEMENT
# ============================================================================

# Dry run reconciliation
DRY_RUN=true node tools/reconcileSessions.js

# Run actual reconciliation
node tools/reconcileSessions.js

# Invalidate all permission caches (emergency)
redis-cli -u "$REDIS_URL" PUBLISH permissions:invalidate '{"type":"all"}'

# Invalidate specific user permissions
redis-cli -u "$REDIS_URL" PUBLISH permissions:invalidate '{"type":"user","userId":123}'

# Invalidate specific role permissions
redis-cli -u "$REDIS_URL" PUBLISH permissions:invalidate '{"type":"role","roleId":5}'

# ============================================================================
# 5. BACKUP & RESTORE
# ============================================================================

# Create backup
pg_dump --format=custom --file="backup_$(date +%Y%m%d_%H%M%S).dump" "$DATABASE_URL"

# Create forensic snapshot (incident response)
pg_dump --format=custom --file="forensic_$(date +%F).dump" "$DATABASE_URL"

# Restore to staging
pg_restore --dbname="$STAGING_DATABASE_URL" --clean --if-exists backup.dump

# Verify RLS after restore
psql "$STAGING_DATABASE_URL" -c "SELECT schemaname, tablename, policyname FROM pg_policies ORDER BY tablename;"

# ============================================================================
# 6. MONITORING QUERIES
# ============================================================================

# Check recent audit activity
psql "$DATABASE_URL" -c "
SELECT 
    operation,
    table_name,
    COUNT(*) as count,
    MAX(changed_at) as latest
FROM audit_logs_dml 
WHERE changed_at > NOW() - INTERVAL '1 hour'
GROUP BY operation, table_name
ORDER BY count DESC;
"

# Check for suspicious patterns
psql "$DATABASE_URL" -c "
SELECT 
    application_name,
    table_name,
    operation,
    COUNT(*) as count
FROM audit_logs_dml 
WHERE changed_at > NOW() - INTERVAL '24 hours'
GROUP BY application_name, table_name, operation
HAVING COUNT(*) > 1000
ORDER BY count DESC;
"

# Check RLS policy violations (if logged)
psql "$DATABASE_URL" -c "
SELECT * FROM security_events 
WHERE event_type = 'rls_violation' 
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC 
LIMIT 20;
"

# ============================================================================
# 7. CACHE OPERATIONS
# ============================================================================

# Check cache health
curl -s http://localhost:3001/internal/cache-health | jq .

# Check cache metrics
curl -s http://localhost:3001/internal/cache-metrics | jq .

# Clear all permission caches
redis-cli -u "$REDIS_URL" KEYS "perm:*" | xargs -r redis-cli -u "$REDIS_URL" DEL

# Clear all session caches
redis-cli -u "$REDIS_URL" KEYS "session:*" | xargs -r redis-cli -u "$REDIS_URL" DEL

# ============================================================================
# 8. API HEALTH CHECKS
# ============================================================================

# Basic health
curl -s http://localhost:3001/api/health | jq .

# Run all security tests via API
curl -s -X POST http://localhost:3001/api/admin/tests/run-all | jq .summary

# Get test results
curl -s http://localhost:3001/api/admin/tests/summary/all | jq .

# Check audit services
curl -s http://localhost:3001/api/audit/services | jq .

# ============================================================================
# 9. INCIDENT RESPONSE QUICK ACTIONS
# ============================================================================

# STEP 1: Isolate - Rotate credentials immediately
# (See Credential Rotation section above)

# STEP 2: Forensic snapshot
pg_dump --format=custom --file="forensic_$(date +%F_%H%M%S).dump" "$DATABASE_URL"

# STEP 3: Increase logging temporarily
psql "$DATABASE_URL" -c "ALTER ROLE bisman_app SET log_statement = 'all';"

# STEP 4: Invalidate all caches
redis-cli -u "$REDIS_URL" PUBLISH permissions:invalidate '{"type":"all"}'
redis-cli -u "$REDIS_URL" PUBLISH sessions:invalidate '{"type":"all"}'

# STEP 5: Block suspicious IPs (if using nginx)
# echo "deny 1.2.3.4;" >> /etc/nginx/conf.d/block.conf && nginx -s reload

# STEP 6: Check for unauthorized access
psql "$DATABASE_URL" -c "
SELECT DISTINCT application_name, client_addr, usename
FROM pg_stat_activity
WHERE application_name NOT IN ('bisman_erp_app', 'pgAdmin', 'psql')
AND state = 'active';
"

echo "
============================================================================
📚 For full procedures, see: SECURITY_RUNBOOK.md
📞 Escalation contacts are in the runbook
============================================================================
"
