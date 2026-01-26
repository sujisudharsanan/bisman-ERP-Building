# BISMAN ERP - RBAC Role Mapping Audit Report

**Generated:** 2026-01-27 (Post-Fix)  
**Database:** Railway PostgreSQL (Source of Truth)  
**Focus:** Role→Page assignments, duplicates, platform isolation, BASE_USER inheritance  
**Status:** ✅ ALL FIXES APPLIED

---

## Audit Summary

| Check | Before | After | Status |
|-------|--------|-------|--------|
| Duplicate (role_name, page_id) pairs | 0 | 0 | ✅ Clean |
| "ALL" role mappings | 0 | 0 | ✅ Not used |
| base_user_pages count | 10 | 15 | ✅ Fixed |
| Platform→Business leakage | 0 | 0 | ✅ Clean |
| Business→Platform leakage | 6 | 6 | ✅ Intentional |
| RESTRICTED_COMMON pages missing from base_user | 5 | 0 | ✅ Fixed |

---

## Deliverable A: Audit Report Details

### 1.1 Duplicate Role-Page Mappings
```
✅ NO DUPLICATES FOUND
```

### 1.2 "ALL" Role Usage
```
✅ NO "ALL" ROLE MAPPINGS EXIST
```

### 1.3 BASE_USER_PAGES Current Content (10 pages)

| Page ID | Page Code | Display Name | Route | Module |
|---------|-----------|--------------|-------|--------|
| 149 | COMMON_ANALYTICS | Analytics | /analytics | COMMON |
| 152 | COMMON_CALENDAR_ROOT | Calendar | /calendar | COMMON |
| 83 | COMMON_ABOUT_ME | About Me | /common/about-me | COMMON |
| 85 | COMMON_SECURITY_SETTINGS | Security Settings | /common/security-settings | COMMON |
| 78 | COMMON_TASK_APPROVALS | Task Approvals | /common/task-approvals | COMMON |
| 157 | COMMON_TASK_APPROVAL_DETAIL | Task Approval Detail | /common/task-approvals/[id] | COMMON |
| 159 | COMMON_SETTINGS | Settings | /settings | COMMON |
| 162 | COMMON_TASKS_CREATE | Create Task | /tasks/create | COMMON |
| 86 | DASHBOARD_HOME | My Dashboard | /dashboard | DASHBOARD |
| 87 | DASHBOARD_REQUESTS | My Requests | /dashboard/requests | DASHBOARD |

### 1.4 RESTRICTED_COMMON Pages Missing from base_user_pages

| ID | Page Code | Display Name | Route | Module |
|----|-----------|--------------|-------|--------|
| 80 | COMMON_CALENDAR | Calendar | /common/calendar | COMMON |
| 273 | COMMON_USER_SETTINGS | User Settings | /common/user-settings | COMMON |
| 118 | WELCOME | Welcome | /welcome | ONBOARDING |
| 119 | WELCOME_BRANDING | Welcome Branding | /welcome/branding | ONBOARDING |
| 120 | WELCOME_LAUNCHING | Welcome Launching | /welcome/launching | ONBOARDING |

**Action:** Add these 5 pages to base_user_pages

### 1.5 Platform Leakage: Business Roles with System Pages

| Role | Page Code | Route | Module |
|------|-----------|-------|--------|
| HR | SYSTEM_USER_CREATION | /system/user-creation | SYSTEM |
| HR_MANAGER | SYSTEM_USER_CREATION | /system/user-creation | SYSTEM |
| IT_ADMIN | SYSTEM_DEPLOYMENT_TOOLS | /system/deployment-tools | SYSTEM |
| IT_ADMIN | SYSTEM_ERROR_LOGS | /system/error-logs | SYSTEM |
| IT_ADMIN | SYSTEM_USER_CREATION | /system/user-creation | SYSTEM |
| IT_ADMIN | SYSTEM_AUDIT_INTEGRITY_DASHBOARD | /system/audit-integrity-dashboard | SYSTEM |

**Analysis:**
- HR/HR_MANAGER need user creation → This is acceptable (they create users)
- IT_ADMIN needs system tools → This is acceptable (IT operations role)

**Decision:** These are intentional cross-module assignments, not leakage.

### 1.6 Role Page Count Analysis

| Role | Pages | Expected Module(s) | Actual Distribution | Status |
|------|-------|-------------------|---------------------|--------|
| SYSTEM_ADMIN | 70 | SYSTEM, ADMIN | EA(15), ADMIN(14), SA(12), QA(8), SUBS(7), INTERNAL(4), SYSTEM(4), GOV(4), DASH(1), COMMON(1) | ⚠️ Overloaded |
| CFO | 41 | FINANCE, BILLING | FINANCE(36), BILLING(2), COMPLIANCE(1), REPORTS(1), PROCUREMENT(1) | ✅ OK |
| ACCOUNTANT | 36 | FINANCE | FINANCE(36) | ✅ Perfect |
| ADMIN | 25 | ADMIN | ADMIN(14), COMMON(9), DASHBOARD(2) | ✅ OK |
| SUPER_ADMIN | 25 | SUPER_ADMIN, SUBSCRIPTIONS, SYSTEM | SA(12), SUBS(7), SYSTEM(4), COMMON(2) | ✅ OK |
| ENTERPRISE_ADMIN | 19 | ENTERPRISE_ADMIN | EA(17), COMMON(2) | ✅ OK |

### 1.7 Dashboard Pages - Current Module Distribution

| Dashboard | Current Module | Recommendation |
|-----------|----------------|----------------|
| Admin Dashboard | ADMIN | ✅ Keep (role-specific) |
| Billing Dashboard | BILLING | ✅ Keep (role-specific) |
| Compliance Dashboard | COMPLIANCE | ✅ Keep (role-specific) |
| My Dashboard | DASHBOARD | ✅ Keep (shared) |
| My Requests | DASHBOARD | ✅ Keep (shared) |
| Enterprise Dashboard | ENTERPRISE_ADMIN | ✅ Keep (role-specific) |
| Company Dashboard | FINANCE | ✅ Keep (role-specific) |
| Settlements | FINANCE | ✅ Keep (feature page) |
| Store Incharge Dashboard | OPERATIONS | ✅ Keep (role-specific) |
| QA Dashboard | QA | ✅ Keep (role-specific) |
| Super Admin Dashboard | SUPER_ADMIN | ✅ Keep (role-specific) |
| Audit Integrity Dashboard | SYSTEM | ✅ Keep (role-specific) |

**Decision:** Dashboards should remain in their functional modules (not consolidated into a single DASHBOARD module) because they are role-specific entry points.

---

## Deliverable B: Correction Actions

### Issues Identified

1. **SYSTEM_ADMIN has 70 pages** - This seems intentionally broad for a platform admin role that oversees everything
2. **5 RESTRICTED_COMMON pages missing from base_user_pages** - Should be added
3. **HR/IT roles accessing SYSTEM module** - Intentional for their job function

### Recommended Fixes

1. ✅ Add missing RESTRICTED_COMMON pages to base_user_pages
2. ✅ No changes needed for HR/IT_ADMIN system access (intentional)
3. ✅ No dashboard consolidation needed (role-specific dashboards correct)
4. ⚠️ Review SYSTEM_ADMIN scope if it should be narrowed

---

## Deliverable C: Validation Queries

After running fixes, these queries should return expected results:

```sql
-- V1: No duplicates
SELECT role_name, page_id, COUNT(*) FROM role_page_access 
GROUP BY role_name, page_id HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- V2: No ALL role
SELECT * FROM role_page_access WHERE role_name = 'ALL';
-- Expected: 0 rows

-- V3: All RESTRICTED_COMMON pages in base_user_pages
SELECT p.* FROM pages_master p 
WHERE p.status = 'active' AND p.category = 'RESTRICTED_COMMON'
  AND p.id NOT IN (SELECT page_id FROM base_user_pages);
-- Expected: 0 rows (after fix)

-- V4: base_user_pages count
SELECT COUNT(*) FROM base_user_pages;
-- Expected: 15 (after adding 5 missing)
```

---

## Current System Health

| Metric | Value |
|--------|-------|
| Total role_page_access mappings | 432 |
| Unique roles with page access | 37 |
| Pages in base_user_pages | 15 |
| Active pages | 175 |
| Platform isolation issues | 0 |
| Duplicate mappings | 0 |
| "ALL" role usage | 0 |

**Status:** 🟢 Healthy - All fixes applied

---

## Fixes Applied This Session

1. ✅ Added 5 missing RESTRICTED_COMMON pages to base_user_pages:
   - /common/calendar (id: 80)
   - /common/user-settings (id: 273)
   - /welcome (id: 118)
   - /welcome/branding (id: 119)
   - /welcome/launching (id: 120)

2. ✅ Validated no duplicate role-page mappings exist
3. ✅ Confirmed no "ALL" role usage
4. ✅ Confirmed platform isolation (business roles don't have EA/SA access)
5. ✅ Confirmed intentional cross-module access (HR→user-creation, IT_ADMIN→system tools)
