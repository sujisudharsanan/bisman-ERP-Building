# 🧪 Super Admin Module Filtering - Testing Guide

## Quick Start Test

### Prerequisites
```bash
# Make sure both servers are running:

# Terminal 1: Backend
cd my-backend
npm run dev
# Should see: Server running on port 3001

# Terminal 2: Frontend  
cd my-frontend
npm run dev
# Should see: Ready on http://localhost:3000
```

---

## Test 1: Suji (Pump Management Only) ✅

### Expected Result: See ONLY Operations module in sidebar

```
1. Open: http://localhost:3000/auth/signin

2. Login credentials:
   📧 Email: suji@gmail.com
   🔒 Password: Demo@123

3. After login, check sidebar:
   ✅ SHOULD SEE: Operations module
   ❌ SHOULD NOT SEE: Finance, System, Procurement, Compliance

4. Open DevTools (F12) → Console tab
   Look for these logs:
   [Sidebar] Super Admin detected - fetching assigned modules
   [Sidebar] Assigned modules: ["operations", "task-management"]
   [Sidebar] Super Admin filtered modules: ["operations"]

5. Click on Operations module → Should expand showing pages:
   - Dashboard
   - Inventory
   - KPI
   - Hub Incharge
   - Store Incharge
   - Manager
   - Staff

6. Try accessing Finance directly:
   Navigate to: http://localhost:3000/super-admin/finance
   ✅ EXPECTED: Page should not be accessible or show error

7. Check API response:
   Open Network tab in DevTools
   Look for: /api/auth/me/permissions
   Response should show:
   {
     "assignedModules": ["operations", "task-management"]
   }
```

---

## Test 2: demo_super_admin (Business ERP) ✅

### Expected Result: See Finance AND Operations modules

```
1. Logout from Suji account
   Click profile → Logout

2. Login with:
   📧 Email: demo_super_admin@bisman.demo
   🔒 Password: Demo@123

3. After login, check sidebar:
   ✅ SHOULD SEE: Finance module
   ✅ SHOULD SEE: Operations module
   ❌ SHOULD NOT SEE: System, Procurement, Compliance

4. Open DevTools Console:
   [Sidebar] Assigned modules: ["finance", "operations"]
   [Sidebar] Super Admin filtered modules: ["finance", "operations"]

5. Click Finance module → Should show all finance pages:
   - Dashboard
   - Accounts
   - Accounts Payable
   - Accounts Receivable
   - General Ledger
   - Executive Dashboard
   - CFO Dashboard
   - Finance Controller
   - Treasury
   - Banker
   - Accounts Payable Summary

6. Click Operations module → Should show all operations pages

7. Try accessing System module:
   Navigate to: http://localhost:3000/super-admin/system
   ✅ EXPECTED: Should be blocked or show error
```

---

## Test 3: API Endpoint Test 🔧

### Test directly with curl or Postman

```bash
# Step 1: Get auth token
# Login via browser first, then copy authToken cookie from DevTools

# Step 2: Test API endpoint
curl -X GET http://localhost:3001/api/auth/me/permissions \
  -H "Cookie: authToken=YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"

# Expected response for suji@gmail.com:
{
  "ok": true,
  "user": {
    "id": 1,
    "username": "Suji Sudharsanan",
    "email": "suji@gmail.com",
    "role": "SUPER_ADMIN",
    "permissions": {
      "assignedModules": ["operations", "task-management"],
      "pagePermissions": {
        "operations": ["dashboard", "inventory", "kpi", "hub-incharge", "store-incharge", "manager", "staff"],
        "task-management": ["dashboard", "my-tasks", "team-tasks"]
      }
    }
  }
}

# Expected response for demo_super_admin:
{
  "ok": true,
  "user": {
    "id": 2,
    "email": "demo_super_admin@bisman.demo",
    "role": "SUPER_ADMIN",
    "permissions": {
      "assignedModules": ["finance", "operations"],
      "pagePermissions": {
        "finance": [...],
        "operations": [...]
      }
    }
  }
}
```

---

## Test 4: Enterprise Admin View 👁️

### Verify the Super Admin selector dropdown works

```
1. Logout from Super Admin account

2. Login as Enterprise Admin:
   📧 Email: demo_enterprise_admin@bisman.demo
   🔒 Password: Demo@123

3. Navigate to: http://localhost:3000/enterprise-admin/users

4. Find "Select Super Admin to View Modules & Permissions" dropdown

5. Select "Suji Sudharsanan (suji@gmail.com)"
   ✅ SHOULD SEE: 
   - Operations module card (orange)
   - Task Management module card (orange)
   - Page Access: 7 / 7 pages (Operations)
   - Page Access: 3 / 3 pages (Task Management)

6. Select "demo_super_admin"
   ✅ SHOULD SEE:
   - Finance module card (green)
   - Operations module card (orange)
   - Page Access: 11 / 11 pages (Finance)
   - Page Access: 7 / 7 pages (Operations)
```

---

## ✅ Success Checklist

After running all tests, verify:

- [ ] Suji sees ONLY Operations in sidebar
- [ ] demo_super_admin sees Finance AND Operations
- [ ] Unauthorized modules are hidden
- [ ] Console logs show correct module filtering
- [ ] API endpoint returns correct permissions
- [ ] Enterprise Admin can view Super Admin permissions via dropdown
- [ ] Module cards show correct page counts
- [ ] No errors in browser console
- [ ] No errors in backend terminal

---

## 🐛 Troubleshooting

### Issue: Sidebar shows ALL modules instead of filtered

**Solution 1**: Check console logs
```javascript
// Should see these logs:
[Sidebar] Super Admin detected - fetching assigned modules
[Sidebar] Assigned modules: [...]
[Sidebar] Super Admin filtered modules: [...]
```

**Solution 2**: Verify API response
```bash
# Check if API returns correct data
curl http://localhost:3001/api/auth/me/permissions \
  -H "Cookie: authToken=YOUR_TOKEN"
```

**Solution 3**: Clear browser cache
```
- Open DevTools (F12)
- Right-click on refresh button
- Select "Empty Cache and Hard Reload"
```

### Issue: API returns 401 Unauthorized

**Cause**: Not logged in or session expired

**Solution**:
```
1. Logout completely
2. Login again
3. Check authToken cookie exists in DevTools → Application → Cookies
```

### Issue: task-management module not showing

**Cause**: Module not added to page-registry.ts

**Solution**: This is expected behavior
- Backend assigns task-management module
- Frontend page-registry doesn't have it defined
- Module won't display in sidebar until added to registry

**To fix**: Add task-management to `/my-frontend/src/common/config/page-registry.ts`

---

## 🎯 What to Look For

### In Browser Console:
```
✅ Good:
[Sidebar] Super Admin detected - fetching assigned modules
[Sidebar] Assigned modules: ["operations"]
[Sidebar] Allowed pages: 7
[Sidebar] Super Admin filtered modules: ["operations"]

❌ Bad:
[Sidebar] Failed to fetch Super Admin permissions: 401
[Sidebar] Error fetching Super Admin permissions: Network error
```

### In Sidebar:
```
✅ Good (for Suji):
└── 📦 Operations
    └── 7 pages

❌ Bad (for Suji):
├── 📊 System Administration
├── 💰 Finance & Accounting
├── 🛒 Procurement
└── 📦 Operations
```

### In Network Tab:
```
✅ Good:
GET /api/auth/me/permissions → Status: 200 OK
Response: { ok: true, user: {...} }

❌ Bad:
GET /api/auth/me/permissions → Status: 401 Unauthorized
GET /api/auth/me/permissions → Status: 500 Internal Server Error
```

---

## 📞 Need Help?

### Check Documentation:
- `/SUPER_ADMIN_SELECTOR_COMPLETE.md` - Dropdown selector implementation
- `/SUPER_ADMIN_SIDEBAR_FILTERING_COMPLETE.md` - Sidebar filtering details
- `/my-frontend/src/common/components/DynamicSidebar.tsx` - Sidebar component code
- `/my-backend/app.js` - API endpoint code (line ~1010)

### Common Commands:
```bash
# Restart backend
cd my-backend && npm run dev

# Restart frontend
cd my-frontend && npm run dev

# Check backend logs
# Look in Terminal 1 for any error messages

# Check database
cd my-backend
npx prisma studio
# Opens database viewer at http://localhost:5555
```

---

**Happy Testing! 🎉**

**Status**: Ready for manual testing
**Date**: 25 October 2025
