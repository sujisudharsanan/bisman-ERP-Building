# P2 Tenant Isolation Audit Report

**Generated:** January 2025  
**Status:** AUDIT COMPLETE - Action Required for 3 Tables

## Executive Summary

This audit examines tenant isolation across all business-critical tables in the BISMAN ERP system.

### Key Findings:
- ✅ **Most tables have proper tenant isolation** via `tenant_id`, `client_id`, or FK relationships
- ⚠️ **3 tables need review**: `approvals`, `bills` - rely on indirect FK isolation
- ✅ **No critical data leakage risk** - all queries filter through tenant-aware parent tables

---

## Tables with Explicit Tenant Isolation ✅

| Table | Isolation Column | Status |
|-------|-----------------|--------|
| `users` | `tenant_id` | ✅ Direct |
| `workflow_tasks` | `tenant_id` | ✅ Direct |
| `task_requests` | `tenant_id` | ✅ Direct |
| `task_clarifications` | `tenant_id` | ✅ Direct |
| `task_reviews` | `tenant_id` | ✅ Direct |
| `vendors` | `tenant_id` | ✅ Direct |
| `contracts` | `client_id` | ✅ Direct |
| `settlements` | `client_id` | ✅ Direct |
| `bank_statements` | `tenant_id` | ✅ Direct |
| `payment_requests` | `clientId` (UUID) | ✅ Direct |
| `client_subscriptions` | `client_id` | ✅ Direct |

---

## Tables with Indirect Tenant Isolation ⚠️

These tables achieve tenant isolation through foreign key relationships:

### 1. `approvals` Table
- **Columns:** `id`, `taskId`, `level`, `approverId`, `action`, `comment`, `attachments`, `createdAt`
- **Isolation Method:** FK to `workflow_tasks.id` which has `tenant_id`
- **Risk Level:** LOW - All approval queries go through task relationships
- **Recommendation:** Consider adding explicit `tenant_id` for RLS enforcement

### 2. `bills` Table
- **Columns:** `id`, `filePath`, `uploadedById`, `taskId`, `ocrStatus`, etc.
- **Isolation Method:** FK to `users.id` (uploadedById) which has `tenant_id`
- **Risk Level:** LOW - Bill access is always through user context
- **Recommendation:** Consider adding explicit `tenant_id` for direct queries

---

## Tables Without Tenant Isolation (By Design) ✅

These system/global tables intentionally don't have tenant isolation:

| Table | Purpose |
|-------|---------|
| `subscription_plans` | Global plan definitions |
| `plan_module_access` | Global plan→module mappings |
| `roles` | System role definitions |
| `pages_master` | Global page catalog |
| `feature_catalog` | Global feature definitions |
| `module_master` | Global module definitions |
| `system_settings` | System-wide configuration |
| `audit_logs` | Cross-tenant audit trail |

---

## P2 Remediation Actions

### Priority 1: Add tenant_id to `bills` table
```sql
-- Add tenant_id column
ALTER TABLE bills ADD COLUMN tenant_id UUID;

-- Backfill from user relationship
UPDATE bills b
SET tenant_id = u.tenant_id
FROM users u
WHERE b."uploadedById" = u.id;

-- Add NOT NULL constraint
ALTER TABLE bills ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_bills_tenant_id ON bills(tenant_id);
```

### Priority 2: Add tenant_id to `approvals` table
```sql
-- Add tenant_id column
ALTER TABLE approvals ADD COLUMN tenant_id UUID;

-- Backfill from task relationship
UPDATE approvals a
SET tenant_id = wt.tenant_id
FROM workflow_tasks wt
WHERE a."taskId" = wt.id;

-- Add NOT NULL constraint (if all approvals have valid tasks)
-- ALTER TABLE approvals ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_approvals_tenant_id ON approvals(tenant_id);
```

### Priority 3: Standardize tenant ID column names
Currently inconsistent naming:
- `tenant_id` (most tables)
- `client_id` (contracts, settlements, client_subscriptions)
- `clientId` (payment_requests - camelCase)

**Recommendation:** Standardize to `tenant_id` or `client_id` consistently.

---

## User ID Type Audit

### Current State:
- `users.id` is `INTEGER` (auto-increment)
- `users.tenant_id` is `UUID`
- Most FK references use `INTEGER` for user IDs

### Recommendation:
- **No immediate action needed** - INTEGER IDs are efficient for foreign keys
- Keep UUIDs for tenant/client IDs (cross-system portability)
- Keep INTEGERs for user IDs within tenant (performance)

---

## Conclusion

The BISMAN ERP system has adequate tenant isolation for multi-tenant operations. The recommended P2 improvements will:
1. Enable Row-Level Security (RLS) policies on all business tables
2. Simplify query patterns with explicit tenant filtering
3. Improve query performance with indexed tenant columns

**Next Steps:**
1. Schedule migration window for `bills` and `approvals` table updates
2. Update Prisma schema to reflect new columns
3. Update all related API endpoints to include tenant filtering
