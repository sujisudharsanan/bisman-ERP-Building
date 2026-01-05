# BISMAN ERP - Security-Critical Gaps

**Date:** 2026-01-05  
**Source:** System Audit Report  
**Priority:** Descending risk order (P0 = Critical, P1 = High, P2 = Medium)

---

## P0-1: Subscription Limits Fail-Open (Bypass User Limits)

### Impact
Attackers can create unlimited users beyond subscription limits, leading to:
- Revenue loss (unlimited users on free/basic plans)
- Resource exhaustion (storage, API calls, database bloat)
- License compliance violations

### Exploit Scenario
1. Tenant on "Basic" plan with max 5 users
2. Attacker triggers any error condition during limit check (network timeout, DB error, malformed response)
3. Both backend and frontend default to `allow` on error
4. Attacker creates unlimited users, bypassing all subscription controls

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-backend/middleware/subscriptionEnforcement.js` | 354 | `failMode = 'open'` default |
| `my-frontend/src/hooks/useSubscriptionLimits.ts` | 73-77 | Returns `can_create_user: true` on error |
| `my-backend/services/superAdminService.js` | 70-85 | No subscription check at all |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Change `failMode` to `'closed'` in production; Add subscription check to `superAdminService.createUser()` |
| **Frontend** | Change error handling to `can_create_user: false` on API failure |

---

## P0-2: V1 Task API Bypasses Hierarchy Enforcement

### Impact
- Subordinates can directly assign tasks to superiors (chain of command violation)
- Potential for task flooding attacks on executives
- Audit trail integrity compromised

### Exploit Scenario
1. Junior employee (L2) wants to assign task to CEO (L9)
2. Frontend calls V2 API → blocked with `HIERARCHY_REQUIRES_REQUEST`
3. Attacker directly calls `POST /api/tasks` (V1) → **task created successfully**
4. CEO receives direct task assignment from subordinate, bypassing approval workflow

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-backend/routes/taskRoutes.js` | 255-301 | No `checkAssignmentHierarchy()` call |
| `my-backend/controllers/taskControllerV2.js` | 548-571 | Has hierarchy check (V2 only) |
| `my-backend/services/taskRequestService.js` | 89-122 | Service exists but not called by V1 |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Add hierarchy check to V1 route OR deprecate V1 API entirely |
| Frontend | N/A (frontend uses V2) |

---

## P0-3: Tenant Isolation Bypass in Critical Queries

### Impact
- Cross-tenant data leakage
- GDPR/compliance violations
- Complete multi-tenant security breakdown

### Exploit Scenario
1. Attacker authenticates as user in Tenant A
2. Calls endpoint that uses unrestricted query (e.g., vendor lookup)
3. Query returns data from ALL tenants (no `WHERE tenant_id = X`)
4. Attacker extracts competitor data, PII, financial records

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-backend/src/routes/vendors.ts` | 433 | `SELECT * FROM non_privileged_users` - no tenant filter |
| `my-backend/src/services/copilateSmartAgent.ts` | 760 | `SELECT * FROM knowledge_base` - no tenant filter |
| `my-backend/src/services/chat/taskService.ts` | 85, 309, 330 | `SELECT * FROM tasks` - filter added later (race condition) |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Add `WHERE tenant_id = $1` to ALL queries; Use tenant-scoped Prisma client |
| Frontend | N/A |

---

## P1-1: Business Level Can Be Set Without Hierarchy Validation

### Impact
- Privilege escalation (user creates another user with higher authority)
- Approval chain manipulation
- Unauthorized financial approvals

### Exploit Scenario
1. SUPER_ADMIN (L10) compromised or malicious
2. Creates new user via `POST /api/super-admin/users` with `business_level: 10`
3. No validation that creator's level >= new user's level
4. New user has same authority as SUPER_ADMIN, can approve unlimited payments

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-backend/services/superAdminService.js` | 70-85 | No `business_level` validation in `createUser()` |
| `my-backend/middleware/businessLevelProtection.js` | 92-109 | Hierarchy check exists for UPDATE but not CREATE |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Add validation: `newUser.business_level <= creator.business_level` |
| Frontend | Add UI warning when setting high business levels |

---

## P1-2: Permission System Desynchronization

### Impact
- Users may have frontend access to features backend denies (error floods)
- Users may be blocked from features they should access (operational disruption)
- Security decisions made inconsistently

### Exploit Scenario
1. Backend RBAC grants user `payment.approve` permission via `rbac_permissions` table
2. Frontend hardcoded `ROLE_PERMISSIONS` map doesn't include this permission for user's role
3. User blocked in UI but API works → or vice versa
4. Attacker discovers API-only permissions and exploits them directly

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-frontend/src/lib/permissions.ts` | 29-62 | Hardcoded `ROLE_PERMISSIONS` map |
| `my-backend/services/rbacService.js` | 307-330 | Uses `rbac_*` tables |
| `my-backend/middleware/rbacAuth.js` | 43-65 | `requirePermission()` uses DB |
| `my-frontend/src/common/rbac/rolePermissions.ts` | 1-100 | Another hardcoded permission set |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Expose `/api/permissions/my-permissions` endpoint |
| **Frontend** | Fetch permissions from backend instead of hardcoded maps |

---

## P1-3: Admin Role Blanket Bypass in Frontend

### Impact
- ADMIN role has implicit full access regardless of actual permissions
- Compromised ADMIN account = full system access
- No principle of least privilege

### Exploit Scenario
1. Tenant-level ADMIN account compromised
2. Frontend `hasPermission()` returns `true` for ANY permission
3. Attacker accesses all tenant features even those explicitly denied
4. Backend may block, but attacker still sees sensitive UI/data

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-frontend/src/lib/permissions.ts` | 76-77 | `if (user.roles?.includes('ADMIN')) return true;` |

### Fix Required
| Layer | Action |
|-------|--------|
| **Frontend** | Remove blanket bypass; Check actual permissions for ADMIN role |
| Backend | N/A (backend has proper checks) |

---

## P2-1: SLA Timeout Escalation Not Implemented

### Impact
- Approval requests stuck indefinitely
- Business process blockage
- No automatic escalation for urgent matters

### Exploit Scenario
1. Payment request submitted requiring L8 approval
2. L8 approver on vacation, no delegation set
3. `sla_hours: 24`, `escalation_hours: 48` defined in schema
4. **No cron job or scheduler executes escalation**
5. Request sits pending forever

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-backend/prisma/schema.prisma` | 815-816 | `sla_hours`, `escalation_hours` fields exist |
| `my-backend/src/services/ApprovalWorkflowService.ts` | N/A | No scheduled job calls escalation |
| `my-backend/cron/` | N/A | No escalation cron found |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Implement cron job to check `due_at` and trigger escalation |
| Frontend | N/A |

---

## P2-2: Reporting Manager Validation Missing

### Impact
- Broken org hierarchy in system
- Circular reporting relationships possible
- Inaccurate approval chain construction

### Exploit Scenario
1. User created without `reporting_manager_id` validation
2. User sets their own direct report as their reporting manager
3. Circular dependency created: A reports to B, B reports to A
4. Approval workflow enters infinite loop or undefined behavior

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-backend/services/superAdminService.js` | 70-85 | No reporting manager validation |
| `my-backend/services/adminCreation/adminWithSubscriptionService.js` | 300-320 | No reporting manager field |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Add validation: reporting_manager cannot be self or downstream report |
| Frontend | Add org chart validation in user creation form |

---

## P2-3: Soft Delete Without Query Filtering

### Impact
- "Deleted" users/data may still appear in queries
- Inactive users might retain access if `is_active` not checked
- Data retention compliance issues

### Exploit Scenario
1. User account deactivated (`is_active = false`)
2. Some queries don't filter by `is_active`
3. User still appears in dropdown lists, approval chains
4. Tasks assigned to inactive user, never completed

### Files Involved
| File | Line | Issue |
|------|------|-------|
| `my-backend/services/rbacService.js` | 143-160 | `getAllUsers()` may not filter `is_active` |
| `my-backend/lib/approvalEngine.js` | 94-117 | `findEligibleApprovers()` has `is_active: true` ✓ |

### Fix Required
| Layer | Action |
|-------|--------|
| **Backend** | Audit all queries; Add `is_active = true` filter where missing |
| Frontend | N/A |

---

## Risk Summary Matrix

| ID | Gap | Impact | Exploitability | Fix Complexity | Priority |
|----|-----|--------|----------------|----------------|----------|
| P0-1 | Subscription fail-open | Revenue, Resources | Easy | Low | **CRITICAL** |
| P0-2 | V1 API hierarchy bypass | Chain of command | Easy | Low | **CRITICAL** |
| P0-3 | Tenant isolation bypass | Data breach | Medium | Medium | **CRITICAL** |
| P1-1 | Business level on create | Privilege escalation | Medium | Low | HIGH |
| P1-2 | Permission desync | Access control | Medium | High | HIGH |
| P1-3 | Admin blanket bypass | Over-privilege | Easy | Low | HIGH |
| P2-1 | SLA escalation missing | Process blockage | N/A (operational) | Medium | MEDIUM |
| P2-2 | Reporting manager | Org integrity | Low | Low | MEDIUM |
| P2-3 | Soft delete filtering | Data integrity | Low | Medium | MEDIUM |

---

## Recommended Fix Order

1. **Immediate (P0):** Fix subscription fail-open, V1 API hierarchy, tenant isolation
2. **This Sprint (P1):** Business level validation, permission sync, admin bypass removal
3. **Next Sprint (P2):** SLA escalation cron, reporting manager validation, soft delete audit

---

*Generated from SYSTEM_AUDIT_REPORT.md analysis*
