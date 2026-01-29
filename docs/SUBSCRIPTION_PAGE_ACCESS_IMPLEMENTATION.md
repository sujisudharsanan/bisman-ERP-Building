# Subscription-Aware Page Access Control

## Implementation Summary

**Date**: $(date +%Y-%m-%d)  
**Migration**: 051_subscription_page_access  
**Status**: ✅ COMPLETE

---

## Three-Layer Access Model

### Layer 1: APPROVAL (RBAC)
- Controls page **VISIBILITY**
- Based on `role_page_access` table
- User can only see pages their role has been granted

### Layer 2: SUBSCRIPTION
- Controls page **ACTIONS** (edit, export, download, delete, create)
- Based on `subscription_page_features` table
- Subscription NEVER grants visibility - only controls what actions are allowed

### Layer 3: DATA SCOPE (RLS)
- Controls **DATA ACCESS**
- Row-Level Security enforces tenant isolation
- Users only see/modify their own tenant's data

---

## Database Objects Created

### Tables

1. **subscription_page_features** - Maps plan capabilities to page actions
   - `plan_id` → References subscription_plans
   - `page_code` → References pages_master.page_code
   - `can_view`, `can_edit`, `can_delete`, `can_export`, `can_download`, `can_create`
   - `daily_action_limit`, `monthly_action_limit`

2. **access_requests** - Track user requests for feature access
   - `tenant_id`, `user_id`, `page_code`, `requested_action`
   - `status` (PENDING/APPROVED/DENIED)
   - `reviewed_by`, `reviewed_at`, `review_notes`

3. **admin_access_notifications** - Notify admins of access requests
   - `access_request_id`, `admin_user_id`
   - `title`, `message`, `upgrade_suggestion`
   - `is_read`, `action_taken`

4. **subscription_action_audit** - Audit trail for subscription-controlled actions
   - `tenant_id`, `user_id`, `page_code`, `action_attempted`
   - `allowed`, `denial_reason`, `plan_id`

### Function

**check_subscription_page_access(tenant_id UUID, page_code TEXT, action TEXT)**
- Returns JSONB with canView, canEdit, canExport, etc.
- Checks tenant's active subscription plan
- Returns action allowance based on plan features

---

## Service Files Created

### /my-backend/services/subscriptionPageAccessService.js
- `getPageAccess()` - Main access check for page load
- `checkAction()` - Check specific action before executing
- `createAccessRequest()` - Users request elevated access
- `reviewAccessRequest()` - Admins approve/deny requests
- `notifyAdmins()` - Send notifications to tenant admins
- `auditActionAttempt()` - Record all access attempts

### /my-backend/middleware/subscriptionFeatureGate.js
- `requireFeature(action)` - Middleware to gate actions
- `requireEdit()` - Shorthand for edit actions
- `requireExport()` - Shorthand for export actions
- `checkFeatureAccess()` - Inline feature check

### /my-backend/routes/accessRequests.js
- `POST /request` - Submit access request
- `GET /pending` - Get pending requests (admin)
- `PUT /:id/review` - Review request (admin)
- `GET /my-requests` - User's own requests

---

## Feature Matrix by Plan

| Plan       | Can View | Can Edit | Can Export | Can Delete | Can Create |
|------------|----------|----------|------------|------------|------------|
| Free       | ✅       | ❌       | ❌         | ❌         | ❌         |
| Basic      | ✅       | ❌       | ❌         | ❌         | ❌         |
| Standard   | ✅       | ✅       | ❌         | ✅         | ✅         |
| Premium    | ✅       | ✅       | ✅         | ✅         | ✅         |
| Enterprise | ✅       | ✅       | ✅         | ✅         | ✅         |

---

## Integration Points

### Frontend Usage
```javascript
// Check access on page load
const access = await api.get(`/api/subscription/page-access/${pageCode}`);

if (!access.visible) {
  // User doesn't have RBAC approval - redirect
}

// Disable buttons based on subscription
<Button disabled={!access.canEdit}>Edit</Button>
<Button disabled={!access.canExport}>Export</Button>
```

### Backend Usage
```javascript
// Protect route with subscription gate
router.put('/records/:id', 
  subscriptionFeatureGate.requireEdit(),
  recordController.update
);

// Inline check
const canExport = await subscriptionService.checkAction({
  tenantId: req.user.tenantId,
  userId: req.user.id,
  pageCode: 'REPORTS_MAIN',
  action: 'export'
});
```

---

## Error Messages

### For Admins (Decision Makers)
- "Your current plan does not include this feature. Upgrade to unlock."
- "This action requires a plan upgrade."

### For Regular Users
- "Contact your administrator to request access."
- "This action is not available. Request access from your administrator."

---

## Tests Passed

1. ✅ subscription_page_features table exists
2. ✅ access_requests table exists
3. ✅ admin_access_notifications table exists
4. ✅ subscription_action_audit table exists
5. ✅ check_subscription_page_access function works
6. ✅ Free plan properly restricted
7. ✅ Enterprise plan has full access
8. ✅ Access request creation works
9. ✅ All service files syntax valid
