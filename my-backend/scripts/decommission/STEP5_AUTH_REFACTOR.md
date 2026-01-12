# STEP 5 — Auth Logic Refactor

## Purpose
Remove the fallback to legacy `users` table from authentication flow.
Make `users_enhanced` the ONLY source of truth for user login.

---

## Current Code (lines 250-285 in auth.js)

```javascript
// 3. Try Regular User (if DB available)
// First try users_enhanced (Prisma User model), then legacy users table for ADMIN users
let regularUser = null;
if (prisma) {
  try {
    regularUser = await withTimeout(
      prisma.user.findUnique({ where: { email } }),
      3000 // 3 second timeout
    );
  } catch (e) {
    console.warn('[auth.routes] regularUser lookup failed/timeout, continuing:', e.message);
  }
  
  // If not found in users_enhanced, try the legacy users table (for ADMIN users with integer IDs)
  if (!regularUser) {
    try {
      const legacyResult = await withTimeout(
        prisma.$queryRaw\`
          SELECT id, username, email, password_hash, role, is_active, 
                 "productType", tenant_id, super_admin_id, profile_pic_url
          FROM users 
          WHERE email = \${email}
          LIMIT 1
        \`,
        3000
      );
      if (legacyResult && legacyResult[0]) {
        regularUser = legacyResult[0];
        regularUser.isLegacyUser = true;
        console.log('[auth.routes] Found user in legacy users table:', email);
      }
    } catch (legacyErr) {
      console.warn('[auth.routes] Legacy users lookup failed:', legacyErr.message);
    }
  }
}
```

---

## New Code (REFACTORED)

```javascript
// 3. Try Regular User (if DB available)
// CANONICAL: Only query users_enhanced table (see docs/CANONICAL_USER_RESOLUTION.md)
let regularUser = null;
if (prisma) {
  try {
    regularUser = await withTimeout(
      prisma.user.findUnique({ where: { email } }),
      3000 // 3 second timeout
    );
    
    if (regularUser) {
      console.log('[auth.routes] Found user in users_enhanced:', email);
    } else {
      // IMPORTANT: No fallback to legacy table!
      // If user not found, log structured error for debugging
      console.warn('[auth.routes] User not found in users_enhanced:', email);
      console.warn('[auth.routes] If this user should exist, run: node scripts/decommission/step2-data-integrity-audit.js');
    }
  } catch (e) {
    console.error('[auth.routes] CRITICAL: users_enhanced lookup failed:', e.message);
    // Fail closed - do not try legacy table
    auditService.logLoginAttempt(false, email, req.ip, {
      error: 'database_error',
      message: e.message
    }).catch(() => {});
    
    return res.status(503).json({
      success: false,
      message: 'Authentication service temporarily unavailable. Please try again.',
      code: 'AUTH_DB_ERROR'
    });
  }
}
```

---

## Changes Summary

| Aspect | Before | After |
|--------|--------|-------|
| Primary lookup | `users_enhanced` | `users_enhanced` (unchanged) |
| Fallback | Legacy `users` table | **REMOVED** |
| On DB error | Silent continue | **Fail closed with 503** |
| Logging | Basic | **Structured error logging** |
| Legacy flag | `isLegacyUser = true` | **REMOVED** |

---

## Validation Queries

After applying the refactor, run:

```sql
-- Check all users can login via users_enhanced
SELECT email, password_hash IS NOT NULL as can_login, is_active
FROM users_enhanced
WHERE email IN (
  SELECT DISTINCT email FROM users WHERE is_active = true
);

-- Verify no orphaned users in legacy table
SELECT u.email, u.role
FROM users u
LEFT JOIN users_enhanced ue ON u.email = ue.email
WHERE ue.id IS NULL AND u.is_active = true;
```

---

## Rollback Steps

If login breaks after this change:

1. **Immediate:** Revert the auth.js file from git
   ```bash
   git checkout HEAD -- routes/auth.js
   ```

2. **If commits made:** Revert the specific commit
   ```bash
   git revert <commit-hash>
   ```

3. **Restart backend**
   ```bash
   pm2 restart all
   ```

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User exists only in legacy table | LOW (audit shows 0 missing) | Run Step 2 audit before deploying |
| Password mismatch | LOW (audit shows 0 mismatches) | Run Step 3 migration to sync |
| Database timeout | MEDIUM | Already handled with timeout wrapper |
| Prisma model missing | LOW | Pre-deployment schema validation |

---

## Apply Instructions

1. Run Step 2 audit first:
   ```bash
   node scripts/decommission/step2-data-integrity-audit.js
   ```

2. If audit shows CRITICAL issues, run Step 3:
   ```bash
   node scripts/decommission/step3-migrate-users.js
   ```

3. Apply the code change to `routes/auth.js` (lines 250-285)

4. Test login with known users

5. Monitor logs for "[auth.routes]" entries
