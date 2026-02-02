# RBAC Schema Audit Report

**Date:** 2 February 2026  
**Database:** Railway Production  

---

## 📊 SCHEMA OVERVIEW

### 1️⃣ CORE MASTER TABLES (Definition Layer)

| Table | Purpose | Row Count | Status |
|-------|---------|-----------|--------|
| `rbac_roles` | Role master | 25 | ✅ Correct |
| `pages_master` | Page/route master | 300 | ✅ Correct |
| `modules_master` | Module master | 20 | ✅ Correct |

**Analysis:**
- ✅ `rbac_roles` contains role definitions without page IDs
- ✅ `pages_master` is the single source for page definitions
- ✅ `modules_master` contains module definitions

---

### 2️⃣ ROLE ↔ PAGE MAPPING TABLES (Permission Layer)

| Table | Purpose | Row Count | Status |
|-------|---------|-----------|--------|
| `role_page_access` | Global role→page permissions | 410 | ⚠️ Primary |
| `admin_page_assignments` | Hierarchical assignments | 409 | ⚠️ Duplicate |
| `base_user_pages` | Default pages for all users | 10 | ✅ OK |
| `superadmin_page_pool` | Pages assigned to SuperAdmins | 246 | ✅ OK |

**🚨 CRITICAL ISSUE: DUAL TABLE SYSTEM**

```
role_page_access         admin_page_assignments
─────────────────        ──────────────────────
• role_name → page_id    • assigner_type → assignee_type → page_id
• Simple flat model      • Hierarchical delegation model
• 410 rows               • 409 rows (nearly identical)
```

**What's happening:**
1. `role_page_access` is the LEGACY table (simpler, flat)
2. `admin_page_assignments` is the NEW table (supports hierarchical delegation)
3. Both tables are being maintained in sync
4. APIs read from `role_page_access`
5. Save operations write to BOTH

---

### 3️⃣ USER/TENANT ROLE ALLOCATION (Assignment Layer)

| Table | Purpose | Row Count | Status |
|-------|---------|-----------|--------|
| `rbac_user_roles` | Assign roles to users | 2 | ⚠️ Low |
| `client_role_assignments` | Client-specific role assignments | ? | Check |

---

### 4️⃣ SUBSCRIPTION/PLAN TABLES (Filter Layer)

| Table | Purpose | Status |
|-------|---------|--------|
| `subscription_plans` | Plan definitions | ✅ |
| `plan_module_access` | Which modules per plan | ✅ |
| `subscription_page_features` | Feature flags per page | ⚠️ Check |

---

## 🔴 IDENTIFIED ISSUES

### Issue 1: Orphan Roles in role_page_access

**14 roles exist in `role_page_access` but NOT in `rbac_roles`:**

```
BISMAN_FINANCE, AUDITOR, SALES_MANAGER, QA, BISMAN_BILLING,
ENTERPRISE_ADMIN, ACCOUNTANT, BISMAN_SUPPORT, BRANCH_INCHARGE,
BISMAN_CUSTOMER_CARE, HUB_INCHARGE_SR, HR, BISMAN_ENGINEERING,
STORE_INCHARGE_SR
```

**Impact:** These roles have page assignments but can't be selected in the UI because they don't exist in `rbac_roles`.

**Fix:** Either:
1. Add these roles to `rbac_roles`, OR
2. Remove orphan assignments from `role_page_access`

---

### Issue 2: Dual Table Maintenance

**Problem:** 
- `role_page_access` (legacy) and `admin_page_assignments` (new) both store role→page mappings
- Code must maintain both in sync
- If sync fails, data diverges

**Current State:** ✅ Tables are in sync (both show 16 pages for OPERATIONS_MANAGER)

**Recommendation:** 
- Migrate fully to `admin_page_assignments`
- Update all READ operations to use `admin_page_assignments`
- Deprecate `role_page_access`

---

### Issue 3: Missing roles in rbac_roles

**Only 25 roles in `rbac_roles` but 34 unique role names in `role_page_access`**

This means the Role Management UI can only see 25 roles, but 34 actually have permissions.

---

## ✅ RECOMMENDED SINGLE SOURCE OF TRUTH

```
pages_master (300 pages)
       ↓
role_page_access (global permission - DEPRECATE)
       ↓
admin_page_assignments (hierarchical - USE THIS)
       ↓
rbac_user_roles (user → role)
       ↓
plan_module_access (subscription filter only)
```

---

## 🛠️ ACTION ITEMS

### Immediate (Fix Display Issues)

1. **Add missing roles to `rbac_roles`:**
   ```sql
   INSERT INTO rbac_roles (name, display_name, level, status, is_system_role)
   SELECT DISTINCT role_name, 
          REPLACE(INITCAP(REPLACE(role_name, '_', ' ')), ' ', '_'),
          5, 'active', false
   FROM role_page_access
   WHERE role_name NOT IN (SELECT name FROM rbac_roles);
   ```

2. **Verify sync between tables after every save operation**

### Medium-term (Clean Architecture)

1. Update `/api/governance/role-pages` to read from `admin_page_assignments`
2. Update `/api/governance/pages-by-role` to read from `admin_page_assignments`
3. Add deprecation warning for `role_page_access`

### Long-term (Full Migration)

1. Migrate all data to `admin_page_assignments`
2. Update all APIs to use `admin_page_assignments`
3. Drop `role_page_access` table

---

## 📋 CURRENT DATA SUMMARY

| Metric | Value |
|--------|-------|
| Total Pages | 300 |
| Total Roles (in rbac_roles) | 25 |
| Total Roles (with permissions) | 34 |
| Orphan Roles | 14 |
| role_page_access rows | 410 |
| admin_page_assignments rows | 409 |
| base_user_pages | 10 |
