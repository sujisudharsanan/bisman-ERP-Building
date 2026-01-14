# 🔍 BISMAN ERP - Module Alignment Audit Report

**Generated:** January 14, 2026  
**Auditor:** Senior ERP Architect + Full-Stack Auditor  
**Scope:** Complete module/feature alignment between DB, Frontend, and Backend

---

## 📊 Executive Summary

| Metric | Count |
|--------|-------|
| **Total DB Features (master_feature_definitions)** | 26 |
| **Total Frontend Pages (page.tsx files)** | 174 |
| **Total Pages in PAGE_REGISTRY** | ~160+ |
| **Total Backend API Routes** | 80+ route files |
| **Total Hardcoded Menu Configs** | 3 (CRITICAL) |
| **Total Mismatches Detected** | 47+ |
| **P0 Critical Issues** | 5 |
| **P1 High Issues** | 12 |
| **P2 Medium Issues** | 18 |
| **P3 Cleanup Issues** | 12+ |

### 🚨 CRITICAL FINDING

**The ERP has MULTIPLE sources of truth for modules/features, causing access issues:**

1. `master_feature_definitions` table → 26 features (subscription/billing focused)
2. `modules` table → Business module definitions with routes
3. `roleLayoutConfig.ts` → **HARDCODED** menu items per role
4. `page-registry.ts` → 160+ pages with permissions (intended to be SSOT)
5. `ROLE_PERMISSIONS` in `rolePermissions.ts` → **HARDCODED** role permissions
6. `ROUTE_FEATURE_MAP` in middleware → API-to-feature mapping

---

## 1️⃣ Module Master Integrity Audit

### 1.1 Database: `modules` Table

**Schema:**
```sql
model modules {
  id            Int     @id
  module_name   String  @unique
  display_name  String
  description   String?
  route         String
  icon          String?
  productType   String
  is_active     Boolean @default(true)
  sort_order    Int?
  is_always_accessible Boolean @default(false)
}
```

**Status:** ✅ Well-structured with unique module_name

**Issues:**
- ⚠️ No direct link to frontend routes
- ⚠️ `productType` seems to be business-type filter (e.g., "PUMP", "RETAIL")
- ❌ Not used as menu source - frontend uses hardcoded config

### 1.2 Database: `master_feature_definitions` Table

**Current Features (26 total):**

| Category | Feature Codes |
|----------|--------------|
| `user_access` | user_creation, role_assignment, branch_creation, location_creation |
| `task_workflow` | task_creation, task_assignment, task_approval, task_reopen, task_attachments |
| `finance` | payment_request_creation, payment_approval, amount_approval_threshold, bank_transfer_execution, refund_processing |
| `reporting` | report_generation, report_download, export_to_excel, export_to_pdf |
| `banking` | bank_statement_upload, auto_reconciliation, manual_reconciliation, utr_trace |
| `documents` | file_upload, file_download, storage_usage |
| `system` | api_calls, webhook_triggers, audit_log_access |

**Issues:**
- ⚠️ These are subscription/billing features, NOT navigation modules
- ❌ Missing many actual frontend modules (HR, Compliance, QA, Governance, etc.)
- ❌ No route/page mapping in this table

---

## 2️⃣ Feature Master Integrity Audit

### 2.1 `plan_feature_controls` Table

**Purpose:** Links subscription plans to features with limits/pricing

**Plans Defined:**
- FREE
- BASIC
- STANDARD
- PREMIUM
- ENTERPRISE

**Issues:**
- ✅ Feature codes are consistent
- ⚠️ Feature codes don't map to frontend pages directly
- ⚠️ Missing many features that exist in code

### 2.2 Missing Features (Not in DB but exist in code)

| Feature Area | Missing Feature Codes |
|--------------|----------------------|
| HR | hr_policy, employee_management, leave_management, attendance |
| Compliance | compliance_dashboard, legal_case_management, contract_management |
| QA | test_tasks, issues, qa_dashboard |
| Governance | security_overview, rbac_structure, audit_integrity |
| Operations | inventory_management, kpi_dashboard |
| Enterprise Admin | monitoring, super_admin_management, module_management |

---

## 3️⃣ Frontend Route Reality Check

### 3.1 Actual Frontend Pages (174 total)

**By Module Path:**

| Module Path | Count | Examples |
|-------------|-------|----------|
| `/admin/*` | 18 | /admin, /admin/users, /admin/permissions |
| `/super-admin/*` | 19 | /super-admin/security, /super-admin/subscriptions |
| `/enterprise-admin/*` | 22 | /enterprise-admin/dashboard, /enterprise-admin/modules |
| `/finance/*` | 7 | /finance/executive-dashboard, /finance/payment-approval-queue |
| `/dashboard/*` | 3 | /dashboard, /dashboard/requests |
| `/common/*` | 11 | /common/task-approvals, /common/payment-request |
| `/auth/*` | 7 | /auth/login, /auth/forgot-password |
| `/system/*` | 14 | /system/user-management, /system/permission-manager |
| `/operations/*` | 2 | /operations/inventory-management, /operations/kpi-dashboard |
| `/compliance/*` | 2 | /compliance/compliance-dashboard, /compliance/legal-case-management |
| `/qa/*` | 9 | /qa, /qa/issues, /qa/test-tasks |
| `/governance/*` | 4 | /governance/security-overview, /governance/rbac-structure |
| `/internal/*` | 4 | /internal/customers, /internal/support-sessions |
| `/billing/*` | 2 | /billing, /billing/invoices |
| `/reports/*` | 2 | /reports/payment-summary, /reports/settlement-audit |
| Others | 48 | /reconciliation, /settlements, /calendar, etc. |

### 3.2 Pages Missing from DB Features Mapping

**CRITICAL:** 174 frontend pages exist, but only 26 features in `master_feature_definitions`

**Unmapped Pages (Examples):**
- `/governance/*` - All 4 pages (NO feature mapping)
- `/internal/*` - All 4 pages (NO feature mapping)
- `/qa/*` - All 9 pages (NO feature mapping)
- `/enterprise-admin/*` - All 22 pages (partial mapping)
- `/super-admin/system/*` - 8 pages (NO feature mapping)

---

## 4️⃣ Backend API Reality Check

### 4.1 API Route Registration (from app.js)

| API Path | Route File | Protected |
|----------|------------|-----------|
| `/api/auth` | auth.js | ❌ Public |
| `/api/upload` | upload.js | ✅ Authenticated |
| `/api/trial` | trialOtpOnboarding.js | ❌ Public |
| `/api/calls` | calls.js | ✅ Authenticated |
| `/api/health` | health.js | Mixed |
| `/api/privileges` | privilegeRoutes.js | ✅ Authenticated |
| `/api/pages` | pagesRoutes.js | ✅ Authenticated |
| `/api/permissions` | permissionsRoutes.js | ✅ Authenticated |
| `/api/reports` | reportsRoutes.js | ✅ Authenticated |
| `/api/calendar` | calendar.js | ✅ Authenticated |
| `/api/approval-dashboard` | approvalDashboardRoutes.js | ✅ Authenticated |
| `/api/task-approvals` | taskApprovalRoutes.js | ✅ Auth + TenantContext |
| `/api/payment-workflow` | paymentWorkflowRoutes.js | ✅ Auth + TenantContext |
| `/api/settlements` | settlementRoutes.js | ✅ Auth + TenantContext |
| `/api/reconciliation` | bankReconciliationRoutes.js | ✅ Auth + TenantContext |
| `/api/clarifications` | clarificationRoutes.js | ✅ Auth + TenantContext |
| `/api/reviews` | reviewRoutes.js | ✅ Auth + TenantContext |
| `/api/decision-load` | decisionLoadRoutes.js | ✅ Authenticated |
| `/api/chat` | modules/chat/routes | ✅ Authenticated |
| `/api/admin/tests` | testRunnerRoutes.js | ✅ Authenticated |
| `/api/admin/security` | securityMonitorRoutes.js | ✅ Authenticated |
| `/api/admin/usage` | adminUsage.js | ✅ Authenticated |
| `/api/audit` | auditRoutes.js | ✅ Authenticated |
| `/api/audit-integrity` | audit-integrity.js | ✅ Authenticated |
| `/api/security-governance` | security-governance.js | ✅ Authenticated |
| `/api/super-admin/subscriptions` | subscriptionManagement.ts | ✅ Authenticated |
| `/api/vendors` | vendors.ts | ✅ Authenticated |
| `/api/approvals` | approvals.ts | ✅ Authenticated |
| `/api/internal` | internal-operations.js | ✅ Authenticated |
| `/api/playbooks` | support-playbooks.js | ✅ Authenticated |
| `/api/fallback-logs` | fallbackLogsRoutes.js | ✅ Authenticated |
| `/api/deployment` | deployment.js | ✅ Authenticated |
| `/api/qa` | qaRoutes.js | ✅ Authenticated |
| `/api/backup` | backup.js | ✅ Authenticated |
| `/api/onboard` | onboarding.js | Mixed |
| `/api/welcome` | welcomeRoutes.js | ✅ Authenticated |
| `/api/billing` | billing.js | ✅ Authenticated |
| `/api/subscription-plans` | subscriptionPlans.js | ✅ Authenticated |
| `/api/micro-unlock` | microUnlockRoutes.js | ✅ Authenticated |
| `/api/analytics` | analytics.js | ✅ Authenticated |
| `/api/admin/tenants` | tenantDashboard.js | ✅ Authenticated |
| `/api/monitoring` | monitoring.js | ✅ Authenticated |

### 4.2 ROUTE_FEATURE_MAP (subscriptionEnforcement.js)

**Mapped Routes (74 patterns):**

```javascript
// User & Access
'POST /api/users': 'user_creation',
'POST /api/admin/users': 'user_creation',
'PUT /api/users/:id/role': 'role_assignment',

// Task & Workflow
'POST /api/tasks': 'task_creation',
'POST /api/tasks/:id/approve': 'task_approval',

// Finance & Payments
'POST /api/payment-requests': 'payment_request_creation',
'POST /api/payments/:id/approve': 'payment_approval',

// ... (74 total mappings)
```

**Issues:**
- ⚠️ Many API routes have NO feature mapping
- ❌ Read operations (GET) mostly unmapped
- ❌ Admin/Super Admin routes largely unmapped

---

## 5️⃣ Menu Source Check (Assumption Detector)

### 🚨 CRITICAL: Multiple Hardcoded Menu Sources

#### Source 1: `roleLayoutConfig.ts`

**Location:** `my-frontend/src/config/roleLayoutConfig.ts`

**Hardcoded Roles:**
- SUPER_ADMIN (8 menu items)
- ADMIN (8 menu items)
- MANAGER (7 menu items)
- STAFF (7 menu items)
- BRANCH_INCHARGE (7 menu items)
- HUB_INCHARGE (7 menu items)
- STORE_INCHARGE (5 menu items)
- CFO (7 menu items)
- IT_ADMIN (6 menu items)
- DEFAULT (5 menu items)

**Risk Rating:** 🔴 CRITICAL
- Menu items are hardcoded per role
- No DB-driven menu API
- Changes require code deployment

#### Source 2: `EnterpriseAdminSidebar.tsx`

**Location:** `my-frontend/src/components/EnterpriseAdminSidebar.tsx`

**Hardcoded:** 17 menu items for Enterprise Admin

**Risk Rating:** 🔴 CRITICAL

#### Source 3: `ROLE_PERMISSIONS` in `rolePermissions.ts`

**Location:** `my-frontend/src/common/rbac/rolePermissions.ts`

**Hardcoded Roles:** 18+ roles with full permission sets

**Risk Rating:** 🔴 CRITICAL

### Intended SSOT: `page-registry.ts`

**Location:** `my-frontend/src/common/config/page-registry.ts`

**Status:** 160+ pages registered with:
- Permissions
- Roles
- Module assignment
- Order

**Problem:** Not fully connected to sidebar generation for all roles!

---

## 6️⃣ Permission Enforcement Consistency

### 6.1 Backend Enforcement ✅

| Middleware | Applied To | Enforcement |
|------------|------------|-------------|
| `rbacEnforcer` | All `/api/*` | ✅ Global RBAC check |
| `subscriptionEnforcer` | Feature routes | ✅ Feature/limit check |
| `authenticate` | Protected routes | ✅ JWT verification |
| `setTenantContext` | Tenant routes | ✅ RLS context |
| `requireRole()` | Role-specific | ✅ Role validation |

### 6.2 Frontend Enforcement ⚠️

| Component | Enforcement |
|-----------|-------------|
| `BaseSidebar.tsx` | Uses `roleLayoutConfig` (hardcoded) |
| `EnterpriseAdminSidebar.tsx` | Hardcoded menu |
| Page guards | Uses `ROLE_PERMISSIONS` (hardcoded) |
| API calls | Rely on backend enforcement |

**Risk:** Frontend shows/hides based on hardcoded config, not DB permissions

---

## 7️⃣ Mismatch Detection Tables

### Table A: DB Modules vs Frontend Modules

| Module (DB `modules` table) | Frontend Path Exists | Menu Shows | Mismatch Type |
|-----------------------------|---------------------|------------|---------------|
| User Management | ✅ `/system/user-management` | ✅ | ✅ OK |
| Finance | ✅ `/finance/*` | ✅ | ✅ OK |
| HR | ⚠️ `/hr/policy` only | ❌ Limited | ⚠️ Incomplete |
| Compliance | ✅ `/compliance/*` | ❌ Not in menu | ❌ Missing in Menu |
| QA | ✅ `/qa/*` | ❌ Hidden | ⚠️ Intentionally hidden |
| Governance | ✅ `/governance/*` | ❌ Not in roleLayoutConfig | ❌ Missing in Menu |
| Internal | ✅ `/internal/*` | ❌ Hidden | ⚠️ Intentionally hidden |
| Pump Management | ⚠️ `/pump-management/*` | ❌ Limited | ⚠️ Incomplete |

### Table B: DB Features vs Frontend Screens

| Feature Code (DB) | Expected Route | Actual Route in Code | Mismatch Type |
|-------------------|----------------|---------------------|---------------|
| user_creation | `/admin/users/create` | ✅ `/admin/users/create` | ✅ OK |
| task_creation | `/tasks/create` | ✅ `/tasks/create` | ✅ OK |
| payment_request_creation | `/common/payment-request` | ✅ `/common/payment-request` | ✅ OK |
| bank_statement_upload | `/reconciliation/upload` | ✅ `/reconciliation/upload` | ✅ OK |
| report_generation | `/reports/*` | ✅ Multiple routes | ✅ OK |
| compliance_dashboard | Not in DB | ✅ `/compliance/compliance-dashboard` | ❌ Missing in DB |
| security_overview | Not in DB | ✅ `/governance/security-overview` | ❌ Missing in DB |
| monitoring | Not in DB | ✅ `/enterprise-admin/monitoring` | ❌ Missing in DB |

### Table C: DB Features vs Backend APIs

| Feature Code | API Path | Protected? | Mismatch Type |
|--------------|----------|------------|---------------|
| user_creation | POST `/api/users` | ✅ Yes | ✅ OK |
| task_creation | POST `/api/tasks` | ✅ Yes | ✅ OK |
| payment_approval | POST `/api/payments/:id/approve` | ✅ Yes | ✅ OK |
| audit_log_access | GET `/api/audit-logs` | ✅ Yes | ✅ OK |
| - | GET `/api/decision-load/*` | ✅ Yes | ⚠️ No feature mapping |
| - | `/api/governance/*` | ✅ Yes | ⚠️ No feature mapping |
| - | `/api/internal/*` | ✅ Yes | ⚠️ No feature mapping |
| - | `/api/qa/*` | ✅ Yes | ⚠️ No feature mapping |

---

## 8️⃣ Critical Issues (Prioritized)

### P0 - Security Issues (Fix Immediately)

| # | Issue | Location | Risk | Fix |
|---|-------|----------|------|-----|
| P0-1 | Hardcoded menus bypass DB permissions | `roleLayoutConfig.ts` | User sees pages they shouldn't | Migrate to DB-driven menu |
| P0-2 | ROLE_PERMISSIONS hardcoded | `rolePermissions.ts` | Permission drift | Sync from DB on login |
| P0-3 | No feature check for many GET APIs | `subscriptionEnforcement.js` | Unlimited access | Add GET route mappings |
| P0-4 | Enterprise Admin sidebar hardcoded | `EnterpriseAdminSidebar.tsx` | Cannot customize | Use page-registry |
| P0-5 | Multiple menu source files | 3 different files | Inconsistent UX | Consolidate to SSOT |

### P1 - Access Broken (Fix This Sprint)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P1-1 | Governance pages not in any menu | `roleLayoutConfig.ts` | Can't access /governance/* |
| P1-2 | Compliance pages not in menu | `roleLayoutConfig.ts` | Can't access /compliance/* |
| P1-3 | Operations pages incomplete | `roleLayoutConfig.ts` | Missing KPI, inventory |
| P1-4 | HR pages not in menu | `roleLayoutConfig.ts` | Only /hr/policy exists |
| P1-5 | Reports module not in sidebar | `roleLayoutConfig.ts` | /reports/* hidden |
| P1-6 | Store Incharge limited menu | `roleLayoutConfig.ts` | Missing key features |
| P1-7 | Internal pages not accessible | `roleLayoutConfig.ts` | /internal/* hidden |
| P1-8 | Pump management incomplete | `roleLayoutConfig.ts` | Only server-logs page |
| P1-9 | Legal module not in menu | `roleLayoutConfig.ts` | /legal/* not accessible |
| P1-10 | Billing pages not in menu | `roleLayoutConfig.ts` | /billing/* for non-admins |
| P1-11 | Onboarding pages not tracked | page-registry.ts | Missing from registry |
| P1-12 | Welcome flow not in registry | page-registry.ts | Missing from registry |

### P2 - Data Mismatch (Fix Next Sprint)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| P2-1 | DB features don't match frontend modules | `master_feature_definitions` | 26 features vs 15+ modules |
| P2-2 | Module names inconsistent | Various | "User Management" vs "system" |
| P2-3 | Route paths don't match module names | DB vs Frontend | /super-admin vs module_name |
| P2-4 | Subscription features != navigation features | Different tables | Billing vs Access |
| P2-5 | Page permissions stored as JSON | `module_assignments` | Not normalized |
| P2-6 | roleLayoutConfig doesn't use page-registry | Disconnect | Duplicate definitions |

### P3 - Cleanup (Backlog)

| # | Issue | Location |
|---|-------|----------|
| P3-1 | Remove hardcoded menus | `roleLayoutConfig.ts` |
| P3-2 | Remove duplicate EnterpriseAdminSidebar | `EnterpriseAdminSidebar.tsx` |
| P3-3 | Consolidate ROLE_PERMISSIONS | `rolePermissions.ts` |
| P3-4 | Add missing features to DB | `master_feature_definitions` |
| P3-5 | Remove dead routes | Various |
| P3-6 | Standardize module naming | DB + Frontend |

---

## 9️⃣ Fix Plan (Step-by-Step)

### Phase 1: Establish Single Source of Truth (Week 1)

#### Step 1.1: Create Module Registry API
```javascript
// New: /api/modules/menu
GET /api/modules/menu
Response: {
  modules: [
    { id, name, icon, route, order, permissions },
    ...
  ],
  pages: [
    { id, name, path, module, permissions, order },
    ...
  ]
}
```

#### Step 1.2: Create `modules_master` table
```sql
CREATE TABLE modules_master (
  id SERIAL PRIMARY KEY,
  module_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  base_route VARCHAR(200) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_hidden BOOLEAN DEFAULT FALSE,
  parent_module_id INT REFERENCES modules_master(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Step 1.3: Create `pages_master` table
```sql
CREATE TABLE pages_master (
  id SERIAL PRIMARY KEY,
  page_code VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  route VARCHAR(300) NOT NULL,
  module_id INT REFERENCES modules_master(id),
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  show_in_sidebar BOOLEAN DEFAULT TRUE,
  required_features TEXT[], -- Links to master_feature_definitions
  min_role_level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Step 1.4: Create `role_page_access` table
```sql
CREATE TABLE role_page_access (
  id SERIAL PRIMARY KEY,
  role_id INT REFERENCES rbac_roles(id),
  page_id INT REFERENCES pages_master(id),
  can_view BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by INT,
  UNIQUE(role_id, page_id)
);
```

### Phase 2: Migrate Existing Data (Week 2)

#### Step 2.1: Seed modules_master from page-registry.ts
```javascript
// Script: scripts/migrate-page-registry-to-db.js
const MODULES = require('../src/common/config/page-registry').MODULES;
const PAGE_REGISTRY = require('../src/common/config/page-registry').PAGE_REGISTRY;

// Insert modules
for (const [key, mod] of Object.entries(MODULES)) {
  await prisma.modules_master.upsert({
    where: { module_code: key },
    create: { module_code: key, display_name: mod.name, ... },
    update: { display_name: mod.name, ... }
  });
}

// Insert pages
for (const page of PAGE_REGISTRY) {
  await prisma.pages_master.upsert({...});
}
```

#### Step 2.2: Seed role_page_access from ROLE_PERMISSIONS
```javascript
// Map existing hardcoded permissions to DB
for (const [role, config] of Object.entries(ROLE_PERMISSIONS)) {
  const roleRecord = await prisma.rbac_roles.findUnique({ where: { name: role }});
  for (const permission of config.permissions) {
    // Map permission to pages and insert
  }
}
```

### Phase 3: Refactor Frontend (Week 3)

#### Step 3.1: Create useMenu hook
```typescript
// hooks/useMenu.ts
export function useMenu() {
  const { data } = useSWR('/api/modules/menu', fetcher);
  return {
    modules: data?.modules || [],
    pages: data?.pages || [],
    isLoading: !data
  };
}
```

#### Step 3.2: Update BaseSidebar.tsx
```typescript
// BEFORE (hardcoded):
const layoutConfig = roleLayoutConfig[user.roleName];

// AFTER (DB-driven):
const { pages, modules } = useMenu();
const menuItems = pages.filter(p => p.roles.includes(user.roleName));
```

#### Step 3.3: Delete hardcoded configs
- [ ] Remove `roleLayoutConfig.ts` after migration
- [ ] Remove `EnterpriseAdminSidebar.tsx` (use BaseSidebar)
- [ ] Deprecate `ROLE_PERMISSIONS` in `rolePermissions.ts`

### Phase 4: Add CI Validation (Week 4)

#### Step 4.1: Create consistency checker
```javascript
// scripts/check-module-consistency.js
async function validateConsistency() {
  const dbPages = await prisma.pages_master.findMany();
  const filePages = glob.sync('my-frontend/src/app/**/page.tsx');
  
  // Check for orphan pages (in files but not DB)
  const orphans = filePages.filter(f => !dbPages.find(p => p.route === pathFromFile(f)));
  
  // Check for dead links (in DB but no file)
  const deadLinks = dbPages.filter(p => !filePages.find(f => pathFromFile(f) === p.route));
  
  return { orphans, deadLinks };
}
```

#### Step 4.2: Add pre-commit hook
```bash
#!/bin/bash
# .husky/pre-commit
node scripts/check-module-consistency.js || exit 1
```

---

## 🔟 Recommended Data Model

### Final Table Structure

```
┌─────────────────────────┐
│     modules_master      │
├─────────────────────────┤
│ id (PK)                 │
│ module_code (UNIQUE)    │
│ display_name            │
│ description             │
│ icon                    │
│ base_route              │
│ sort_order              │
│ is_active               │
│ is_hidden               │
│ parent_module_id (FK)   │
└─────────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────────┐
│      pages_master       │
├─────────────────────────┤
│ id (PK)                 │
│ page_code (UNIQUE)      │
│ display_name            │
│ route                   │
│ module_id (FK)          │
│ icon                    │
│ sort_order              │
│ is_active               │
│ show_in_sidebar         │
│ required_features[]     │
│ min_role_level          │
└─────────────────────────┘
           │
           │ M:N
           ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    role_page_access     │────▶│      rbac_roles         │
├─────────────────────────┤     └─────────────────────────┘
│ id (PK)                 │
│ role_id (FK)            │
│ page_id (FK)            │
│ can_view                │
│ can_edit                │
│ granted_at              │
│ granted_by              │
└─────────────────────────┘
           │
           │ Links to
           ▼
┌─────────────────────────────────┐
│   master_feature_definitions    │ (Already exists - for subscription limits)
├─────────────────────────────────┤
│ id (PK)                         │
│ feature_code (UNIQUE)           │
│ feature_name                    │
│ category                        │
│ description                     │
└─────────────────────────────────┘
```

### Relationship Summary

1. **modules_master** → Groups pages into logical modules
2. **pages_master** → All navigable pages with routes
3. **role_page_access** → Which roles can access which pages
4. **master_feature_definitions** → Subscription/billing features (keep separate)
5. **plan_feature_controls** → Feature limits per plan

---

## ✅ Action Items Checklist

### Immediate (This Week)
- [ ] Create migration for `modules_master` table
- [ ] Create migration for `pages_master` table
- [ ] Create migration for `role_page_access` table
- [ ] Seed initial data from page-registry.ts
- [ ] Create `/api/modules/menu` endpoint

### Short-term (Next 2 Weeks)
- [ ] Create `useMenu` hook
- [ ] Update BaseSidebar to use API
- [ ] Remove EnterpriseAdminSidebar.tsx
- [ ] Deprecate roleLayoutConfig.ts
- [ ] Update ROLE_PERMISSIONS to load from DB

### Medium-term (Next Month)
- [ ] Add CI validation for module consistency
- [ ] Add admin UI for managing pages
- [ ] Add feature-to-page mapping in DB
- [ ] Create module management page for Enterprise Admin
- [ ] Document new architecture

---

## 📎 Appendix

### A. Files to Modify

| File | Action |
|------|--------|
| `my-frontend/src/config/roleLayoutConfig.ts` | DELETE after migration |
| `my-frontend/src/components/EnterpriseAdminSidebar.tsx` | DELETE after migration |
| `my-frontend/src/common/rbac/rolePermissions.ts` | Deprecate ROLE_PERMISSIONS |
| `my-frontend/src/components/layout/BaseSidebar.tsx` | Update to use API |
| `my-frontend/src/common/config/page-registry.ts` | Keep as reference, migrate to DB |
| `my-backend/lib/featureFlags.js` | Keep for subscription features |
| `my-backend/middleware/subscriptionEnforcement.js` | Keep, add more mappings |

### B. New Files to Create

| File | Purpose |
|------|---------|
| `database/migrations/XXX_modules_pages_master.sql` | New tables |
| `my-backend/routes/modulesRoutes.js` | Menu API |
| `my-backend/scripts/migrate-page-registry.js` | Migration script |
| `my-frontend/src/hooks/useMenu.ts` | Menu hook |
| `.github/workflows/module-consistency.yml` | CI check |

### C. API Endpoints to Create

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/modules/menu` | GET | Get menu for current user |
| `/api/modules/pages` | GET | Get all pages (admin) |
| `/api/modules/pages/:id` | PUT | Update page (admin) |
| `/api/modules/:id/pages` | GET | Get pages for module |
| `/api/roles/:id/pages` | GET | Get pages for role |
| `/api/roles/:id/pages` | PUT | Assign pages to role |

---

**Report End**

*This audit provides the foundation for establishing a single source of truth for ERP modules and features. Implementation should be prioritized based on the P0-P3 classification above.*
