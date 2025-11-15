# 🔧 BISMAN ERP - Permission System Troubleshooting Guide

**Quick fixes for common permission-related issues**

---

## 📋 Table of Contents

1. [Page Not Appearing in Roles & Users Report](#issue-1-page-not-appearing-in-roles--users-report)
2. [Page in Sidebar but Access Denied](#issue-2-page-in-sidebar-but-access-denied)
3. [User Can't See Page After Permission Grant](#issue-3-user-cant-see-page-after-permission-grant)
4. [Sidebar Shows Wrong Pages](#issue-4-sidebar-shows-wrong-pages)
5. [Backend Permission Check Fails](#issue-5-backend-permission-check-fails)
6. [TypeScript Compilation Errors](#issue-6-typescript-compilation-errors)
7. [Database Permission Not Saving](#issue-7-database-permission-not-saving)
8. [Double Sidebar Appearing](#issue-8-double-sidebar-appearing)

---

## Issue 1: Page Not Appearing in Roles & Users Report

### 🔍 Symptoms
- Created new page in `/my-frontend/src/app/module/page-name/page.tsx`
- Added to `page-registry.ts`
- But NOT showing in `http://localhost:3000/system/roles-users-report`

### 🎯 Root Causes
1. Page not added to `master-modules.js` (backend)
2. Backend not restarted after adding
3. Typo in page ID between frontend and backend

### ✅ Solution

**Step 1: Verify Backend Configuration**
```bash
# Search for your page in master-modules.js
grep -n "your-page-id" /Users/abhi/Desktop/BISMAN\ ERP/my-backend/config/master-modules.js
```

**If NOT found:**
```javascript
// File: /my-backend/config/master-modules.js

{
  id: 'hr',  // Find your module
  name: 'Human Resources',
  pages: [
    { id: 'dashboard', name: 'HR Dashboard', path: '/hr' },
    
    // ✅ ADD YOUR PAGE HERE
    { id: 'your-page-id', name: 'Your Page Name', path: '/module/your-page' },
  ],
},
```

**Step 2: Restart Backend**
```bash
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend
pkill -f "node.*app.js"
nohup node app.js > backend.log 2>&1 &

# Verify it started
ps aux | grep "node.*app.js"
tail -20 backend.log
```

**Step 3: Verify in UI**
1. Refresh: `http://localhost:3000/system/roles-users-report`
2. Scroll to your module
3. Your page should now appear

### 🧪 Verification
```bash
# Check backend logs
tail -f my-backend/backend.log | grep "Enterprise Admin routes"

# Should see: ✅ Enterprise Admin routes loaded (protected)
```

---

## Issue 2: Page in Sidebar but Access Denied

### 🔍 Symptoms
- Page appears in sidebar
- Clicking redirects to `/access-denied`
- Console error: "403 Forbidden"

### 🎯 Root Causes
1. Page `id` mismatch between `page-registry.ts` and `master-modules.js`
2. Page `path` incorrect in registry
3. Database has different page ID

### ✅ Solution

**Step 1: Compare IDs**
```bash
# Check page-registry.ts
grep -A 5 "id: 'your-page-id'" my-frontend/src/common/config/page-registry.ts

# Check master-modules.js
grep -A 2 "id: 'your-page-id'" my-backend/config/master-modules.js
```

**Step 2: Ensure Exact Match**
```typescript
// page-registry.ts
{
  id: 'employee-onboarding',        // ← MUST match exactly
  path: '/hr/employee-onboarding',  // ← Must match file location
  module: 'hr',
}

// master-modules.js
{
  id: 'employee-onboarding',        // ← MUST match exactly
  path: '/hr/employee-onboarding',
}
```

**Step 3: Check Database**
```sql
-- Connect to database
psql -U your_user -d your_database

-- Check what's stored
SELECT user_id, role_name, allowed_pages 
FROM rbac_user_permissions 
WHERE user_id = YOUR_USER_ID;

-- Example output:
-- allowed_pages: {"user-creation", "employees"}
-- Check if your page ID is in the array
```

**Step 4: Fix Database if Needed**
```sql
-- Update to correct page ID
UPDATE rbac_user_permissions
SET allowed_pages = ARRAY['user-creation', 'employee-onboarding'],
    updated_at = NOW()
WHERE user_id = 55;
```

### 🧪 Verification
```bash
# Test backend API
curl -X GET "http://localhost:3001/api/permissions/check-page?pageId=employee-onboarding" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return: {"hasAccess": true}
```

---

## Issue 3: User Can't See Page After Permission Grant

### 🔍 Symptoms
- Admin assigned permission via UI
- Toast showed "Permissions saved successfully"
- But user still can't see page in sidebar

### 🎯 Root Causes
1. User needs to re-login (permissions cached)
2. Database not actually updated
3. DynamicSidebar caching old data

### ✅ Solution

**Step 1: Force Re-login**
```bash
# User should:
1. Logout completely
2. Clear browser cache (Cmd+Shift+R on Mac)
3. Close all browser tabs
4. Login again
```

**Step 2: Verify Database Update**
```sql
-- Check if permission was saved
SELECT u.email, rp.allowed_pages, rp.updated_at
FROM users u
JOIN rbac_user_permissions rp ON u.id = rp.user_id
WHERE u.email = 'demo_hr@bisman.demo';

-- updated_at should be recent (within last few minutes)
```

**Step 3: Check Backend Logs**
```bash
tail -50 backend.log | grep -i "permission"

# Should see logs like:
# [Permissions] Saving for user: 55
# [Permissions] Allowed pages: ["user-creation", "employee-onboarding"]
```

**Step 4: Manual Database Fix (if needed)**
```sql
-- Force update permissions
INSERT INTO rbac_user_permissions (user_id, role_name, allowed_pages, created_at, updated_at)
VALUES (55, 'HR', ARRAY['user-creation', 'employee-onboarding', 'employees'], NOW(), NOW())
ON CONFLICT (user_id) 
DO UPDATE SET 
  allowed_pages = EXCLUDED.allowed_pages,
  updated_at = NOW();
```

### 🧪 Verification
```bash
# Test API response
curl http://localhost:3001/api/permissions?userId=55

# Should return:
# {"success": true, "data": {"userId": 55, "allowedPages": [...]}}
```

---

## Issue 4: Sidebar Shows Wrong Pages

### 🔍 Symptoms
- User sees pages they shouldn't have access to
- Or missing pages they should see
- Sidebar inconsistent with database permissions

### 🎯 Root Causes
1. Frontend caching stale permissions
2. `DynamicSidebar` using wrong user ID
3. JWT token has outdated role information

### ✅ Solution

**Step 1: Clear Frontend State**
```bash
# In browser DevTools Console (F12):
localStorage.clear();
sessionStorage.clear();

# Then hard refresh:
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

**Step 2: Check User ID**
```typescript
// In browser console:
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('User ID:', user.id);
console.log('User Role:', user.role);
```

**Step 3: Verify API Response**
```bash
# Check what API returns
curl http://localhost:3001/api/permissions?userId=55

# Compare with database:
SELECT allowed_pages FROM rbac_user_permissions WHERE user_id = 55;

# Should match exactly
```

**Step 4: Check DynamicSidebar Logs**
```javascript
// Browser Console (F12) → Console tab
// Look for logs like:
[Sidebar] User permissions from DB: {...}
[Sidebar] Allowed pages: ["user-creation", "employees"]
[Sidebar] Final permissions: ["authenticated", "hr-management", ...]

// If logs missing, DynamicSidebar might not be fetching
```

### 🧪 Verification
```bash
# Login as user
# Open DevTools → Console
# Check for DynamicSidebar logs
# Verify: Allowed pages matches database
```

---

## Issue 5: Backend Permission Check Fails

### 🔍 Symptoms
- Frontend shows page in sidebar
- But backend API returns: `{"hasAccess": false}`
- 403 errors in Network tab

### 🎯 Root Causes
1. Backend querying wrong table
2. JWT token invalid or expired
3. Page ID mismatch in backend logic

### ✅ Solution

**Step 1: Check Backend Route**
```javascript
// File: /my-backend/routes/permissions.js

// Ensure using correct query:
router.get('/check-page', authenticate, async (req, res) => {
  const { pageId } = req.query;
  const userId = req.user.id;

  // ✅ CORRECT - Raw SQL query
  const result = await prisma.$queryRaw`
    SELECT allowed_pages 
    FROM rbac_user_permissions 
    WHERE user_id = ${userId}
  `;

  const allowedPages = result[0]?.allowed_pages || [];
  const hasAccess = allowedPages.includes(pageId);

  console.log('User:', userId, 'Page:', pageId, 'Access:', hasAccess);
  return res.json({ hasAccess });
});
```

**Step 2: Add Debug Logs**
```javascript
// Add temporary logging
console.log('🔍 Check Page Access:');
console.log('  User ID:', userId);
console.log('  Page ID:', pageId);
console.log('  Allowed Pages:', allowedPages);
console.log('  Has Access:', allowedPages.includes(pageId));
```

**Step 3: Test Backend Directly**
```bash
# Get JWT token (from browser DevTools → Application → Cookies)
TOKEN="your_jwt_token_here"

# Test API
curl -X GET "http://localhost:3001/api/permissions/check-page?pageId=user-creation" \
  -H "Authorization: Bearer $TOKEN" \
  -v

# Check response
```

**Step 4: Verify JWT Token**
```javascript
// In Node.js console or backend route:
const jwt = require('jsonwebtoken');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log('Token payload:', decoded);
// Should contain: { id: 55, email: 'demo_hr@bisman.demo', role: 'HR' }
```

### 🧪 Verification
```bash
# Check backend logs
tail -f backend.log | grep "Check Page Access"

# Should see debug logs with correct user ID and page ID
```

---

## Issue 6: TypeScript Compilation Errors

### 🔍 Symptoms
```
Error: Type '"HR"' is not assignable to type 'ModuleType'
Error: Property 'path' is missing in type
```

### 🎯 Root Causes
1. Invalid module name in `page-registry.ts`
2. Missing required fields
3. Type definition mismatch

### ✅ Solution

**Common Error 1: Invalid Module**
```typescript
// ❌ WRONG
{
  module: 'HR',  // Uppercase not allowed
}

// ✅ CORRECT
{
  module: 'hr',  // Lowercase only
}

// Valid modules:
// 'common', 'finance', 'hr', 'operations', 'compliance', 
// 'system', 'enterprise-management'
```

**Common Error 2: Missing Fields**
```typescript
// ❌ WRONG - Missing required fields
{
  id: 'my-page',
  name: 'My Page',
}

// ✅ CORRECT - All required fields
{
  id: 'my-page',
  name: 'My Page',
  path: '/module/my-page',        // Required
  module: 'hr',                   // Required
  icon: 'FiFileText',             // Required
  description: 'Page description', // Required
  permissions: ['permission'],     // Required
  roles: ['HR'],                  // Required
  status: 'active',               // Required
}
```

**Common Error 3: Type Mismatch**
```typescript
// ❌ WRONG
{
  status: 'enabled',  // Invalid value
}

// ✅ CORRECT
{
  status: 'active',  // Only: 'active' | 'inactive' | 'beta'
}
```

### 🧪 Verification
```bash
# Run TypeScript check
cd my-frontend
npm run type-check

# Should output: No errors found
```

---

## Issue 7: Database Permission Not Saving

### 🔍 Symptoms
- Click "Save Permissions" in UI
- Success toast appears
- But database not updated (verified via SQL query)

### 🎯 Root Causes
1. Database transaction failed silently
2. User ID or role ID incorrect
3. Database constraints preventing update

### ✅ Solution

**Step 1: Check Backend Save Route**
```javascript
// File: /my-backend/routes/permissions.js (or similar)

router.post('/save', authenticate, async (req, res) => {
  const { userId, roleName, allowedPages } = req.body;

  console.log('💾 Saving permissions:', { userId, roleName, allowedPages });

  try {
    // ✅ Use UPSERT (INSERT or UPDATE)
    const result = await prisma.$executeRaw`
      INSERT INTO rbac_user_permissions (user_id, role_name, allowed_pages, created_at, updated_at)
      VALUES (${userId}, ${roleName}, ${allowedPages}::text[], NOW(), NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET 
        allowed_pages = EXCLUDED.allowed_pages,
        role_name = EXCLUDED.role_name,
        updated_at = NOW()
    `;

    console.log('✅ Permissions saved, rows affected:', result);
    return res.json({ success: true });

  } catch (error) {
    console.error('❌ Save permissions error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
```

**Step 2: Verify Database Constraints**
```sql
-- Check table structure
\d rbac_user_permissions;

-- Ensure no blocking constraints:
-- - user_id should allow updates
-- - No unique constraint on allowed_pages
-- - Foreign key to users table should exist
```

**Step 3: Manual Test**
```sql
-- Try manual insert
INSERT INTO rbac_user_permissions (user_id, role_name, allowed_pages, created_at, updated_at)
VALUES (55, 'HR', ARRAY['user-creation', 'employees'], NOW(), NOW())
ON CONFLICT (user_id) 
DO UPDATE SET allowed_pages = EXCLUDED.allowed_pages, updated_at = NOW();

-- Check result
SELECT * FROM rbac_user_permissions WHERE user_id = 55;
```

### 🧪 Verification
```bash
# Check backend logs during save
tail -f backend.log | grep -i "saving permissions"

# Should see:
# 💾 Saving permissions: { userId: 55, ... }
# ✅ Permissions saved, rows affected: 1
```

---

## Issue 8: Double Sidebar Appearing

### 🔍 Symptoms
- Two sidebars rendered on same page
- Usually on `/system/*` or `/hr/*` routes

### 🎯 Root Causes
1. Both `AppShell` and `SuperAdminShell` rendering sidebar
2. Route not excluded in `AppShell`

### ✅ Solution

**Step 1: Check AppShell Exclusions**
```typescript
// File: /my-frontend/src/components/layout/AppShell.tsx

const excludedPrefixes = [
  '/auth',
  '/login',
  '/signup',
  '/enterprise',
  '/system',          // ✅ MUST be here
  '/hr',              // ✅ MUST be here if HR uses own shell
];

const isExcluded = excludedPrefixes.some(prefix => pathname?.startsWith(prefix));

if (isExcluded) {
  // Don't render AppShell sidebar for these routes
  return <>{children}</>;
}
```

**Step 2: Verify SuperAdminShell Usage**
```tsx
// Your page should use ONLY SuperAdminShell:

// ✅ CORRECT
export default function YourPage() {
  return (
    <SuperAdminShell>
      <div>Content</div>
    </SuperAdminShell>
  );
}

// ❌ WRONG - Don't wrap in another shell
export default function YourPage() {
  return (
    <AppShell>  {/* ❌ Causes double sidebar */}
      <SuperAdminShell>
        <div>Content</div>
      </SuperAdminShell>
    </AppShell>
  );
}
```

**Step 3: Check Root Layout**
```tsx
// File: /my-frontend/src/app/layout.tsx

// Ensure AppShell wraps children ONLY
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppShell>
          {children}  {/* This will be SuperAdminShell for /system pages */}
        </AppShell>
      </body>
    </html>
  );
}
```

### 🧪 Verification
```bash
# Navigate to: http://localhost:3000/system/roles-users-report
# Should see: ONE sidebar only
# Check DevTools → Elements → Search for "sidebar"
# Should find: 1 instance, not 2
```

---

## 🔬 Diagnostic Commands

### Quick Health Check
```bash
# Backend status
ps aux | grep "node.*app.js"

# Backend logs
tail -50 my-backend/backend.log

# Database connection
psql -U your_user -d your_database -c "SELECT COUNT(*) FROM users;"

# Frontend build
cd my-frontend && npm run type-check
```

### Database Diagnostic Queries
```sql
-- 1. Check all users and their permissions
SELECT 
  u.id, 
  u.email, 
  u.role, 
  rp.allowed_pages,
  rp.updated_at as permissions_updated
FROM users u
LEFT JOIN rbac_user_permissions rp ON u.id = rp.user_id
ORDER BY u.id;

-- 2. Find users with specific permission
SELECT u.email, u.role
FROM users u
JOIN rbac_user_permissions rp ON u.id = rp.user_id
WHERE 'user-creation' = ANY(rp.allowed_pages);

-- 3. Check for orphaned permissions (user doesn't exist)
SELECT rp.*
FROM rbac_user_permissions rp
LEFT JOIN users u ON rp.user_id = u.id
WHERE u.id IS NULL;

-- 4. Count permissions per role
SELECT role_name, COUNT(*) as user_count, array_agg(DISTINCT unnest(allowed_pages)) as all_permissions
FROM rbac_user_permissions
GROUP BY role_name;
```

### API Test Commands
```bash
# Test permission check (replace JWT token)
TOKEN="your_jwt_token"
curl -X GET "http://localhost:3001/api/permissions?userId=55" \
  -H "Authorization: Bearer $TOKEN"

# Test page access check
curl -X GET "http://localhost:3001/api/permissions/check-page?pageId=user-creation" \
  -H "Authorization: Bearer $TOKEN"

# Test master modules (enterprise admin token required)
curl -X GET "http://localhost:3001/api/enterprise-admin/master-modules" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📞 Still Stuck?

### Escalation Steps

1. **Check Full Documentation**
   - `PERMISSION_CONTROL_SYSTEM_GUIDELINE.md`
   - `PERMISSION_SYSTEM_ARCHITECTURE_DIAGRAMS.md`

2. **Enable Debug Mode**
   ```javascript
   // Add to backend routes
   console.log('🐛 DEBUG:', { user, pageId, allowedPages });
   
   // Add to frontend components
   console.log('🐛 FRONTEND DEBUG:', { userAllowedPages, visiblePages });
   ```

3. **Collect Information**
   - Backend logs (last 100 lines)
   - Frontend console errors
   - Database query results
   - Network tab errors (F12 → Network)

4. **Create Support Ticket**
   Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Diagnostic output
   - Screenshots

---

**Last Updated:** November 15, 2025  
**Version:** 1.0
