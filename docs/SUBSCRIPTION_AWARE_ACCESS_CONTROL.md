# 🔐 Subscription-Aware Access Control

## Overview

This system implements **THREE INDEPENDENT CONTROL LAYERS**:

| Layer | Name | Controls | Tables |
|-------|------|----------|--------|
| 1 | **APPROVAL** | Page VISIBILITY | `role_page_access`, `admin_page_assignments` |
| 2 | **SUBSCRIPTION** | Page ACTIONS | `subscription_page_features` |
| 3 | **DATA SCOPE** | Data ACCESS | RLS policies |

---

## 🔑 Golden Rules

1. **Approval decides if you can SEE a page**
2. **Subscription decides what you can DO on that page**
3. **Subscription NEVER grants visibility alone**

---

## Behavior Matrix

| Approval | Subscription | Result |
|----------|--------------|--------|
| ❌ | ❌ | Page NOT visible |
| ❌ | ✅ | Page NOT visible |
| ✅ | ❌ | Page visible (VIEW-ONLY) |
| ✅ | ✅ | Page visible (FULL ACCESS) |

⚠️ **Approval always comes first**

---

## User Type Behavior

### 1️⃣ Admin / Client (Decision Makers)

When subscription does NOT allow the feature:
- ✅ Page is visible
- ✅ Page is READ-ONLY
- 🔔 Show: "Upgrade plan to unlock this feature"
- ✅ Show: Upgrade CTA button
- ❌ No edit / download / export actions

### 2️⃣ Regular Users (Non-decision makers)

When subscription does NOT allow the feature:
- ✅ Page is visible
- ✅ Page is READ-ONLY
- ❌ NO upgrade plan info
- ✅ Show: "Request access" button
- ⚠️ Show: "Contact administrator for access"

### 3️⃣ Blocked Action Attempt

When user tries restricted action (edit/export/download):
- Backend returns `403 FEATURE_NOT_ALLOWED`
- Message differs by role (frontend mapped)

---

## Database Schema

### `subscription_page_features`
Controls what actions are allowed per plan per page.

```sql
CREATE TABLE subscription_page_features (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL,
  page_code TEXT NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  can_download BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  daily_action_limit INT,
  monthly_action_limit INT,
  UNIQUE(plan_id, page_code)
);
```

### `access_requests`
Stores user requests for feature access.

```sql
CREATE TABLE access_requests (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id INT NOT NULL,
  page_code TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  reviewed_by INT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `admin_access_notifications`
Notifications sent to admins about access requests.

### `subscription_action_audit`
Audit log of all action attempts (allowed and denied).

---

## API Endpoints

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/access-requests` | Create access request |
| GET | `/api/access-requests/my-requests` | Get user's requests |
| GET | `/api/access-requests/page-access/:pageCode` | Get page access info |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/access-requests/pending` | Get pending requests |
| POST | `/api/access-requests/:id/review` | Approve/deny request |
| GET | `/api/access-requests/notifications` | Get admin notifications |

---

## Backend Decision Flow

```
Request
  │
  ├─► RBAC approval check (Layer 1)
  │      │
  │      ├─► ❌ DENY → 403 PAGE_ACCESS_DENIED
  │      │
  │      └─► ✅ ALLOW
  │              │
  │              └─► Subscription feature check (Layer 2)
  │                      │
  │                      ├─► ❌ Feature not allowed
  │                      │      │
  │                      │      ├─► Allow VIEW
  │                      │      └─► Block ACTIONS
  │                      │
  │                      └─► ✅ Feature allowed → FULL ACCESS
  │
  └─► RLS data scope check (Layer 3)
```

---

## API Response Examples

### Page Load Response

```json
{
  "pageCode": "FINANCE_REPORTS",
  "visible": true,
  "access": {
    "canView": true,
    "canEdit": false,
    "canExport": false,
    "canDelete": false,
    "canDownload": false,
    "canCreate": false
  },
  "subscriptionRestricted": true,
  "userRole": "USER",
  "ui": {
    "showUpgradeBanner": false,
    "showRequestButton": true,
    "message": "Contact your administrator to request access.",
    "ctaText": "Request Access"
  }
}
```

### Action Denied Response

```json
{
  "success": false,
  "errorCode": "FEATURE_NOT_ALLOWED",
  "message": "This action is not available. Request access from your administrator.",
  "action": "export",
  "upgradeRequired": false,
  "requestAccessAvailable": true
}
```

---

## Usage Examples

### 1. Protect a Route with Subscription Check

```javascript
const { requireEdit, requireExport } = require('../middleware/subscriptionFeatureGate');

// Require edit permission for update
router.put('/tasks/:id', 
  requireEdit('TASKS'),
  asyncHandler(async (req, res) => {
    // Only runs if subscription allows edit
  })
);

// Require export permission
router.get('/tasks/export',
  requireExport('TASKS'),
  asyncHandler(async (req, res) => {
    // Only runs if subscription allows export
  })
);
```

### 2. Inject Access Info for Frontend

```javascript
const { injectSubscriptionAccess, withSubscriptionAccess } = require('../middleware/subscriptionFeatureGate');

router.get('/tasks',
  injectSubscriptionAccess('TASKS'),
  asyncHandler(async (req, res) => {
    const tasks = await prisma.task.findMany({ ... });
    
    // Include access info in response
    withSubscriptionAccess(res, {
      success: true,
      data: tasks,
    }, req.subscriptionAccess);
  })
);
```

### 3. Check Access in Service

```javascript
const { subscriptionPageAccessService } = require('../services/subscriptionPageAccessService');

async function handleExport(tenantId, userId, pageCode, isAdmin) {
  const result = await subscriptionPageAccessService.checkAction({
    tenantId,
    userId,
    pageCode,
    action: 'export',
    isAdmin,
  });
  
  if (!result.allowed) {
    throw new Error(result.message);
  }
  
  // Proceed with export...
}
```

---

## Frontend Implementation Guide

### Show Upgrade Banner (Admin Only)

```jsx
{subscriptionAccess.ui.showUpgradeBanner && (
  <UpgradeBanner 
    message={subscriptionAccess.ui.bannerMessage}
    ctaText={subscriptionAccess.ui.ctaText}
    ctaAction={subscriptionAccess.ui.ctaAction}
  />
)}
```

### Show Request Button (User Only)

```jsx
{subscriptionAccess.ui.showRequestButton && (
  <Button onClick={handleRequestAccess}>
    {subscriptionAccess.ui.ctaText}
  </Button>
)}

{subscriptionAccess.ui.hasPendingRequest && (
  <Alert>Your access request is pending review.</Alert>
)}
```

### Disable Actions Based on Access

```jsx
<Button 
  onClick={handleEdit}
  disabled={!subscriptionAccess.access.canEdit}
>
  Edit
</Button>

<Button 
  onClick={handleExport}
  disabled={!subscriptionAccess.access.canExport}
>
  Export
</Button>
```

---

## Admin Notification Example

When a user requests access, the admin sees:

```
📬 Access Request: John Doe needs export access

User John Doe (john@example.com) requested export access to Finance Reports.
This feature is available in the Enterprise Plan.

[View Upgrade Plans] [Ignore] [Contact User]
```

---

## Security Guarantees

| Guarantee | Status |
|-----------|--------|
| No unauthorized edits | ✅ |
| No data leakage | ✅ |
| No plan info exposed to normal users | ✅ |
| Clear upgrade funnel | ✅ |
| Audit-friendly behavior | ✅ |

---

## Files

| File | Purpose |
|------|---------|
| `database/migrations/migration_051_subscription_page_access.js` | DB schema |
| `services/subscriptionPageAccessService.js` | Core service |
| `middleware/subscriptionFeatureGate.js` | Route middleware |
| `routes/accessRequests.js` | API endpoints |

---

## What NOT to Do

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Hide the page completely | Show page, restrict actions |
| Let subscription override approval | Approval first, always |
| Show upgrade CTA to normal users | Show "Request access" |
| Allow frontend-only enforcement | Enforce on backend |
| Let actions fail silently | Return clear 403 error |

---

*Last Updated: 2026-01-29*
