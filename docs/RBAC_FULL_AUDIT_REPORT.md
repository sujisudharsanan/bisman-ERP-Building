# BISMAN ERP - RBAC Schema Detailed Audit Report

**Generated:** 2 February 2026  
**Database:** Railway Production (hopper.proxy.rlwy.net:30204/railway)  
**Auditor:** Automated Analysis  

---

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Pages | 300 | - |
| Active Pages | 168 | ✅ |
| Total Roles | 39 | ✅ |
| Sync Issues Between Tables | 33 roles | 🚨 CRITICAL |
| Orphan Roles | 0 | ✅ Fixed |
| Base User Pages | 10 | ✅ |

---

## 1️⃣ CORE MASTER TABLES (Definition Layer)

### 1.1 `pages_master` - Page Registry

**Purpose:** Single source of truth for all UI pages and routes

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `id` | integer | NO | Primary key |
| `page_code` | varchar | NO | Unique identifier (e.g., DASHBOARD_HOME) |
| `display_name` | varchar | NO | Human-readable name |
| `route` | varchar | NO | URL path |
| `module_id` | integer | YES | FK to modules_master |
| `icon` | varchar | YES | Icon identifier |
| `sort_order` | integer | YES | Display order |
| `is_active` | boolean | NO | Whether page is active |
| `show_in_sidebar` | boolean | NO | Show in navigation |
| `is_public` | boolean | YES | Public access allowed |
| `is_governed` | boolean | YES | Requires RBAC check |
| `is_compulsory` | boolean | NO | Auto-assigned to all roles |
| `category` | varchar | YES | Page category |
| `page_type` | varchar | YES | UI_PAGE, API_ROUTE, etc. |

**Statistics:**
- Total: 300 pages
- Active: 168 pages
- Sidebar: 144 pages
- Public: 29 pages
- Governed: 273 pages
- Compulsory: 7 pages

**✅ Status:** Correct schema, no issues

---

### 1.2 `rbac_roles` - Role Master

**Purpose:** Define all roles in the system

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `id` | integer | NO | Primary key |
| `name` | varchar | NO | Role code (e.g., OPERATIONS_MANAGER) |
| `display_name` | varchar | YES | Human-readable name |
| `description` | text | YES | Role description |
| `level` | integer | YES | Hierarchy level (1=lowest, 10=highest) |
| `status` | varchar | YES | active/inactive |
| `is_system_role` | boolean | YES | Cannot be modified |
| `data_scope` | varchar | NO | Data visibility scope |

**Total Roles:** 39

**Role Hierarchy:**
```
Level 10: BISMAN_* (Internal platform roles)
Level 9:  ENTERPRISE_ADMIN, SYSTEM_ADMIN
Level 8:  CEO, CFO, COO
Level 7:  *_MANAGER, *_INCHARGE, ADMIN_OPS
Level 6:  AUDITOR, COMPLIANCE, LEGAL, QA
Level 5:  ACCOUNTANT, HUB_INCHARGE, STORE_INCHARGE
Level 4:  ACCOUNTS, BANKER
Level 3:  IT_ADMIN, STAFF
Level 1:  BASE_USER, DEMO_USER
```

**✅ Status:** Correct schema, 14 missing roles were added

---

### 1.3 `modules_master` - Module Registry

**Purpose:** Group pages into functional modules

| Module Code | Display Name | Active Pages |
|-------------|--------------|--------------|
| ENTERPRISE_ADMIN | Enterprise Admin | 17 |
| SUPER_ADMIN | Super Admin | 10 |
| FINANCE | Finance & Accounting | 36 |
| OPERATIONS | Operations | 15 |
| COMPLIANCE | Compliance & Legal | 14 |
| ADMIN | Admin Console | 12 |
| COMMON | Common | 11 |
| PROCUREMENT | Procurement | 9 |
| QA | QA & Testing | 8 |
| SUBSCRIPTIONS | Subscriptions | 7 |
| PUBLIC | Public Pages | 5 |
| INTERNAL | Internal Operations | 4 |
| GOVERNANCE | Governance | 4 |
| HR | Human Resources | 4 |
| ONBOARDING | Onboarding | 4 |
| BILLING | Billing & Subscription | 2 |
| SYSTEM | System Administration | 2 |
| AUTH | Authentication | 2 |
| DASHBOARD | Dashboard | 1 |
| REPORTS | Reports | 1 |

**Total: 20 modules, 168 active pages**

---

## 2️⃣ PERMISSION TABLES (Role ↔ Page Mapping)

### 🚨 CRITICAL ISSUE: Dual Table System

There are **TWO tables** storing role-to-page permissions:

### 2.1 `role_page_access` (LEGACY - Currently Used for READs)

**Purpose:** Simple role → page permission mapping

| Column | Type | Purpose |
|--------|------|---------|
| `id` | integer | Primary key |
| `role_name` | varchar | Role code (FK to rbac_roles.name) |
| `page_id` | integer | FK to pages_master |
| `can_view` | boolean | View permission |
| `can_edit` | boolean | Edit permission |
| `can_delete` | boolean | Delete permission |
| `can_export` | boolean | Export permission |
| `granted_at` | timestamp | When granted |
| `granted_by` | integer | Who granted |
| `is_legacy` | boolean | Legacy marker |

**Row Count:** 410

**API Endpoints Using This Table:**
- `GET /api/governance/role-pages` → Used by Role Management UI
- `GET /api/governance/pages-by-role` → Used by page count display
- `GET /api/governance/my-routes` → Used for sidebar filtering

---

### 2.2 `admin_page_assignments` (NEW - Intended for Hierarchical Delegation)

**Purpose:** Hierarchical assignment with assigner tracking

| Column | Type | Purpose |
|--------|------|---------|
| `id` | integer | Primary key |
| `assigner_id` | integer | Who assigned |
| `assigner_type` | varchar | Role of assigner |
| `assignee_id` | integer | Who receives |
| `assignee_type` | varchar | Role receiving |
| `page_id` | integer | FK to pages_master |
| `page_key` | varchar | Page code |
| `tenant_id` | varchar | Tenant scope |
| `is_active` | boolean | Active assignment |
| `granted_at` | timestamp | When granted |
| `revoked_at` | timestamp | When revoked |

**Row Count:** 409

**API Endpoints Using This Table:**
- `GET /api/rbac/roles/:id/pages` → Role page listing
- `POST /api/rbac/roles/:id/pages` → Save (writes to BOTH tables)

---

### 2.3 🚨 DATA SYNC ISSUES

**The two tables are OUT OF SYNC for 33 roles!**

| Role | role_page_access | admin_page_assignments | Difference |
|------|------------------|------------------------|------------|
| SUPER_ADMIN | 19 | 168 | -149 |
| ADMIN | 12 | 168 | -156 |
| USER | 0 | 37 | -37 |
| SYSTEM_ADMIN | 64 | 0 | +64 |
| CFO | 41 | 0 | +41 |
| ACCOUNTANT | 36 | 0 | +36 |
| AUDITOR | 19 | 0 | +19 |
| COMPLIANCE | 18 | 0 | +18 |
| COO | 17 | 0 | +17 |
| ENTERPRISE_ADMIN | 17 | 0 | +17 |
| LEGAL | 15 | 0 | +15 |
| HUB_INCHARGE | 15 | 0 | +15 |
| STORE_INCHARGE | 15 | 0 | +15 |
| BISMAN_ENGINEERING | 12 | 0 | +12 |
| FINANCE_CONTROLLER | 10 | 0 | +10 |
| PROCUREMENT_OFFICER | 9 | 0 | +9 |
| QA | 8 | 0 | +8 |
| ACCOUNTS | 8 | 0 | +8 |
| BISMAN_FINANCE | 6 | 0 | +6 |
| BISMAN_BILLING | 6 | 0 | +6 |
| HR | 5 | 0 | +5 |
| HR_MANAGER | 5 | 0 | +5 |
| IT_ADMIN | 4 | 0 | +4 |
| BISMAN_CUSTOMER_CARE | 4 | 0 | +4 |
| BISMAN_SUPPORT | 4 | 0 | +4 |
| ACCOUNTS_PAYABLE | 4 | 0 | +4 |
| CEO | 3 | 0 | +3 |
| BANKER | 3 | 0 | +3 |
| STORE_INCHARGE_SR | 2 | 0 | +2 |
| SALES_MANAGER | 1 | 0 | +1 |
| TREASURY | 1 | 0 | +1 |
| BRANCH_INCHARGE | 1 | 0 | +1 |
| HUB_INCHARGE_SR | 1 | 0 | +1 |

**Only OPERATIONS_MANAGER and ADMIN_OPS are in sync (16 and 9 pages respectively).**

---

### 2.4 `base_user_pages` - Default Pages for All Users

**Purpose:** Pages automatically available to all authenticated users

| Page Code | Display Name | Route |
|-----------|--------------|-------|
| DASHBOARD_HOME | My Dashboard | /dashboard |
| COMMON_ABOUT_ME | About Me | /common/about-me |
| COMMON_ANALYTICS | Analytics | /analytics |
| COMMON_CALENDAR | Calendar | /common/calendar |
| COMMON_TASKS_CREATE | Create Task | /tasks/create |
| COMMON_SECURITY_SETTINGS | Security Settings | /common/security-settings |
| COMMON_USER_SETTINGS | User Settings | /common/user-settings |
| WELCOME | Welcome | /welcome |
| WELCOME_BRANDING | Welcome Branding | /welcome/branding |
| WELCOME_LAUNCHING | Welcome Launching | /welcome/launching |

**Total: 10 base user pages**

---

### 2.5 `superadmin_page_pool` - SuperAdmin Page Allocation

**Purpose:** Pages a SuperAdmin can delegate to others

| Column | Type | Purpose |
|--------|------|---------|
| `superadmin_id` | integer | SuperAdmin user ID |
| `page_id` | integer | Page they can delegate |
| `granted_by` | integer | Who granted this pool |
| `is_active` | boolean | Active allocation |

**Row Count:** 246

---

## 3️⃣ USER ROLE ASSIGNMENT TABLES

### 3.1 `rbac_user_roles` - User Role Assignments

**Purpose:** Assign roles to individual users

| Column | Type | Purpose |
|--------|------|---------|
| `user_id` | integer | FK to users |
| `role_id` | integer | FK to rbac_roles |
| `assigned_at` | timestamp | When assigned |
| `assigned_by` | integer | Who assigned |
| `is_active` | boolean | Active assignment |
| `expires_at` | timestamp | Optional expiry |

**Row Count:** 2 (Very low - most users get roles from `users.role` column)

**⚠️ Issue:** Users appear to have roles assigned directly in the `users` table rather than through `rbac_user_roles`. This is an architectural inconsistency.

---

## 4️⃣ ROOT CAUSE ANALYSIS

### Why You See "(0/167 selected)"

The display issue is caused by:

1. **API reads from `role_page_access`** → `/api/governance/role-pages`
2. **Data exists in `role_page_access`** → 410 rows
3. **But API result returns 0 for some roles**

**Root Cause:** The frontend fetches data correctly, but:
- `role_page_access` has data for 34 roles
- `admin_page_assignments` has data for only 6 roles
- When save happens, it writes to BOTH, but only for roles that were explicitly saved
- Historical data in `role_page_access` was never synced to `admin_page_assignments`

---

## 5️⃣ RECOMMENDED ARCHITECTURE

### Single Source of Truth Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     DEFINITION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  pages_master (300 pages)                                   │
│       ↓                                                     │
│  modules_master (20 modules)                                │
│       ↓                                                     │
│  rbac_roles (39 roles)                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  ❌ role_page_access (DEPRECATE)                            │
│       ↓                                                     │
│  ✅ admin_page_assignments (USE THIS - hierarchical)        │
│       ↓                                                     │
│  ✅ base_user_pages (10 default pages)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ASSIGNMENT LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  ✅ rbac_user_roles (user → role)                           │
│       ↓                                                     │
│  ✅ superadmin_page_pool (delegation pool)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     FILTER LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  plan_module_access (subscription → modules)                │
│  client_subscriptions (tenant → plan)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ ACTION ITEMS

### Immediate (Fix Display Issues)

#### Action 1: Sync `role_page_access` → `admin_page_assignments`

```sql
-- Copy all data from role_page_access to admin_page_assignments
INSERT INTO admin_page_assignments (
  assigner_id, assigner_type, assignee_id, assignee_type, 
  page_id, page_key, is_active, granted_at, created_at, updated_at
)
SELECT 
  0, 'SYSTEM',  -- assigner
  (SELECT id FROM rbac_roles WHERE name = rpa.role_name LIMIT 1), rpa.role_name,  -- assignee
  rpa.page_id, 
  (SELECT page_code FROM pages_master WHERE id = rpa.page_id),
  true, rpa.granted_at, NOW(), NOW()
FROM role_page_access rpa
WHERE rpa.can_view = true
AND NOT EXISTS (
  SELECT 1 FROM admin_page_assignments apa 
  WHERE apa.assignee_type = rpa.role_name AND apa.page_id = rpa.page_id AND apa.is_active = true
);
```

#### Action 2: Update API endpoints to read from `admin_page_assignments`

Modify `/api/governance/role-pages` in `governanceRoutes.js` to query `admin_page_assignments` instead of `role_page_access`.

### Medium-term (Clean Architecture)

1. Add database trigger to keep tables in sync during migration
2. Update all READ endpoints to use `admin_page_assignments`
3. Add deprecation logging for `role_page_access` queries

### Long-term (Full Migration)

1. Remove `role_page_access` sync from WRITE operations
2. Drop `role_page_access` table
3. Rename `admin_page_assignments` to `role_page_access` (optional)

---

## 7️⃣ API ENDPOINT MAPPING

| Endpoint | Method | Table(s) Used | Purpose |
|----------|--------|---------------|---------|
| `/api/governance/role-pages` | GET | role_page_access | Get pages for a role |
| `/api/governance/pages-by-role` | GET | role_page_access | Get all pages grouped by role |
| `/api/governance/my-routes` | GET | role_page_access | Get current user's accessible routes |
| `/api/rbac/roles/:id/pages` | GET | admin_page_assignments | Get pages for role by ID |
| `/api/rbac/roles/:id/pages` | POST | BOTH tables | Save role pages |

---

## 8️⃣ COMPLETE ROLE INVENTORY

| Role | Level | System | RPA Pages | APA Pages | Status |
|------|-------|--------|-----------|-----------|--------|
| BISMAN_BILLING | 10 | No | 6 | 0 | ⚠️ Out of sync |
| BISMAN_CUSTOMER_CARE | 10 | No | 4 | 0 | ⚠️ Out of sync |
| BISMAN_ENGINEERING | 10 | No | 12 | 0 | ⚠️ Out of sync |
| BISMAN_FINANCE | 10 | No | 6 | 0 | ⚠️ Out of sync |
| BISMAN_SUPPORT | 10 | No | 4 | 0 | ⚠️ Out of sync |
| ENTERPRISE_ADMIN | 9 | Yes | 17 | 0 | ⚠️ Out of sync |
| SUPER_ADMIN | 9 | Yes | 19 | 168 | ⚠️ Out of sync |
| SYSTEM_ADMIN | 9 | No | 64 | 0 | ⚠️ Out of sync |
| CEO | 8 | No | 3 | 0 | ⚠️ Out of sync |
| CFO | 8 | No | 41 | 0 | ⚠️ Out of sync |
| COO | 8 | No | 17 | 0 | ⚠️ Out of sync |
| ADMIN | 8 | No | 12 | 168 | ⚠️ Out of sync |
| ADMIN_OPS | 7 | No | 9 | 9 | ✅ In sync |
| BRANCH_INCHARGE | 7 | No | 1 | 0 | ⚠️ Out of sync |
| HUB_INCHARGE_SR | 7 | No | 1 | 0 | ⚠️ Out of sync |
| MANAGER | 7 | No | 0 | 0 | ✅ Empty |
| OPERATIONS_MANAGER | 7 | No | 16 | 16 | ✅ In sync |
| PROCUREMENT_OFFICER | 7 | No | 9 | 0 | ⚠️ Out of sync |
| SALES_MANAGER | 7 | No | 1 | 0 | ⚠️ Out of sync |
| STORE_INCHARGE_SR | 7 | No | 2 | 0 | ⚠️ Out of sync |
| TREASURY | 7 | No | 1 | 0 | ⚠️ Out of sync |
| AUDITOR | 6 | No | 19 | 0 | ⚠️ Out of sync |
| COMPLIANCE | 6 | No | 18 | 0 | ⚠️ Out of sync |
| LEGAL | 6 | No | 15 | 0 | ⚠️ Out of sync |
| QA | 6 | No | 8 | 0 | ⚠️ Out of sync |
| ACCOUNTANT | 5 | No | 36 | 0 | ⚠️ Out of sync |
| HR | 5 | No | 5 | 0 | ⚠️ Out of sync |
| HUB_INCHARGE | 5 | No | 15 | 0 | ⚠️ Out of sync |
| STORE_INCHARGE | 5 | No | 15 | 0 | ⚠️ Out of sync |
| ACCOUNTS | 4 | No | 8 | 0 | ⚠️ Out of sync |
| BANKER | 4 | No | 3 | 0 | ⚠️ Out of sync |
| IT_ADMIN | 3 | No | 4 | 0 | ⚠️ Out of sync |
| STAFF | 3 | No | 0 | 0 | ✅ Empty |
| BASE_USER | 1 | Yes | 0 | 0 | ✅ (uses base_user_pages) |
| DEMO_USER | 1 | No | 0 | 0 | ✅ Empty |

---

## 9️⃣ CONCLUSION

### Critical Issues Found:
1. **Dual table system** causes data inconsistency
2. **33 out of 39 roles** have mismatched data between tables
3. **APIs read from wrong table** for the UI display

### Recommended Fix Priority:
1. 🔴 **HIGH**: Sync `role_page_access` data to `admin_page_assignments`
2. 🟡 **MEDIUM**: Update READ APIs to use `admin_page_assignments`
3. 🟢 **LOW**: Deprecate and remove `role_page_access`

---

*Report generated by automated RBAC audit system*
