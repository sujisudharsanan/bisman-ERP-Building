# BISMAN ERP System Audit Report

**Date:** 2026-01-05  
**Auditor:** Senior ERP System Auditor  
**Scope:** User creation, Role hierarchy, Privilege checks, Task assignment, Approval logic, Subscription limits, UI vs Backend enforcement

---

## 1️⃣ User Creation Audit

### Endpoint(s):
| Endpoint | File | Line Range |
|----------|------|------------|
| `POST /api/super-admin/users` | `my-backend/routes/super-admin.js` | 19 |
| `POST /api/enterprise-admin/users/bulk/import` | `my-backend/routes/enterprise-admin-Users.js` | 375 |
| `POST /api/internal/users` | `my-backend/routes/internal-operations.js` | 291-308 |
| Admin with Subscription Service | `my-backend/services/adminCreation/adminWithSubscriptionService.js` | 153-420 |

### Who can create users:
| Method | Allowed Roles | Enforcement Point |
|--------|---------------|-------------------|
| Super Admin API | SUPER_ADMIN only | `my-backend/routes/super-admin.js:13` - `requireSuperAdmin` middleware |
| Enterprise Admin API | ENTERPRISE_ADMIN | `my-backend/routes/enterprise-admin-Users.js` - `requireEnterpriseAdmin` |
| Admin with Subscription | ENTERPRISE_ADMIN (via `options.createdByRole`) | `my-backend/services/adminCreation/adminWithSubscriptionService.js:238-241` |

### Role/Level Comparison Used:
- **NOT ENFORCED** in `superAdminService.createUser()` - no check preventing SUPER_ADMIN from creating users with higher `business_level`
- `business_level` is hardcoded to `10` for admin users in `adminWithSubscriptionService.js:313`
- No validation that creator's role level >= created user's role level in the basic `POST /api/super-admin/users` endpoint

### Subscription/User-Limit Checks:
| Check | File | Line | Status |
|-------|------|------|--------|
| `enforceUsage('user_creation')` | `my-backend/routes/enterprise-admin-Users.js` | 375 | ENFORCED via `microUnlockEnforcer.js` |
| `checkSubscriptionLimits(clientId)` | `my-backend/services/adminCreation/adminWithSubscriptionService.js` | 495-564 | Service available but NOT called during `createUser` |
| Subscription middleware | `my-backend/middleware/subscriptionEnforcement.js` | 30-32 | Maps `POST /api/users` and `POST /api/admin/users` to `user_creation` feature |

**CRITICAL FINDING:** The `superAdminService.createUser()` in `my-backend/services/superAdminService.js:70-85` does **NOT** call subscription limit checks. Only the Enterprise Admin bulk import route has `enforceUsage('user_creation')`.

### Reporting Manager Validation:
- **NOT ENFORCED** - No validation of reporting manager relationship during user creation in any examined route

### Missing Validations:
1. No `business_level` hierarchy check during user creation via Super Admin API
2. No subscription limit check in `superAdminService.createUser()`
3. No reporting manager/hierarchy validation
4. No duplicate email check in Super Admin route (handled at DB level via unique constraint)

---

## 2️⃣ Role & Hierarchy Model

### Role List with Numeric Levels:

#### Global/Platform Roles (from `my-backend/services/rbacService.js:8-13`):
```javascript
const GLOBAL_ROLE_LEVELS = {
  ENTERPRISE_ADMIN: 100,
  SUPER_ADMIN: 90
}
```

#### Business Levels (from `my-backend/lib/approvalEngine.js:31-43`):
| Level | Key | Name | Description |
|-------|-----|------|-------------|
| 1 | L1 | Staff | Entry-level staff |
| 2 | L2 | Supervisor | Team supervisor |
| 3 | L3 | Incharge | Branch/Store/Hub Incharge |
| 4 | L4 | Officer | Procurement/Accounts Officer |
| 5 | L5 | Senior Officer | Senior officers |
| 6 | L6 | Manager | Department managers |
| 7 | L7 | Senior Manager | Operations/Senior managers |
| 8 | L8 | Controller | Finance Controller / Head |
| 9 | L9 | Executive | CFO / Admin / Director |
| 10 | L10 | Super Admin | Platform Super Admin |

#### Chat Service Role Levels (from `my-backend/src/services/chat/rbacService.ts:225-237`):
```typescript
const levels: Record<UserRole, number> = {
  'super-admin': 100,
  'admin': 90,
  'manager': 70,
  'accountant': 60,
  'hr': 60,
  'inventory-manager': 60,
  'employee': 40,
  'viewer': 10,
};
```

#### RBAC Roles Table (`my-backend/prisma/schema.prisma:88-106`):
- `rbac_roles.level` column exists (Int, default: 1)
- Roles stored in `rbac_roles` table with `name`, `description`, `level`, `status`

### Where Levels ARE Enforced:

| Location | Enforcement | File:Line |
|----------|-------------|-----------|
| Business Level Protection | Prevents unauthorized modification of `business_level` | `my-backend/middleware/businessLevelProtection.js:24-126` |
| Task Request Hierarchy Check | Subordinates cannot directly assign to superiors | `my-backend/services/taskRequestService.js:89-122` |
| Approval Engine | `business_level >= min_business_level` check | `my-backend/lib/approvalEngine.js:94-117` |
| Chat RBAC | `canActOnUser()` - checks if actor level > target level | `my-backend/src/services/chat/rbacService.ts:243` |
| RBAC Service Role Level Validation | Validates assigner's max role level | `my-backend/services/rbacService.js:369-400` |
| Payment Workflow | `business_level` used in approver selection | `my-backend/services/PaymentWorkflowServiceV2.js:329-358` |

### Where Levels are NOT Enforced:

| Location | Missing Enforcement | File:Line |
|----------|---------------------|-----------|
| Super Admin User Creation | No level check when creating users | `my-backend/services/superAdminService.js:70-85` |
| RBAC Role Creation | No validation on `level` field during role creation | `my-backend/services/rbacService.js:97-111` |
| Role Assignment | `assignUserRole()` doesn't validate assigner vs role levels | `my-backend/services/rbacService.js:159-173` |
| Basic Task Routes | `taskRoutes.js` - no hierarchy check on POST `/` | `my-backend/routes/taskRoutes.js:255-301` |

---

## 3️⃣ Privilege Model

### Privilege Storage Model: **HYBRID (RBAC tables + hardcoded)**

#### RBAC Tables (from `my-backend/prisma/schema.prisma`):
| Table | Purpose |
|-------|---------|
| `rbac_roles` | Role definitions with `level` |
| `rbac_actions` | Action definitions (CRUD operations) |
| `rbac_routes` | Route/endpoint definitions |
| `rbac_permissions` | Role-Action-Route mappings (granted: boolean) |
| `rbac_user_roles` | User-to-Role assignments |
| `rbac_user_permissions` | Direct user-to-page permissions |

#### Module-Level Permissions:
- `client_module_permissions` table: `can_view`, `can_create`, `can_edit`, `can_delete` per client-module pair
- Stored in `my-backend/prisma/schema.prisma:457-476`
- `module_approval_flows` table defines approval levels per module (`my-backend/prisma/schema.prisma:418-435`)

#### Action-Level Permissions:
- `rbac_permissions` joins `role_id`, `action_id`, `route_id` with `granted` flag
- Actions are stored in `rbac_actions` table
- Permission check: `my-backend/services/rbacService.js:307-330` - `checkUserPermission(userId, action, routePath, method)`

### Admin vs SuperAdmin Differences:

| Capability | ADMIN | SUPER_ADMIN | ENTERPRISE_ADMIN |
|------------|-------|-------------|------------------|
| User Creation | NOT in `requireSuperAdmin` | YES | YES |
| Business Level Changes | YES (via Enterprise routes) | NO (blocked in `superAdminService.updateUser`) | YES |
| Cross-Tenant Access | NO (tenant-isolated) | Limited to assigned modules | YES (full) |
| System Settings | NO | Partial | YES |
| Direct Table Access | NO | YES (`my-backend/routes/super-admin.js:57-58`) | NO |

**Hardcoded Checks (from `my-backend/middleware/rbac.js:46-56`):**
```javascript
requireSuperAdmin: () => rbac.requireRole(['Super Admin', 'super_admin'])
requireAdmin: () => rbac.requireRole(['Super Admin', 'Admin', 'super_admin', 'admin'])
```

---

## 4️⃣ Task Assignment Behavior

### Normal Assignment Rules:

**Location:** `my-backend/controllers/taskControllerV2.js:534-571`

**Logic:**
1. Task creation requires `authenticateToken` middleware
2. If `assigneeId` is provided and `skipHierarchyCheck` is false:
   - Calls `taskRequestService.checkAssignmentHierarchy(userId, assigneeId)`
   - Returns 403 with code `HIERARCHY_REQUIRES_REQUEST` if subordinate → superior

### Subordinate → Superior Handling:

**Location:** `my-backend/services/taskRequestService.js:89-122`

```javascript
// checkAssignmentHierarchy logic:
if (creatorRole.level >= assigneeRole.level) {
  return { canAssignDirectly: true, requiresRequest: false }
}
// Subordinate to superior = requires request
return { canAssignDirectly: false, requiresRequest: true }
```

### Request vs Task Conversion Logic:

**Location:** `my-backend/services/taskRequestService.js:127-218`

1. Task Requests are stored in `task_requests` table with status enum: `REQUESTED`, `NEED_INFO`, `DEFERRED`, `ACCEPTED`, `DELEGATED`, `REJECTED`, `CANCELLED`
2. Request → Task conversion happens when superior accepts (status = `ACCEPTED`)
3. State machine defined in `validRequestTransitions` object (`my-backend/services/taskRequestService.js:34-57`)

### Backend Enforcement Status:
- **ENFORCED** in `taskControllerV2.js` (V2 API)
- **NOT ENFORCED** in `taskRoutes.js` (V1 API) - basic POST `/` has no hierarchy check
- Can be bypassed via `skipHierarchyCheck: true` parameter

---

## 5️⃣ Approval & Escalation Logic

### Approval Chain Source:

**Location:** `my-backend/lib/approvalEngine.js:270-330` (`buildApprovalChain`)

1. Checks module access via `clientHasModuleAccess(clientId, moduleId)`
2. Fetches approval steps from `module_approval_flows` table ordered by `step_order`
3. For each step, finds approvers where `business_level >= min_business_level`

### Missing Role/User Behavior:

**Location:** `my-backend/lib/approvalEngine.js:148-193` (`getApproverForStep`)

**Fallback Order:**
1. Find user with `business_level >= min_business_level` (lowest eligible first)
2. If NONE found → `getClientAdminFallback(clientId)` - finds user with `user_type = 'ADMIN'`
3. Returns `{ isFallback: true }` when admin fallback is used

### Auto-Approve/Auto-Escalate Rules:

**Location:** `my-backend/src/services/ApprovalWorkflowService.ts:301-395`

**Fallback Strategies (from schema `my-backend/prisma/schema.prisma:810`):**
```
fallback_strategy: 'auto_assign_admin' | 'auto_approve' | 'escalate_to_owner' | etc.
```

**Auto-Approve Implementation (`ApprovalWorkflowService.ts:401-442`):**
```typescript
private async autoApproveStage(stageInstance, reason, initiatorId, stageName, isUltimateFallback) {
  // Updates status to 'auto_approved'
  // Logs audit with fallback_applied = 'auto_approve'
}
```

**Escalation Chain:**
1. Primary fallback strategy from `ApprovalWorkflowStage.fallback_strategy`
2. Secondary fallback from `ApprovalWorkflowStage.secondary_fallback`
3. Ultimate safety net: Auto-approve if all fallbacks fail (`ApprovalWorkflowService.ts:387-391`)

### Timeout Handling:

**Schema fields (`my-backend/prisma/schema.prisma:815-816`):**
```
sla_hours: Int (default: 24)
escalation_hours: Int (default: 48)
```

**NOT ENFORCED via cron/scheduler** - The `due_at` field is populated but no automatic escalation process found.

---

## 6️⃣ Visibility & Data Access

### How Data is Filtered by User:

**Tenant Isolation Middleware:**
- `my-backend/middleware/tenantIsolation.js:26-76`
- Attaches `req.tenantFilter = { tenant_id: req.user.tenant_id }` for regular users
- ENTERPRISE_ADMIN and SUPER_ADMIN bypass tenant filtering (lines 33-36)

**Task Filtering (`my-backend/controllers/taskControllerV2.js:146-162`):**
```sql
WHERE (
  t.creator_id = $N 
  OR t.assignee_id = $N
  OR t.approver_id = $N
  OR EXISTS (SELECT 1 FROM task_participants tp WHERE tp.task_id = t.id AND tp.user_id = $N)
)
```

### Cross-Department Visibility:
- **NO explicit department filtering** found in task queries
- Users can see all tasks within their tenant where they are creator/assignee/approver/participant
- `client_module_permissions` controls module access, not department

### Any Unrestricted Queries:

| Query | File:Line | Risk |
|-------|-----------|------|
| `prisma.user.findMany({})` | `my-backend/middleware/tenantIsolation.js:86` (example in comments) | LOW - example only |
| `SELECT * FROM knowledge_base` | `my-backend/src/services/copilateSmartAgent.ts:760` | MEDIUM - no tenant filter |
| `SELECT * FROM non_privileged_users` | `my-backend/src/routes/vendors.ts:433` | HIGH - no WHERE clause |
| `SELECT * FROM tasks` (chat service) | `my-backend/src/services/chat/taskService.ts:85,309,330` | MEDIUM - user_id filter added later |

---

## 7️⃣ UI vs Backend Enforcement Gaps

### Rules Enforced ONLY in Frontend:

| Rule | Frontend Location | Backend Status |
|------|-------------------|----------------|
| Permission-based menu visibility | `my-frontend/src/lib/permissions.ts:75-89` | Partial - routes protected but not all |
| Role hierarchy display (L1-L10) | `my-frontend/src/hooks/useRoleDisplay.ts` | Level values from backend but display is frontend |
| Subscription limit warning UI | `my-frontend/src/hooks/useSubscriptionLimits.ts` | Backend has checks but defaults to `allow on error` |

### Rules Enforced ONLY in Backend:

| Rule | Backend Location | Frontend Status |
|------|------------------|-----------------|
| Tenant isolation | `my-backend/middleware/tenantIsolation.js` | Frontend assumes data is pre-filtered |
| Business level modification protection | `my-backend/middleware/businessLevelProtection.js` | No UI prevents submission |
| RBAC permission checks | `my-backend/middleware/rbacAuth.js:43-65` | Frontend has separate permission system |

### High-Risk Inconsistencies:

1. **Subscription Limits Fail-Open:**
   - Backend: `my-backend/middleware/subscriptionEnforcement.js:354` - `failMode = 'open'` default
   - Frontend: `my-frontend/src/hooks/useSubscriptionLimits.ts:73-77` - defaults to `can_create_user: true` on error
   - **RISK:** Both fail open - user creation not blocked on errors

2. **Task Assignment Hierarchy:**
   - Backend V2: Enforced (`my-backend/controllers/taskControllerV2.js:548-571`)
   - Backend V1: **NOT enforced** (`my-backend/routes/taskRoutes.js:255`)
   - Frontend: Calls hierarchy check API but could bypass with direct V1 API call

3. **Permission Systems Mismatch:**
   - Backend: Uses `rbac_*` tables with route/action/role model
   - Frontend: Uses hardcoded `ROLE_PERMISSIONS` map (`my-frontend/src/lib/permissions.ts:29-62`)
   - **RISK:** Permissions not synchronized

4. **Admin Role Bypass:**
   - Frontend: `hasPermission()` returns `true` for SYSTEM_ADMIN, ADMIN, SUPER_ADMIN regardless of permission (`my-frontend/src/lib/permissions.ts:76-77`)
   - Backend: Varies by middleware - some routes check specific roles, others check permissions

---

## 8️⃣ Database Constraints

### Foreign Key Constraints (User-Related):

| Table | Column | References | On Delete | File:Line |
|-------|--------|------------|-----------|-----------|
| `super_admins` | `created_by` | `enterprise_admins.id` | CASCADE | `schema.prisma:213` |
| `clients` | `super_admin_id` | `super_admins.id` | CASCADE | `schema.prisma:285` |
| `rbac_user_roles` | `role_id` | `rbac_roles.id` | CASCADE | `schema.prisma:134` |
| `rbac_permissions` | `role_id` | `rbac_roles.id` | CASCADE | `schema.prisma:79` |
| `rbac_permissions` | `action_id` | `rbac_actions.id` | CASCADE | `schema.prisma:78` |
| `audit_logs` | `session_id` | `user_sessions.id` | NoAction | `schema.prisma:34` |

### Enum / Check Constraints:

| Table | Column | Constraint Type | Values | Location |
|-------|--------|-----------------|--------|----------|
| `tasks` (chat) | `status` | CHECK | `pending, in_progress, completed, cancelled` | `chat/taskService.ts:414` |
| `tasks` (chat) | `priority` | CHECK | `low, medium, high, urgent` | `chat/taskService.ts:415` |
| `tasks` (chat) | `source` | CHECK | `chat, manual, system` | `chat/taskService.ts:416` |
| `rbac_roles` | `status` | VARCHAR(20) | Default: 'active' | `schema.prisma:99` |
| `approval_instances` | `status` | VARCHAR(20) | Default: 'draft' | `schema.prisma:829` |
| `approval_stage_instances` | `status` | VARCHAR(20) | Default: 'pending' | `schema.prisma:866` |

**Note:** Most enums are enforced at application level, not DB level. The Prisma schema uses `String` types with defaults rather than PostgreSQL ENUM types.

### Soft Delete vs Hard Delete:

| Table | Delete Type | Implementation | Location |
|-------|-------------|----------------|----------|
| `users` / `users_enhanced` | Soft (`is_active`) | `is_active: Boolean` flag | Throughout |
| `clients` | Soft | `is_active: Boolean`, `status` | `schema.prisma:249,259` |
| `rbac_roles` | Soft | `status` column, `is_active` flag | `schema.prisma:99,108` |
| `rbac_permissions` | Soft | `is_active` flag | `schema.prisma:75` |
| `user_sessions` | Soft | `is_active`, `expires_at` | `schema.prisma:175-176` |
| `rbac_user_roles` | Soft | `is_active`, `expires_at` | `schema.prisma:133,135` |
| `approval_delegation` | Soft | `is_active`, `revoked_at` | `schema.prisma:945-946` |

**Hard Deletes:** CASCADE on most FK relationships means deleting parent deletes children.
- Deleting `enterprise_admin` → cascades to `super_admins` → cascades to `clients`
- Deleting `client` → cascades to module permissions, usage events, role assignments
- Deleting `rbac_roles` → cascades to `rbac_permissions`, `rbac_user_roles`

---

## Summary of Critical Findings

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| 1 | Subscription limits default to ALLOW on error (fail-open) | HIGH | `subscriptionEnforcement.js:354`, `useSubscriptionLimits.ts:73` |
| 2 | V1 Task API lacks hierarchy enforcement | HIGH | `taskRoutes.js:255` |
| 3 | `superAdminService.createUser()` skips subscription checks | MEDIUM | `superAdminService.js:70-85` |
| 4 | No automatic SLA timeout escalation implemented | MEDIUM | Schema has fields, no cron found |
| 5 | Permission systems not synchronized frontend/backend | MEDIUM | Multiple locations |
| 6 | Some queries lack tenant filtering | MEDIUM | `vendors.ts:433`, `copilateSmartAgent.ts:760` |
| 7 | `business_level` not validated during user creation | MEDIUM | `superAdminService.js:70-85` |
| 8 | Reporting manager validation missing | LOW | All user creation endpoints |

---

*Report generated from codebase analysis. All claims reference specific files and line numbers.*
