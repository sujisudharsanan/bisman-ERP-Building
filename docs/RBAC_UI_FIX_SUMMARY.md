# RBAC UI Fix Summary

**Date:** 2026-01-27  
**Issue:** RBAC Page Picker showing wrong page counts (176/167 instead of scoped pages)

---

## Problem

The RBAC assignment UI was showing ALL 175 active pages instead of properly scoped pages:
- Top section showed ~176 pages
- Bottom section showed ~167 pages
- No role/module scoping applied
- Platform isolation not enforced in UI

---

## Root Cause

The backend API `/api/rbac/roles/:roleId/pages` was returning ALL active pages with granted=true/false status, without:
1. Filtering by target role's allowed scope (business roles shouldn't see admin pages)
2. Filtering by logged-in user's assignable scope (Super Admin can't assign EA pages)
3. Excluding non-UI pages (REDIRECT, API_ROUTE)
4. Properly categorizing pages as ASSIGNED, INHERITED, or CANDIDATE

---

## Fix Applied

### Backend: `/api/rbac/roles/:roleId/pages` (app.js)

**Before:** Returned ALL 175 active pages with granted status

**After:** Returns SCOPED pages based on:

1. **Target Role Scope:**
   - Platform roles (ENTERPRISE_ADMIN) → Can see all except SUPER_ADMIN pages
   - Platform roles (SUPER_ADMIN) → Can see all except ENTERPRISE_ADMIN pages
   - Admin roles (ADMIN, IT_ADMIN) → Can't see platform pages
   - Business roles → Can only see business pages (no admin/system)

2. **Logged-in User Scope:**
   - ENTERPRISE_ADMIN → Can assign all pages
   - SUPER_ADMIN → Can assign pages except /enterprise-admin/*
   - ADMIN → Can assign business pages only

3. **Page Type Filter:**
   - Only `page_type = 'UI_PAGE'`
   - Excludes `category = 'PUBLIC'`

4. **Response Structure:**
   ```json
   {
     "success": true,
     "role": "ADMIN",
     "pages": [...],  // Full list (backward compatible)
     "assignedPages": [...],  // Pages directly assigned
     "inheritedPages": [...],  // BASE_USER pages inherited
     "candidatePages": [...],  // Pages available for assignment
     "counts": {
       "assigned": 15,
       "inherited": 11,
       "candidate": 50,
       "total": 26
     }
   }
   ```

### Frontend: `enterprise-admin/roles/page.tsx`

**Before:** Displayed all pages regardless of access type

**After:** 
- Uses `accessType` field to categorize pages
- Selected = ASSIGNED + INHERITED pages
- Candidate pages shown as unselected but available

### Frontend: `system/roles-users-report/page.tsx`

**Before:** Same issue as above

**After:**
- Updated RolePage type to include `accessType` and `inherited` fields
- Uses same logic as enterprise-admin page

---

## SQL Queries Used in Backend

### Get Assignable Pages (Scoped)
```sql
SELECT 
  p.id, p.page_code, p.display_name, p.route, p.icon,
  p.show_in_sidebar, p.category, p.page_type,
  m.module_code, m.display_name as module_name
FROM pages_master p
LEFT JOIN modules_master m ON m.id = p.module_id
WHERE p.status = 'active'
  AND p.page_type = 'UI_PAGE'
  AND p.category <> 'PUBLIC'
  AND p.route NOT LIKE '/super-admin%'  -- Example: for EA target
  -- Additional route filters based on role scope
ORDER BY m.sort_order, m.module_code, p.sort_order
```

### Get Assigned Pages
```sql
SELECT page_id FROM role_page_access 
WHERE role_name = 'ADMIN' AND can_view = true
```

### Get Inherited Pages
```sql
SELECT page_id FROM base_user_pages
```

---

## Scope Rules (Platform Isolation)

| Target Role | Can See Routes |
|-------------|----------------|
| SYSTEM_ADMIN | All routes |
| ENTERPRISE_ADMIN | All except /super-admin/* |
| SUPER_ADMIN | All except /enterprise-admin/* |
| ADMIN, IT_ADMIN | Not /super-admin/*, /enterprise-admin/*, /system/* |
| Business Roles | Not /super-admin/*, /enterprise-admin/*, /admin/*, /system/*, /internal/*, /qa/* |

| Logged-In User | Can Assign |
|----------------|------------|
| ENTERPRISE_ADMIN | All pages |
| SUPER_ADMIN | All except /enterprise-admin/* |
| ADMIN | Business pages only |

---

## Files Changed

1. `my-backend/app.js` - GET /api/rbac/roles/:roleId/pages endpoint
2. `my-frontend/src/app/enterprise-admin/roles/page.tsx` - Page loading logic
3. `my-frontend/src/app/system/roles-users-report/page.tsx` - Page loading logic + types

---

## Testing

1. Log in as ENTERPRISE_ADMIN → Click role → Should see all assignable pages (scoped by target role)
2. Log in as SUPER_ADMIN → Click role → Should NOT see /enterprise-admin/* pages
3. Select a business role (e.g., ACCOUNTANT) → Should only see business pages
4. Select ADMIN role → Should see admin pages but not platform pages

---

## Expected Page Counts (Approximate)

| Target Role | Approx Pages |
|-------------|--------------|
| ENTERPRISE_ADMIN | ~160 (all except SA pages) |
| SUPER_ADMIN | ~150 (all except EA pages) |
| ADMIN | ~120 (no platform pages) |
| Business Role | ~80 (only business pages) |

---

**Report Generated:** 2026-01-27  
**Status:** ✅ Fix Applied
