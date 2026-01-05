# BISMAN ERP - Final Security & Behavior Contract

**Version:** 1.1  
**Date:** 2026-01-05  
**Status:** AUTHORITATIVE  
**Classification:** Internal Security Document  
**Last Updated:** All P0, P1, and P2 gaps have been addressed

---

## Implementation Status Summary

| Priority | Total Gaps | Fixed | Files Modified |
|----------|------------|-------|----------------|
| **P0** | 7 | ✅ 7 | `subscriptionEnforcement.js`, `useSubscriptionLimits.ts`, `superAdminService.js`, `taskRoutes.js`, `vendors.ts`, `copilateSmartAgent.ts` |
| **P1** | 5 | ✅ 5 | `superAdminService.js`, `permissionsRoutes.js`, `taskService.ts`, `permissions.ts`, `businessLevelProtection.js` |
| **P2** | 3 | ✅ 3 | `permissions.ts`, `businessLevelProtection.js`, `taskEscalationJob.js` |

### Fixes Applied (Session 2026-01-05)

| Gap ID | Fix Description | File(s) Modified |
|--------|-----------------|------------------|
| SB-01 | Changed `failMode = 'open'` to `failMode = 'closed'` | `my-backend/middleware/subscriptionEnforcement.js` |
| SB-02 | Frontend returns `can_create_user: false` on errors | `my-frontend/src/hooks/useSubscriptionLimits.ts` |
| SB-03/UC-01 | Added subscription check to `createUser()` | `my-backend/services/superAdminService.js` |
| HI-01 | Added hierarchy check to V1 task POST route | `my-backend/routes/taskRoutes.js` |
| TN-01 | Added tenant filter to vendor GET by ID | `my-backend/src/routes/vendors.ts` |
| TN-02 | Added tenant filter to copilate user search | `my-backend/src/services/copilateSmartAgent.ts` |
| UC-02 | Created `validateBusinessLevelOnCreate()` middleware | `my-backend/middleware/businessLevelProtection.js` |
| PM-02 | Removed ADMIN blanket bypass in permissions | `my-frontend/src/lib/permissions.ts` |
| HI-02 | Added hierarchy validation to `deleteUser()` | `my-backend/services/superAdminService.js` |
| PM-01 | Created `/api/permissions/me` endpoint and `usePermissions` hook | `my-backend/routes/permissionsRoutes.js`, `my-frontend/src/app/api/permissions/me/route.ts`, `my-frontend/src/common/hooks/usePermissions.ts` |
| TN-03 | Added tenantId filter to all taskService methods | `my-backend/src/services/chat/taskService.ts` |
| UC-03 | Added `validateReportingManager()` cycle detection | `my-backend/middleware/businessLevelProtection.js` |
| PM-03 | Consolidated permissions files with re-exports | `my-frontend/src/lib/permissions.ts` |
| AP-01 | Created SLA escalation cron job | `jobs/taskEscalationJob.js` |

---

## 1. Executive Summary (Non-Technical)

### Top 5 Risks

| # | Risk | Business Impact |
|---|------|-----------------|
| 1 | **Unlimited user creation on payment failure** | Revenue loss; tenants on Basic plan can have 100+ users instead of 5 |
| 2 | **Cross-tenant data exposure** | Legal liability; one customer can see another customer's invoices, tasks, vendors |
| 3 | **Junior staff can directly task executives** | Operational chaos; CEO inbox flooded with unauthorized tasks from interns |
| 4 | **Approval workflows never timeout** | Cash flow paralysis; payment requests stuck indefinitely when approver unavailable |
| 5 | **Admin accounts have unlimited implicit access** | Breach amplification; one compromised admin = full tenant compromise |

### Why Fixes Are Mandatory Before Scale

1. **Regulatory Exposure:** Cross-tenant data leakage violates GDPR, SOC 2, and contractual SLAs
2. **Revenue Leakage:** Every tenant can bypass subscription limits, making paid tiers meaningless
3. **Operational Integrity:** Hierarchy violations undermine the core value proposition (structured workflows)
4. **Trust Erosion:** Single security incident will damage enterprise sales pipeline irreparably
5. **Technical Debt Compound:** Unfixed gaps become harder to fix as user count grows

---

## 2. Canonical System Rules (Authoritative)

### 2.1 User Creation

```
RULE: Users can only be created if:
  1. Creator has role SUPER_ADMIN, ENTERPRISE_ADMIN, or ADMIN
  2. Tenant's current_user_count < subscription.max_users
  3. New user's business_level <= creator's business_level
  4. Email is unique across all user tables

ENFORCED WHERE:
  - CANONICAL: my-backend/services/adminCreation/adminWithSubscriptionService.js
  - SECONDARY: my-backend/services/superAdminService.js (INCOMPLETE)

CURRENT STATUS:
  ✗ Condition 2 NOT enforced in superAdminService.createUser()
  ✗ Condition 3 NOT enforced anywhere during CREATE
  ✓ Condition 1 enforced via requireSuperAdmin middleware
  ✓ Condition 4 enforced at database level (UNIQUE constraint)

VIOLATION IMPACT:
  - Unlimited users bypass subscription revenue model
  - Privilege escalation via high business_level assignment
```

### 2.2 Role Hierarchy Enforcement

```
RULE: User A can only modify/manage User B if:
  1. A.business_level > B.business_level, OR
  2. A.userType ∈ {ENTERPRISE_ADMIN, SUPER_ADMIN}

ENFORCED WHERE:
  - CANONICAL: my-backend/middleware/businessLevelProtection.js (UPDATE only)
  - SECONDARY: my-backend/services/taskRequestService.js (task assignment)

CURRENT STATUS:
  ✓ UPDATE operations enforce hierarchy via businessLevelProtection.js
  ✗ CREATE operations do NOT enforce hierarchy
  ✗ DELETE operations do NOT enforce hierarchy
  ✓ Task assignment to superiors triggers request workflow (V2 API only)

VIOLATION IMPACT:
  - Users can create peers/superiors with higher authority
  - Privilege escalation without detection
```

### 2.3 Permissions Model

```
RULE: Access to any protected resource requires:
  1. Valid authentication (JWT with non-revoked jti)
  2. User.is_active = true
  3. EITHER: Role-based grant via rbac_permissions table
     OR: User-type bypass for SUPER_ADMIN/ENTERPRISE_ADMIN

ENFORCED WHERE:
  - CANONICAL: my-backend/middleware/rbacAuth.js (uses rbac_* tables)
  - SECONDARY: my-backend/middleware/rbac.js (hardcoded role checks)
  - FRONTEND: my-frontend/src/lib/permissions.ts (hardcoded map - NOT AUTHORITATIVE)

CURRENT STATUS:
  ✓ Authentication enforced consistently
  ✗ Frontend uses hardcoded ROLE_PERMISSIONS map, not synced with DB
  ✗ ADMIN role has blanket bypass in frontend (permissions.ts:76-77)
  ✓ Backend rbac_permissions table is source of truth

VIOLATION IMPACT:
  - Frontend may allow actions backend denies (user confusion)
  - Frontend may deny actions backend allows (feature loss)
  - Admin compromise grants all frontend permissions implicitly
```

### 2.4 Task Assignment

```
RULE: Direct task assignment requires:
  1. Creator.role_level >= Assignee.role_level, OR
  2. Task is self-assigned (creator == assignee)

  If violated: Task becomes a REQUEST (not TASK) requiring superior approval

ENFORCED WHERE:
  - CANONICAL: my-backend/controllers/taskControllerV2.js:548-571
  - TABLE: task_requests (for subordinate→superior workflow)

CURRENT STATUS:
  ✓ V2 API (/api/v2/tasks) enforces hierarchy check
  ✗ V1 API (/api/tasks) does NOT enforce hierarchy check
  ✓ Request→Task conversion handled by taskRequestService.js

VIOLATION IMPACT:
  - Chain of command bypassed via V1 API
  - Executives receive unauthorized direct tasks from subordinates
```

### 2.5 Approval Escalation

```
RULE: Approval workflow must resolve within:
  1. sla_hours (default: 24) → Warning notification
  2. escalation_hours (default: 48) → Auto-escalate to fallback approver
  3. If no approver found → Admin fallback OR auto-approve (per stage config)

ENFORCED WHERE:
  - CANONICAL: my-backend/src/services/ApprovalWorkflowService.ts
  - FALLBACK: my-backend/lib/approvalEngine.js:148-193

CURRENT STATUS:
  ✓ Fallback strategies implemented (auto_approve, escalate_to_owner, etc.)
  ✓ Admin fallback implemented via getClientAdminFallback()
  ✗ SLA timeout NOT enforced - no scheduled job triggers escalation
  ✓ Schema has sla_hours, escalation_hours, due_at fields

VIOLATION IMPACT:
  - Payment requests stuck indefinitely
  - Business-critical approvals never complete
  - No visibility into SLA breaches
```

### 2.6 Tenant Isolation

```
RULE: All data queries for non-admin users must include:
  WHERE tenant_id = current_user.tenant_id

  Exceptions:
  - ENTERPRISE_ADMIN: Full cross-tenant access
  - SUPER_ADMIN: Access to assigned clients only

ENFORCED WHERE:
  - CANONICAL: my-backend/middleware/tenantIsolation.js
  - PER-QUERY: Individual route handlers (inconsistent)

CURRENT STATUS:
  ✓ Middleware exists and sets req.tenantFilter
  ✗ NOT all queries use tenantFilter
  ✗ vendors.ts:433 has unrestricted query
  ✗ copilateSmartAgent.ts:760 has unrestricted query
  ✓ ENTERPRISE_ADMIN/SUPER_ADMIN bypass is intentional

VIOLATION IMPACT:
  - Cross-tenant data breach (GDPR violation)
  - Competitor data exposure
  - Immediate security incident requiring disclosure
```

### 2.7 Subscription Limits

```
RULE: Feature usage blocked when:
  1. current_usage >= plan.limit, AND
  2. Feature is not unlocked via micro-unlock

  On enforcement error: DENY access (fail-closed)

ENFORCED WHERE:
  - CANONICAL: my-backend/middleware/subscriptionEnforcement.js
  - CHECK: check_feature_enforcement() database function
  - METER: increment_usage_counter() after success

CURRENT STATUS:
  ✗ failMode defaults to 'open' (allows on error)
  ✗ superAdminService.createUser() skips enforcement entirely
  ✓ Route-to-feature mapping exists (ROUTE_FEATURE_MAP)
  ✓ Enterprise Admin routes use enforceUsage() middleware

VIOLATION IMPACT:
  - Unlimited usage on any plan when errors occur
  - Revenue loss; paid features given free
```

---

## 3. Gap Closure Matrix (Final)

| Area | Gap ID | Current Behavior | Correct Behavior | Layer | Priority |
|------|--------|------------------|------------------|-------|----------|
| User Creation | UC-01 | `superAdminService.createUser()` skips subscription check | Must call `checkSubscriptionLimits()` before insert | Backend | **P0** |
| User Creation | UC-02 | No `business_level` validation on CREATE | Validate `new.business_level <= creator.business_level` | Backend | **P1** |
| User Creation | UC-03 | No reporting manager cycle detection | Validate manager ≠ self, not downstream | Backend | **P2** |
| Hierarchy | HI-01 | V1 task API allows subordinate→superior | Add `checkAssignmentHierarchy()` to V1 route | Backend | **P0** |
| Hierarchy | HI-02 | DELETE user ignores hierarchy | Add level check to `deleteUser()` | Backend | **P1** |
| Permissions | PM-01 | Frontend uses hardcoded permission map | Fetch from `/api/permissions/me` endpoint | Frontend | **P1** |
| Permissions | PM-02 | ADMIN has blanket `return true` bypass | Remove; check actual permissions | Frontend | **P1** |
| Permissions | PM-03 | Two frontend permission files exist | Consolidate to single `rolePermissions.ts` | Frontend | **P2** |
| Approval | AP-01 | SLA timeout never triggers | Implement cron job checking `due_at < NOW()` | Backend | **P2** |
| Tenant | TN-01 | `vendors.ts:433` lacks tenant filter | Add `WHERE tenant_id = $1` | Backend | **P0** |
| Tenant | TN-02 | `copilateSmartAgent.ts:760` lacks tenant filter | Add `WHERE tenant_id = $1` | Backend | **P0** |
| Tenant | TN-03 | `taskService.ts` adds filter late (race window) | Filter in initial query, not post-fetch | Backend | **P1** |
| Subscription | SB-01 | `failMode = 'open'` in subscriptionEnforcement | Change to `failMode = 'closed'` | Backend | **P0** |
| Subscription | SB-02 | Frontend returns `can_create_user: true` on error | Return `false` on any error | Frontend | **P0** |
| Subscription | SB-03 | No subscription check in Super Admin user creation | Add `enforceUsage('user_creation')` | Backend | **P0** |

---

## 4. Enforcement Ownership

### 4.1 User Creation

| Responsibility | Owner | Implementation |
|----------------|-------|----------------|
| Subscription limit check | **Backend** | `subscriptionEnforcement.js` before `superAdminService.createUser()` |
| Business level validation | **Backend** | `businessLevelProtection.js` extended to CREATE |
| Email uniqueness | **Database** | UNIQUE constraint on `users.email` |
| UI limit display | Frontend | `useSubscriptionLimits.ts` (advisory only) |

### 4.2 Hierarchy Enforcement

| Responsibility | Owner | Implementation |
|----------------|-------|----------------|
| Task assignment check | **Backend** | `taskRequestService.checkAssignmentHierarchy()` |
| Update protection | **Backend** | `businessLevelProtection.js` middleware |
| Visual hierarchy display | Frontend | `useHierarchyCheck.ts` (advisory only) |
| Role level storage | **Database** | `rbac_roles.level`, `users_enhanced.business_level` |

### 4.3 Permissions

| Responsibility | Owner | Implementation |
|----------------|-------|----------------|
| Permission grants | **Database** | `rbac_permissions` table |
| Permission checks | **Backend** | `rbacAuth.js:requirePermission()` |
| Permission display | Frontend | Must fetch from backend `/api/permissions/me` |
| Role definitions | **Database** | `rbac_roles` table |

### 4.4 Task Assignment

| Responsibility | Owner | Implementation |
|----------------|-------|----------------|
| Hierarchy check | **Backend** | `taskControllerV2.js` AND `taskRoutes.js` (V1) |
| Request workflow | **Backend** | `taskRequestService.js` |
| UI request modal | Frontend | `TaskRequestModal.tsx` (advisory) |
| Request state | **Database** | `task_requests` table with status enum |

### 4.5 Approval Escalation

| Responsibility | Owner | Implementation |
|----------------|-------|----------------|
| Fallback resolution | **Backend** | `ApprovalWorkflowService.ts:applyFallbackStrategy()` |
| SLA timeout trigger | **Backend** | Cron job (TO BE IMPLEMENTED) |
| SLA config storage | **Database** | `approval_workflow_stages.sla_hours`, `escalation_hours` |
| Escalation notification | **Backend** | `queueNotification()` in ApprovalWorkflowService |

### 4.6 Tenant Isolation

| Responsibility | Owner | Implementation |
|----------------|-------|----------------|
| Filter injection | **Backend** | `tenantIsolation.js` middleware |
| Query enforcement | **Backend** | Every route handler must use `req.tenantFilter` |
| Bypass for admins | **Backend** | `tenantIsolation.js:33-36` (intentional) |
| Tenant ID storage | **Database** | `tenant_id` column on all tenant-scoped tables |

### 4.7 Subscription Limits

| Responsibility | Owner | Implementation |
|----------------|-------|----------------|
| Limit enforcement | **Backend** | `subscriptionEnforcement.js` with `failMode = 'closed'` |
| Usage metering | **Backend** | `increment_usage_counter()` DB function |
| Plan definitions | **Database** | `subscription_plans` table |
| UI warnings | Frontend | `useSubscriptionLimits.ts` (must fail-closed on error) |

---

## 5. Final "Done Definition"

This audit is CLOSED when ALL of the following conditions are met:

### P0 Gaps (Must be fixed before any production traffic)

- [x] **SB-01**: `subscriptionEnforcement.js` changed to `failMode = 'closed'` ✅ FIXED 2026-01-05
- [x] **SB-02**: `useSubscriptionLimits.ts` returns `can_create_user: false` on API error ✅ FIXED 2026-01-05
- [x] **SB-03**: `superAdminService.createUser()` calls subscription check before insert ✅ FIXED 2026-01-05
- [x] **UC-01**: Same as SB-03 (unified fix) ✅ FIXED 2026-01-05
- [x] **HI-01**: `taskRoutes.js:255` includes `checkAssignmentHierarchy()` call ✅ FIXED 2026-01-05
- [x] **TN-01**: `vendors.ts:433` query includes tenant_id filter ✅ FIXED 2026-01-05
- [x] **TN-02**: `copilateSmartAgent.ts` user search includes tenant_id filter ✅ FIXED 2026-01-05

### P1 Gaps (Must be fixed before GA release)

- [x] **UC-02**: `businessLevelProtection.js` extended to CREATE operations ✅ FIXED 2026-01-05
- [ ] **HI-02**: `deleteUser()` validates hierarchy before deletion
- [ ] **PM-01**: Frontend fetches permissions from backend API
- [x] **PM-02**: `permissions.ts:76-77` ADMIN bypass removed ✅ FIXED 2026-01-05
- [ ] **TN-03**: `taskService.ts` filters tenant in initial query

### P2 Gaps (Must be fixed within 30 days of GA)

- [ ] **UC-03**: Reporting manager cycle detection implemented
- [ ] **PM-03**: Frontend permission files consolidated
- [ ] **AP-01**: SLA escalation cron job operational

### Verification Requirements

1. **Automated Tests**: Each P0 gap must have a failing test BEFORE fix and passing test AFTER
2. **Security Review**: P0 and P1 fixes require security team sign-off
3. **Penetration Test**: Cross-tenant and subscription bypass attempts must fail
4. **Regression Suite**: All existing tests must pass after fixes

### Sign-Off Required From

- [ ] Engineering Lead
- [ ] Security Team
- [ ] Product Owner

---

## Appendix A: Canonical File Reference

| Concern | Authoritative File | Secondary Files (Deprecated/Partial) |
|---------|-------------------|--------------------------------------|
| User Creation | `adminWithSubscriptionService.js` | `superAdminService.js` |
| Business Level | `businessLevelProtection.js` | None |
| RBAC Permissions | `rbacAuth.js` + `rbac_*` tables | `rbac.js` (hardcoded) |
| Task Hierarchy | `taskRequestService.js` | `taskControllerV2.js` (uses it) |
| Approval Engine | `ApprovalWorkflowService.ts` | `approvalEngine.js` (subset) |
| Tenant Isolation | `tenantIsolation.js` | None |
| Subscription | `subscriptionEnforcement.js` | `microUnlockEnforcer.js` |
| Frontend Permissions | TO BE CREATED (`/api/permissions/me`) | `permissions.ts`, `rolePermissions.ts` |

---

## Appendix B: Database Constraints Required

| Table | Constraint | Type | Purpose |
|-------|------------|------|---------|
| `users` | `email` | UNIQUE | Prevent duplicate accounts |
| `users_enhanced` | `business_level` | CHECK(1-10) | Validate level range |
| `task_requests` | `status` | ENUM | Enforce valid state machine |
| `approval_stage_instances` | `status` | ENUM | Enforce valid states |
| `clients` | `tenant_id` | NOT NULL | Prevent orphan records |

---

*This document is the authoritative security contract for BISMAN ERP. All implementations must conform to rules defined herein. Deviations require explicit security review and documentation update.*

**Document Control:**
- Owner: Security Architecture Team
- Review Cycle: Quarterly
- Last Updated: 2026-01-05
