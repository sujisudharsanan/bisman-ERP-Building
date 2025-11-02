# 🔒 BISMAN ERP Security Checklist

Quick reference for security controls that must be in place.

## ✅ Authentication & Authorization

### JWT Token Security
- [ ] All protected routes use `authenticate` middleware
- [ ] Tokens expire after 1 hour (access) / 7 days (refresh)
- [ ] Refresh tokens stored as hashed values in database
- [ ] HttpOnly cookies used for token storage
- [ ] Tokens validated on every request
- [ ] Invalid tokens return 401 Unauthorized
- [ ] Expired tokens cannot be used

### Role-Based Access Control (RBAC)
- [ ] `requireRole()` middleware applied to admin routes
- [ ] Role hierarchy enforced: USER < MANAGER < ADMIN < SUPER_ADMIN < ENTERPRISE_ADMIN
- [ ] Cannot escalate privileges via header/token manipulation
- [ ] Role changes logged in audit trail

**Test Command:**
```bash
node security-test.js --test=role-jumping
```

---

## ✅ Tenant Isolation

### Multi-Tenant Security
- [ ] All database queries filtered by `tenant_id`
- [ ] Cross-tenant access returns 403 Forbidden
- [ ] Users cannot view other tenant's data
- [ ] File uploads segregated by tenant
- [ ] IDOR attacks prevented (cannot guess other tenant IDs)

### Critical Queries to Review
```javascript
// ❌ WRONG - No tenant filtering
const users = await prisma.user.findMany();

// ✅ CORRECT - Filtered by tenant
const users = await prisma.user.findMany({
  where: { tenant_id: req.user.tenant_id }
});
```

**Test Command:**
```bash
node security-test.js --test=cross-tenant
```

---

## ✅ Task & Payment Authorization

### Task Access Control
- [ ] Users can only view tasks assigned to them
- [ ] Task approval requires assignee verification
- [ ] Cannot approve tasks from other tenants
- [ ] Horizontal privilege escalation prevented

### Payment Request Security
- [ ] Creator can view their own payment requests
- [ ] Approvers can only view pending tasks assigned to them
- [ ] Cannot modify other users' payment requests
- [ ] Amount limits enforced per approval level

**Test Command:**
```bash
node security-test.js --test=task-access
```

---

## ✅ Input Validation & Injection Prevention

### SQL/NoSQL Injection
- [ ] Prisma ORM used (parameterized queries)
- [ ] No raw SQL with string concatenation
- [ ] Login protected from `admin' OR '1'='1` attacks
- [ ] Object injection blocked (`{ $ne: null }`)

### XSS (Cross-Site Scripting)
- [ ] User input sanitized before storage
- [ ] Output encoded in frontend
- [ ] Content-Security-Policy header set
- [ ] No `dangerouslySetInnerHTML` in React

### Path Traversal
- [ ] File paths validated (no `../` escapes)
- [ ] File serving uses whitelist of allowed paths
- [ ] `path.normalize()` used to prevent traversal
- [ ] Secure file endpoint with authentication

**Test Command:**
```bash
node security-test.js --test=auth-bypass
```

---

## ✅ API Security

### Rate Limiting
- [ ] Login endpoint rate-limited (5 attempts/15 min)
- [ ] API endpoints rate-limited (100 requests/15 min)
- [ ] Brute force attacks prevented

### CORS Configuration
- [ ] Only allowed origins in whitelist
- [ ] Credentials enabled for trusted origins
- [ ] Wildcard (`*`) NOT used in production

### HTTP Headers
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Strict-Transport-Security` (HTTPS only)
- [ ] `X-XSS-Protection: 1; mode=block`

**Test Command:**
```bash
node security-test.js --test=url-guessing
```

---

## ✅ File Upload Security

### Validation
- [ ] File type validation (whitelist only)
- [ ] File size limits enforced (10MB max)
- [ ] Virus scanning enabled (if available)
- [ ] Files stored outside web root

### Access Control
- [ ] Files served via authenticated endpoint only
- [ ] No direct URL access to `/uploads/`
- [ ] Tenant isolation for file access
- [ ] File ownership verified before serving

**Secure File Serving:**
```javascript
// ✅ CORRECT
app.get('/api/secure-files/:category/:filename', authenticate, async (req, res) => {
  // Verify user has access to this file
  // Check tenant_id
  // Prevent path traversal
  res.sendFile(safePath);
});

// ❌ WRONG
app.use('/uploads', express.static('uploads')); // Public access!
```

---

## ✅ Password Security

### Storage
- [ ] Passwords hashed with bcrypt (salt rounds >= 10)
- [ ] Never stored in plain text
- [ ] Never logged
- [ ] Password reset uses secure tokens

### Policy
- [ ] Minimum 8 characters
- [ ] Requires: uppercase, lowercase, number, special char
- [ ] Cannot reuse last 3 passwords (optional)
- [ ] Forced reset every 90 days (optional)

---

## ✅ Session Management

### Cookies
- [ ] HttpOnly flag set (prevent XSS)
- [ ] Secure flag set (HTTPS only in prod)
- [ ] SameSite=Lax (CSRF protection)
- [ ] Appropriate expiration times

### Session Database
- [ ] Active sessions tracked in `user_sessions` table
- [ ] Refresh tokens hashed before storage
- [ ] Old sessions cleaned up (expired)
- [ ] Logout invalidates both tokens

---

## ✅ Audit Logging

### What to Log
- [ ] All authentication attempts (success/failure)
- [ ] Role changes
- [ ] Permission modifications
- [ ] High-value payment approvals
- [ ] Sensitive data access
- [ ] Failed authorization attempts

### Log Content
- [ ] User ID
- [ ] Action performed
- [ ] Timestamp
- [ ] IP address
- [ ] User agent
- [ ] Result (success/failure)

**Never Log:**
- ❌ Passwords (plain or hashed)
- ❌ Full credit card numbers
- ❌ JWT tokens
- ❌ Session IDs

---

## ✅ Smart Approver Selection (P0 Fix)

### Validation Checklist
- [ ] `approverSelectionService.js` exists
- [ ] Smart selection active (not always first approver)
- [ ] Workload balancing distributes tasks
- [ ] `requestedApprovers` parameter honored
- [ ] Enterprise Admin escalation works (>₹500K)
- [ ] Approval limits checked
- [ ] Selection logged in `approver_selection_logs`

### Database Tables
- [ ] `approver_configurations` table exists
- [ ] `approver_selection_logs` table exists
- [ ] Foreign keys properly set
- [ ] Indexes created for performance

**Test Command:**
```bash
node security-test.js --test=smart-approver
```

---

## ✅ Production Deployment Checklist

### Before Going Live
- [ ] Run full security test suite: `node security-test.js`
- [ ] All tests pass (0 critical vulnerabilities)
- [ ] Environment variables set correctly
- [ ] DATABASE_URL uses production database
- [ ] JWT secrets are strong (64+ characters)
- [ ] HTTPS enabled (no HTTP in production)
- [ ] Firewalls configured
- [ ] Database backups scheduled
- [ ] Error messages don't leak sensitive info
- [ ] Debug mode disabled (`NODE_ENV=production`)
- [ ] Unused routes/endpoints removed
- [ ] Default passwords changed
- [ ] Test accounts disabled

### Post-Deployment
- [ ] Monitor logs for suspicious activity
- [ ] Set up alerts for failed logins
- [ ] Regular security scans (weekly)
- [ ] Dependency updates (monthly)
- [ ] Penetration testing (annually)

---

## 🚨 Critical Security Fixes (Must Have)

### Priority 0 (Block Deployment If Missing)
1. ✅ **Tenant Isolation** - Cross-tenant access blocked
2. ✅ **Authentication** - All routes protected
3. ✅ **RBAC** - Role-based access enforced
4. ✅ **Password Hashing** - bcrypt with salt
5. ✅ **SQL Injection** - Parameterized queries only

### Priority 1 (Fix Within 1 Week)
1. ⏳ **File Security** - Tenant validation for file access
2. ⏳ **Rate Limiting** - Prevent brute force
3. ⏳ **Audit Logging** - Track security events
4. ⏳ **HTTPS** - Force secure connections
5. ⏳ **Security Headers** - Add protective headers

### Priority 2 (Fix Within 1 Month)
1. ⏳ **2FA** - Two-factor authentication option
2. ⏳ **Password Policy** - Enforce strong passwords
3. ⏳ **Session Timeout** - Auto-logout after inactivity
4. ⏳ **IP Whitelisting** - For admin access
5. ⏳ **Anomaly Detection** - Alert on suspicious patterns

---

## 📊 Security Test Results Template

```
Date: __________
Tester: __________
Environment: [ ] Dev  [ ] Staging  [ ] Production

Test Results:
[ ] Cross-Tenant Access:        _____ PASS / FAIL
[ ] Role Jumping:               _____ PASS / FAIL  
[ ] Unauthorized Task View:     _____ PASS / FAIL
[ ] Invalid Token Access:       _____ PASS / FAIL
[ ] URL Guessing Attacks:       _____ PASS / FAIL
[ ] Smart Approver Selection:   _____ PASS / FAIL

Critical Vulnerabilities Found: _____
Total Tests Run: _____
Pass Rate: _____%

Approval:
[ ] Safe for deployment
[ ] Requires fixes before deployment

Signature: __________________
```

---

## 🔗 Quick Links

- **Run All Tests**: `node security-test.js`
- **Quick Start Guide**: `/SECURITY_TESTING_QUICK_START.md`
- **P0 Implementation**: `/P0_SMART_APPROVER_IMPLEMENTATION_COMPLETE.md`
- **Approval Flow Audit**: `/APPROVAL_FLOW_AUDIT_REPORT.md`

---

## 📞 Security Contact

**For security vulnerabilities:**
- Email: security@bisman.com
- Do NOT open public issues
- Expect response within 24 hours

**For security questions:**
- Email: dev@bisman.com
- Slack: #security channel

---

*Last Updated: November 2, 2025*  
*Version: 1.0.0*  
*Security Test Suite Version: 1.0.0*
