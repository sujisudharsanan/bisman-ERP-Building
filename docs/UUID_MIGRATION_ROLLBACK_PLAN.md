# UUID Migration Rollback Plan

## Overview

This document provides step-by-step instructions for rolling back the UUID migration in case of critical issues.

## Pre-Rollback Checklist

Before executing rollback:

1. [ ] Confirm the issue is migration-related, not application code
2. [ ] Document the specific errors encountered
3. [ ] Notify all stakeholders
4. [ ] Ensure backup tables exist in `uuid_migration_backup` schema
5. [ ] Have database admin access ready

## Rollback Procedures

### Level 1: Minor Issues (No Data Loss)

For issues with specific columns or constraints:

```sql
-- Example: Revert a column type change
ALTER TABLE effective_access_cache 
ALTER COLUMN tenant_id TYPE VARCHAR(100) 
USING tenant_id::text;

-- Example: Remove a constraint
ALTER TABLE tenant_usage 
DROP CONSTRAINT IF EXISTS tenant_usage_tenant_date_unique;
```

### Level 2: Table-Level Rollback

For issues affecting entire tables:

```sql
-- 1. Check backup exists
SELECT COUNT(*) FROM uuid_migration_backup.users_enhanced_backup_TIMESTAMP;

-- 2. Truncate current table (CAUTION!)
TRUNCATE TABLE users_enhanced CASCADE;

-- 3. Restore from backup
INSERT INTO users_enhanced 
SELECT * FROM uuid_migration_backup.users_enhanced_backup_TIMESTAMP;
```

### Level 3: Full Database Rollback

For catastrophic issues:

```bash
# 1. Stop all application services
pm2 stop all

# 2. List available backups
psql $DATABASE_URL -c "
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'uuid_migration_backup'
  ORDER BY table_name;
"

# 3. Run rollback script
node scripts/uuid-migration-execute.js --rollback

# 4. Verify data integrity
node scripts/uuid-migration-verify.js

# 5. Restart services
pm2 start all
```

## Rollback SQL Script

```sql
-- =============================================================================
-- FULL ROLLBACK SCRIPT
-- =============================================================================

BEGIN;

-- 1. Restore effective_access_cache
DROP TABLE IF EXISTS effective_access_cache_temp;
ALTER TABLE effective_access_cache RENAME TO effective_access_cache_temp;

CREATE TABLE effective_access_cache AS 
SELECT * FROM uuid_migration_backup.effective_access_cache_backup_TIMESTAMP;

-- Add back original constraints and indexes
-- (Modify based on your specific schema)

-- 2. Restore tenant_usage
DROP TABLE IF EXISTS tenant_usage_temp;
ALTER TABLE tenant_usage RENAME TO tenant_usage_temp;

CREATE TABLE tenant_usage AS 
SELECT * FROM uuid_migration_backup.tenant_usage_backup_TIMESTAMP;

-- 3. Verify rollback
SELECT 
  'effective_access_cache' as table_name,
  COUNT(*) as row_count 
FROM effective_access_cache
UNION ALL
SELECT 'tenant_usage', COUNT(*) FROM tenant_usage;

-- 4. If verification passes, drop temp tables
-- DROP TABLE effective_access_cache_temp;
-- DROP TABLE tenant_usage_temp;

COMMIT;
```

## Post-Rollback Steps

1. **Verify Application Functionality**
   ```bash
   # Test authentication
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   
   # Test task creation
   # Test kanban loading
   # Test chat messaging
   ```

2. **Update Prisma Schema**
   ```bash
   cd my-backend
   npx prisma db pull
   npx prisma generate
   ```

3. **Restart All Services**
   ```bash
   pm2 restart all
   ```

4. **Monitor Logs**
   ```bash
   pm2 logs --lines 100
   ```

## Emergency Contacts

- Database Admin: [Contact Info]
- DevOps Lead: [Contact Info]
- Application Owner: [Contact Info]

## Backup Inventory

| Table | Backup Location | Created At |
|-------|-----------------|------------|
| users_enhanced | uuid_migration_backup.users_enhanced_backup_* | [Timestamp] |
| chat_messages | uuid_migration_backup.chat_messages_backup_* | [Timestamp] |
| tenant_usage | uuid_migration_backup.tenant_usage_backup_* | [Timestamp] |
| effective_access_cache | uuid_migration_backup.effective_access_cache_backup_* | [Timestamp] |

## Lessons Learned

Document any issues encountered during the migration for future reference:

1. 
2. 
3. 

---

**Last Updated**: 2026-02-06
**Migration Version**: 1.0.0
