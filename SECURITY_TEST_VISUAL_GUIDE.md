# 🔐 Security Test Script - Visual Guide

## Test Flow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   SECURITY TEST SCRIPT                      │
│                    security-test.js                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     SETUP PHASE                             │
│  • Login as Super Admin                                     │
│  • Fetch test clients (Client A, Client B)                  │
│  • Login as Manager, Admin                                  │
│  • Prepare test data                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌────────────────────┴────────────────────┐
        ↓                                         ↓
┌──────────────────┐                    ┌──────────────────┐
│   TEST PHASE     │                    │   ALL TESTS      │
│  Run Selected    │                    │   Run Complete   │
│  Single Test     │                    │   Test Suite     │
└──────────────────┘                    └──────────────────┘
        ↓                                         ↓
        └────────────────────┬────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                  RESULTS SUMMARY                            │
│  • Total Tests: X                                           │
│  • Passed: Y (green)                                        │
│  • Failed: Z (red)                                          │
│  • Critical Vulnerabilities: N (red bold)                   │
│  • Exit Code: 0 (pass) or 1 (fail)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Test Categories Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                    TEST 1: CROSS-TENANT ACCESS                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Login as Client A User                                        │
│     ↓                                                              │
│  2. Try to access Client B's user list                            │
│     ↓                                                              │
│  3. Expected: 403 Forbidden ✅                                     │
│     Actual: 200 OK ❌ → CRITICAL VULNERABILITY                     │
│                                                                   │
│  4. Try to access Client B's payment requests                     │
│     ↓                                                              │
│  5. Expected: Empty list or 403 ✅                                 │
│     Actual: Returns Client B data ❌ → CRITICAL                    │
│                                                                   │
│  6. Try IDOR attack (direct user ID access)                       │
│     GET /api/users/999 (Client B's user)                          │
│     ↓                                                              │
│  7. Expected: 403/404 ✅                                           │
│     Actual: Returns user data ❌ → CRITICAL VULNERABILITY          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    TEST 2: ROLE JUMPING                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Login as MANAGER                                              │
│     ↓                                                              │
│  2. Try to access /api/admin (ADMIN only)                         │
│     ↓                                                              │
│  3. Expected: 403 Forbidden ✅                                     │
│     Actual: 200 OK ❌ → CRITICAL: Privilege Escalation            │
│                                                                   │
│  4. Try to access /api/super-admin/clients (SUPER_ADMIN only)     │
│     ↓                                                              │
│  5. Expected: 403 Forbidden ✅                                     │
│     Actual: 200 OK ❌ → CRITICAL: Privilege Escalation            │
│                                                                   │
│  6. Try header injection (X-User-Role: ADMIN)                     │
│     ↓                                                              │
│  7. Expected: Header ignored, 403 ✅                               │
│     Actual: Accepted, 200 OK ❌ → CRITICAL                         │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                TEST 3: UNAUTHORIZED TASK VIEW                     │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Get list of all tasks (as Super Admin)                        │
│     ↓                                                              │
│  2. Login as MANAGER                                              │
│     ↓                                                              │
│  3. Try to access random task not assigned to manager             │
│     GET /api/tasks/abc123 (assigned to someone else)              │
│     ↓                                                              │
│  4. Expected: 403/404 ✅                                           │
│     Actual: Returns task details ❌ → CRITICAL                     │
│                                                                   │
│  5. Try to approve that task                                      │
│     POST /api/tasks/abc123/approve                                │
│     ↓                                                              │
│  6. Expected: 403 Forbidden ✅                                     │
│     Actual: Approval successful ❌ → CRITICAL VULNERABILITY        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                TEST 4: INVALID TOKEN ACCESS                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Try to access /api/tasks without token                        │
│     ↓                                                              │
│  2. Expected: 401 Unauthorized ✅                                  │
│     Actual: 200 OK ❌ → CRITICAL: Auth Bypass                      │
│                                                                   │
│  3. Try with malformed token                                      │
│     Authorization: Bearer invalid.token.here                      │
│     ↓                                                              │
│  4. Expected: 401 Unauthorized ✅                                  │
│     Actual: 200 OK ❌ → CRITICAL                                   │
│                                                                   │
│  5. Try SQL injection in login                                    │
│     email: "admin' OR '1'='1"                                     │
│     ↓                                                              │
│  6. Expected: 401 Failed login ✅                                  │
│     Actual: Login successful ❌ → CRITICAL: SQL Injection          │
│                                                                   │
│  7. Try NoSQL injection                                           │
│     email: { $ne: null }                                          │
│     ↓                                                              │
│  8. Expected: 400/401 ✅                                           │
│     Actual: Login successful ❌ → CRITICAL: NoSQL Injection        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                TEST 5: URL GUESSING ATTACKS                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Sequential ID enumeration                                     │
│     GET /api/users/1, /api/users/2, /api/users/3...              │
│     ↓                                                              │
│  2. Expected: Only own ID accessible (1/5) ✅                      │
│     Actual: Multiple IDs accessible (4/5) ❌ → Enumeration        │
│                                                                   │
│  3. Hidden admin paths                                            │
│     GET /api/admin/config                                         │
│     GET /api/admin/debug                                          │
│     GET /api/.env                                                 │
│     ↓                                                              │
│  4. Expected: All return 403/404 ✅                                │
│     Actual: Some return 200 ⚠️ → Information Disclosure           │
│                                                                   │
│  5. Path traversal                                                │
│     GET /api/secure-files/documents/../../../etc/passwd           │
│     ↓                                                              │
│  6. Expected: Normalized and blocked ✅                            │
│     Actual: File served ❌ → CRITICAL: Path Traversal             │
│                                                                   │
│  7. HTTP verb tampering                                           │
│     DELETE /api/tasks (should be POST)                            │
│     ↓                                                              │
│  8. Expected: 405 Method Not Allowed ✅                            │
│     Actual: 200 OK ⚠️ → Verb tampering possible                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│            TEST 6: SMART APPROVER SELECTION (P0 FIX)              │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Create payment request                                        │
│     POST /api/payment-requests { amount: 5000 }                   │
│     ↓                                                              │
│  2. Check if smart selection applied                              │
│     Expected: Assigned to least-busy approver ✅                   │
│     Actual: Always assigned to same person ❌ → Not working        │
│                                                                   │
│  3. Create 3 payment requests quickly                             │
│     ↓                                                              │
│  4. Check workload distribution                                   │
│     Expected: Distributed to 2-3 different approvers ✅            │
│     Actual: All to same person ❌ → Workload balancing off         │
│                                                                   │
│  5. Create high-value payment (₹750,000)                          │
│     ↓                                                              │
│  6. Approve through L1 → L2 → L3                                  │
│     ↓                                                              │
│  7. Check for Enterprise Admin escalation                         │
│     Expected: Auto-escalates to L4 after L3 ✅                     │
│     Actual: No escalation ❌ → Escalation not working              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Attack Scenarios Visualized

### Scenario 1: Cross-Tenant Data Breach

```
┌─────────────────┐
│   Client A      │
│   User: alice   │
│   tenant_id: 1  │
└────────┬────────┘
         │
         │ 1. Login successful
         │    Token: eyJhbG...
         ↓
    ┌─────────┐
    │   API   │
    └────┬────┘
         │
         │ 2. GET /api/super-admin/clients/2/users
         │    (Client B's users)
         │
         │ 🔴 Without tenant check:
         │    Returns Client B users ❌
         │
         │ ✅ With tenant check:
         │    Returns 403 Forbidden ✅
         ↓
┌────────────────────┐
│   Client B         │
│   tenant_id: 2     │
│   Users: bob, eve  │
│   ⚠️ Data exposed!  │
└────────────────────┘
```

### Scenario 2: Privilege Escalation

```
┌──────────────┐
│   MANAGER    │
│   Role: LOW  │
└──────┬───────┘
       │
       │ 1. Login as MANAGER
       │    Token contains: { role: "MANAGER" }
       ↓
  ┌─────────┐
  │   API   │
  └────┬────┘
       │
       │ 2. GET /api/admin (requires ADMIN role)
       │
       │ 🔴 Without role check:
       │    Returns admin data ❌
       │    Manager gains admin access!
       │
       │ ✅ With requireRole() middleware:
       │    Returns 403 Forbidden ✅
       ↓
┌────────────────────┐
│   ADMIN Panel      │
│   ⚠️ Unauthorized   │
│      access!       │
└────────────────────┘
```

### Scenario 3: IDOR Attack

```
User A          User B
(ID: 5)         (ID: 10)
   │               │
   │ 1. Login      │
   │    ↓          │
   └───→ API ←─────┘
         │
         │ 2. User A tries:
         │    GET /api/users/10
         │    (User B's profile)
         │
         ↓
    🔴 Without ownership check:
       Returns User B's data ❌
       {
         id: 10,
         email: "userb@company.com",
         salary: 75000,  ← Private!
         ssn: "123-45-6789" ← Sensitive!
       }
    
    ✅ With ownership check:
       IF user.id !== req.user.id:
         Return 403 Forbidden ✅
```

### Scenario 4: SQL Injection

```
Attacker
   │
   │ 1. Submit malicious login
   ↓
POST /api/auth/login
{
  "email": "admin' OR '1'='1",
  "password": "anything' OR '1'='1"
}
   │
   │ 🔴 Vulnerable code:
   │    query = `SELECT * FROM users 
   │             WHERE email = '${email}' 
   │             AND password = '${password}'`
   │    
   │    Becomes:
   │    SELECT * FROM users 
   │    WHERE email = 'admin' OR '1'='1' 
   │    AND password = 'anything' OR '1'='1'
   │    ↓
   │    Always TRUE! ❌
   │    Returns admin user!
   │
   │ ✅ Secure code (Prisma):
   │    prisma.user.findUnique({
   │      where: { email: email }  ← Parameterized
   │    })
   │    ↓
   │    Literal string match ✅
   │    Login fails ✅
   ↓
Database
```

---

## Test Result Interpretation

### ✅ SECURE (All Green)
```
┌────────────────────────────────────────┐
│  ✅ Cross-Tenant Access: PASS          │
│  ✅ Role Jumping: PASS                 │
│  ✅ Unauthorized Task View: PASS       │
│  ✅ Invalid Token Access: PASS         │
│  ✅ URL Guessing Attacks: PASS         │
│  ✅ Smart Approver Selection: PASS     │
└────────────────────────────────────────┘
         ↓
    🎉 SAFE TO DEPLOY!
```

### ⚠️ NEEDS ATTENTION (Some Red)
```
┌────────────────────────────────────────┐
│  ✅ Cross-Tenant Access: PASS          │
│  ❌ Role Jumping: FAIL                 │
│  ✅ Unauthorized Task View: PASS       │
│  ❌ Invalid Token Access: FAIL         │
│  ✅ URL Guessing Attacks: PASS         │
│  ✅ Smart Approver Selection: PASS     │
└────────────────────────────────────────┘
         ↓
    ⚠️ FIX BEFORE DEPLOY!
         ↓
    Fix role middleware
    Add authentication checks
         ↓
    Re-run tests
```

### 🚨 CRITICAL (Red Bold)
```
┌────────────────────────────────────────┐
│  ❌ Cross-Tenant Access: FAIL          │
│  ❌ Role Jumping: FAIL                 │
│  ❌ Unauthorized Task View: FAIL       │
│  ❌ Invalid Token Access: FAIL         │
│  ✅ URL Guessing Attacks: PASS         │
│  ✅ Smart Approver Selection: PASS     │
└────────────────────────────────────────┘
         ↓
    🚨 DO NOT DEPLOY!
         ↓
    4 Critical Vulnerabilities:
    1. Tenant isolation broken
    2. Privilege escalation possible
    3. Task authorization missing
    4. Authentication bypassable
         ↓
    IMMEDIATE ACTION REQUIRED!
```

---

## Workflow Integration

```
Developer
    ↓
1. Write Code
    ↓
2. Local Test
   $ node security-test.js
    ↓
    ├─ PASS → Continue
    └─ FAIL → Fix & Re-test
    ↓
3. Git Commit
    ↓
   Pre-commit Hook
   Runs security tests
    ↓
    ├─ PASS → Commit allowed
    └─ FAIL → Commit blocked
    ↓
4. Push to GitHub
    ↓
   CI/CD Pipeline
   Runs security tests
    ↓
    ├─ PASS → Deploy to staging
    └─ FAIL → Block deployment
    ↓
5. Staging Environment
    ↓
   Run security tests
   on staging API
    ↓
    ├─ PASS → Approve for production
    └─ FAIL → Fix in dev
    ↓
6. Production Deploy
    ↓
   Post-deploy verification
   Run security tests
    ↓
    ├─ PASS → Deployment successful ✅
    └─ FAIL → Rollback immediately! 🚨
```

---

## Quick Command Reference

```bash
# Basic test
node security-test.js

# Single category
node security-test.js --test=cross-tenant

# Verbose debug
node security-test.js --verbose

# Production test
API_URL=https://api.bisman.com node security-test.js

# With both options
node security-test.js --verbose --test=role-jumping

# Exit code check
node security-test.js
if [ $? -eq 0 ]; then
  echo "✅ Safe to deploy"
else
  echo "❌ Fix vulnerabilities first"
fi
```

---

*Visual Guide Version: 1.0.0*  
*Date: November 2, 2025*  
*Part of: Security Test Implementation*
