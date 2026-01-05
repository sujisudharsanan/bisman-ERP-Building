# USER MODEL LOCK

**Status:** 🔒 LOCKED  
**Effective Date:** 2026-01-05  
**Authority:** Principal Systems Architect  
**Enforcement:** Automated CI + Manual Review

---

## OVERVIEW

This document defines the **CANONICAL** and **LOCKED** architecture for user lifecycle management in BISMAN ERP. Any changes to this architecture require explicit Platform Architecture approval.

---

## CANONICAL SOURCE OF TRUTH

| Component | Location | Purpose |
|-----------|----------|---------|
| **User Table** | `users_enhanced` | Primary user storage |
| **User Service** | `services/userService.js` | ALL user lifecycle operations |
| **Role Junction** | `rbac_user_roles` | Canonical role assignment |
| **Reporting Hierarchy** | `users_enhanced.reports_to` | Manager chain for approvals |

---

## PROHIBITED PATTERNS

The following patterns are **BLOCKED BY CI** and will fail builds:

### ❌ Direct Prisma User Mutations

```javascript
// PROHIBITED - will fail CI
prisma.user.create({ ... })
prisma.user.update({ ... })
prisma.user.delete({ ... })
```

**Exception:** Only `services/userService.js` may call these methods.

### ❌ Deprecated Field References

```javascript
// PROHIBITED - will fail CI
user.manager_id           // Use: user.reports_to
user.reporting_manager_id // Use: user.reports_to
user.role_id = ...        // Use: rbac_user_roles junction
```

### ❌ Direct User Creation Outside UserService

Any route that creates or updates users MUST delegate to:
- `UserService.createUser()`
- `UserService.updateUser()`
- `UserService.deleteUser()`

---

## REQUIRED PATTERNS

### ✅ User Creation

```javascript
const UserService = require('../services/userService');

// All creation MUST go through UserService
const newUser = await UserService.createUser(
  {
    username: 'jdoe',
    email: 'jdoe@example.com',
    password: 'SecureP@ss123!',
    role: 'USER',
    business_level: 1,
    reports_to: managerUuid, // Optional
    tenant_id: tenantUuid,   // Required for multi-tenant
  },
  {
    adminUserId: requestingAdminUuid,
    isEnterpriseAdmin: false,
    skipSubscriptionCheck: false, // Only true for system operations
  }
);
```

### ✅ User Update

```javascript
const updatedUser = await UserService.updateUser(
  targetUserId,
  {
    email: 'newemail@example.com',
    role: 'ADMIN',
    business_level: 3,
    reports_to: newManagerUuid,
  },
  {
    adminUserId: requestingAdminUuid,
    isEnterpriseAdmin: true,
  }
);
```

### ✅ User Deletion

```javascript
await UserService.deleteUser(targetUserId, {
  adminUserId: requestingAdminUuid,
});
```

---

## SCHEMA LOCK

The following columns on `users_enhanced` are **LOCKED**:

| Column | Type | Status | Notes |
|--------|------|--------|-------|
| `id` | UUID | 🔒 LOCKED | Primary key, immutable |
| `legacy_id` | Int | 🔒 LOCKED | For backwards compat |
| `username` | VarChar(50) | 🔒 LOCKED | Unique |
| `email` | VarChar(255) | 🔒 LOCKED | Unique, validated |
| `password_hash` | VarChar(255) | 🔒 LOCKED | Bcrypt |
| `role` | VarChar(100) | 🔒 LOCKED | String role (cache) |
| `role_id` | UUID | ⚠️ DEPRECATED | DO NOT USE |
| `business_level` | Int | 🔒 LOCKED | 1-10, hierarchy |
| `reports_to` | UUID | 🔒 LOCKED | Manager FK |
| `tenant_id` | UUID | 🔒 LOCKED | Multi-tenant |

### Adding New Columns

1. Requires Platform Architecture approval
2. Must update `userService.js`
3. Must update CI guard patterns
4. Must document in this file

---

## ENFORCEMENT MECHANISMS

### 1. CI Guard Script

Location: `scripts/ci/user-model-guard.sh`

Runs on every PR and blocks merge if:
- Direct `prisma.user.create/update/delete` calls found (outside UserService)
- Deprecated field references found
- `userService.js` is missing

### 2. ESLint Rule (Optional)

Custom ESLint rule to flag violations in IDE.

### 3. Code Review Requirement

All changes to files in this list require Platform Architect review:
- `services/userService.js`
- `prisma/schema.prisma` (User model)
- `docs/USER_MODEL_LOCK.md`

---

## AUDIT TRAIL

All user lifecycle operations are logged to `audit_log` table with:
- `action`: CREATE_USER, UPDATE_USER, DELETE_USER
- `table_name`: users_enhanced
- `user_id`: Admin who performed action
- `old_values` / `new_values`: Change delta

---

## CHANGE REQUEST PROCESS

To modify user model architecture:

1. Create RFC document explaining:
   - What change is needed
   - Why it cannot be achieved with current architecture
   - Impact assessment
   - Rollback plan

2. Submit for Platform Architecture review

3. If approved:
   - Update `userService.js`
   - Update `USER_MODEL_LOCK.md`
   - Update CI guard patterns
   - Deploy with feature flag

---

## RELATED DOCUMENTS

- `docs/CANONICAL_USER_RESOLUTION.md` - Resolution implementation
- `docs/PRINCIPAL_SYSTEMS_AUDIT.md` - Original audit findings
- `scripts/ci/user-model-guard.sh` - CI enforcement script

---

**THIS DOCUMENT IS THE SOURCE OF TRUTH FOR USER MODEL ARCHITECTURE.**

Any code that violates these rules will be rejected by CI.

*Last Updated: 2026-01-05*  
*Locked By: Principal Systems Architect*
