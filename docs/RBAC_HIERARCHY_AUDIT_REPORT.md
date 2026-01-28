# RBAC Hierarchy Audit Report

**Date:** January 28, 2026  
**System:** BISMAN ERP (Railway Production)  
**Auditor:** AI Automated Audit

---

## Executive Summary

**CRITICAL BUGS IDENTIFIED: 3**

The RBAC (Role-Based Access Control) system has fundamental issues in the approval chain mechanism that allows:
1. Admins to create users with pages they shouldn't have access to
2. Users seeing pages not allocated by their authorizer
3. Menu system bypassing the 3-layer intersection security model

---

## Bug #1: Menu Routes Bypass 3-Layer Intersection

### Current (BROKEN) Flow:
```
User Login → Menu API → role_page_access table → Shows ALL pages for role
```

### Expected (CORRECT) Flow:
```
User Login → Menu API → effectiveAccessService.computeEffectivePages()
  → subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
  → Shows only APPROVED pages
```

### Root Cause:
`menuRoutes.js` directly queries `role_page_access` table without checking:
- Whether Enterprise Admin approved the page for the Super Admin
- Whether Super Admin approved the page for the Admin/User

### Evidence:
```javascript
// menuRoutes.js line ~130-150
// PROBLEM: Queries role_page_access directly without intersection check
const pagesResult = await client.query(`
  SELECT ... FROM pages_master p
  INNER JOIN role_page_access rpa ON rpa.page_id = p.id
  WHERE rpa.role_name = $1
  ...
`);
```

---

## Bug #2: admin_page_assignments Table is EMPTY

### Data Analysis:
- `admin_page_assignments` count: **0 rows**
- `rbac_user_permissions` count: **690 rows**

### Impact:
Since `admin_page_assignments` is empty:
1. `getEnterpriseApprovedPages()` returns `null` (no restrictions)
2. `getSuperadminApprovedPages()` returns `null` (no restrictions)
3. **All subscription pages become "effective" by default!**

### Design Flaw:
The system uses "default open" when no assignments exist:
```javascript
// effectiveAccessService.js line ~115-117
if (assignments.length === 0) {
  return null; // null means "no restriction" ← THIS IS THE PROBLEM
}
```

---

## Bug #3: User Creation Without Approval Validation

### Current (BROKEN) Flow:
```
Admin clicks "Create User"
  → UserService.createUser()
  → subscriptionPageGrant.grantPagesForSubscription()
  → Grants ALL subscription pages (no check on Admin's permissions!)
```

### Missing Validation:
- Admin should only assign pages THEY have been approved for
- Admin cannot grant a page that their Super Admin did not approve for them

### Evidence:
```javascript
// userService.js line ~515-520
// Grants pages based on tenant subscription, NOT admin's approved pages
if (newUser.legacy_id && newUser.tenant_id && grantPagesForNewUser) {
  const grantResult = await grantPagesForNewUser(newUser.legacy_id, newUser.tenant_id);
}
```

---

## Current Database State

### User Hierarchy:
| legacy_id | email | role | business_level | super_admin_id |
|-----------|-------|------|----------------|----------------|
| 2 | sujisudharsanan@eazymile.in | ADMIN | 10 | 3 |

### Permissions:
- User 3 has 347 page permissions
- User 4 has 343 page permissions
- **No approval chain exists** (admin_page_assignments = 0)

---

## Required Fixes

### Fix #1: Update Menu Routes to Use Effective Access

**File:** `my-backend/routes/menuRoutes.js`

```javascript
// BEFORE: Direct role_page_access query
const pagesResult = await client.query(`...role_page_access...`);

// AFTER: Use effectiveAccessService
const effectiveAccess = require('../services/effectiveAccessService');
const { effectivePages } = await effectiveAccess.computeEffectivePages({
  userId: req.user.legacyId,
  tenantId: req.user.tenantId,
  planId: req.user.planId
});
// Filter menu items based on effectivePages
```

### Fix #2: Enforce Approval Chain on User Creation

**File:** `my-backend/services/userService.js`

```javascript
// BEFORE: Grant all subscription pages
if (grantPagesForNewUser) {
  await grantPagesForNewUser(newUser.legacy_id, newUser.tenant_id);
}

// AFTER: Grant only pages admin is approved for
if (grantPagesForNewUser) {
  const adminApprovedPages = await getApprovedPagesForAdmin(adminUserId);
  await grantPagesForNewUser(newUser.legacy_id, newUser.tenant_id, {
    limitToPages: adminApprovedPages
  });
}
```

### Fix #3: Change Default Behavior from "Open" to "Closed"

**File:** `my-backend/services/effectiveAccessService.js`

```javascript
// BEFORE: No assignments = no restrictions (DANGEROUS)
if (assignments.length === 0) {
  return null; // null means "no restriction"
}

// AFTER: No assignments = no access (except ALWAYS_ACCESSIBLE_PAGES)
if (assignments.length === 0) {
  return new Set(ALWAYS_ACCESSIBLE_PAGES); // Only common pages
}
```

### Fix #4: Initialize Approval Chain for Existing Users

Create migration to populate `admin_page_assignments`:
1. Enterprise Admin → approves pages for Super Admin
2. Super Admin → approves pages for Admin
3. Admin → already has rbac_user_permissions, need to validate against chain

---

## Action Items

| Priority | Task | Owner | Status |
|----------|------|-------|--------|
| P0 | Fix menuRoutes.js to use effectiveAccessService | Dev | Pending |
| P0 | Change "default open" to "default closed" | Dev | Pending |
| P0 | Add approval validation to user creation | Dev | Pending |
| P1 | Create migration for initial approval chain | Dev | Pending |
| P1 | Add UI for Enterprise Admin to approve Super Admin pages | Dev | Pending |
| P1 | Add UI for Super Admin to approve Admin pages | Dev | Pending |

---

## Conclusion

The RBAC hierarchy system has the correct architecture (3-layer intersection) but is not being enforced:
1. Menu system bypasses it entirely
2. User creation bypasses it
3. Default behavior is "allow all" instead of "deny all"

**Immediate action required** to prevent privilege escalation.
