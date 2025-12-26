# 🔐 ERP INPUT SECURITY & CREDENTIAL STANDARDS AUDIT REPORT

**Audit Date:** December 26, 2025  
**Auditor:** Automated Security Scan  
**ERP Version:** BISMAN ERP (deployment branch)

---

## 📊 EXECUTIVE SUMMARY

| Category | Status | Critical Issues | High Issues | Medium Issues |
|----------|--------|-----------------|-------------|---------------|
| Password Security | ⚠️ PARTIAL | 2 | 3 | 2 |
| Email Validation | ✅ GOOD | 0 | 1 | 1 |
| Phone Validation | ⚠️ PARTIAL | 0 | 2 | 1 |
| Name Fields | ❌ FAIL | 0 | 2 | 1 |
| KYC/ID Security | ✅ GOOD | 0 | 0 | 2 |
| Input Sanitization | ⚠️ PARTIAL | 1 | 1 | 1 |
| **TOTAL** | **⚠️ NEEDS WORK** | **3** | **9** | **8** |

---

## 1️⃣ PASSWORD SECURITY

### ❌ CRITICAL: Password Minimum Length Inconsistency

| Module | File | Current | Required | Status |
|--------|------|---------|----------|--------|
| Backend Password Reset | `routes/password-reset.js:34` | 8 chars | 12 chars | ❌ FAIL |
| Backend Security Middleware | `middleware/security.js:17` | 8 chars | 12 chars | ❌ FAIL |
| Enterprise Admin Create | `routes/enterprise-admin-SuperAdmins.js:240` | 8 chars | 12 chars | ❌ FAIL |
| **Super Admin Create** | `enterprise-admin/super-admins/create/page.tsx:175` | **6 chars** | 12 chars | ❌ CRITICAL |
| **Module Management** | `enterprise-admin/modules/page.tsx:1355` | **6 chars** | 12 chars | ❌ CRITICAL |
| Frontend Change Password | `modules/common/pages/change-password.tsx:29` | 8 chars | 12 chars | ❌ FAIL |
| Frontend Signup | `app/signup/page.tsx:176` | 8 chars | 12 chars | ❌ FAIL |
| Auth Reset Password | `app/auth/reset-password/page.tsx:139` | 8 chars | 12 chars | ❌ FAIL |

**Finding:** Multiple places use 6-8 character minimum instead of required 12 characters.

---

### ❌ CRITICAL: Security Middleware NOT Applied to Auth Routes

**Issue:** `sanitizeInput` middleware exists in `middleware/security.js` but is **not used anywhere**.

```javascript
// middleware/security.js - exports sanitizeInput but...
module.exports = {
  authLimiter,
  sanitizeInput,  // ← NEVER IMPORTED OR USED
  validatePassword,
  ...
}
```

**Evidence:** Grep for `sanitizeInput` shows only 2 matches - both in the same file (definition and export).

**Impact:** Backend password validation regex is never enforced at the API layer.

---

### ⚠️ HIGH: Bulk Import Uses Default Password

**File:** `routes/enterprise-admin-Users.js:399`

```javascript
// Hash password
const hashedPassword = await bcrypt.hash(password || 'Welcome@123', 10);
```

**Issue:** Bulk user import falls back to weak default password `Welcome@123` if no password provided.

---

### ⚠️ HIGH: No Common Password Blocking

**Issue:** No blocklist for common passwords (123456, password, qwerty, etc.)

**Evidence:** Searched for `common.*password|password.*history` - no blocklist implementation found.

---

### ⚠️ HIGH: No Password Reuse Prevention

**Issue:** No password history tracking. Users can reuse the same password indefinitely.

**Required:** Last 5 passwords should be blocked.

---

### ✅ PASS: Password Hashing

**Status:** bcrypt with 10-12 rounds properly implemented.

```javascript
// middleware/security.js:69
const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return bcrypt.hash(password, rounds);
}
```

---

### ✅ PASS: Password Complexity Regex (Backend - but not enforced)

```javascript
// middleware/security.js:19
/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
```

**Note:** Good regex but minimum length is 8, should be 12.

---

### ⚠️ MEDIUM: Frontend/Backend Validation Mismatch

| Location | Min Length | Uppercase | Lowercase | Number | Special |
|----------|------------|-----------|-----------|--------|---------|
| Backend `security.js` | 8 | ✅ | ✅ | ✅ | ✅ |
| Frontend `change-password.tsx` | 8 | ✅ | ✅ | ✅ | ✅ |
| Frontend `signup/page.tsx` | 8 | ✅ | ✅ | ✅ | ✅ |
| Backend `password-reset.js` | 8 | ✅ | ✅ | ✅ | ✅ |

**Note:** Rules are consistent but min length should be 12.

---

## 2️⃣ EMAIL / USERNAME VALIDATION

### ✅ PASS: Email Format Validation

**Backend:** Uses `express-validator` with `isEmail()` and `normalizeEmail()`.

```javascript
// routes/onboarding/index.js:40
body('adminEmail')
  .isEmail()
  .normalizeEmail()
```

---

### ✅ PASS: Disposable Email Blocking (Trial Flow)

**File:** `routes/trialOtpOnboarding.js:17`

```javascript
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'yopmail.com'
])
```

**Note:** Limited blocklist. Consider using a package like `disposable-email-domains`.

---

### ⚠️ HIGH: Disposable Email Not Blocked in Main Signup

**Issue:** Disposable email blocking only exists in trial OTP flow, not in main signup or user creation.

---

### ✅ PASS: Email Uniqueness Enforcement

Multiple checks found:
- `onboarding/index.js` - checks email exists before tenant creation
- `adminWithSubscription.js` - validates email availability
- `clientManagement.js` - checks for duplicate admin email

---

### ⚠️ MEDIUM: Email Case Sensitivity

**Good:** Database uses `citext` for case-insensitive email matching.

```sql
-- migrations/013_add_constraints_indexes.sql
-- Convert email column to citext (case-insensitive text)
```

---

## 3️⃣ PHONE NUMBER VALIDATION

### ⚠️ HIGH: Inconsistent Phone Validation

| Location | Format | Country Code | E.164 |
|----------|--------|--------------|-------|
| Trial Onboarding | ✅ E.164 | ✅ Required | ✅ |
| Main Onboarding | `isMobilePhone()` | ❌ Optional | ❌ |
| User Creation | None | ❌ | ❌ |
| Client Form | India only (+91) | ✅ Dropdown | ⚠️ |

---

### ⚠️ HIGH: Trial Flow Has Better Validation Than Main Flow

**Good (Trial):** `routes/trialOtpOnboarding.js:21`
```javascript
function isE164(m){ return /^\+?[1-9]\d{7,14}$/.test(String(m||'').trim()) }
```

**Weak (Main):** `routes/onboarding/index.js:54`
```javascript
body('phone')
  .optional()
  .isMobilePhone()  // Less strict, optional
```

---

### ⚠️ MEDIUM: Indian-Only Phone Regex in Frontend

**File:** `shared/validation/commonSchemas.ts:127`
```javascript
v => /^(\+91|91|0)?[6-9][0-9]{9}$/.test(v),
```

**Issue:** Only validates Indian phone numbers. Not suitable for international ERP.

---

## 4️⃣ NAME FIELD VALIDATION

### ⚠️ HIGH: No Numeric/Special Character Blocking

**Issue:** Name fields do not block numbers or special characters.

**Evidence:** Searched for name validation - only length checks found:

```javascript
// onboarding/index.js:42
body('adminName')
  .trim()
  .isLength({ min: 2, max: 100 })  // No character type validation
```

---

### ⚠️ HIGH: No Emoji Blocking

**Issue:** Emoji and special Unicode characters are not blocked in name fields.

---

### ⚠️ MEDIUM: Inconsistent Length Limits

| Field | File | Min | Max |
|-------|------|-----|-----|
| adminName | onboarding/index.js | 2 | 100 |
| username | UserFormModal.tsx | 3 | - |
| company name | onboarding/index.js | 2 | 100 |

---

## 5️⃣ KYC / GOVERNMENT ID FIELDS

### ✅ PASS: PII Encryption at Rest

**Implementation:** AES-256-GCM encryption for sensitive data.

**File:** `lib/encryption.js`

| Field | Encrypted Column | IV | Display |
|-------|-----------------|-----|---------|
| PAN | `pan_encrypted` | `pan_iv` | `pan_last4` |
| Aadhaar | `aadhaar_encrypted` | `aadhaar_iv` | `aadhaar_last4` |
| Bank Account | `account_number_encrypted` | `account_number_iv` | `account_number_last4` |

---

### ✅ PASS: ID Format Validation

**PAN Validation:**
```javascript
// shared/validation/commonSchemas.ts:68
/^[A-Z]{5}[0-9]{4}[A-Z]$/
```

**Aadhaar Validation:**
```javascript
// shared/validation/commonSchemas.ts:80
/^[0-9]{12}$/
```

**GSTIN Validation:**
```javascript
// shared/validation/commonSchemas.ts:50
/^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/
```

---

### ⚠️ MEDIUM: Deprecated Plaintext Columns Still Exist

**Database still has:**
- `user_kyc.pan_number` (deprecated)
- `user_kyc.aadhaar_number` (deprecated)

**Recommendation:** Run data migration to encrypt all existing data, then drop plaintext columns.

---

### ⚠️ MEDIUM: Encryption Key Validation

**File:** `lib/encryption.js:25`
```javascript
function validateKey() {
  if (!ENCRYPTION_KEY) {
    throw new Error('PII_ENCRYPTION_KEY environment variable not set...');
  }
  // Key length validation exists
}
```

**Good:** Throws error if key not set.

---

## 6️⃣ INPUT SANITIZATION

### ❌ CRITICAL: XSS Sanitization Middleware Not Applied

**Issue:** `sanitizeInput` middleware exists but is **never used** in any route.

**File:** `middleware/security.js` - defined but not imported/used elsewhere.

---

### ⚠️ HIGH: Limited HTML Stripping

**Only found in:**
- `trialOtpOnboarding.js` - strips newlines/tabs
- `logSanitizer.js` - redacts sensitive data for logs

**Missing:** General HTML/script tag stripping for form inputs.

---

### ✅ PASS: Helmet Security Headers

**File:** `app.js:131`
```javascript
// X-XSS-Protection - Enable browser XSS filtering
xssFilter: true,
```

---

### ✅ PASS: Prisma ORM (SQL Injection Prevention)

Using Prisma ORM throughout - parameterized queries by default.

---

### ⚠️ MEDIUM: Raw SQL Queries

Some raw SQL queries found:
```javascript
// Example in auth.js
prisma.$queryRaw`SELECT ... WHERE email = ${email}`
```

**Status:** Uses template literals (safe with Prisma) but should be audited for consistency.

---

## 7️⃣ RATE LIMITING

### ✅ PASS: Login Rate Limiting

**File:** `middleware/loginRateLimiter.js`
- 5 attempts per email per window
- 5 attempts per IP per window
- Configurable block duration

---

### ✅ PASS: OTP Rate Limiting

**File:** `services/otpService.js`
```javascript
const RATE_EMAIL_HOURLY = Number(process.env.RATE_LIMIT_EMAIL || 5);
const RATE_IP_HOURLY = Number(process.env.RATE_LIMIT_IP || 20);
```

---

### ✅ PASS: Onboarding Rate Limiting

**File:** `routes/onboarding/index.js`
```javascript
const onboardingLimiter = createAdaptiveRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
});
```

---

## 📋 REMEDIATION PRIORITY

### 🔴 CRITICAL (Fix Immediately)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | 6-char password in Super Admin create | `super-admins/create/page.tsx:175` | Change to 12 |
| 2 | 6-char password in Module Management | `modules/page.tsx:1355` | Change to 12 |
| 3 | `sanitizeInput` not applied | Multiple routes | Apply to all auth routes |

### 🟠 HIGH (Fix This Sprint)

| # | Issue | Fix |
|---|-------|-----|
| 4 | Password min 8 → 12 everywhere | Update all validation constants |
| 5 | Add common password blocklist | Create `commonPasswords.js` |
| 6 | Add password history | Create `password_history` table |
| 7 | Bulk import default password | Require password or generate strong random |
| 8 | Disposable email blocking | Apply to all signup flows |
| 9 | Phone E.164 enforcement | Apply to all phone inputs |
| 10 | Name field character validation | Block numbers, emojis, scripts |
| 11 | HTML/XSS input stripping | Create and apply `stripHtml` middleware |
| 12 | Phone validation - main signup | Use E.164 like trial flow |

### 🟡 MEDIUM (Next Sprint)

| # | Issue | Fix |
|---|-------|-----|
| 13 | Frontend/backend validation sync | Centralize in shared package |
| 14 | Deprecated KYC columns | Run encryption migration, drop columns |
| 15 | International phone support | Support E.164 with country selector |
| 16 | Expand disposable email list | Use `disposable-email-domains` package |
| 17 | Audit raw SQL queries | Review and document all `$queryRaw` usage |
| 18 | Name length consistency | Standardize min/max across forms |

---

## 🛠️ RECOMMENDED FIXES

### Fix 1: Create Central Password Validator

```javascript
// lib/passwordValidator.js
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', 'qwerty', 
  'letmein', 'welcome', 'admin', 'login'
]);

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{12,}$/;

function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[@$!%*?&#]/.test(password)) {
    errors.push('Password must contain special character');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  if (/^(.)\1+$/.test(password) || /^(012|123|234|345|456|567|678|789|abc|bcd)/i.test(password)) {
    errors.push('Password contains sequential pattern');
  }
  
  return { valid: errors.length === 0, errors };
}

module.exports = { validatePassword, PASSWORD_REGEX };
```

### Fix 2: Apply sanitizeInput to Auth Routes

```javascript
// routes/auth.js
const { sanitizeInput, authLimiter } = require('../middleware/security');

router.post('/login', authLimiter, sanitizeInput, async (req, res) => {
  // existing login logic
});
```

### Fix 3: Create Name Validator

```javascript
// lib/nameValidator.js
const NAME_REGEX = /^[\p{L}\p{M}' -]+$/u;  // Unicode letters, marks, apostrophe, space, hyphen

function validateName(name) {
  if (!name || name.length < 2 || name.length > 50) {
    return { valid: false, error: 'Name must be 2-50 characters' };
  }
  if (!NAME_REGEX.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }
  if (/\d/.test(name)) {
    return { valid: false, error: 'Name cannot contain numbers' };
  }
  return { valid: true };
}
```

---

## ✅ PASSING AREAS

| Area | Status | Notes |
|------|--------|-------|
| Password Hashing | ✅ PASS | bcrypt 10-12 rounds |
| KYC Encryption | ✅ PASS | AES-256-GCM |
| ID Format Validation | ✅ PASS | PAN, Aadhaar, GSTIN regex |
| Login Rate Limiting | ✅ PASS | 5 attempts/window |
| OTP Security | ✅ PASS | HMAC hashing, rate limiting |
| Session Token Hashing | ✅ PASS | SHA-256 |
| Helmet Headers | ✅ PASS | XSS, HSTS, X-Frame |
| SQL Injection | ✅ PASS | Prisma ORM |
| Email Uniqueness | ✅ PASS | Multiple checks |
| Database Constraints | ✅ PASS | Password hash min length constraint |

---

## 📅 AUDIT FOLLOW-UP

| Date | Action | Responsible |
|------|--------|-------------|
| Jan 2, 2026 | Fix CRITICAL issues | Dev Team |
| Jan 9, 2026 | Fix HIGH issues | Dev Team |
| Jan 16, 2026 | Re-audit password security | Security Team |
| Jan 23, 2026 | Fix MEDIUM issues | Dev Team |
| Jan 30, 2026 | Full security regression test | QA Team |

---

**Report Generated:** December 26, 2025  
**Next Audit Scheduled:** January 30, 2026
