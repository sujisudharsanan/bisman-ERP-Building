# 🔐 Complete Page & Role Permission System - IMPLEMENTATION GUIDE

## 🎯 What This System Does

This system ensures that:
1. **Sidebar only shows approved pages** for each role
2. **Direct URL access is blocked** if user doesn't have permission
3. **New pages require admin approval** before they're visible
4. **Each role has strict boundaries** - no cross-contamination

---

## 📁 Files Created/Modified

### ✅ New Files

1. **`/my-backend/middleware/roleProtection.js`**
   - Middleware to check role permissions on every API request
   - Blocks unauthorized access even if user knows the URL

2. **`/my-backend/routes/permissions.js`**
   - API endpoint to check if user can access a specific page
   - Used by frontend ProtectedPage component

3. **`/my-frontend/src/components/ProtectedPage.tsx`**
   - React component that wraps every page
   - Checks permissions before rendering
   - Redirects unauthorized users

### ✅ Modified Files

1. **`/my-backend/app.js`**
   - Added role protection middleware
   - Protected enterprise routes
   - Added smart route protection

2. **`/my-frontend/src/common/components/DynamicSidebar.tsx`**
   - Already updated in previous fix
   - Filters sidebar based on role

3. **`/my-backend/app.js` (Line 965)**
   - Already updated Enterprise Admin permissions

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ USER TRIES TO ACCESS A PAGE                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Frontend Sidebar Filtering                          │
│ • DynamicSidebar.tsx checks user role                        │
│ • Only shows approved pages in menu                          │
│ • Hides unauthorized pages                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Frontend Page Guard (ProtectedPage.tsx)            │
│ • Wraps every page component                                 │
│ • Calls /api/permissions/check-page                          │
│ • Shows loading while checking                               │
│ • Redirects if unauthorized                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 3: Backend Permission API (permissions.js)             │
│ • Receives pageId from frontend                              │
│ • Checks database for user permissions                       │
│ • Returns hasAccess: true/false                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ LAYER 4: Backend Route Protection (roleProtection.js)        │
│ • Checks every API request                                   │
│ • Enterprise routes: Only ENTERPRISE_ADMIN                   │
│ • Business routes: NOT ENTERPRISE_ADMIN                      │
│ • Blocks at API level                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ RESULT: Page Rendered OR Access Denied                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 How to Use - For Developers

### 1. Creating a New Page (Business Module)

**Step 1:** Create the page file

```tsx
// /my-frontend/src/app/finance/budget-approval/page.tsx
import ProtectedPage from '@/components/ProtectedPage';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

export default function BudgetApprovalPage() {
  return (
    <ProtectedPage 
      pageId="budget-approval"           // ← Must match PAGE_REGISTRY id
      moduleName="finance"                // ← Module this page belongs to
      requiredRole={['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER']}
    >
      <SuperAdminShell title="Budget Approval" module="finance">
        <div className="p-6">
          <h1>Budget Approval</h1>
          {/* Your page content here */}
        </div>
      </SuperAdminShell>
    </ProtectedPage>
  );
}
```

**Step 2:** Add to PAGE_REGISTRY

```typescript
// /my-frontend/src/common/config/page-registry.ts
{
  id: 'budget-approval',              // ← Same as pageId in ProtectedPage
  name: 'Budget Approval',
  path: '/finance/budget-approval',
  icon: CheckCircle,
  module: 'finance',
  permissions: ['budget-approve'],
  roles: ['SUPER_ADMIN', 'CFO', 'FINANCE_CONTROLLER'],
  status: 'active',
  description: 'Approve budget requests',
  order: 10,
}
```

**Step 3:** Admin approves the page

```sql
-- Super Admin must be granted this page in module_assignments
INSERT INTO module_assignments (super_admin_id, module_id, page_permissions)
VALUES (1, 2, '["budget-approval"]');

-- OR for regular users in user_pages table
INSERT INTO user_pages (user_id, page_key)
VALUES (5, 'budget-approval');
```

---

### 2. Creating a New Page (Enterprise Module)

**Step 1:** Create the page file

```tsx
// /my-frontend/src/app/enterprise-admin/system-settings/page.tsx
import ProtectedPage from '@/components/ProtectedPage';
import EnterpriseAdminLayout from '@/components/layouts/EnterpriseAdminLayout';

export default function SystemSettingsPage() {
  return (
    <ProtectedPage 
      pageId="enterprise-system-settings"
      requiredRole={['ENTERPRISE_ADMIN']}    // ← Enterprise Admin only
    >
      <EnterpriseAdminLayout title="System Settings">
        <div className="p-6">
          <h1>System Settings</h1>
          {/* Your page content here */}
        </div>
      </EnterpriseAdminLayout>
    </ProtectedPage>
  );
}
```

**Step 2:** Add to PAGE_REGISTRY with enterprise prefix

```typescript
{
  id: 'enterprise-system-settings',    // ← Must start with 'enterprise-'
  name: 'System Settings',
  path: '/enterprise-admin/system-settings',
  icon: Settings,
  module: 'enterprise-management',      // ← Enterprise module
  permissions: ['enterprise-admin'],
  roles: ['ENTERPRISE_ADMIN'],          // ← Only ENTERPRISE_ADMIN
  status: 'active',
  description: 'Configure system settings',
  order: 1,
}
```

---

## 🗃️ Database Schema for Permissions

### For Super Admins: `module_assignments` table

```sql
CREATE TABLE module_assignments (
  id SERIAL PRIMARY KEY,
  super_admin_id INTEGER REFERENCES super_admins(id),
  module_id INTEGER REFERENCES modules(id),
  page_permissions TEXT[],              -- Array of approved page IDs
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example: Super Admin can access finance module pages
INSERT INTO module_assignments (super_admin_id, module_id, page_permissions)
VALUES (1, 2, ARRAY['finance-dashboard', 'general-ledger', 'accounts-payable']);
```

### For Regular Users: `user_pages` table

```sql
CREATE TABLE user_pages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  page_key VARCHAR(100),                -- Page ID from PAGE_REGISTRY
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

-- Example: Manager can access specific pages
INSERT INTO user_pages (user_id, page_key) VALUES
(5, 'operations-dashboard'),
(5, 'inventory-management'),
(5, 'team-performance');
```

---

## 🧪 Testing the System

### Test 1: Enterprise Admin Cannot Access Business Pages

```bash
# 1. Login as Enterprise Admin
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"enterprise@bisman.erp","password":"enterprise123"}'

# 2. Try to access business route (should fail)
curl http://localhost:3001/api/finance/dashboard \
  -H "Cookie: token=<your-token>"

# Expected: 403 Forbidden
# Response: {"ok":false,"error":"Access denied","message":"Enterprise Admin cannot access business operations"}
```

### Test 2: Super Admin Cannot Access Enterprise Pages

```bash
# 1. Login as Super Admin
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"business_superadmin@bisman.demo","password":"Super@123"}'

# 2. Try to access enterprise route (should fail)
curl http://localhost:3001/api/enterprise-admin/super-admins \
  -H "Cookie: token=<your-token>"

# Expected: 403 Forbidden
# Response: {"ok":false,"error":"Access denied","message":"Enterprise Admin access required"}
```

### Test 3: User Accessing Unapproved Page

```bash
# 1. Login as Manager
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@business.com","password":"manager123"}'

# 2. Check if can access finance page (not granted)
curl http://localhost:3001/api/permissions/check-page?pageId=finance-dashboard \
  -H "Cookie: token=<your-token>"

# Expected: {"hasAccess":false,"reason":"Page not assigned to you"}
```

### Test 4: Frontend Page Guard

```
1. Open browser
2. Login as Super Admin
3. Try to navigate to: http://localhost:3000/enterprise-admin/super-admins
4. Expected: Redirected to /access-denied
5. Console shows: 🚫 [PAGE GUARD] Super Admin cannot access enterprise page
```

---

## 📊 Permission Flow Chart

```
┌──────────────────────────────────────────────────────────────┐
│ ENTERPRISE ADMIN                                              │
├──────────────────────────────────────────────────────────────┤
│ CAN ACCESS:                                                   │
│   ✅ /enterprise-admin/*                                      │
│   ✅ /api/enterprise-admin/*                                  │
│   ✅ Super Admins Management                                  │
│   ✅ Clients Management                                       │
│   ✅ Modules Assignment                                       │
│   ✅ Common pages (About Me, Profile)                         │
│                                                               │
│ CANNOT ACCESS:                                                │
│   ❌ Any business module (/finance, /operations, etc.)       │
│   ❌ Any business API (/api/finance/*, etc.)                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ SUPER ADMIN                                                   │
├──────────────────────────────────────────────────────────────┤
│ CAN ACCESS:                                                   │
│   ✅ Assigned business modules only                           │
│   ✅ Pages approved in module_assignments                     │
│   ✅ Common pages (About Me, Profile)                         │
│                                                               │
│ CANNOT ACCESS:                                                │
│   ❌ /enterprise-admin/* routes                              │
│   ❌ /api/enterprise-admin/* APIs                            │
│   ❌ Unassigned business modules                             │
│   ❌ Pages not in page_permissions array                     │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ REGULAR USERS (ADMIN, MANAGER, STAFF, USER)                  │
├──────────────────────────────────────────────────────────────┤
│ CAN ACCESS:                                                   │
│   ✅ Pages in user_pages table only                           │
│   ✅ Common pages (About Me, Profile)                         │
│                                                               │
│ CANNOT ACCESS:                                                │
│   ❌ /enterprise-admin/* routes                              │
│   ❌ Pages not in user_pages table                           │
│   ❌ Admin-only features                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

### Backend Setup
- [x] Created `/my-backend/middleware/roleProtection.js`
- [x] Created `/my-backend/routes/permissions.js`
- [x] Updated `/my-backend/app.js` to use middleware
- [x] Protected enterprise routes with `requireEnterpriseAdmin`
- [x] Added smart route protection to all API routes

### Frontend Setup
- [x] Created `/my-frontend/src/components/ProtectedPage.tsx`
- [x] Updated `DynamicSidebar.tsx` with role filtering
- [ ] **TODO**: Wrap existing pages with `ProtectedPage` component
- [ ] **TODO**: Add `accessLevel` to PAGE_REGISTRY entries

### Database Setup
- [ ] **TODO**: Verify `module_assignments` table exists
- [ ] **TODO**: Verify `user_pages` table exists
- [ ] **TODO**: Seed initial permissions for test users

### Testing
- [ ] Test Enterprise Admin sidebar (only enterprise pages)
- [ ] Test Super Admin sidebar (only assigned modules)
- [ ] Test direct URL access blocking
- [ ] Test API endpoint protection
- [ ] Test page guard redirects

---

## 🚀 Next Steps

### 1. Wrap Existing Pages
Go through each page and wrap with `ProtectedPage`:

```bash
# Example script to update all pages
find my-frontend/src/app -name "page.tsx" -type f
```

### 2. Update PAGE_REGISTRY
Add `accessLevel` field to all entries:

```typescript
// Enterprise pages
accessLevel: 'enterprise'

// Business pages  
accessLevel: 'business'

// Common pages
accessLevel: 'common'
```

### 3. Verify Database Tables
Run migrations to ensure tables exist:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('module_assignments', 'user_pages');
```

---

## 📞 Support

If you encounter issues:
1. Check browser console for `[PAGE GUARD]` logs
2. Check backend logs for `[ACCESS DENIED]` or `[ACCESS GRANTED]` logs
3. Verify user has correct role in database
4. Verify page permissions are correctly assigned

---

**Status**: ✅ Core system implemented, ready for page wrapping and testing
