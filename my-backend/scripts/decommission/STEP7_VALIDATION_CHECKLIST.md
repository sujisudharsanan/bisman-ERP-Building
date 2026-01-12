# STEP 7 — Production Validation Checklist

**Purpose:** Verify all user-related functionality works correctly after decommissioning the legacy users table.

---

## Pre-Deployment Checklist

| # | Check | Command | Expected | Status |
|---|-------|---------|----------|--------|
| 1 | Audit shows no CRITICAL issues | `node scripts/decommission/step2-data-integrity-audit.js` | 0 critical | ☐ |
| 2 | All users migrated | Audit check 1 shows 0 missing | 0 missing | ☐ |
| 3 | Password hashes synced | Audit check 3 shows 0 mismatches | 0 mismatches | ☐ |
| 4 | Backend restarts without error | `pm2 restart all` or restart dev server | No startup errors | ☐ |
| 5 | Prisma client regenerated | `npx prisma generate` | No errors | ☐ |

---

## Login Tests

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| L1 | Admin user login | Login with admin email/password | Redirect to admin dashboard | ☐ |
| L2 | Regular user login | Login with regular user | Redirect to user dashboard | ☐ |
| L3 | Super Admin login | Login with super admin | Redirect to /super-admin/dashboard | ☐ |
| L4 | Enterprise Admin login | Login with enterprise admin | Redirect to /enterprise-admin/dashboard | ☐ |
| L5 | Wrong password | Enter incorrect password | "Incorrect password" error | ☐ |
| L6 | Non-existent user | Login with fake email | "User not found" error | ☐ |
| L7 | Inactive user | Login with deactivated user | "Account deactivated" error | ☐ |

---

## Password Management Tests

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| P1 | Password reset request | Click "Forgot password" | Email sent confirmation | ☐ |
| P2 | Password reset complete | Use reset link, set new password | Can login with new password | ☐ |
| P3 | Admin password update | Super Admin changes user password | User can login with new password | ☐ |
| P4 | Self password change | User changes own password | Immediate effect, can re-login | ☐ |

---

## User Management Tests

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| U1 | Create new user | Admin creates new user | User appears in list, can login | ☐ |
| U2 | Update user | Admin edits user profile | Changes saved, visible immediately | ☐ |
| U3 | Deactivate user | Admin deactivates user | User cannot login | ☐ |
| U4 | Reactivate user | Admin reactivates user | User can login again | ☐ |
| U5 | Delete user | Admin deletes user | User removed from system | ☐ |

---

## Feature Verification Tests

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| F1 | Approval workflow | Create payment request | Correct approvers assigned | ☐ |
| F2 | Task assignment | Create task, assign to user | User receives task | ☐ |
| F3 | Settlement workflow | Create settlement | Shows creator, approvers correctly | ☐ |
| F4 | Calendar events | Create event with organizer | Organizer name displays | ☐ |
| F5 | Chat messages | Send message | Sender name displays correctly | ☐ |
| F6 | Audit logs | View security dashboard | User names resolve in logs | ☐ |
| F7 | Reports | Generate user report | All users listed correctly | ☐ |

---

## Legacy Code Path Tests

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| C1 | Knex queries (reviewService) | Trigger review workflow | No errors, users resolve | ☐ |
| C2 | Raw SQL JOINs | Check payment list | Creator/approver names display | ☐ |
| C3 | RBAC checks | Access restricted page | Permission check works | ☐ |

---

## Database Verification

Run these SQL queries after deployment:

```sql
-- 1. Verify VIEW exists
SELECT table_type FROM information_schema.tables 
WHERE table_name = 'users' AND table_schema = 'public';
-- Expected: VIEW

-- 2. Verify backup exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'users_backup_pre_view'
);
-- Expected: true

-- 3. Test VIEW returns data
SELECT COUNT(*) FROM users;
-- Expected: Same count as users_enhanced

-- 4. Verify no write triggers fire on SELECT
SELECT id, email, role FROM users LIMIT 1;
-- Expected: Returns data without error

-- 5. Verify writes are blocked
INSERT INTO users (email, username) VALUES ('test@test.com', 'test');
-- Expected: ERROR with helpful message
```

---

## Go / No-Go Decision

| Criteria | Status | Notes |
|----------|--------|-------|
| All login tests pass | ☐ | |
| All password tests pass | ☐ | |
| All user management tests pass | ☐ | |
| All feature tests pass | ☐ | |
| No console errors in browser | ☐ | |
| No 500 errors in backend logs | ☐ | |
| Backup table exists | ☐ | |

### Decision

- **GO** ☐ - All criteria met, proceed to monitoring phase
- **NO-GO** ☐ - Issues found, rollback required

---

## Rollback Procedure

If NO-GO decision:

```bash
# 1. Revert auth.js changes
git checkout HEAD -- routes/auth.js

# 2. Rollback VIEW to TABLE
cd my-backend
node scripts/decommission/step6-create-users-view.js --rollback

# 3. Remove freeze trigger (if applied)
node scripts/decommission/step4-freeze-legacy-writes.js --rollback

# 4. Restart backend
pm2 restart all

# 5. Verify login works
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| DevOps | | | |
| Product Owner | | | |
