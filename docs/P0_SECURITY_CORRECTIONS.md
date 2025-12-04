# P0 Security Corrections - Implementation Summary

**Date:** December 4, 2025  
**Priority:** P0 (Critical - Hours)  
**Status:** ✅ Implemented

---

## Overview

This document summarizes the P0 security corrections implemented to address critical security and correctness issues in the BISMAN ERP database and application layer.

---

## 1. Password/Token Hygiene ✅

### Changes Made:
- **Renamed columns:** `password` → `password_hash` in:
  - `users` table
  - `enterprise_admins` table
  - `super_admins` table

### Why:
- Makes it semantically clear that only hashed passwords are stored
- Prevents accidental plaintext storage
- Enforces bcrypt/argon2 at application layer

### Files Modified:
- `prisma/schema.prisma` - Column renames
- `routes/auth.js` - Login handlers updated
- `services/superAdminService.js` - User creation/update
- `routes/enterprise.js` - Super admin updates
- `routes/clientManagement.js` - Admin user creation
- `app.js` - Super admin update endpoint

### Backward Compatibility:
Auth code now checks both `password_hash` and `password` fields:
```javascript
const passwordHash = user.password_hash || user.password;
```

---

## 2. PII Encryption ✅

### Changes Made:
- Added encrypted columns for sensitive data:

**user_kyc table:**
| Field | Encrypted Column | IV Column | Display Column |
|-------|-----------------|-----------|----------------|
| PAN | `pan_encrypted` | `pan_iv` | `pan_last4` |
| Aadhaar | `aadhaar_encrypted` | `aadhaar_iv` | `aadhaar_last4` |

**user_bank_accounts table:**
| Field | Encrypted Column | IV Column | Display Column |
|-------|-----------------|-----------|----------------|
| Account Number | `account_number_encrypted` | `account_number_iv` | `account_number_last4` |

### Encryption Details:
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key:** 256-bit via `PII_ENCRYPTION_KEY` environment variable
- **IV:** Random 128-bit per encryption operation

### New File:
`lib/encryption.js` - Encryption utility with:
- `encryptPAN()` / `decryptPAN()`
- `encryptAadhaar()` / `decryptAadhaar()`
- `encryptBankAccount()` / `decryptBankAccount()`
- `maskSensitiveData()` - For display purposes
- `generateEncryptionKey()` - Key generation utility

### Environment Variable:
```bash
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PII_ENCRYPTION_KEY=<64-hex-characters>
```

---

## 3. Session/OTP Token Hashing ✅

### Changes Made:

**user_sessions table:**
- Added `token_hash` (VARCHAR 64) - SHA-256 hash of session token
- Added `token_prefix` (VARCHAR 8) - First 8 chars for debugging
- Deprecated `session_token` raw storage

**otp_tokens table:**
- Already uses `otp_hash` - verified ✅

### New Functions in `lib/encryption.js`:
```javascript
hashSessionToken(token)  // Returns { hash, prefix }
hashOTP(otp)             // Returns SHA-256 hash
verifyOTP(otp, storedHash) // Timing-safe comparison
```

### Cleanup Functions (SQL):
- `cleanup_expired_sessions()` - Removes expired sessions
- `cleanup_expired_otps()` - Removes expired OTPs

---

## 4. Audit Columns ✅

### Changes Made:

**users table:**
- Added `created_by` (INT FK) - Who created the account

**clients table:**
- Added `created_by` (INT) - Who created the client

**payment_requests table:**
- Added `updated_by` (INT) - Last modifier

**tasks table:**
- Added `updated_by` (INT) - Last modifier

### Note:
- `created_at` and `updated_at` already existed on most tables
- `thread_messages` already has `senderId` as creator

---

## Migration File

**Location:** `database/migrations/009_p0_security_corrections.sql`

### To Apply:
```bash
psql $DATABASE_URL -f database/migrations/009_p0_security_corrections.sql
```

### What It Does:
1. Renames password columns
2. Adds encrypted PII columns
3. Adds session hash columns
4. Adds audit columns
5. Creates cleanup functions
6. Adds security constraints
7. Adds documentation comments

---

## Constraints Added

```sql
-- Password hash minimum length (bcrypt = 60 chars)
CHECK (password_hash IS NOT NULL AND LENGTH(password_hash) >= 60)

-- OTP hash length (SHA-256 = 64 chars)
CHECK (LENGTH(otp_hash) >= 64)
```

---

## Data Migration Required

After running the SQL migration, existing data needs to be migrated:

### 1. Encrypt existing PII data:
```javascript
const { encryptPAN, encryptAadhaar, encryptBankAccount } = require('./lib/encryption');

// For each user_kyc record with panNumber:
const encrypted = encryptPAN(record.panNumber);
await prisma.userKYC.update({
  where: { id: record.id },
  data: {
    panEncrypted: encrypted.panEncrypted,
    panIv: encrypted.panIv,
    panLast4: encrypted.panLast4
  }
});
```

### 2. Hash existing session tokens:
```javascript
const { hashSessionToken } = require('./lib/encryption');

// For each session:
const { hash, prefix } = hashSessionToken(session.session_token);
await prisma.user_sessions.update({
  where: { id: session.id },
  data: { token_hash: hash, token_prefix: prefix }
});
```

---

## Production Checklist

- [ ] Generate and securely store `PII_ENCRYPTION_KEY`
- [ ] Run SQL migration in staging first
- [ ] Run data migration scripts
- [ ] Test login with new column names
- [ ] Verify PII encryption/decryption
- [ ] Set up cron jobs for session cleanup
- [ ] Monitor for any auth failures

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Column renames, new encrypted fields |
| `routes/auth.js` | Updated password field references |
| `services/superAdminService.js` | Updated to password_hash |
| `routes/enterprise.js` | Updated to password_hash |
| `routes/clientManagement.js` | Updated to password_hash |
| `app.js` | Updated to password_hash |
| `lib/encryption.js` | **NEW** - PII encryption utilities |
| `.env.local.example` | Added PII_ENCRYPTION_KEY |
| `database/migrations/009_p0_security_corrections.sql` | **NEW** - Migration |
| `docs/DATABASE_TABLES_REPORT.md` | Updated documentation |

---

## Next Steps (P1)

1. Remove deprecated plaintext columns after migration verified
2. Implement key rotation mechanism
3. Add database-level row security policies
4. Implement audit log for PII access
5. Add encryption for other sensitive fields (phone numbers, etc.)
