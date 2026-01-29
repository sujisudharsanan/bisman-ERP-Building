# DEVELOPER CONTRACT: Subscription-Aware Access Control

## Document Status: MANDATORY

**Version**: 1.0  
**Date**: 2026-01-29  
**Status**: ENFORCED

---

## 🔒 THE GOLDEN RULE (NON-NEGOTIABLE)

```
┌─────────────────────────────────────────────────────────────────┐
│  APPROVAL decides what you can SEE.                             │
│  SUBSCRIPTION decides what you can DO.                          │
│  DATA SCOPE decides what DATA you can SEE.                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ DEVELOPERS MUST

### 1. Use `featureGate()` for ALL protected actions

```javascript
// CORRECT: Use featureGate middleware
const { requireFeature, requireEdit, requireExport } = require('../security/featureGate');

// For routes
router.post('/records', requireFeature('RECORDS_PAGE', 'CREATE'), controller.create);
router.put('/records/:id', requireEdit('RECORDS_PAGE'), controller.update);
router.get('/records/export', requireExport('RECORDS_PAGE'), controller.export);

// For inline checks
const { checkFeatureAccess } = require('../security/featureGate');
const allowed = await checkFeatureAccess({
  pageKey: 'RECORDS_PAGE',
  action: 'EXPORT',
  user: req.user,
});
```

### 2. Apply featureGate to ALL mutation endpoints

| HTTP Method | Requires featureGate |
|-------------|---------------------|
| GET (list/read) | `VIEW` check |
| POST (create) | `CREATE` check |
| PUT (update) | `EDIT` check |
| PATCH (update) | `EDIT` check |
| DELETE | `DELETE` check |
| GET (export) | `EXPORT` check |
| GET (download) | `DOWNLOAD` check |

### 3. Treat frontend as NON-AUTHORITATIVE

```javascript
// WRONG: Trusting frontend disabled state
if (req.body.userClickedExportButton) {
  // This can be bypassed with direct API calls!
  doExport();
}

// CORRECT: Always check backend
const { allowed } = await featureGate({
  pageKey: 'REPORTS',
  action: 'EXPORT',
  user: req.user,
});
if (!allowed) {
  return res.status(403).json({ error: 'Feature not allowed' });
}
doExport();
```

### 4. Keep the three layers SEPARATE

```
Layer 1: APPROVAL     → role_page_access / admin_page_assignments
Layer 2: SUBSCRIPTION → subscription_page_features
Layer 3: DATA SCOPE   → RLS policies
```

Each layer has its own responsibility. NEVER mix them.

### 5. Return proper API responses for page load

```javascript
// CORRECT: Include access info in page response
const pageAccess = await getPageAccess({
  pageKey: 'FINANCE_REPORTS',
  user: req.user,
});

res.json({
  data: pageData,
  access: pageAccess.access,
  subscriptionRestricted: pageAccess.subscriptionRestricted,
  isAdmin: pageAccess.isAdmin,
});
```

---

## ❌ DEVELOPERS MUST NOT

### 1. Hide pages due to subscription

```javascript
// WRONG: Filtering pages by subscription
const visiblePages = pages.filter(p => 
  hasSubscriptionFeature(p.pageKey) // ❌ NEVER DO THIS
);

// CORRECT: Filter by APPROVAL only
const visiblePages = pages.filter(p => 
  hasPageApproval(userId, p.pageKey) // ✅ Approval controls visibility
);
```

### 2. Check subscription only in UI

```javascript
// WRONG: Frontend-only check
<Button 
  onClick={handleExport}
  disabled={!plan.canExport} // ❌ Can be bypassed!
/>

// CORRECT: Backend enforces, frontend informs
<Button 
  onClick={handleExport}
  disabled={!access.canExport} // Informational only
/>

// Backend ALWAYS checks
router.get('/export', requireExport('PAGE'), controller.export);
```

### 3. Hardcode role checks in SQL

```sql
-- WRONG: Hardcoded role checks
SELECT * FROM orders 
WHERE (role = 'ADMIN' OR created_by = $1);

-- CORRECT: Use RLS + data_scope
SELECT * FROM orders; -- RLS handles filtering
```

### 4. Allow exports without featureGate

```javascript
// WRONG: Export without feature gate
router.get('/export', async (req, res) => {
  const data = await getExportData(); // ❌ No access check!
  res.csv(data);
});

// CORRECT: Always gate exports
router.get('/export', 
  requireExport('REPORTS_PAGE'), // ✅ Feature gate
  async (req, res) => {
    const data = await getExportData();
    res.csv(data);
  }
);
```

### 5. Expose plan details to non-admins

```javascript
// WRONG: Exposing plan info
return res.status(403).json({
  error: 'Upgrade to Enterprise to access this feature', // ❌
  currentPlan: 'Free', // ❌
  requiredPlan: 'Enterprise', // ❌
});

// CORRECT: Generic message for non-admins
return res.status(403).json({
  error: user.isAdmin 
    ? 'This feature is not available on your current plan.' // Admin sees this
    : 'Contact your administrator for access.', // User sees this
  errorCode: 'FEATURE_NOT_ALLOWED',
});
```

### 6. Skip featureGate on "internal" routes

```javascript
// WRONG: Assuming internal routes are safe
router.post('/internal/generate-report', controller.generate); // ❌ No gate!

// CORRECT: All routes need protection
router.post('/internal/generate-report', 
  requireFeature('REPORTS', 'CREATE'), // ✅
  controller.generate
);
```

---

## 📋 ACCESS DECISION MATRIX

| Approval | Subscription | Result |
|----------|--------------|--------|
| ❌ | ❌ | Page NOT visible (403) |
| ❌ | ✅ | Page NOT visible (403) |
| ✅ | ❌ | Page visible, VIEW-ONLY |
| ✅ | ✅ | Page visible, FULL ACCESS |

**Key Points:**
- Approval ALWAYS comes first
- Subscription NEVER grants visibility
- VIEW is always allowed if approved

---

## 🔧 INTEGRATION CHECKLIST

Before submitting code, verify:

- [ ] All POST/PUT/PATCH/DELETE routes have `requireFeature()` or `requireEdit()`
- [ ] All export endpoints have `requireExport()`
- [ ] All download endpoints have `requireDownload()`
- [ ] Background jobs use `checkFeatureAccess()` before mutations
- [ ] API responses include `access` object for page loads
- [ ] Error messages don't expose plan details to non-admins
- [ ] No frontend-only access checks

---

## 🧪 REQUIRED TESTS

Every feature must have tests verifying:

1. Approved user with Free plan can VIEW
2. Approved user with Free plan cannot EDIT
3. Approved user with Free plan cannot EXPORT
4. Unapproved user with Enterprise plan cannot access
5. Direct API call to export is blocked
6. Audit log entry is created for blocked actions

---

## 📞 ENFORCEMENT

Violations of this contract will result in:

1. **Code Review Rejection** - PRs that bypass featureGate will be rejected
2. **Security Audit Flag** - Pattern detected in security scans
3. **Mandatory Hotfix** - If deployed, requires immediate remediation

---

## 📚 REFERENCE

### Feature Gate Import

```javascript
const { 
  featureGate,
  requireFeature,
  requireEdit,
  requireCreate,
  requireDelete,
  requireExport,
  requireDownload,
  checkFeatureAccess,
  getPageAccess,
  ERROR_CODES,
} = require('../security/featureGate');
```

### Page Access Response Structure

```javascript
{
  pageKey: "FINANCE_REPORTS",
  visible: true,
  access: {
    canView: true,
    canEdit: false,
    canExport: false,
    canDownload: false,
    canCreate: false,
    canDelete: false,
  },
  subscriptionRestricted: true,
  isAdmin: false,
  planId: 1,
}
```

### Error Response Structure

```javascript
{
  error: "This feature is not available on your current plan.",
  errorCode: "FEATURE_NOT_ALLOWED",
  // Only for admins:
  upgradeRequired: true,
}
```

---

**Document Owner**: Security Team  
**Review Cycle**: Quarterly  
**Last Updated**: 2026-01-29
