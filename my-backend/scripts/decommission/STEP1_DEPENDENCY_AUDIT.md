# STEP 1 — Dependency Audit Report

**Generated:** 2026-01-12  
**Status:** READ-ONLY AUDIT  

---

## Summary

| Category | Count | Risk Level |
|----------|-------|------------|
| Raw SQL SELECT queries | 60+ | MEDIUM |
| Raw SQL INSERT queries | 4 | HIGH |
| Raw SQL UPDATE queries | 2 | HIGH |
| Auth routes (fallback) | 1 | CRITICAL |
| Services with user joins | 12 | MEDIUM |
| Knex ORM queries | 5 | MEDIUM |

---

## CRITICAL DEPENDENCIES (Must fix before decommission)

### 1. Auth Route Fallback (`routes/auth.js:270`)
```javascript
// Falls back to legacy users table for ADMIN users
const legacyResult = await prisma.$queryRaw`
  SELECT id, username, email, password_hash, role, is_active, 
         "productType", tenant_id, super_admin_id, profile_pic_url
  FROM users 
  WHERE email = ${email}
  LIMIT 1
`;
```
**Risk:** CRITICAL - Login depends on this fallback  
**Action:** Remove after all users migrated to `users_enhanced`

---

### 2. Admin User Creation (`routes/clientManagement.js:400-440`)
Creates users in `prismaClient.user` (users_enhanced), but does NOT sync to legacy table.  
**Risk:** HIGH - Password mismatch  
**Action:** Already correct - uses enhanced table

---

### 3. INSERT Statements (scripts/)
| File | Line | Purpose |
|------|------|---------|
| `create-test-user.js:23` | INSERT INTO users | Test user creation |
| `migrate-users-to-production.js:84` | INSERT INTO users | Migration script |
| `create-admin.js:56-72` | INSERT INTO users | Admin creation |

**Risk:** HIGH - Creates users in wrong table  
**Action:** Deprecate or update these scripts

---

### 4. UPDATE Statements
| File | Line | Purpose |
|------|------|---------|
| `lib/authorityLevel.js:457` | UPDATE users SET | Authority level update |
| `lib/authorityLevel.js:526` | UPDATE users SET | Business level update |

**Risk:** HIGH - Updates wrong table  
**Action:** Change to users_enhanced

---

## MEDIUM RISK DEPENDENCIES (JOIN queries - will auto-resolve with VIEW)

### Services with user JOINs
| File | Lines | Description |
|------|-------|-------------|
| `ApprovalWorkflowService.ts` | 229, 251, 277, 428, 457, 519, 591, 630, 688, 953, 982, 1005 | User lookups for approvals |
| `PaymentWorkflowService.js` | 138, 178, 200, 947-950, 1045-1046, 1065 | Payment workflow users |
| `PaymentWorkflowServiceV2.js` | 685 | Updated service |
| `SettlementService.js` | 633, 759, 823, 1540-1541, 1612, 1706, 1817 | Settlement users |
| `clarificationService.js` | 96-97, 290, 462, 580-582, 620, 686-688, 707 | Clarification actors |
| `taskRequestService.js` | 80, 263, 277, 361-363, 1068, 1103 | Task request users |
| `reviewService.js` | 86, 487, 666, 821, 844 | Review users (Knex) |
| `rbacService.js` | 151, 524 | RBAC user lookups |
| `beyTools.js` | 67-68, 87, 397-398, 604, 697, 745, 750, 823 | AI tool user lookups |
| `beyLLMEngine.js` | 356 | LLM user context |
| `unifiedChatEngine.js` | 429, 492 | Chat user context |
| `microUnlockBillingEngine.js` | 425 | Billing user lookup |
| `spendControlService.js` | 296, 324 | Spend control users |

**Action:** These will auto-resolve when `users` becomes a VIEW pointing to `users_enhanced`

---

### Routes with user JOINs
| File | Lines | Description |
|------|-------|-------------|
| `calendar.js` | 223 | Calendar organizer |
| `decisionLoadRoutes.js` | 166, 575, 750-751, 961 | Decision load users |
| `paymentWorkflowRoutes.js` | 654, 695-696, 840-841, 913-914 | Payment workflow |
| `settlementRoutes.js` | 513 | Settlement actors |
| `taskWorkbenchRoutes.js` | 68-69, 103-104, 232-233, 251 | Task users |
| `taskApprovalRoutes.js` | 145 | Task approval |
| `securityDashboard.js` | 575 | Audit log users |
| `password-reset.js` | 316 | Password reset |
| `approverRoutes.js` | 248 | Approver lookup |
| `privilegeRoutes.js` | 178, 493 | Privilege users |
| `enterprise-admin-Reports.js` | 90 | Report users |
| `internal-operations.js` | 515 | Support sessions |
| `ultimateChatRoutes.ts` | 54, 148 | Chat user lookup |
| `messages.ts` | 115 | Message sender |

**Action:** Auto-resolve with VIEW

---

## LOW RISK (Scripts / Shell)

| File | Purpose |
|------|---------|
| `setup-railway-db.sh` | Setup verification queries |
| `check-user.js` | Debug script |
| `check-tables.js` | Debug script |
| `reset-password.js` | Password reset (updates both tables) |

**Action:** Update or deprecate after migration

---

## DEPENDENCY MAP DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ auth.js      │───>│ users_enhanced   │───>│ SUCCESS       │  │
│  │ (Primary)    │    │ (Prisma User)    │    │               │  │
│  └──────────────┘    └──────────────────┘    └───────────────┘  │
│         │                                                        │
│         │ (if not found)                                         │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ auth.js      │───>│ users (legacy)   │───>│ SUCCESS       │  │
│  │ (Fallback)   │    │ (Raw SQL)        │    │               │  │
│  └──────────────┘    └──────────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     JOIN QUERIES (60+)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ApprovalWorkflowService, PaymentWorkflowService,         │   │
│  │ SettlementService, taskRequestService, reviewService,    │   │
│  │ clarificationService, rbacService, beyTools, etc.        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    users TABLE                            │   │
│  │         (Will become VIEW → users_enhanced)               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    WRITE OPERATIONS                              │
│  ┌──────────────┐    ┌──────────────────┐                       │
│  │ scripts/     │───>│ INSERT INTO users│  ❌ DEPRECATED        │
│  │ create-*.js  │    │                  │                       │
│  └──────────────┘    └──────────────────┘                       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐                       │
│  │ lib/         │───>│ UPDATE users SET │  ❌ MUST FIX          │
│  │ authorityLvl │    │                  │                       │
│  └──────────────┘    └──────────────────┘                       │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐                       │
│  │ clientMgmt   │───>│ users_enhanced   │  ✅ CORRECT           │
│  │ (Admin CRUD) │    │ (Prisma)         │                       │
│  └──────────────┘    └──────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## NEXT STEP

Proceed to **STEP 2 — Data Integrity Audit** to identify:
- Users missing from `users_enhanced`
- Password hash mismatches
- Orphaned records
