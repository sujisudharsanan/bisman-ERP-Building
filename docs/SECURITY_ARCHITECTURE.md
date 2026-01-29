# 🔐 ERP Security Architecture

> **Version:** 2.0  
> **Last Updated:** January 2026  
> **Status:** Production-Ready

---

## Overview

This document describes the complete security architecture for the BISMAN ERP system. The architecture implements **defense-in-depth** with multiple layers of protection.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY LAYERS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │   Layer 1    │   │   Layer 2    │   │   Layer 3    │   │   Layer 4    │ │
│  │ Authentication│──▶│  RBAC (Page) │──▶│ Data Scope   │──▶│ Database RLS │ │
│  │   (JWT)      │   │  Access      │   │ (Row Filter) │   │ (Safety Net) │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Page Access (RBAC)

### What it Controls
- **"Can I access this page/API?"**
- Menu visibility
- API endpoint authorization

### Source of Truth
```
admin_page_assignments
├── assigner_type (ENTERPRISE_ADMIN, SUPER_ADMIN, ADMIN)
├── assignee_type (SUPER_ADMIN, ADMIN, USER)
├── page_id
├── page_key
└── is_active
```

### Enforcement
- `effectiveAccessService.js` - Computes allowed pages
- `requireRole()` middleware - Blocks unauthorized access
- Frontend sidebar - Shows only allowed pages

### Hierarchy
```
ENTERPRISE_ADMIN
    ↓ assigns pages to
SUPER_ADMIN
    ↓ assigns pages to
ADMIN
    ↓ assigns pages to
USER
```

### Key Rule
> You can only assign pages that YOUR superior has approved for YOU.

---

## 2. Data Access (Data Scope)

### What it Controls
- **"What data do I see once inside a page?"**
- Row-level filtering
- Query result sets

### Source of Truth
```
rbac_roles.data_scope
├── ALL         - See everything (platform admins)
├── TENANT      - See all within tenant
├── DEPARTMENT  - See same department
├── EMPLOYEES   - See employee-type users only
├── OPERATIONS  - See operations department only
├── TEAM        - See same team
└── SELF        - See own records only
```

### Enforcement
- `dataScopeService.js` - Resolves user's scope
- `securityGate.js` - Attaches scope to request
- Query filters - Applied in WHERE clauses
- PostgreSQL RLS - Database safety net

### Example
```javascript
// Same page, different data based on role
const scope = await getDataScope(req.user);
const where = applyDataScope({ status: 'active' }, scope, req.user);
// Admin sees: 100 users
// HR sees: 50 employees
// User sees: 1 (self)
```

---

## 3. Database Security (RLS)

### What it Controls
- **Fail-safe data isolation**
- Tenant boundaries
- Defense against app bugs

### Session Context (MANDATORY)
```sql
-- Called at start of EVERY request
SELECT set_security_context(
  12,                    -- user_id
  'tenant-uuid',         -- tenant_id
  'EMPLOYEES',           -- data_scope
  'HR_ADMIN',            -- role
  'HR'                   -- department
);
```

### Key Policies
```sql
-- Tenant isolation (users_enhanced)
CREATE POLICY users_security_policy ON users_enhanced
USING (
  current_setting('app.data_scope') = 'ALL'
  OR (
    current_setting('app.data_scope') = 'TENANT'
    AND tenant_id::text = current_setting('app.tenant_id')
  )
  OR (
    current_setting('app.data_scope') = 'SELF'
    AND id = current_setting('app.user_id')::int
  )
);
```

### Tables with RLS
- `users_enhanced` - Core user data
- `clients` - Tenant visibility
- `contracts`, `invoices`, `expenses` - Financial data
- `audit_logs` - Security events

---

## 4. Security Invariants

These rules MUST always hold true:

| # | Invariant | Enforced By |
|---|-----------|-------------|
| 1 | No page access without RBAC approval | admin_page_assignments |
| 2 | No data without scope | dataScopeService |
| 3 | RBAC ≠ Data access | Separate tables |
| 4 | Same page ≠ Same data | data_scope column |
| 5 | No frontend-only filtering | Backend enforcement |
| 6 | No role-based SQL | Scope-based WHERE |
| 7 | Tenant isolation guaranteed | RLS policies |
| 8 | All decisions logged | security_access_log |

---

## 5. Request Flow

```
Request arrives
    │
    ▼
┌──────────────────┐
│ 1. Authenticate  │ JWT verification
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│ 2. Set Context   │ set_security_context()
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│ 3. RBAC Check    │ Page access allowed?
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│ 4. Attach Scope  │ getDataScope()
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│ 5. Execute Query │ applyDataScope() in WHERE
└────────┬─────────┘
         │
    ▼
┌──────────────────┐
│ 6. RLS Filter    │ DB policy enforcement
└────────┬─────────┘
         │
    ▼
Response (scoped data only)
```

---

## 6. Code Examples

### Secure Endpoint
```javascript
const { withSecurityGates } = require('./middleware/securityGate');

app.get('/api/users', authenticate, withSecurityGates('USER_MANAGEMENT', 
  async (req, res) => {
    // Gate 1: RBAC ✅
    // Gate 2: Scope ✅
    
    const where = req.applyScope({ status: 'active' });
    const users = await prisma.users_enhanced.findMany({ where });
    
    res.json(users);
  }
));
```

### Manual Scope Application
```javascript
const { getDataScope, applyDataScope } = require('./services/dataScopeService');

async function getUsers(req) {
  // Get user's scope
  const scope = await getDataScope(req.user);
  
  // Build scoped query
  const where = applyDataScope(
    { status: 'active' },
    scope,
    req.user
  );
  
  return prisma.users_enhanced.findMany({ where });
}
```

---

## 7. Role → Scope Mapping

| Role | Default Scope | Data Visibility |
|------|---------------|-----------------|
| ENTERPRISE_ADMIN | ALL | Everything |
| SYSTEM_ADMIN | ALL | Everything |
| SUPER_ADMIN | TENANT | All tenant data |
| ADMIN | TENANT | All tenant data |
| HR_ADMIN | EMPLOYEES | Employee records |
| OPS_ADMIN | OPERATIONS | Operations dept |
| MANAGER | TEAM | Team members |
| USER | SELF | Own records |

---

## 8. Security Testing

Run before every release:

```bash
node scripts/security-test-suite.js
```

### Test Categories

1. **RLS Context Tests**
   - Context function exists
   - Variables set correctly
   - Context detection works

2. **Tenant Isolation Tests**
   - Wrong tenant = 0 rows
   - Tenant switch works

3. **Data Scope Tests**
   - ALL sees everything
   - SELF sees only own record

4. **Bypass Prevention**
   - Missing context = 0 rows
   - Manual override blocked

---

## 9. Audit & Compliance

### What's Logged
```javascript
{
  event_type: 'ACCESS_DENIED',
  user_id: 12,
  tenant_id: 'uuid',
  data_scope: 'EMPLOYEES',
  table_name: 'users',
  operation: 'SELECT',
  timestamp: '2026-01-29T10:30:00Z'
}
```

### Alert Triggers
- Cross-scope access attempts
- Repeated DENY events
- ALL scope by non-admins
- Missing context queries

---

## 10. Emergency Procedures

### If Data Leak Detected
1. Revoke user's access immediately
2. Check `security_access_log` for scope violations
3. Review RLS policy for affected table
4. Audit all queries from that user/session

### If RLS Bypassed
1. Check if `set_security_context()` was called
2. Verify DB user doesn't have BYPASSRLS
3. Review application logs
4. Check for raw SQL queries

---

## Quick Reference

| Need to... | Use this... |
|------------|-------------|
| Check page access | `effectiveAccessService.checkPageAccess()` |
| Get user's scope | `dataScopeService.getDataScope()` |
| Apply scope to query | `dataScopeService.applyDataScope()` |
| Secure an endpoint | `withSecurityGates(pageKey, handler)` |
| Set DB context | `SELECT set_security_context(...)` |
| Log security event | `SELECT log_security_access(...)` |
| Run security tests | `node scripts/security-test-suite.js` |

---

## Files

| File | Purpose |
|------|---------|
| `services/effectiveAccessService.js` | RBAC computation |
| `services/dataScopeService.js` | Data scope resolution |
| `middleware/securityGate.js` | Two-gate security wrapper |
| `middleware/rlsContext.js` | PostgreSQL RLS context |
| `scripts/security-test-suite.js` | Security verification |
| `database/migrations/migration_046_*.js` | RLS setup |

---

*Last reviewed: January 2026*
