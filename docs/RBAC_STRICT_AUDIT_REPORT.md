# 🔒 RBAC Approval Chain – Schema & Data Audit Report (STRICT)

**Date:** January 28, 2026  
**System:** BISMAN ERP (Railway Production)  
**Audit Type:** Security-Critical Schema Validation  
**Auditor:** AI Automated Security Audit  

---

## 🎯 Executive Verdict

# ❌ UNSAFE FOR PRODUCTION

**Blocking Issues:**
1. `admin_page_assignments` table is EMPTY (0 rows) - approval chain does not exist
2. Menu system uses `role_page_access` directly, bypassing 3-layer intersection
3. User creation grants ALL subscription pages without approval validation
4. Default behavior is ALLOW ALL when no approvals exist

---

## 🧩 PHASE 1 — Schema Inventory

### Table Analysis

| Table | Row Count | Authority | Type | Who Writes | Parent Dependency | Audited | Can Grant Access Alone? |
|-------|-----------|-----------|------|------------|-------------------|---------|------------------------|
| `users_enhanced` | 4 | User identity & hierarchy | Assignment | System/Admin | None | ✅ Yes | ❌ No (needs role) |
| `rbac_roles` | 25 | Role definitions | Definition | System | None | ✅ Yes | ❌ No (needs pages) |
| `pages_master` | 300 | Page definitions | Definition | System | `modules_master` | ✅ Yes | ❌ No (needs assignment) |
| `modules_master` | 20 | Module definitions | Definition | System | Self-ref | ✅ Yes | ❌ No |
| `role_page_access` | 474 | Role→Page mapping | Assignment | System/Admin | `pages_master` | ❌ **No granted_by audit** | ⚠️ **YES - THIS IS THE PROBLEM** |
| `rbac_user_permissions` | 690 | User→Page grants | Derived | System (auto-grant) | None | ❌ No | ⚠️ **YES** |
| `rbac_user_roles` | 2 | User→Role mapping | Assignment | Admin | `rbac_roles` | Partial | ❌ No (needs page check) |
| `admin_page_assignments` | **0** | Approval chain | **Approval** | EA/SA/Admin | None | ✅ Yes | ❌ **NO DATA EXISTS** |
| `client_subscriptions` | 1 | Tenant subscription | Assignment | System | `subscription_plans` | ✅ Yes | ❌ No |
| `subscription_plans` | 9 | Plan definitions | Definition | System | None | ✅ Yes | ❌ No |
| `plan_module_access` | 261 | Plan→Module mapping | Assignment | System | `subscription_plans` | ❌ No | ❌ No |
| `super_admins` | 1 | Super Admin identity | Identity | System | None | ✅ Yes | ❌ No |
| `clients` | 1 | Tenant/Client data | Identity | System/SA | `super_admins` | ✅ Yes | ❌ No |
| `audit_logs` | 2543 | Audit trail | Audit | System | None | N/A | ❌ No |

### Critical Schema Findings

#### 1. `admin_page_assignments` (THE APPROVAL TABLE)

```
┌─────────────────┬────────────────────────────┬─────────────┐
│ column_name     │ data_type                  │ is_nullable │
├─────────────────┼────────────────────────────┼─────────────┤
│ id              │ integer                    │ NO          │
│ assigner_id     │ integer                    │ NO          │
│ assigner_type   │ character varying          │ NO          │ ← ENTERPRISE_ADMIN | SUPER_ADMIN
│ assignee_id     │ integer                    │ NO          │
│ assignee_type   │ character varying          │ NO          │
│ page_id         │ integer                    │ YES         │ ← FK to pages_master
│ page_key        │ character varying          │ NO          │
│ tenant_id       │ character varying          │ YES         │
│ is_active       │ boolean                    │ YES         │ ← default true
│ granted_at      │ timestamp with time zone   │ YES         │
│ revoked_at      │ timestamp with time zone   │ YES         │
│ notes           │ text                       │ YES         │
└─────────────────┴────────────────────────────┴─────────────┘
```

**STATUS:** ❌ **TABLE IS EMPTY (0 ROWS)**

**Impact:** The entire approval chain is non-existent. The intended flow:
- Enterprise Admin → approves pages for → Super Admin
- Super Admin → approves pages for → Admin
- Admin → delegates to → Users

**Reality:** No approvals have ever been created.

#### 2. `role_page_access` (THE ACTUAL ACCESS CONTROL)

```
┌───────────────┬────────────────────────────┬─────────────┐
│ column_name   │ data_type                  │ is_nullable │
├───────────────┼────────────────────────────┼─────────────┤
│ role_name     │ character varying          │ NO          │
│ page_id       │ integer                    │ NO          │ ← FK to pages_master
│ can_view      │ boolean                    │ YES         │
│ can_edit      │ boolean                    │ YES         │
│ can_delete    │ boolean                    │ YES         │
│ granted_by    │ integer                    │ YES         │ ← ⚠️ NULLABLE, NO FK
│ auto_seeded   │ boolean                    │ YES         │
└───────────────┴────────────────────────────┴─────────────┘
```

**STATUS:** ⚠️ **THIS IS THE DE FACTO ACCESS CONTROL (474 ROWS)**

**Problems:**
1. `granted_by` is nullable with no FK - cannot trace who granted
2. No `tenant_id` - not tenant-scoped
3. No approval chain validation
4. Menu system queries this table DIRECTLY

#### 3. `rbac_user_permissions` (USER-LEVEL GRANTS)

```
┌──────────────┬────────────────────────────┬─────────────┐
│ column_name  │ data_type                  │ is_nullable │
├──────────────┼────────────────────────────┼─────────────┤
│ user_id      │ integer                    │ NO          │ ← legacy_id from users_enhanced
│ page_key     │ character varying          │ NO          │
└──────────────┴────────────────────────────┴─────────────┘
```

**STATUS:** ⚠️ **FLAT PERMISSION TABLE (690 ROWS)**

**Problems:**
1. No `granted_by` column - cannot audit who granted
2. No `source` column - cannot distinguish subscription vs manual grant
3. No FK to `pages_master` - uses string key, not integer ID
4. No approval chain validation
5. Unique constraint on (user_id, page_key) but no audit trail

---

## 🧩 PHASE 2 — Approval Chain Validation

### Intended Approval Chain

```
Subscription Pages
       ↓
Enterprise Admin approves → Super Admin
       ↓
Super Admin approves → Admin
       ↓
Admin assigns → Users
       ↓
Effective Access = Intersection of all layers
```

### Validation Results

| Link | Table Used | Can Store? | Data Exists? | Enforced? |
|------|-----------|------------|--------------|-----------|
| Enterprise Admin → Super Admin | `admin_page_assignments` | ✅ Yes | ❌ **0 rows** | ❌ **NO** |
| Super Admin → Admin | `admin_page_assignments` | ✅ Yes | ❌ **0 rows** | ❌ **NO** |
| Admin → User | `rbac_user_permissions` | ⚠️ Partial | ✅ 690 rows | ❌ **NO** |
| Role → Pages | `role_page_access` | ✅ Yes | ✅ 474 rows | ⚠️ **BYPASSES CHAIN** |
| Subscription → Modules | `plan_module_access` | ✅ Yes | ✅ 261 rows | ⚠️ **LAYER 1 ONLY** |

### Chain Status

| Link | Status | Reason |
|------|--------|--------|
| EA → SA | ❌ **BROKEN** | `admin_page_assignments` is empty |
| SA → Admin | ❌ **BROKEN** | `admin_page_assignments` is empty |
| Admin → User | ❌ **BROKEN** | `rbac_user_permissions` has no approval validation |
| Role → Page | ⚠️ **UNCONTROLLED** | Direct access without chain validation |

### Conclusion

**The approval chain is NOT materialized in data.** The schema supports it, but:
1. No data exists in `admin_page_assignments`
2. `role_page_access` is the actual source of truth
3. Enforcement is impossible without data

---

## 🧩 PHASE 3 — Default Behavior Audit (CRITICAL)

### Question: What happens when NO approval rows exist?

| Table/Service | Empty Result Behavior | Risk Level |
|---------------|----------------------|------------|
| `getEnterpriseApprovedPages()` | Returns `null` → **NO RESTRICTION** | 🔴 CRITICAL |
| `getSuperadminApprovedPages()` | Returns `null` → **NO RESTRICTION** | 🔴 CRITICAL |
| `menuRoutes.js` | Uses `role_page_access` directly → **BYPASSES** | 🔴 CRITICAL |
| `subscriptionPageGrant` | Grants ALL subscription pages → **NO FILTER** | 🔴 CRITICAL |

### Code Evidence

#### effectiveAccessService.js (Line ~115)

```javascript
// ❌ DANGEROUS: Empty = unrestricted
if (assignments.length === 0) {
  return null; // null means "no restriction"
}
```

**Risk:** When `admin_page_assignments` is empty, ALL pages pass the approval check.

**Exploit:**
1. Admin creates new user
2. `grantPagesForNewUser()` is called
3. `getEnterpriseApprovedPages()` returns `null` (no restrictions)
4. `getSuperadminApprovedPages()` returns `null` (no restrictions)
5. User gets ALL subscription pages
6. **Privilege escalation achieved**

#### menuRoutes.js (Line ~130)

```javascript
// ❌ DANGEROUS: Direct role_page_access query
const pagesResult = await client.query(`
  SELECT ... FROM pages_master p
  INNER JOIN role_page_access rpa ON rpa.page_id = p.id
  WHERE rpa.role_name = $1
  ...
`);
```

**Risk:** Menu shows ALL pages assigned to role, ignoring approval chain.

**Exploit:**
1. User logs in with role "ACCOUNTANT"
2. Menu queries `role_page_access` for "ACCOUNTANT"
3. Returns 38 pages (all seeded for that role)
4. No check if Enterprise Admin or Super Admin approved these pages
5. **User sees pages they shouldn't have access to**

### Default Behavior Verdict

| Scenario | Current Behavior | Correct Behavior |
|----------|-----------------|------------------|
| No EA approvals for SA | ⛔ ALLOW ALL | ⛔ DENY ALL |
| No SA approvals for Admin | ⛔ ALLOW ALL | ⛔ DENY ALL |
| No explicit user permissions | ⚠️ Role-based fallback | ⛔ DENY ALL |
| Empty approval table | ⛔ No restrictions | ⛔ Only common pages |

---

## 🧩 PHASE 4 — Privilege Escalation Simulation

### Scenario: Admin with partial approval creates a user

**Assumptions (based on data):**
- Admin user: legacy_id=2, role=ADMIN, business_level=10
- Tenant: 6b68f86a-225f-480f-ae29-292da9e565d3
- Subscription: ENTERPRISE plan (plan_id=5)

### Step-by-Step Simulation

#### Step 1: Admin clicks "Create User"

| What Happens | Table Consulted | Validation | Escalation? |
|--------------|-----------------|------------|-------------|
| Modal opens | None | None | ❌ |
| Role dropdown populated | `rbac_roles` | Excludes ADMIN/SUPER_ADMIN | ✅ OK |
| Branch dropdown populated | `branches` | Filtered by tenant | ✅ OK |

#### Step 2: Admin assigns role + pages to new user

| What Happens | Table Consulted | Validation | Escalation? |
|--------------|-----------------|------------|-------------|
| User created | `users_enhanced` | Business level check | ⚠️ Partial |
| Role assigned | `rbac_user_roles` | None | ⚠️ Partial |
| `grantPagesForNewUser()` called | `client_subscriptions` | None | ⚠️ Start |
| `computeEffectivePages()` called | `admin_page_assignments` | **EMPTY** | 🔴 **ESCALATION** |
| Returns all subscription pages | `plan_module_access` | No filter | 🔴 **ESCALATION** |
| Pages written to `rbac_user_permissions` | `rbac_user_permissions` | None | 🔴 **ESCALATION** |

**Result:** New user gets ALL pages from ENTERPRISE subscription, regardless of what Admin was approved for.

#### Step 3: Menu is rendered for new user

| What Happens | Table Consulted | Validation | Escalation? |
|--------------|-----------------|------------|-------------|
| `/api/modules/menu` called | `role_page_access` | Role match only | ❌ Bypasses chain |
| Pages returned | `pages_master` | show_in_sidebar only | ❌ Bypasses chain |
| Menu displayed | None | None | ❌ |

**Result:** User sees all pages for their role, regardless of approval chain.

#### Step 4: API is called directly

| What Happens | Table Consulted | Validation | Escalation? |
|--------------|-----------------|------------|-------------|
| Request to `/finance/general-ledger` | Backend middleware | Token valid | ⚠️ Depends |
| Page access check | `rbac_user_permissions` | User has page_key | ⚠️ Depends |
| If not in permissions | `role_page_access` | Role has page | 🔴 **ESCALATION** |

**Result:** If backend allows role-based fallback, user can access ANY page their role has in `role_page_access`.

---

## 🧩 PHASE 5 — DATA REALITY CHECK

### Current Data State

| Table | Rows | Data Quality | Authoritative? |
|-------|------|--------------|----------------|
| `users_enhanced` | 4 | ✅ Clean | ✅ Yes |
| `rbac_roles` | 25 | ✅ Clean | ✅ Yes |
| `pages_master` | 300 | ✅ Clean | ✅ Yes |
| `role_page_access` | 474 | ⚠️ No audit trail | ⚠️ Legacy noise |
| `rbac_user_permissions` | 690 | ⚠️ No source tracking | ⚠️ Legacy noise |
| `admin_page_assignments` | 0 | ❌ Empty | ❌ Not usable |
| `plan_module_access` | 261 | ✅ Clean | ✅ Yes |

### Can Approval Chain Be Retro-fitted?

| Question | Answer |
|----------|--------|
| Schema supports approval chain? | ✅ Yes (`admin_page_assignments` exists) |
| Data exists to populate chain? | ❌ No - must be manually configured |
| Can migrate `role_page_access` → `admin_page_assignments`? | ⚠️ Partially - no assigner info |
| Can migrate `rbac_user_permissions` → chain? | ❌ No - no source tracking |

### Migration Strategy

#### Option A: Bootstrap Approval Chain (Recommended)

1. **Create initial EA→SA approvals:**
   ```sql
   -- Enterprise Admin (id=?) approves ALL pages for Super Admin (id=3)
   INSERT INTO admin_page_assignments (assigner_id, assigner_type, assignee_id, assignee_type, page_key, is_active)
   SELECT 
     1 as assigner_id,  -- Enterprise Admin legacy_id (MUST IDENTIFY)
     'ENTERPRISE_ADMIN' as assigner_type,
     3 as assignee_id,  -- Super Admin legacy_id
     'SUPER_ADMIN' as assignee_type,
     page_code as page_key,
     true as is_active
   FROM pages_master
   WHERE is_active = true;
   ```

2. **Create initial SA→Admin approvals:**
   ```sql
   -- Super Admin (id=3) approves ALL pages for Admin (id=2)
   INSERT INTO admin_page_assignments (assigner_id, assigner_type, assignee_id, assignee_type, page_key, is_active)
   SELECT 
     3 as assigner_id,  -- Super Admin legacy_id
     'SUPER_ADMIN' as assigner_type,
     2 as assignee_id,  -- Admin legacy_id
     'ADMIN' as assignee_type,
     page_code as page_key,
     true as is_active
   FROM pages_master
   WHERE is_active = true;
   ```

3. **Change default behavior to DENY:**
   ```javascript
   // effectiveAccessService.js
   if (assignments.length === 0) {
     // Changed from: return null;
     return new Set(ALWAYS_ACCESSIBLE_PAGES); // Only common pages
   }
   ```

#### Data Loss Risks

| Risk | Mitigation |
|------|------------|
| Existing permissions revoked | Bootstrap all pages initially |
| Users lose access | Gradual rollout with fallback |
| Audit trail gaps | Log migration as system action |

#### Rollback Plan

1. Keep `role_page_access` as fallback for 30 days
2. Add feature flag: `USE_APPROVAL_CHAIN=true/false`
3. Monitor audit logs for access denials
4. Rollback by setting flag to false

---

## 🧩 PHASE 6 — Final Verdict

# ❌ UNSAFE FOR PRODUCTION

### Blocking Issues

| # | Issue | Severity | Fix Required |
|---|-------|----------|--------------|
| 1 | `admin_page_assignments` is empty | 🔴 CRITICAL | Bootstrap approval data |
| 2 | Menu bypasses approval chain | 🔴 CRITICAL | Use `effectiveAccessService` in menu |
| 3 | User creation grants all subscription pages | 🔴 CRITICAL | Validate against admin's approved pages |
| 4 | Default behavior is ALLOW ALL | 🔴 CRITICAL | Change to DENY ALL |
| 5 | `role_page_access` has no audit trail | 🟡 HIGH | Add `granted_by` FK and logging |
| 6 | `rbac_user_permissions` has no source tracking | 🟡 HIGH | Add `source` and `granted_by` columns |

### Required Fixes Before Release

| Priority | Task | Effort | Blocking? |
|----------|------|--------|-----------|
| P0 | Bootstrap `admin_page_assignments` with initial data | 1 day | ✅ YES |
| P0 | Update menu routes to use `effectiveAccessService` | 2 hours | ✅ YES |
| P0 | Change default from ALLOW to DENY | 1 hour | ✅ YES |
| P0 | Add admin limit validation to user creation | 2 hours | ✅ YES |
| P1 | Add approval management UI for EA | 3 days | ⚠️ Required soon |
| P1 | Add approval management UI for SA | 3 days | ⚠️ Required soon |
| P2 | Add audit columns to `role_page_access` | 1 day | ❌ No |
| P2 | Add source tracking to `rbac_user_permissions` | 1 day | ❌ No |

### Non-Negotiable Invariants

1. **Absence of approval data = DENY access** (not allow)
2. **Menu must use effective pages, not role pages**
3. **User creation must limit pages to creator's approved pages**
4. **All page grants must be auditable** (who, when, why)
5. **Approval chain must be enforced at API layer, not just UI**

---

## Appendix: Schema Diagrams

### Current (Broken) Flow

```
User Login
    ↓
Menu API ─────────────────────────────→ role_page_access (DIRECT!)
    ↓                                         │
Shows ALL pages for role                      │
    ↓                                         │
API Call ─────────────────────────────────────┘
    ↓
Backend checks rbac_user_permissions OR role_page_access
    ↓
ACCESS GRANTED (no approval check!)
```

### Correct (Fixed) Flow

```
User Login
    ↓
Menu API ────────→ effectiveAccessService.computeEffectivePages()
    ↓                      │
    │     ┌────────────────┴────────────────┐
    │     ↓                                 ↓
    │  subscription_pages        admin_page_assignments
    │     │                            │
    │     │    ┌───────────────────────┤
    │     │    ↓                       ↓
    │  Layer 1: Plan         Layer 2: EA→SA approval
    │     │                       ↓
    │     │              Layer 3: SA→Admin approval
    │     │                       ↓
    │     └──────→ INTERSECTION ←─┘
    │                   ↓
    │            effectivePages
    │                   ↓
Menu shows only effectivePages
    ↓
API Call ────────→ Check effectivePages
    ↓
ACCESS GRANTED/DENIED (approval enforced!)
```

---

**END OF AUDIT REPORT**
