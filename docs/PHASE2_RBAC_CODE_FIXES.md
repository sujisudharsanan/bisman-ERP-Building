# 🧩 PHASE 2 — RBAC Code-Level Fixes (MANDATORY)

## Implementation Summary

This document details the MANDATORY code-level fixes implemented for the RBAC approval chain system.

---

## 1️⃣ Menu Enforcement

### File: `my-backend/routes/menuRoutesSecure.js`

**Rules Implemented:**
- ✅ ONLY uses `effectiveAccessService` - NO direct `role_page_access` queries
- ✅ NO role-based fallback - if effective access fails, return EMPTY menu
- ✅ ALL users go through intersection (including ENTERPRISE_ADMIN, SUPER_ADMIN)
- ✅ Logs all access decisions for audit trail

### Pseudocode:
```
FUNCTION getMenu(user):
  effectivePages = computeEffectivePages(user.legacyId, user.tenantId, user.planId)
  
  IF effectivePages IS EMPTY:
    RETURN { menu: [], accessibleRoutes: [] }  // FAIL CLOSED
  
  pages = SELECT * FROM pages_master WHERE page_code IN effectivePages
  
  RETURN buildMenuFromPages(pages)
```

### Service Call Contract:
```javascript
// effectiveAccessService.computeEffectivePages
const result = await effectiveAccessService.computeEffectivePages({
  userId: number,     // legacy_id
  tenantId: string,   // UUID
  planId: number      // subscription plan ID
});

// Returns:
{
  effectivePages: string[],   // Page codes user can access
  blockedPages: { pageKey: string, reason: string }[],
  accessDetails: { [pageKey]: { inSubscription, inEnterprise, inSuperadmin, isEffective } }
}
```

### Example Filtered Menu Output:
```json
{
  "success": true,
  "role": "FINANCE_CONTROLLER",
  "effectivePagesCount": 12,
  "menu": [
    {
      "code": "FINANCE",
      "name": "Finance",
      "pages": [
        { "code": "FINANCE_GENERAL_LEDGER", "route": "/finance/general-ledger" },
        { "code": "FINANCE_ACCOUNTS_PAYABLE", "route": "/finance/accounts-payable" }
      ]
    },
    {
      "code": "COMMON",
      "name": "Common",
      "pages": [
        { "code": "COMMON_CALENDAR", "route": "/common/calendar" }
      ]
    }
  ],
  "accessibleRoutes": [
    { "route": "/finance/general-ledger", "code": "FINANCE_GENERAL_LEDGER", "canView": true }
  ],
  "meta": {
    "source": "effectiveAccessService",
    "computeTimeMs": 45
  }
}
```

---

## 2️⃣ API Authorization Middleware

### File: `my-backend/middleware/authorize.js`

**Rules Implemented:**
- ✅ Uses ONLY `effectivePages` from `effectiveAccessService`
- ✅ NO role fallback - if page not in effective set, DENY
- ✅ NO silent allow - every decision is logged
- ✅ Logs denial with reason for audit

### Middleware Usage:
```javascript
const { authorize, authorizeAny, authorizeAll } = require('../middleware/authorize');

// Basic usage - check single page
router.get('/finance/reports', authenticate, authorize('FINANCE_REPORTS'), handler);

// With specific permission (future use)
router.post('/users', authenticate, authorize('USER_MANAGEMENT', 'edit'), handler);

// Allow if user has ANY of the pages
router.get('/common/data', authenticate, authorizeAny(['PAGE_A', 'PAGE_B']), handler);

// Require ALL pages
router.get('/admin/critical', authenticate, authorizeAll(['ADMIN', 'SYSTEM']), handler);
```

### Authorization Flow:
```
1. Extract user from JWT (set by authenticate middleware)
2. Get cached effective pages (30s TTL)
3. Check if pageKey is in effective pages set
4. Log decision (ALLOW or DENY)
5. Return 403 with hint on DENY
```

### Denial Response:
```json
{
  "success": false,
  "error": "FORBIDDEN",
  "message": "Access denied to FINANCE_REPORTS",
  "pageKey": "FINANCE_REPORTS",
  "permission": "view",
  "hint": "Contact your administrator to request access to this page"
}
```

### Integration Points:
- All finance routes: `my-backend/routes/financeRoutes.js`
- All admin routes: `my-backend/routes/adminRoutes.js`
- All user routes: `my-backend/routes/userRoutes.js`
- All report routes: `my-backend/routes/reportRoutes.js`

---

## 3️⃣ User Creation Hardening

### File: `my-backend/services/userCreationValidator.js`

**Rules Implemented:**
- ✅ Admin can ONLY grant pages they are approved for
- ✅ Subscription pages are filtered through 4-layer intersection
- ✅ Violations throw HARD ERRORS (no silent failures)
- ✅ All validations are logged

### Validation Logic:
```
FUNCTION validateUserCreation(admin, newUserData):
  
  # 1. Subscription Check
  IF no active subscription:
    THROW SubscriptionViolationError
  
  # 2. User Limit Check
  IF current_users >= max_users:
    THROW SubscriptionViolationError
  
  # 3. Hierarchy Check
  IF admin.business_level <= newUser.business_level:
    THROW HierarchyViolationError
  
  # 4. Page Grant Check (CRITICAL)
  adminApprovedPages = getAdminEffectivePages(admin)
  rolePages = getRoleDefaultPages(newUser.role)
  
  FOR EACH page IN rolePages:
    IF page NOT IN adminApprovedPages:
      violations.add(page)
  
  IF violations.length > 0:
    THROW PageGrantViolationError(violations)
  
  RETURN { valid: true, grantablePages: rolePages ∩ adminApprovedPages }
```

### Failure Cases:

| Error Code | Condition | HTTP Status |
|------------|-----------|-------------|
| `SUBSCRIPTION_VIOLATION` | No active subscription | 403 |
| `SUBSCRIPTION_VIOLATION` | User limit reached | 403 |
| `HIERARCHY_VIOLATION` | Creating user at higher level | 403 |
| `PAGE_GRANT_VIOLATION` | Admin trying to grant unauthorized pages | 403 |

### Updated Function Signatures:

```javascript
// userCreationValidator.js
async function validateUserCreation({
  adminUserId,          // UUID of admin creating user
  adminLegacyId,        // legacy_id of admin (for page lookup)
  adminRole,            // Role of admin
  tenantId,             // Target tenant
  planId,               // Subscription plan
  newUserData,          // { role, business_level, ... }
  requestedPages        // Optional explicit pages to grant
}) → { valid: boolean, grantablePages: string[] }

async function validatePageGrant({
  adminLegacyId,
  tenantId,
  planId,
  newUserRole,
  requestedPages
}) → { valid: boolean, grantablePages: string[] }

async function getAdminGrantablePages(adminLegacyId, tenantId, planId) → Set<string>
```

### Integration in userService.js:

```javascript
// Before creating user, validate
const validationResult = await userCreationValidator.validateUserCreation({
  adminUserId,
  adminLegacyId: assignedByLegacyId,
  adminRole: isEnterpriseAdmin ? 'ENTERPRISE_ADMIN' : 'ADMIN',
  tenantId: tenant_id,
  newUserData: { role, business_level },
  requestedPages: page_permissions
});

// If validation throws, user creation is blocked
// If passes, use validated pages for granting
const grantResult = await grantPagesForNewUser(newUser.legacy_id, tenant_id, {
  preValidatedPages: validationResult.grantablePages  // Use pre-validated
});
```

---

## Files Modified/Created

| File | Status | Purpose |
|------|--------|---------|
| `my-backend/routes/menuRoutesSecure.js` | **NEW** | Secure menu endpoint using only effectiveAccessService |
| `my-backend/middleware/authorize.js` | **NEW** | Authorization middleware with no fallback |
| `my-backend/services/userCreationValidator.js` | **NEW** | Validates user creation against approval chain |
| `my-backend/services/userService.js` | **MODIFIED** | Integrated validator before user creation |
| `my-backend/services/subscriptionPageGrant.js` | **MODIFIED** | Accepts preValidatedPages parameter |
| `my-backend/services/effectiveAccessService.js` | **MODIFIED** | DENY by default, creates approval chain entries |

---

## Security Guarantees

1. **No Privilege Escalation**: Admin cannot grant pages they don't have
2. **No Silent Failures**: All denials are logged and return explicit errors
3. **Fail Closed**: On any error, access is DENIED (not allowed)
4. **Audit Trail**: All authorization decisions are logged to `audit_logs`
5. **4-Layer Intersection**: Every access goes through Subscription ∩ EA ∩ SA ∩ Admin

---

## Commit Reference

```
1fb7a128 feat(security): PHASE 2 MANDATORY RBAC fixes
```
