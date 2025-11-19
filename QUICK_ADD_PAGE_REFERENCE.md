# 🚀 Quick Reference: Add New Page to BISMAN ERP

**⏱️ Time Required:** 10 minutes  
**📍 Applies To:** All new pages that need permission control

---

## ✅ 5-Step Checklist

### Step 1: Create Page File (2 min)
```bash
# Create: /my-frontend/src/app/[module]/[page-name]/page.tsx
```

```tsx
'use client';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

export default function YourPage() {
  return (
    <SuperAdminShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Your Page Title</h1>
        {/* Content */}
      </div>
    </SuperAdminShell>
  );
}
```

---

### Step 2: Add to Page Registry (3 min)
```typescript
// File: /my-frontend/src/common/config/page-registry.ts

{
  id: 'your-page-id',                    // ⚠️ Must be unique, kebab-case
  name: 'Your Page Name',                // Display in sidebar
  path: '/module/your-page',             // Must match file location
  module: 'hr',                          // hr | finance | operations | system
  icon: 'FiFileText',                    // Icon name
  description: 'Page description',
  permissions: ['permission-name'],
  roles: ['HR', 'SUPER_ADMIN'],
  status: 'active',
  order: 10,
},
```

**⚠️ Common Mistakes:**
- ❌ `id: 'Your Page'` → ✅ `id: 'your-page'`
- ❌ `path: 'your-page'` → ✅ `path: '/module/your-page'`
- ❌ `module: 'HR'` → ✅ `module: 'hr'`

---

### Step 3: Add to Backend Config (2 min)
```javascript
// File: /my-backend/config/master-modules.js

{
  id: 'hr',  // Find your module
  name: 'Human Resources',
  pages: [
    { id: 'dashboard', name: 'HR Dashboard', path: '/hr' },
    
    // ✅ ADD HERE - MUST MATCH REGISTRY ID
    { id: 'your-page-id', name: 'Your Page Name', path: '/module/your-page' },
    
    { id: 'employees', name: 'Employees', path: '/hr/employees' },
  ],
},
```

**⚠️ Critical:** `id` must be **EXACTLY** the same as in page-registry.ts

---

### Step 4: Restart Backend (1 min)
```bash
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend
pkill -f "node.*app.js"
nohup node app.js > backend.log 2>&1 &

# Verify
ps aux | grep "node.*app.js"
```

---

### Step 5: Assign Permissions (2 min)
1. Login as **Super Admin**
2. Go to: `http://localhost:3000/system/roles-users-report`
3. Find your module (e.g., "Human Resources")
4. **Verify** your page appears in the list
5. Toggle ON for desired roles
6. Click **Save Permissions**

---

## 🔍 Verification

### ✅ Success Indicators
- [ ] Page visible in roles-users-report
- [ ] User with permission sees page in sidebar
- [ ] User without permission does NOT see page
- [ ] Direct URL access works for authorized users
- [ ] Direct URL redirects to /access-denied for unauthorized

### ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| Page not in report | Check backend restarted, verify master-modules.js |
| Page in sidebar but 403 | Check `id` matches in registry & master-modules |
| TypeScript error | Check module is valid: 'hr' not 'HR' |
| Backend error | Check syntax: `node -c config/master-modules.js` |

---

## 📋 Quick Copy Templates

### Standard Page Template
```tsx
'use client';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { FiFileText } from 'react-icons/fi';

export default function YourPageName() {
  return (
    <SuperAdminShell>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <FiFileText className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Page Title</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Your content here */}
        </div>
      </div>
    </SuperAdminShell>
  );
}
```

### Registry Entry Template
```typescript
{
  id: 'kebab-case-id',
  name: 'Display Name',
  path: '/module/page-path',
  module: 'hr',
  icon: 'FiIcon',
  description: 'Short description',
  permissions: ['permission-name'],
  roles: ['ROLE_NAME'],
  status: 'active',
  order: 10,
},
```

### Master Module Entry Template
```javascript
{ id: 'kebab-case-id', name: 'Display Name', path: '/module/page-path' },
```

---

## ⚠️ DON'Ts (Common Mistakes)

```typescript
// ❌ NEVER hardcode permissions in component
{user.role === 'HR' && <Link href="/hr/page">Link</Link>}

// ❌ NEVER check permissions manually
{userPermissions.includes('hr') && <Component />}

// ❌ NEVER skip SuperAdminShell wrapper
export default function Page() {
  return <div>Content</div>; // ❌ No protection!
}

// ✅ ALWAYS use SuperAdminShell
export default function Page() {
  return <SuperAdminShell><div>Content</div></SuperAdminShell>;
}
```

---

## 🎯 Module Reference

| Module ID | Name | Use For |
|-----------|------|---------|
| `common` | Common Module | All users (Profile, Settings, Help) |
| `hr` | Human Resources | Employee, Payroll, Attendance |
| `finance` | Finance | Accounting, Treasury, Billing |
| `operations` | Operations | Warehouse, Logistics, Inventory |
| `system` | System Admin | User Mgmt, Roles, Audit Logs |
| `compliance` | Compliance | Legal, Regulatory, Audits |
| `enterprise-management` | Enterprise | Super Admin Mgmt (Enterprise only) |

---

## 📞 Need Help?

1. **Full Documentation:** `PERMISSION_CONTROL_SYSTEM_GUIDELINE.md`
2. **Check Logs:** `tail -f my-backend/backend.log`
3. **Database:** Query `rbac_user_permissions` table
4. **Frontend Console:** Look for `[Sidebar]` logs in browser DevTools

---

**Last Updated:** November 15, 2025  
**Version:** 1.0
