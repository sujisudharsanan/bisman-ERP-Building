# SYSTEM FORENSIC AUDIT REPORT
## Principal Software Architect Production Stability Analysis

**Date:** 2026-02-06  
**Auditor:** Principal Software Architect  
**System:** BISMAN ERP SaaS Platform  
**Environment:** Railway Production  

---

## EXECUTIVE SUMMARY

The BISMAN ERP platform is experiencing **systemic architectural drift** that has led to cascading failures across multiple services. This audit identifies **8 critical root causes** and provides a **9-phase remediation plan**.

### Severity Assessment

| Category | Status | Count | Risk Level |
|----------|--------|-------|------------|
| Non-UUID Primary Keys | ❌ CRITICAL | 178 tables | HIGH |
| Legacy _old Columns | ⚠️ MEDIUM | 12 columns | MEDIUM |
| Non-UUID tenant_id | ❌ CRITICAL | 4 tables | HIGH |
| Non-UUID User References | ❌ CRITICAL | 194 columns | HIGH |
| Missing FK Constraints | ⚠️ MEDIUM | 50+ columns | MEDIUM |
| Nullable Critical IDs | ⚠️ MEDIUM | 67 columns | MEDIUM |
| Mixed ID Type Tables | ❌ CRITICAL | 30 tables | HIGH |

---

## PHASE 1: FORENSIC FINDINGS

### 1.1 Database Schema Analysis

#### ID Column Type Distribution
```
integer:           188 tables (59.5%)
uuid:               83 tables (26.3%)
text:               30 tables (9.5%)
bigint:              9 tables (2.8%)
character varying:   1 table  (0.3%)
```

**Finding:** Only 26% of tables use UUID as primary key. This creates type mismatch errors when joining tables.

#### Critical Tables Status

| Table | id Type | tenant_id Type | Legacy Columns | Status |
|-------|---------|----------------|----------------|--------|
| users | UUID ✅ | UUID ✅ | 0 | ✅ COMPLIANT |
| tenants | - | - | - | ✅ COMPLIANT |
| chat_conversations | UUID ✅ | - | 0 | ✅ COMPLIANT |
| chat_messages | UUID ✅ | - | 0 | ✅ COMPLIANT |
| threads | UUID ✅ | - | 1 | ⚠️ LEGACY |
| thread_messages | UUID ✅ | - | 1 | ⚠️ LEGACY |
| thread_members | TEXT ❌ | - | - | ❌ NON-COMPLIANT |
| workflow_tasks | UUID ✅ | UUID ✅ | 3 | ⚠️ LEGACY |
| rbac_user_roles | INTEGER ❌ | - | - | ❌ NON-COMPLIANT |
| rbac_permissions | INTEGER ❌ | - | - | ❌ NON-COMPLIANT |
| effective_access_cache | INTEGER ❌ | UUID ✅ | - | ❌ NON-COMPLIANT |
| audit_logs | INTEGER ❌ | UUID ✅ | - | ❌ NON-COMPLIANT |
| tenant_usage | INTEGER ❌ | VARCHAR ❌ | - | ❌ CRITICAL |
| subscription_plans | INTEGER ❌ | - | - | ❌ NON-COMPLIANT |

### 1.2 RBAC & Access Control

| Metric | Value | Status |
|--------|-------|--------|
| Total RBAC User Roles | 2 | ⚠️ LOW |
| Roles with user_id_uuid | 2 | ✅ MIGRATED |
| Missing UUID mapping | 0 | ✅ |

**Finding:** RBAC user_id_uuid migration is complete for existing data, but code still uses parseInt() in some places.

### 1.3 Legacy Columns Requiring Cleanup

| Table | Column | Type |
|-------|--------|------|
| threads | id_old | text |
| thread_messages | id_old | text |
| workflow_tasks | id_old | integer |
| workflow_tasks | assignee_id_old | integer |
| workflow_tasks | creator_id_old | integer |
| task_messages | id_old | integer |
| task_messages | task_id_old | integer |
| task_requests | id_old | integer |

### 1.4 Non-UUID tenant_id Columns (CRITICAL)

| Table | Current Type | Impact |
|-------|--------------|--------|
| tenant_usage | character varying | Billing/metrics broken |
| tenant_usage_monthly | character varying | Reporting broken |
| security_access_log | text | Audit trail gaps |
| unregistered_route_access | integer | Route logging fails |

---

## PHASE 2: ROOT CAUSE MATRIX

| # | Symptom | Root Cause | Impact | Priority | Owner |
|---|---------|------------|--------|----------|-------|
| 1 | `uuid = text` operator errors | Mixed identifier types | Query failures, data isolation breaks | **CRITICAL** | DBA |
| 2 | RBAC denial on valid users | Legacy integer IDs in rbac tables | Permission lookups fail | **CRITICAL** | Backend |
| 3 | Prisma field mismatch | Schema drift DB ↔ ORM | ORM operations fail | **HIGH** | Backend |
| 4 | parseInt/Number on UUIDs | Legacy code patterns | NaN values, broken queries | **HIGH** | Backend |
| 5 | Insert failures | Legacy _old columns | Data operations fail | **MEDIUM** | DBA |
| 6 | Orphan records | Missing FK constraints | Data inconsistency | **MEDIUM** | DBA |
| 7 | Data leakage risk | Nullable tenant_id | Multi-tenancy violations | **CRITICAL** | Security |
| 8 | WebSocket failures | Hardcoded localhost | Real-time features broken | **HIGH** | DevOps |

---

## PHASE 3: SCHEMA NORMALIZATION PLAN

### 3.1 Priority 1: Fix Non-UUID tenant_id (CRITICAL)

```sql
-- tenant_usage
ALTER TABLE tenant_usage ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID;

-- tenant_usage_monthly  
ALTER TABLE tenant_usage_monthly ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID;

-- security_access_log
ALTER TABLE security_access_log ALTER COLUMN tenant_id TYPE UUID USING tenant_id::UUID;

-- unregistered_route_access (requires mapping)
ALTER TABLE unregistered_route_access ADD COLUMN tenant_id_uuid UUID;
UPDATE unregistered_route_access SET tenant_id_uuid = (
  SELECT id FROM tenants WHERE CAST(id AS TEXT) = CAST(tenant_id AS TEXT) LIMIT 1
);
```

### 3.2 Priority 2: Drop Legacy _old Columns

```sql
-- After verifying data integrity
ALTER TABLE threads DROP COLUMN IF EXISTS id_old;
ALTER TABLE thread_messages DROP COLUMN IF EXISTS id_old;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS id_old CASCADE;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS assignee_id_old CASCADE;
ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS creator_id_old CASCADE;
ALTER TABLE task_messages DROP COLUMN IF EXISTS id_old CASCADE;
ALTER TABLE task_messages DROP COLUMN IF EXISTS task_id_old CASCADE;
ALTER TABLE task_requests DROP COLUMN IF EXISTS id_old CASCADE;
```

### 3.3 Priority 3: Convert Critical Table PKs to UUID

Tables requiring PK conversion (phased approach):
1. **Phase A** (Low data volume): rbac_*, effective_access_cache
2. **Phase B** (Medium data): subscription_plans, audit_logs
3. **Phase C** (High data): partitioned tables (defer)

---

## PHASE 4: PRISMA RECONCILIATION

### Required Actions

1. **Regenerate schema from DB:**
   ```bash
   cd my-backend && npx prisma db pull
   ```

2. **Verify @db.Uuid annotations** for all UUID columns

3. **Add missing @@unique constraints**

4. **Remove phantom fields** not present in database

5. **Generate client:**
   ```bash
   npx prisma generate
   ```

---

## PHASE 5: QUERY HARDENING

### Patterns to Eliminate

| Pattern | Count | Fix |
|---------|-------|-----|
| `parseInt(userId)` | 55+ | Remove, use String |
| `Number(req.user.id)` | 11+ | Remove, use String |
| `::INTEGER` casts | 15+ | Remove unnecessary casts |
| `SELECT *` | Multiple | Specify columns explicitly |

### Files Requiring Updates

- ✅ `app.js` - Fixed RBAC query
- ✅ `rbacMiddleware.js` - Fixed user lookup
- ✅ `planModuleAccessMiddleware.js` - Fixed audit logging
- ✅ `businessLevelProtection.js` - Fixed param parsing
- ⏳ `qaController.js` - Valid (BIGINT tables)
- ⏳ `superAdminController.js` - Valid (INTEGER tables)

---

## PHASE 6: ACCESS CONTROL REBUILD

### Current State
- `rbac_user_roles.user_id`: TEXT (legacy integers)
- `rbac_user_roles.user_id_uuid`: UUID (newly added)
- Migration: 2/2 rows complete

### Required Actions

1. Update all RBAC queries to use `user_id_uuid` column
2. Deprecate TEXT `user_id` column after full migration
3. Add audit logging for access decisions
4. Implement deterministic role resolution (no fallbacks)

---

## PHASE 7: OBSERVABILITY IMPLEMENTATION

### Alerts to Create

| Alert | Trigger | Action |
|-------|---------|--------|
| Constraint Violation | INSERT/UPDATE fails | Log + notify |
| Prisma Query Error | Type mismatch | Log + trace |
| RBAC Denial | Access denied | Audit + review |
| Migration Drift | Schema mismatch | Block deploy |

---

## PHASE 8: CERTIFICATION TESTING

### Required Test Coverage

| Service | Test Types | Status |
|---------|------------|--------|
| Auth/Login | E2E, Unit | ⏳ Required |
| RBAC Permissions | Integration | ⏳ Required |
| Task Management | E2E | ⏳ Required |
| Kanban Board | E2E | ⏳ Required |
| Chat/Threads | E2E | ⏳ Required |
| Billing/Usage | Integration | ⏳ Required |
| WebSockets | Integration | ⏳ Required |

---

## PHASE 9: PRODUCTION HARDENING

### Checklist

- [ ] Remove all localhost references
- [ ] Enforce environment validation at startup
- [ ] Rotate database credentials
- [ ] Lock migration state in production
- [ ] Enable automated daily backups
- [ ] Set up disaster recovery procedures

---

## IMMEDIATE ACTION ITEMS

### Today (Critical)
1. ✅ Run full forensic audit
2. ⏳ Fix remaining non-UUID tenant_id columns
3. ⏳ Drop legacy _old columns
4. ⏳ Regenerate Prisma schema

### This Week (High)
1. Complete RBAC to UUID-only migration
2. Fix all parseInt/Number patterns in code
3. Add query validation middleware
4. Create E2E test suite

### This Month (Medium)
1. Convert remaining tables to UUID PKs
2. Add FK constraints
3. Implement observability alerts
4. Production hardening checklist

---

## APPENDIX: TABLES REQUIRING UUID CONVERSION

<details>
<summary>178 Tables with Non-UUID Primary Keys (Click to expand)</summary>

Priority tables for conversion:
- rbac_user_roles
- rbac_permissions
- rbac_roles
- rbac_routes
- rbac_actions
- effective_access_cache
- subscription_plans
- tenant_usage
- audit_logs

Infrastructure/partition tables (defer):
- audit_logs_p2025_*
- audit_logs_p2026_*
- client_usage_events_p*
- thread_messages_p*

</details>

---

**Report Generated:** 2026-02-06T12:45:41Z  
**Next Review:** After Phase 3-4 completion
