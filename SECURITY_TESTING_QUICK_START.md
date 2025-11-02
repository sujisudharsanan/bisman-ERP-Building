# 🔐 Security Testing Quick Start

## Overview

This guide will help you run comprehensive security tests on your BISMAN ERP system to verify:
- ✅ Cross-tenant access protection
- ✅ Role-based access control
- ✅ Task authorization
- ✅ Authentication security
- ✅ URL enumeration prevention
- ✅ Smart approver selection (P0 fix validation)

---

## Prerequisites

1. **Backend and database running**:
   ```bash
   npm run dev:both
   ```

2. **Database seeded with test data**:
   ```bash
   cd my-backend
   node seed-multi-tenant.js
   ```

3. **Required npm packages installed**:
   ```bash
   npm install axios chalk
   ```

---

## Running Security Tests

### Option 1: Run All Tests (Recommended)
```bash
node security-test.js
```

### Option 2: Run Specific Test Category
```bash
# Test cross-tenant access only
node security-test.js --test=cross-tenant

# Test role jumping only
node security-test.js --test=role-jumping

# Test task access control
node security-test.js --test=task-access

# Test authentication bypass
node security-test.js --test=auth-bypass

# Test URL guessing attacks
node security-test.js --test=url-guessing

# Test P0 smart approver fix
node security-test.js --test=smart-approver
```

### Option 3: Verbose Mode (Detailed Logs)
```bash
node security-test.js --verbose
```

### Option 4: Test Against Production/Staging
```bash
# Set custom API URL
API_URL=https://your-production-api.com node security-test.js
```

---

## Understanding Test Results

### ✅ PASS (Green)
- Security control is working correctly
- Vulnerability is **NOT** present
- No action required

### ❌ FAIL (Red)
- Security control **FAILED**
- Vulnerability **IS** present
- **Immediate action required!**

### ⚠️ WARNING (Yellow)
- Potential security issue detected
- Review recommended
- May not be critical

### 🚨 CRITICAL (Red Bold)
- **High-severity vulnerability**
- **System is actively exploitable**
- **Fix immediately before production deployment!**

---

## Test Categories Explained

### 1. Cross-Tenant Access (Tenant Isolation)
**What it tests:**
- Can User from Client A access Client B's data?
- Can users enumerate other tenants?
- Is tenant_id properly filtered in all queries?

**Expected behavior:**
- All cross-tenant requests should return `403 Forbidden` or `401 Unauthorized`
- Users should only see data from their own tenant

**Example failure:**
```
❌ Block cross-tenant user list access: FAIL
🚨 CRITICAL VULNERABILITY: Cross-Tenant Data Access
   Details: Users can view data from other tenants. Tenant isolation is broken!
```

**Fix if failed:**
- Add tenant_id filtering to all database queries
- Use middleware: `ensureTenantIsolation()`
- Review `/middleware/tenantIsolation.js`

---

### 2. Role Jumping (Privilege Escalation)
**What it tests:**
- Can MANAGER access ADMIN endpoints?
- Can ADMIN access SUPER_ADMIN endpoints?
- Can users escalate privileges via token/header manipulation?

**Expected behavior:**
- Lower-privilege roles blocked from higher-privilege endpoints
- Token manipulation attempts rejected

**Example failure:**
```
❌ Block Manager from Admin endpoints: FAIL
🚨 CRITICAL VULNERABILITY: Privilege Escalation (Manager → Admin)
   Details: Managers can access Admin-only endpoints!
```

**Fix if failed:**
- Add `requireRole()` middleware to all protected routes
- Example: `app.get('/api/admin', authenticate, requireRole('ADMIN'), ...)`
- Review `/middleware/auth.js`

---

### 3. Unauthorized Task View (Horizontal Privilege Escalation)
**What it tests:**
- Can users view tasks not assigned to them?
- Can users approve tasks they shouldn't?
- Is task ownership properly validated?

**Expected behavior:**
- Users can only view/approve tasks assigned to them
- Task list properly filtered by assignee

**Example failure:**
```
❌ Block unauthorized task access: FAIL
🚨 CRITICAL VULNERABILITY: Horizontal Privilege Escalation (Task Access)
   Details: User can view tasks not assigned to them (Task ID: abc123)
```

**Fix if failed:**
- Add ownership check in task routes:
  ```javascript
  const task = await prisma.task.findFirst({
    where: { id: taskId, assigneeId: req.user.id }
  });
  ```
- Review `/routes/tasks.js`

---

### 4. Invalid Token Access (Authentication Bypass)
**What it tests:**
- Can endpoints be accessed without authentication?
- Are invalid/malformed tokens rejected?
- Is the system vulnerable to SQL/NoSQL injection?

**Expected behavior:**
- All protected endpoints require valid JWT token
- Invalid tokens return `401 Unauthorized`
- Injection attempts blocked

**Example failure:**
```
❌ Block requests without token: FAIL
🚨 CRITICAL VULNERABILITY: Authentication Bypass
   Details: Protected endpoints accessible without authentication token!
```

**Fix if failed:**
- Add `authenticate` middleware to all protected routes
- Example: `app.get('/api/tasks', authenticate, ...)`
- Review middleware configuration in `app.js`

---

### 5. URL Guessing Attacks (Enumeration)
**What it tests:**
- Can users enumerate user IDs by trying sequential numbers?
- Are admin/debug paths exposed?
- Is path traversal possible?
- Can HTTP verb tampering bypass security?

**Expected behavior:**
- User enumeration prevented (403/404 for unauthorized IDs)
- Admin paths return 403 for non-admins
- Path traversal blocked
- Only intended HTTP verbs accepted

**Example failure:**
```
❌ Prevent user ID enumeration: FAIL
🚨 CRITICAL VULNERABILITY: User ID Enumeration
   Details: Users can enumerate other user profiles (4/5 accessible)
```

**Fix if failed:**
- Add ownership check in user profile endpoint
- Return 404 instead of 403 (don't leak existence)
- Disable directory listing
- Validate HTTP methods in routes

---

### 6. Smart Approver Selection (P0 Fix Validation)
**What it tests:**
- Is the new smart approver selection service active?
- Does workload balancing distribute tasks evenly?
- Does Enterprise Admin escalation work for high-value payments (>₹500K)?

**Expected behavior:**
- Payment requests automatically assigned using smart selection
- Multiple payments distributed to different approvers
- High-value payments escalate to L4 after L3 approval

**Example success:**
```
✅ Smart approver selection active: PASS
   Assigned to: manager2
✅ Workload distribution across approvers: PASS
   Distributed to 2 approver(s): manager1, manager2
```

**If tests fail:**
- Check if backend restarted after P0 implementation
- Verify `approverSelectionService.js` exists
- Check logs for `[ApproverSelection]` messages

---

## Common Issues & Fixes

### Issue 1: "Test setup failed. Cannot continue."
**Cause:** Cannot login as Super Admin

**Fix:**
```bash
cd my-backend
node seed-multi-tenant.js  # Recreate test users
```

### Issue 2: "Insufficient test data for cross-tenant tests"
**Cause:** Not enough clients/users in database

**Fix:**
```bash
cd my-backend
node seed-multi-tenant.js  # Creates 2 clients with users
```

### Issue 3: "Connection refused"
**Cause:** Backend not running

**Fix:**
```bash
# In project root
npm run dev:both
# Wait for "Backend server running on port 8081"
```

### Issue 4: All tests failing with 500 errors
**Cause:** Backend crash or configuration issue

**Fix:**
```bash
# Check backend logs
tail -f my-backend/backend.log

# Restart backend
pkill -f "node.*server"
npm run dev:both
```

### Issue 5: "Cannot find module 'axios'"
**Cause:** Missing dependencies

**Fix:**
```bash
npm install axios chalk
```

---

## Security Test Checklist

Before deploying to production, ensure:

- [ ] ✅ All cross-tenant access tests PASS
- [ ] ✅ All role jumping tests PASS
- [ ] ✅ All task authorization tests PASS
- [ ] ✅ All authentication bypass tests PASS
- [ ] ✅ All URL guessing tests PASS
- [ ] ✅ No 🚨 CRITICAL vulnerabilities detected
- [ ] ✅ Smart approver selection validated

---

## Example Test Output

### ✅ SECURE SYSTEM (All Tests Pass)
```
================================================================================
  TEST SUMMARY
================================================================================

  Total Tests: 28
  ✅ Passed: 28 (100.0%)
  ❌ Failed: 0 (0.0%)

  🎉 NO CRITICAL VULNERABILITIES DETECTED

================================================================================
```

### ❌ VULNERABLE SYSTEM (Tests Failed)
```
================================================================================
  TEST SUMMARY
================================================================================

  Total Tests: 28
  ✅ Passed: 24 (85.7%)
  ❌ Failed: 4 (14.3%)

  🚨 CRITICAL VULNERABILITIES FOUND: 2
  ==============================================================================

  1. Cross-Tenant Data Access
     Users can view data from other tenants. Tenant isolation is broken!

  2. Privilege Escalation (Manager → Admin)
     Managers can access Admin-only endpoints!

  ⚠️  IMMEDIATE ACTION REQUIRED!
  ==============================================================================

================================================================================
```

---

## Automated CI/CD Integration

### Add to GitHub Actions
```yaml
name: Security Tests
on: [push, pull_request]

jobs:
  security-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run dev:both &
      - run: sleep 10  # Wait for server
      - run: node security-test.js
```

### Add to package.json
```json
{
  "scripts": {
    "test:security": "node security-test.js",
    "test:security:verbose": "node security-test.js --verbose"
  }
}
```

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. **DO** email: security@bisman.com
3. **Include**:
   - Test output showing the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

---

## Next Steps After Testing

1. **If all tests pass:**
   - Document test results
   - Proceed with deployment
   - Schedule regular security testing (monthly)

2. **If tests fail:**
   - **STOP deployment immediately**
   - Review failed tests above
   - Implement fixes
   - Re-run tests until all pass
   - Consider security audit before production

3. **Ongoing security:**
   - Run tests before each release
   - Add new tests for new features
   - Keep dependencies updated
   - Monitor security advisories

---

## Quick Reference Commands

```bash
# Run all tests
node security-test.js

# Run specific test
node security-test.js --test=cross-tenant

# Verbose output
node security-test.js --verbose

# Test production
API_URL=https://api.bisman.com node security-test.js

# Re-seed database
cd my-backend && node seed-multi-tenant.js

# Check backend logs
tail -f my-backend/backend.log

# Restart backend
pkill -f "node.*server" && npm run dev:both
```

---

## Support

For help with security testing:
- Documentation: `/SECURITY_TESTING_GUIDE.md`
- Security policy: `/SECURITY.md`
- Issues: https://github.com/your-org/bisman-erp/issues
- Email: support@bisman.com

---

*Last Updated: November 2, 2025*  
*Version: 1.0.0*  
*Part of: P0 Smart Approver Selection Implementation*
