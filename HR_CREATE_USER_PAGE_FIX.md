# HR Module - Create User Page Fix

## Issue
HR user (demo_hr@bisman.demo) was not seeing the "Create New User" page in the sidebar.

## Root Cause
The backend `/api/permissions` endpoint was querying from a non-existent `userPage` table instead of the correct `user_permissions` table.

## Fixes Applied

### 1. ✅ Database - HR User & Permissions Created
**Script:** `fix-hr-permissions.js`

Created/verified:
- HR user with email: `demo_hr@bisman.demo`
- Password: `hr123`
- Role: `HR`
- User ID: 55

Permissions granted in `user_permissions` table:
- `user-creation` (Create New User page)
- `user-settings` (User Settings)
- `about-me` (About Me profile)

**Verification:**
```sql
SELECT up.*, u.email, u.role 
FROM user_permissions up
JOIN users u ON u.id = up.user_id
WHERE u.email = 'demo_hr@bisman.demo'
```

Result:
```
user_id: 55
email: demo_hr@bisman.demo
role: HR
allowed_pages: ['user-creation', 'user-settings', 'about-me']
```

### 2. ✅ Backend API - Fixed Permissions Query
**File:** `/my-backend/routes/permissions.js`

**Changed:**
```javascript
// OLD CODE (BROKEN) - queried non-existent userPage table
const userPages = await prisma.userPage.findMany({
  where: { user_id: userId },
  select: { page_key: true }
});

// NEW CODE (FIXED) - queries actual user_permissions table
const result = await prisma.$queryRaw`
  SELECT allowed_pages 
  FROM user_permissions 
  WHERE user_id = ${userId}
`;

let allowedPages = [];
if (result && result.length > 0 && result[0].allowed_pages) {
  allowedPages = result[0].allowed_pages;
}
```

### 3. ✅ Backend Server Restarted
The backend has been restarted to apply the permission route changes.

Process: `node app.js` (PID: 15831)

## How It Works

### Flow:
1. HR user logs in with `demo_hr@bisman.demo` / `hr123`
2. Frontend `DynamicSidebar.tsx` calls `/api/permissions?userId=55`
3. Next.js API route proxies to backend: `http://localhost:3001/api/permissions?userId=55`
4. Backend queries `user_permissions` table
5. Returns: `{ success: true, data: { userId: 55, allowedPages: ['user-creation', 'user-settings', 'about-me'] } }`
6. Sidebar filters pages and shows only allowed pages

## Testing Steps

### Step 1: Login as HR User
1. Open browser to `http://localhost:3000`
2. Navigate to login page
3. Email: `demo_hr@bisman.demo`
4. Password: `hr123`
5. Click Login

### Step 2: Verify Sidebar
The sidebar should show:
- ✅ Dashboard (default)
- ✅ **Create New User** (user-creation page) ← THIS SHOULD NOW BE VISIBLE
- ✅ User Settings
- ✅ About Me

### Step 3: Access Create User Page
1. Click "Create New User" in sidebar
2. Should navigate to `/hr/user-creation`
3. Page should load the two-stage user creation form:
   - Stage A: HR creates request → sends KYC link
   - Stage B: New employee completes KYC

## Page Registry Configuration

**File:** `/my-frontend/src/common/config/page-registry.ts`

```typescript
{
  id: 'user-creation',
  name: 'Create New User',
  path: '/hr/user-creation',
  icon: UserPlus,
  module: 'hr',
  permissions: ['user-management', 'hr-management'],
  roles: ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'],
  status: 'active',
  description: 'Two-stage user creation with KYC workflow',
  badge: 'New',
  order: 2.5,
}
```

## Troubleshooting

### Issue: "Create New User" still not showing
**Check 1: Verify user permissions in database**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
node fix-hr-permissions.js
```

**Check 2: Clear browser cache and hard refresh**
- Chrome/Safari: Cmd + Shift + R
- Or open incognito/private window

**Check 3: Verify backend is running**
```bash
ps aux | grep "node.*app.js"
# Should show process running
```

**Check 4: Check browser console for errors**
Open DevTools (F12) → Console tab
Look for any API errors

**Check 5: Verify API response**
Login as HR user, then in browser console:
```javascript
fetch('/api/permissions?userId=55', {credentials: 'include'})
  .then(r => r.json())
  .then(console.log)
```

Should return:
```json
{
  "success": true,
  "data": {
    "userId": 55,
    "allowedPages": ["user-creation", "user-settings", "about-me"]
  }
}
```

### Issue: Backend shows errors
**Check backend logs:**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"
tail -f backend.log
```

**Restart backend if needed:**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"
pkill -f "node.*app.js"
nohup node app.js > backend.log 2>&1 &
```

## Files Modified

1. **Created:** `/fix-hr-permissions.js` - Script to create HR user and permissions
2. **Modified:** `/my-backend/routes/permissions.js` - Fixed to query `user_permissions` table
3. **Backend:** Restarted to apply changes

## Verification Checklist

- [x] HR user exists in database (ID: 55)
- [x] HR user has correct permissions in `user_permissions` table
- [x] Backend `/api/permissions` route updated to query correct table
- [x] Backend server restarted
- [ ] Frontend tested - HR user can see "Create New User" in sidebar
- [ ] Page navigation works - clicking link loads `/hr/user-creation`

## Next Steps

1. **Test the login** with HR credentials
2. **Verify the sidebar** shows "Create New User"
3. **Test navigation** to the user creation page
4. If issues persist, check browser console and backend logs

---

**Created:** November 15, 2025  
**Issue:** HR module not showing create user page  
**Status:** ✅ Fixed - Ready for testing  
**Login:** demo_hr@bisman.demo / hr123
