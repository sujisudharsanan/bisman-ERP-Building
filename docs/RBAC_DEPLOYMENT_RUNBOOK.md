# RBAC Privilege Escalation Protection - Deployment Runbook

**Feature**: Role-level privilege escalation protection  
**Migration**: `20251205_add_min_role_level_to_rbac_permissions.sql`  
**Date**: 5 December 2025  
**Branch**: `deployment`

---

## Pre-Deployment Checklist

- [ ] All CI tests passing
- [ ] Feature flag `NEXT_PUBLIC_FEATURE_ROLE_PAGE_PICKER` set to `false` in production
- [ ] Database backup created
- [ ] Redis access confirmed
- [ ] Staging environment tested first

---

## 1. Database Migration

### 1.1 Backup Database (REQUIRED)

```bash
# Production backup - ALWAYS do this first
pg_dump -Fc -f backup_before_rbac_20251205.dump your_database

# Verify backup was created
ls -la backup_before_rbac_20251205.dump
```

### 1.2 Run Migration (Staging First!)

```bash
# On STAGING first
psql -d staging_database -f my-backend/migrations/20251205_add_min_role_level_to_rbac_permissions.sql

# After staging verification, run on PRODUCTION
psql -d production_database -f my-backend/migrations/20251205_add_min_role_level_to_rbac_permissions.sql
```

### 1.3 Verify Migration Success

```sql
-- Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'rbac_permissions' 
  AND column_name = 'min_role_level';

-- Expected: min_role_level | integer | 0

-- Verify index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'rbac_permissions' 
  AND indexname LIKE '%min_role_level%';

-- Verify system-critical permissions were seeded
SELECT key, min_role_level 
FROM rbac_permissions 
WHERE min_role_level >= 80 
ORDER BY min_role_level DESC;
```

**Expected high-level permissions:**
| Permission Key | Min Role Level |
|----------------|----------------|
| `system.enterprise.manage` | 100 |
| `system.tenants.create` | 100 |
| `system.tenants.delete` | 100 |
| `system.super_admin.assign` | 90 |
| `system.audit.view_all` | 90 |
| `system.roles.manage` | 80 |
| `system.permissions.assign` | 80 |

---

## 2. API Smoke Tests

Replace these placeholders before running:
- `API_HOST` → Your API hostname (e.g., `api.bisman.com`)
- `TOKEN_LOW` → JWT token for a low-privilege user (level < 80)
- `TOKEN_ADMIN` → JWT token for Admin/Super Admin (level >= 80)
- `ROLE_ID` → A valid role ID to test with
- Permission IDs → Real permission IDs from your database

### 2.1 Test: Low-Level User Blocked (Expect 403)

```bash
curl -i -X PUT "https://API_HOST/api/privileges/roles/ROLE_ID/permissions" \
  -H "Authorization: Bearer TOKEN_LOW" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":[12345]}'
```

**Expected Response:**
```
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "code": "ROLE_LEVEL_TOO_LOW",
  "message": "Insufficient role level to perform this action"
}
```

### 2.2 Test: Admin/Super Admin Success (Expect 200)

```bash
curl -i -X PUT "https://API_HOST/api/privileges/roles/ROLE_ID/permissions" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":[12345,23456]}'
```

**Expected Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "assigned": 2,
  "roleId": "ROLE_ID"
}
```

### 2.3 Test: Invalid Permission IDs (Expect 400)

```bash
curl -i -X PUT "https://API_HOST/api/privileges/roles/ROLE_ID/permissions" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":["not-an-int"]}'
```

**Expected Response:**
```
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "code": "PERMISSIONS_NOT_FOUND",
  "message": "One or more permission IDs are invalid"
}
```

### 2.4 Test: Privilege Escalation Attempt (Expect 403)

```bash
# Try to assign a permission with min_role_level=100 as an Admin (level=80)
curl -i -X PUT "https://API_HOST/api/privileges/roles/ROLE_ID/permissions" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":[<enterprise_permission_id>]}'
```

**Expected Response:**
```
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "code": "ROLE_LEVEL_VIOLATION",
  "message": "Cannot assign permissions above your role level"
}
```

---

## 3. Verify Audit Logs & Database Side-Effects

### 3.1 Check Role-Permission Mappings

```sql
-- After a successful assignment, verify the mappings
SELECT rp.*, p.key as permission_key
FROM role_permissions rp
JOIN rbac_permissions p ON p.id = rp.permission_id
WHERE rp.role_id = '<ROLE_ID>'
ORDER BY rp.created_at DESC;
```

### 3.2 Check Audit Log Entries

```sql
SELECT 
  id, 
  actor_id, 
  action, 
  payload::text, 
  created_at
FROM audit_logs
WHERE action = 'ROLE_PERMISSIONS_UPDATED'
ORDER BY created_at DESC 
LIMIT 20;
```

**Expected Payload Structure:**
```json
{
  "roleId": "uuid",
  "assignedCount": 2,
  "permissionIds": [12345, 23456],
  "assignerLevel": 90,
  "ip": "x.x.x.x",
  "userAgent": "..."
}
```

### 3.3 Verify Role Levels

```sql
-- List all roles and their levels
SELECT id, name, level, tenant_id
FROM rbac_roles 
ORDER BY level DESC;
```

**Expected Role Levels:**
| Role | Level |
|------|-------|
| Enterprise Admin | 100 |
| Super Admin | 90 |
| Admin | 80 |
| Manager | 50 |
| Staff | 30 |
| Basic | 10 |

### 3.4 Check Users' Max Levels (Sanity Check)

```sql
SELECT 
  u.id, 
  u.email, 
  MAX(r.level) as max_level
FROM users u
JOIN rbac_user_roles ur ON ur.user_id = u.id
JOIN rbac_roles r ON r.id = ur.role_id
GROUP BY u.id, u.email 
ORDER BY max_level DESC 
LIMIT 20;
```

---

## 4. Verify Redis Cache Invalidation

### 4.1 Subscribe to Invalidation Channel

In **Terminal 1** (subscriber):
```bash
redis-cli SUBSCRIBE permissions:invalidate
```

In **Terminal 2** (trigger API call):
```bash
curl -X PUT "https://API_HOST/api/privileges/roles/ROLE_ID/permissions" \
  -H "Authorization: Bearer TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"permissionIds":[12345]}'
```

**Expected in Terminal 1:**
```
1) "message"
2) "permissions:invalidate"
3) "{\"roleId\":\"ROLE_ID\",\"timestamp\":1733410000000}"
```

### 4.2 Verify Cache Keys Cleared

```bash
# Check if role permission cache was invalidated
redis-cli EXISTS permissions:role:<ROLE_ID>
# Expected: (integer) 0

# List all permission-related keys (for debugging)
redis-cli KEYS "permissions:*"
```

---

## 5. Run Automated Tests

### 5.1 Local Test Run

```bash
cd my-backend

# Run only RBAC privilege tests
npm test -- --testPathPattern=rbac.privilege

# Run with verbose output
npm test -- --testPathPattern=rbac.privilege --verbose

# Run all RBAC-related tests
npm test -- --testPathPattern=rbac
```

### 5.2 Expected Test Results

```
 PASS  tests/rbac.privilege.test.js
  PUT /api/privileges/roles/:roleId/permissions
    ✓ should return 401 without auth token
    ✓ should return 403 for low-privilege user (level < 80)
    ✓ should return 400 for invalid permission IDs
    ✓ should return 200 for Super Admin with valid permissions

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

### 5.3 CI Pipeline

The `rbac-security-tests` job in `.github/workflows/ci.yml` will run automatically on PR/push.

---

## 6. Rollback Plan

### 6.1 Quick Rollback (Database Restore)

```bash
# Stop application servers first
pm2 stop all  # or your process manager

# Restore from backup
pg_restore -d your_database -c backup_before_rbac_20251205.dump

# Restart application
pm2 start all
```

### 6.2 Manual Rollback SQL (Use with Caution)

```sql
-- Remove the new column and index
DROP INDEX IF EXISTS idx_rbac_permissions_min_role_level;
ALTER TABLE rbac_permissions DROP COLUMN IF EXISTS min_role_level;

-- Note: This does NOT revert any role.level changes if you modified those
-- Use database backup restoration if unsure
```

### 6.3 Code Rollback

```bash
# Revert to previous commit
git revert HEAD

# Or checkout previous version
git checkout <previous-commit-sha> -- my-backend/services/rbacService.js
git checkout <previous-commit-sha> -- my-backend/middleware/rbacMiddleware.js
git checkout <previous-commit-sha> -- my-backend/routes/privilegeRoutes.js
```

---

## 7. PR/Merge Checklist

Before merging to `main`, verify:

- [ ] Migration tested on staging with no errors
- [ ] All `rbac.privilege` tests pass in CI
- [ ] Manual smoke tests (curl) performed by at least one reviewer
- [ ] Audit logs contain `ROLE_PERMISSIONS_UPDATED` entries with `actor_id` and `payload`
- [ ] Redis invalidation observed for role changes
- [ ] Frontend behind `NEXT_PUBLIC_FEATURE_ROLE_PAGE_PICKER=false` feature flag
- [ ] Security review: tenant scoping is enforced
- [ ] Schema/seed changes documented in migration file header
- [ ] CHANGELOG.md updated

---

## 8. Post-Deployment Monitoring

### 8.1 Key Metrics to Watch

The RBAC system now exposes Prometheus metrics. Monitor these:

1. **`rbac_permission_changes_total`** - Track all permission changes by user/role
2. **`rbac_role_level_violations_total`** - Privilege escalation attempts
3. **`rbac_cross_tenant_violations_total`** - Cross-tenant access attempts
4. **`rbac_permission_check_errors_total`** - Permission check failures
5. **`rbac_audit_log_errors_total`** - Audit logging failures

### 8.2 Alert Rules

Prometheus alerts are configured in `monitoring/alerts/rbac-security-alerts.yml`:

| Alert | Threshold | Severity |
|-------|-----------|----------|
| `HighVolumeRolePermissionChanges` | >10 changes/5min per user | Warning |
| `BurstRolePermissionChanges` | >5 changes/1min per user | Critical |
| `RoleLevelViolationAttempt` | Any violation | Critical |
| `CrossTenantAccessAttempt` | Any violation | Critical |
| `AdminRoleModified` | Any change to level ≥80 | Warning |
| `EnterpriseAdminChanges` | Any change to level 100 | Critical |

### 8.3 Smoke Test Script

Run the automated smoke test after deployment:

```bash
# Set environment variables
export API_HOST="https://api.bisman.com"
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."
export ADMIN_TOKEN="..."
export LOW_TOKEN="..."

# Run smoke tests
./scripts/rbac-smoke-test.sh staging
```

### 8.4 Manual Metric Queries (Grafana/Prometheus)

```promql
# Rate of privilege escalation attempts
rate(rbac_role_level_violations_total[5m])

# Cross-tenant violations by user
sum by (user_id) (rbac_cross_tenant_violations_total)

# Permission change rate by role level
sum by (role_level) (rate(rbac_permission_changes_total[1h]))
```

---

## 9. Important Follow-Ups

### ✅ Completed

1. **Tenant-Scoping Verification** — `assignPermissionsToRole` now enforces `tenant_id` scoping with `validateTenantScope()` method

2. **Alerting** — Prometheus alert rules created in `monitoring/alerts/rbac-security-alerts.yml`

3. **Metrics Instrumentation** — `lib/rbacMetrics.js` provides Prometheus metrics for all RBAC operations

### Medium Priority

4. **Idempotency & Concurrency** — Ensure `assignPermissionsToRole` handles concurrent updates (consider transaction + optimistic locking)

5. **Enhanced Audit Payload** — Include `oldPermissions`/`newPermissions` diff in audit payload for forensics

6. **Rate-Limiting** — Restrict how often a single user can change role permissions

### Low Priority

7. **E2E Smoke Test** — Add Playwright/Cypress test for frontend modal + backend flow

8. **Secrets Rotation** — Ensure Redis, DB, and `permissionInvalidator` credentials are rotated

---

## 10. Feature Flag Rollout

### Enable Frontend (After Backend Verified)

```bash
# In production .env
NEXT_PUBLIC_FEATURE_ROLE_PAGE_PICKER=true

# Restart frontend
pm2 restart frontend
```

### Gradual Rollout (Recommended)

1. **Week 1**: Enable for internal admin users only
2. **Week 2**: Enable for Enterprise Admin tier
3. **Week 3**: Enable for all Admin users
4. **Week 4**: Full rollout

---

## Quick Reference: Role Levels

| Role | Level | Can Assign Permissions With Level ≤ |
|------|-------|-------------------------------------|
| Enterprise Admin | 100 | 100 (all) |
| Super Admin | 90 | 90 |
| Admin | 80 | 80 |
| Manager | 50 | 50 |
| Staff | 30 | 30 |
| Basic | 10 | 10 |

---

## Contact & Escalation

- **On-Call Engineer**: Check PagerDuty rotation
- **Security Team**: For privilege escalation concerns
- **Database Team**: For migration issues

---

*Last Updated: 5 December 2025*
