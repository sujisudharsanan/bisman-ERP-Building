# 🔐 Data Isolation Error Handling

## Core Principle (Non-Negotiable)

> **Authorization errors must be understandable to users, but vague to attackers.**

| ✅ Good | ❌ Bad |
|---------|--------|
| Helpful to the user | Internal security leakage |
| Clear next action | Role/scope details exposed |
| No confusion | SQL errors shown |

---

## Error Type Differentiation

| Scenario | HTTP Code | User Message | Internal Meaning |
|----------|-----------|--------------|------------------|
| Page not allowed | 403 | "You don't have access to this page." | RBAC deny |
| Page allowed, no data | 200 | Empty state UI | Valid but no rows |
| Page allowed, data restricted | 403 | "You don't have permission to view this data." | Data-scope / RLS |
| System / context error | 500 | "Something went wrong." | Bug / misconfig |

---

## 🔴 MOST IMPORTANT RULE

> **Empty data is NOT an error. Blocked data IS an error.**

### ✅ DO: Empty State for 0 Rows
```javascript
// User has page access, query returns 0 rows
res.json({
  success: true,
  data: [],
  message: "No records are available for your access level.",
  isEmpty: true,
  count: 0
});
```

### ❌ DON'T: Error for Empty Data
```javascript
// WRONG - This confuses users
res.status(403).json({
  error: "Access denied"  // When really there's just no data
});
```

---

## When to Show Errors

Show an error **ONLY** when:
- User tries to **open a specific record** they are not allowed to see
- User tries to **edit/delete data** outside their scope
- User tries to **export data** they can't access

These are **explicit actions**, not passive views.

---

## Implementation Files

### Core Module
**`/my-backend/middleware/dataIsolationErrorHandler.js`**

### Integration
**`/my-backend/middleware/errorHandler.js`** (updated)

---

## Error Codes

| Code | HTTP | Message |
|------|------|---------|
| `PAGE_ACCESS_DENIED` | 403 | "You don't have access to this page." |
| `DATA_ACCESS_DENIED` | 403 | "You don't have permission to view this data." |
| `DATA_MODIFY_DENIED` | 403 | "You can view this record, but you're not allowed to modify it." |
| `DATA_DELETE_DENIED` | 403 | "You don't have permission to delete this data." |
| `DATA_EXPORT_DENIED` | 403 | "You don't have permission to export this data." |
| `SELF_SCOPE_VIOLATION` | 403 | "You can only access your own information." |
| `RLS_CONTEXT_ERROR` | 500 | "Something went wrong." |

---

## Usage Examples

### 1. Basic Query with Empty State Handling

```javascript
const { asyncHandler, createEmptyStateResponse } = require('../middleware/errorHandler');

router.get('/tasks', asyncHandler(async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { tenant_id: req.user.tenantId }
  });
  
  // Handle empty results properly (NOT an error!)
  if (tasks.length === 0) {
    return res.json(createEmptyStateResponse('tasks'));
  }
  
  res.json({ success: true, data: tasks, count: tasks.length });
}));
```

### 2. Using the Data Isolation Wrapper

```javascript
const { withDataIsolation } = require('../middleware/dataIsolationErrorHandler');

// Automatically handles empty states and RLS errors
router.get('/tasks', withDataIsolation(async (req) => {
  return prisma.task.findMany({
    where: { tenant_id: req.user.tenantId }
  });
}, { entityType: 'tasks', paginated: true }));
```

### 3. Enforcing Self-Scope on User Routes

```javascript
const { enforceSelfScope } = require('../middleware/dataIsolationErrorHandler');

// GET /users/:id - Only allow access to own record for SELF scope
router.get('/users/:id', enforceSelfScope, asyncHandler(async (req, res) => {
  // If we get here, access is allowed
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: user });
}));
```

### 4. Manual Self-Scope Check

```javascript
const { checkSelfScopeAccess } = require('../middleware/dataIsolationErrorHandler');

router.get('/profile/:userId', asyncHandler(async (req, res) => {
  const { allowed, error } = checkSelfScopeAccess(req, req.params.userId);
  
  if (!allowed) {
    return res.status(error.status).json({
      success: false,
      errorCode: error.code,
      message: error.message
    });
  }
  
  // Proceed with query...
}));
```

---

## PostgreSQL RLS Error Detection

The system automatically detects these PostgreSQL error patterns:

| PG Code | Meaning |
|---------|---------|
| `42501` | Insufficient privilege (RLS policy violation) |
| `42000` | Syntax error or access rule violation |

And these message patterns:
- `permission denied for relation`
- `violates row-level security policy`
- `new row violates row-level security policy`

All are mapped to `DATA_ACCESS_DENIED` with a user-friendly message.

---

## Internal Logging

All RLS violations are logged internally with full details:

```javascript
// Logged to security_events table
{
  event_type: 'RLS_BLOCK',
  severity: 'WARNING',
  user_id: 123,
  details: {
    errorCode: 'DATA_ACCESS_DENIED',
    operation: 'view',
    dataScope: 'BRANCH',
    tableName: 'tasks',
    path: '/api/tasks/456',
    originalError: 'permission denied for relation tasks',
    pgErrorCode: '42501'
  }
}
```

**Users see:** "You don't have permission to view this data."
**Security team sees:** Full internal details in audit logs.

---

## Frontend UX Rules

### ✅ DO

| Situation | UI Behavior |
|-----------|-------------|
| No rows | Empty state component |
| View record denied | Modal/toast error |
| Edit denied | Inline error message |
| Export denied | Explicit warning dialog |

### ❌ DON'T

- ❌ Show SQL error text
- ❌ Mention "RLS", "scope", "role"
- ❌ Say "Admin restricted this"
- ❌ Reveal tenant boundaries
- ❌ Show error for empty data

---

## UX Copy Guidelines

### Empty State
```
"No records are available for your access level."
```

### View Denied
```
"You don't have permission to view this item."
```

### Edit Denied
```
"You can view this record, but you're not allowed to modify it."
```

### Export Denied
```
"You don't have permission to export this data."
```

### Self-Scope Violation
```
"You can only access your own information."
```

---

## Flow Diagram

```
Request
 │
 ├─► RBAC Check
 │      │
 │      ├─► DENY → 403 "You don't have access to this page."
 │      │
 │      └─► ALLOW → Query Executes
 │                      │
 │                      ├─► 0 Rows → 200 Empty State UI
 │                      │
 │                      ├─► RLS Block → 403 "You don't have permission..."
 │                      │
 │                      └─► Success → 200 Data
```

---

## 🔐 GOLDEN RULES (Print These)

1. **Empty data is NOT an error**
2. **Blocked data IS an error**
3. **Internal reasons are NEVER shown to users**
4. **Log everything internally, show nothing externally**

---

*Last Updated: 2026-01-29*
*Module: `/my-backend/middleware/dataIsolationErrorHandler.js`*
