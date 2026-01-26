# BISMAN ERP - RBAC Page ↔ Module Mapping Audit Report

**Generated:** 2026-01-27 (Post-Fix)  
**Database:** Railway PostgreSQL (Source of Truth)  
**Status:** ✅ ALL FIXES APPLIED

---

## Executive Summary

| Metric | Before Fix | After Fix | Status |
|--------|------------|-----------|--------|
| Active Pages | 176 | 175 | ✅ |
| NULL module_id | 0 | 0 | ✅ |
| Duplicate Routes | 0 | 0 | ✅ |
| Non-UI in Sidebar | 0 | 0 | ✅ |
| Orphan Pages | 7 | 0 | ✅ Fixed |
| PUMP Pages Active | 1 | 0 | ✅ Deactivated |
| Pages with Roles | 159 | 163 | ✅ +4 assigned |
| Total Role Assignments | 425 | 432 | ✅ +7 new |

---

## Fixes Applied

### 1. Module Mapping Corrections
| Action | Pages Affected |
|--------|----------------|
| Moved `/admin/billing/*` from BILLING → ADMIN | 2 |
| Moved `/admin/reports` from REPORTS → ADMIN | 1 |

### 2. PUMP Module Deactivation
| Page Code | Route | Status |
|-----------|-------|--------|
| PUMP_MANAGEMENT_SERVER_LOGS | /pump-management/server-logs | ❌ Deactivated |

### 3. Category Corrections
| Action | Pages Affected |
|--------|----------------|
| `/welcome/*` pages: ROLE_SPECIFIC → RESTRICTED_COMMON | 3 |
| PUBLIC pages: Set is_public = true | 7 |

### 4. Orphan Pages - Role Assignments Added
| Page | Route | Roles Assigned |
|------|-------|----------------|
| Analytics | /analytics | ADMIN, ENTERPRISE_ADMIN, SUPER_ADMIN |
| Create Client | /clients/create | ADMIN, SALES_MANAGER |
| Activity Logs | /enterprise-admin/activity-logs | ENTERPRISE_ADMIN |
| Subscriptions | /enterprise-admin/subscriptions | ENTERPRISE_ADMIN |

### 5. Display Name Improvements
| Page Code | Old Name | New Name |
|-----------|----------|----------|
| SUPER_ADMIN_DASHBOARD | Dashboard | Super Admin Dashboard |
| ADMIN_DASHBOARD | Dashboard | Admin Dashboard |
| DASHBOARD_HOME | Dashboard | My Dashboard |

---

## Current State Validation

### ✅ All Validations Passed

| Check | Result |
|-------|--------|
| Pages with NULL module_id | 0 ✅ |
| Orphan UI pages (no roles) | 0 ✅ |
| PUBLIC pages with role assignments | 0 ✅ |
| Non-UI pages in sidebar | 0 ✅ |
| PUMP pages active | 0 ✅ |
| Duplicate routes | 0 ✅ |

---

## Module Distribution (Post-Fix)

| Module | Pages | Sidebar |
|--------|-------|---------|
| FINANCE | 36 | 32 |
| ENTERPRISE_ADMIN | 17 | 10 |
| OPERATIONS | 15 | 15 |
| COMPLIANCE | 14 | 14 |
| ADMIN | 14 | 10 |
| SUPER_ADMIN | 12 | 10 |
| COMMON | 11 | 4 |
| PROCUREMENT | 9 | 9 |
| QA | 8 | 4 |
| SUBSCRIPTIONS | 7 | 1 |
| PUBLIC | 5 | 0 |
| INTERNAL | 4 | 4 |
| HR | 4 | 4 |
| GOVERNANCE | 4 | 4 |
| ONBOARDING | 4 | 0 |
| SYSTEM | 4 | 3 |
| BILLING | 2 | 2 |
| AUTH | 2 | 0 |
| DASHBOARD | 2 | 1 |
| REPORTS | 1 | 1 |

---

## Health Summary

| Metric | Value |
|--------|-------|
| **Active Pages** | 175 |
| **Sidebar Pages** | 128 |
| **Pages with Role Assignments** | 163 |
| **Unique Roles** | 37 |
| **Total Role-Page Assignments** | 432 |

---

## Remaining Notes

### Route-Module Mismatches (Acceptable)
These pages have routes that don't match their module's base_route, but are semantically correct:

| Route | Module | Reason |
|-------|--------|--------|
| /reconciliation/* | FINANCE | Finance feature, shorthand URL |
| /settlements/* | FINANCE | Finance feature, shorthand URL |
| /welcome/* | ONBOARDING | Onboarding flow pages |
| /store-incharge | OPERATIONS | Role-specific dashboard |

### Duplicate Display Names (Acceptable)
Only "Subscriptions" appears twice — in different contexts (super-admin vs enterprise-admin).

---

## Audit Files Generated

All raw data exported to `docs/audit/`:
- `pages_null_module.csv`
- `duplicate_routes.csv`
- `duplicate_display_names.csv`
- `non_ui_sidebar.csv`
- `orphan_pages.csv`
- `pump_pages.csv`
- `dashboards.csv`
- `route_module_mismatch.csv`
- `modules_summary.csv`

---

## Scripts Available

| Script | Purpose |
|--------|---------|
| `scripts/export-rbac-audit.js` | Re-run audit and export CSVs |
| `scripts/rbac-page-module-fix.sql` | SQL fix script (already applied) |
| `scripts/rbac-validation-queries.sql` | Validation queries for psql |

---

**Audit Complete. System is healthy.** ✅
