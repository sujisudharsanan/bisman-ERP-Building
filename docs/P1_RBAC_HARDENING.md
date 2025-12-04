# P1 RBAC Hardening Implementation Guide

## Overview

This document describes the P1 security hardening implemented for the BISMAN ERP system, focusing on:

1. **Database User Separation** - Different users for different application components
2. **PostgreSQL Enums** - Type-safe status fields
3. **Foreign Key Constraints** - Referential integrity enforcement
4. **Row Level Security (RLS)** - Tenant isolation at database level
5. **Audit Triggers** - Automatic change tracking

## 1. Database Users & Roles

### Roles (Groups)

| Role | Description | Permissions |
|------|-------------|-------------|
| `bisman_readonly` | Analytics & reporting | SELECT only |
| `bisman_app` | Application CRUD | SELECT, INSERT, UPDATE, DELETE (no TRUNCATE, no DDL) |
| `bisman_service` | Background services | Same as app + EXECUTE functions |
| `bisman_admin` | Migrations & maintenance | Full access + BYPASSRLS |

### Login Users

| User | Role | Use Case |
|------|------|----------|
| `bisman_frontend` | bisman_app | Frontend API calls |
| `bisman_backend` | bisman_app | Backend API server |
| `bisman_worker` | bisman_service | Cron jobs, background workers |
| `bisman_migrator` | bisman_admin | Schema migrations only |
| `bisman_analytics` | bisman_readonly | Reporting dashboards |

### Connection String Updates

Update your `.env.local` files:

```bash
# Backend API Server
DATABASE_URL=postgres://bisman_backend:YOUR_SECURE_PASSWORD@localhost:5432/BISMAN

# Background Workers
DATABASE_URL_WORKER=postgres://bisman_worker:YOUR_SECURE_PASSWORD@localhost:5432/BISMAN

# Migrations (only used during deployment)
DATABASE_URL_MIGRATE=postgres://bisman_migrator:YOUR_SECURE_PASSWORD@localhost:5432/BISMAN

# Analytics/Reporting (read-only)
DATABASE_URL_READONLY=postgres://bisman_analytics:YOUR_SECURE_PASSWORD@localhost:5432/BISMAN
```

### Changing Default Passwords

**CRITICAL**: Change all default passwords before production!

```sql
ALTER USER bisman_frontend WITH PASSWORD 'your_secure_password_here';
ALTER USER bisman_backend WITH PASSWORD 'your_secure_password_here';
ALTER USER bisman_worker WITH PASSWORD 'your_secure_password_here';
ALTER USER bisman_migrator WITH PASSWORD 'your_secure_password_here';
ALTER USER bisman_analytics WITH PASSWORD 'your_secure_password_here';
```

## 2. PostgreSQL Enums

The following enums were created for type safety:

| Enum | Values | Used By |
|------|--------|---------|
| `client_status` | Active, Inactive, Suspended, Pending, Archived | clients.status |
| `onboarding_status` | pending, in_progress, completed, failed, cancelled | onboarding flows |
| `subscription_status` | active, suspended, cancelled, expired, trial | subscriptions |
| `subscription_plan` | free, starter, professional, enterprise, custom | subscriptions |
| `payment_request_status` | DRAFT, PENDING, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PAID, CANCELLED, EXPIRED | payment_requests |
| `task_status` | PENDING, IN_PROGRESS, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED, CANCELLED | tasks |
| `approval_action` | APPROVED, REJECTED, RETURNED, ESCALATED, PENDING | approvals |
| `user_role_type` | SYSTEM_ADMIN, ENTERPRISE_ADMIN, SUPER_ADMIN, ADMIN, MANAGER, FINANCE_CONTROLLER, HR_MANAGER, OPERATIONS_MANAGER, STAFF, VIEWER, USER | users |
| `call_status` | ringing, ongoing, ended, missed, declined, failed | calls |
| `message_type` | text, image, file, audio, video, system, call | messages |

### Using Enums in Prisma

To use these enums in Prisma, update your `schema.prisma`:

```prisma
enum ClientStatus {
  Active
  Inactive
  Suspended
  Pending
  Archived
}

model Client {
  id     String       @id @default(uuid())
  status ClientStatus @default(Active)
}
```

## 3. Foreign Key Constraints Added

| Constraint | Table | References |
|------------|-------|------------|
| fk_clients_super_admin | clients | super_admins(id) |
| fk_module_assignments_super_admin | module_assignments | super_admins(id) |
| fk_module_assignments_module | module_assignments | modules(id) |
| fk_admin_role_assignments_role | admin_role_assignments | rbac_roles(id) |
| fk_client_module_permissions_client | client_module_permissions | clients(id) |
| fk_client_module_permissions_module | client_module_permissions | modules(id) |
| fk_branches_client | branches | clients(id) |
| fk_payment_activity_logs_request | payment_activity_logs | payment_requests(id) |

## 4. Row Level Security (RLS)

### Enabled Tables

RLS is enabled on these tables:
- `clients`
- `branches`
- `payment_requests`
- `expenses`
- `tasks`
- `client_usage_events`
- `client_daily_usage`
- `client_module_permissions`
- `client_onboarding_activity`

### Policy Logic

All policies follow this pattern:

```sql
-- User can access row if:
-- 1. They are a platform admin (ENTERPRISE_ADMIN), OR
-- 2. Row belongs to their super_admin, OR
-- 3. Row belongs to their tenant
```

### Setting Tenant Context

**CRITICAL**: Your application MUST set tenant context before queries!

```javascript
// middleware/tenantContext.js
const { setTenantContext, getPrismaWithTenant } = require('./middleware/tenantContext');

// In your route
app.use('/api/protected', authenticate, setTenantContext, yourRoutes);

// In your handler
const prisma = getPrismaWithTenant(req);
const data = await prisma.clients.findMany(); // RLS automatically applied!
```

### Context Functions

The database provides these functions:

```sql
-- Set context for current transaction
SELECT set_tenant_context(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- tenant_id
  123,                                             -- super_admin_id  
  false                                            -- is_platform_admin
);

-- Get current tenant
SELECT current_tenant_id();

-- Get current super admin
SELECT current_super_admin_id();

-- Check if platform admin
SELECT is_platform_admin();
```

### Testing RLS

```sql
-- As superuser, set context and test
SET ROLE bisman_backend;

SELECT set_tenant_context(
  '550e8400-e29b-41d4-a716-446655440000',
  1,
  false
);

-- This should only return rows for that tenant/super_admin
SELECT * FROM clients;

RESET ROLE;
```

## 5. Audit Triggers

Audit triggers automatically log changes to sensitive tables:

- `clients`
- `super_admins`
- `enterprise_admins`
- `payment_requests`

### Audit Log Structure

```sql
SELECT * FROM audit_logs;
-- id, user_id, action, table_name, record_id, old_values, new_values, created_at
```

### Setting User Context for Audit

```javascript
// Before operations that should be audited
await prisma.$executeRaw`SELECT set_config('app.user_id', ${String(userId)}, true)`;
```

## 6. Unique Constraints Added

| Constraint | Table | Columns |
|------------|-------|---------|
| uq_module_assignments_super_admin_module | module_assignments | super_admin_id, module_id |
| uq_clients_client_code | clients | client_code |
| uq_branches_tenant_code | branches | tenant_id, branch_code |
| uq_permissions_role_module | permissions | role, module_id |

## 7. Security Indexes

Performance indexes added for RLS policies:

```sql
idx_clients_super_admin_active     -- clients(super_admin_id) WHERE is_active = true
idx_branches_tenant_active         -- branches(tenant_id) WHERE is_active = true
idx_payment_requests_client        -- payment_requests(clientId)
idx_expenses_client               -- expenses(clientId)
idx_client_usage_events_client_date -- client_usage_events(client_id, occurred_at DESC)
```

## Migration File

The complete migration is located at:
```
database/migrations/010_p1_rbac_hardening.sql
```

## Rollback

If needed, RLS can be disabled:

```sql
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
-- ... for each table
```

To remove policies:

```sql
DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
DROP POLICY IF EXISTS branches_tenant_isolation ON branches;
-- ... for each table
```

## Post-Implementation Checklist

- [ ] Change all default passwords for bisman_* users
- [ ] Update DATABASE_URL in all .env files
- [ ] Test RLS policies with different user contexts
- [ ] Verify audit logs are capturing changes
- [ ] Update Prisma schema with new enums (optional)
- [ ] Monitor query performance with RLS enabled
- [ ] Train team on tenant context requirements

## Troubleshooting

### "permission denied for table X"
- Check that the user has the correct role granted
- Verify RLS policies allow access for that context

### "new row violates row-level security policy"
- Ensure tenant context is set before INSERT/UPDATE
- Check that the data belongs to the current tenant

### "function set_tenant_context does not exist"
- Run the migration: `psql -U postgres -d BISMAN -f database/migrations/010_p1_rbac_hardening.sql`

---

**Document Version**: 1.0
**Last Updated**: 2024-12-04
**Author**: Security Team
