# 🔐 BISMAN ERP - Permission Control System Guideline

**Version:** 1.0  
**Last Updated:** November 15, 2025  
**Author:** System Architecture Team

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Permission Hierarchy](#permission-hierarchy)
4. [How to Add a New Page](#how-to-add-a-new-page)
5. [Database Schema](#database-schema)
6. [Backend Configuration](#backend-configuration)
7. [Frontend Integration](#frontend-integration)
8. [Testing & Verification](#testing--verification)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## 🎯 Overview

The BISMAN ERP uses a **centralized, database-driven permission control system** where:

- ✅ **ALL pages are controlled dynamically** - No hardcoded permissions
- ✅ **Visible in Roles & Users Report** - Managed via `http://localhost:3000/system/roles-users-report`
- ✅ **Role-based access control (RBAC)** - Permission hierarchy per user role
- ✅ **Real-time permission checks** - Backend validates all page access
- ✅ **Automatic sidebar generation** - DynamicSidebar reads from database

### Key Principle
> **NEVER hardcode page visibility in sidebar or components. ALL page access MUST be controlled through the permission system.**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION CONTROL FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. NEW PAGE CREATION
   ├─ Step 1: Create page file in /my-frontend/src/app/[module]/[page]/page.tsx
   ├─ Step 2: Register in page-registry.ts
   ├─ Step 3: Add to master-modules.js (backend)
   └─ Step 4: Restart backend to load config

2. PERMISSION ASSIGNMENT (via UI)
   ├─ Enterprise Admin → http://localhost:3000/system/roles-users-report
   ├─ Select Role → Expand Module → Toggle Page Permission
   └─ Save → Database: rbac_user_permissions table updated

3. USER LOGIN & ACCESS
   ├─ User logs in → JWT token with role info
   ├─ Frontend fetches: /api/permissions?userId=X
   ├─ Backend queries: rbac_user_permissions.allowed_pages
   ├─ DynamicSidebar filters pages based on permissions
   └─ Page access validated on route navigation

4. RUNTIME PERMISSION CHECK
   ├─ User navigates to /hr/user-creation
   ├─ Frontend checks: userAllowedPages.includes('user-creation')
   ├─ Backend validates: /api/permissions/check-page?pageId=user-creation
   └─ Access granted/denied based on database permissions
```

---

## 👥 Permission Hierarchy

### Role Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     ROLE HIERARCHY                          │
└─────────────────────────────────────────────────────────────┘

ENTERPRISE_ADMIN (Highest Authority)
├─ Can access: /enterprise/* pages only
├─ Manages: Super Admins, Modules, System Configuration
├─ Permissions: Managed via master-modules.js → 'enterprise-management' module
└─ Cannot access: Business ERP pages (finance, HR, operations, etc.)

SUPER_ADMIN (Organization Level)
├─ Can access: /system/* and /common/* pages
├─ Assigned modules by Enterprise Admin
├─ Manages: Users, Roles, Permissions within assigned modules
├─ Permissions: Stored in module_assignments table
└─ Cannot access: /enterprise/* pages

CUSTOM ROLES (HR, Finance, Operations, etc.)
├─ Can access: Pages assigned by Super Admin
├─ Module-specific access (e.g., HR module, Finance module)
├─ Permissions: Stored in rbac_user_permissions table
└─ Always have access to: /common/* pages (common module)

ALL USERS (Authenticated)
├─ Automatic access: 'common' module pages
├─ Pages: About Me, Change Password, Help Center, Notifications
└─ Permission: 'authenticated' (granted automatically)
```

### Permission Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Module-Level** | Access to entire module | User assigned "HR Module" → All HR pages |
| **Page-Level** | Access to specific pages | User granted "user-creation" page only |
| **Element-Level** | Access to UI components | Show/hide buttons, tabs, sections (future) |

---

## 🆕 How to Add a New Page

### Step-by-Step Process

#### **STEP 1: Create the Page File**

Location: `/my-frontend/src/app/[module]/[page-name]/page.tsx`

**Example:** Creating a new "Employee Onboarding" page in HR module

```tsx
// File: /my-frontend/src/app/hr/employee-onboarding/page.tsx

'use client';

import React from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { FiUserPlus } from 'react-icons/fi';

export default function EmployeeOnboardingPage() {
  return (
    <SuperAdminShell>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <FiUserPlus className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Employee Onboarding</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Your page content here */}
          <p>Employee onboarding workflow...</p>
        </div>
      </div>
    </SuperAdminShell>
  );
}
```

**✅ DO:**
- Use `SuperAdminShell` or `HRShell` wrapper
- Include descriptive icons from `react-icons`
- Add proper TypeScript types
- Use Tailwind CSS for styling

**❌ DON'T:**
- Hardcode role checks in the component
- Directly check `user.role` for access control
- Skip the shell wrapper

---

#### **STEP 2: Register in Page Registry**

Location: `/my-frontend/src/common/config/page-registry.ts`

Add your page to the `PAGE_REGISTRY` array:

```typescript
{
  id: 'employee-onboarding',              // ✅ Unique identifier (kebab-case)
  name: 'Employee Onboarding',            // ✅ Display name for sidebar
  path: '/hr/employee-onboarding',        // ✅ Route path (must match file location)
  module: 'hr',                           // ✅ Parent module (hr, finance, system, etc.)
  icon: 'FiUserPlus',                     // ✅ Icon from lucide-react or react-icons
  description: 'Streamlined employee onboarding process',  // ✅ Tooltip/help text
  permissions: ['hr-management', 'employee-create'],       // ✅ Required permissions (OR logic)
  roles: ['HR', 'HR_MANAGER', 'SUPER_ADMIN'],             // ✅ Allowed roles
  status: 'active',                       // ✅ active | inactive | beta
  order: 20,                              // ✅ Sort order in sidebar (optional)
},
```

**Field Descriptions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique page identifier (used in DB) | `'employee-onboarding'` |
| `name` | string | Display name in sidebar/UI | `'Employee Onboarding'` |
| `path` | string | Next.js route path | `'/hr/employee-onboarding'` |
| `module` | string | Parent module category | `'hr'` / `'finance'` / `'system'` |
| `icon` | string | Icon component name | `'FiUserPlus'` |
| `description` | string | Help text/tooltip | `'Manage employee onboarding'` |
| `permissions` | string[] | Required permissions (user needs ANY one) | `['hr-management']` |
| `roles` | string[] | Allowed roles | `['HR', 'HR_MANAGER']` |
| `status` | string | Page status | `'active'` / `'inactive'` / `'beta'` |
| `order` | number | Sort position in sidebar | `10, 20, 30...` |

---

#### **STEP 3: Add to Backend Master Modules**

Location: `/my-backend/config/master-modules.js`

Find your module (e.g., HR) and add the page to the `pages` array:

```javascript
{
  id: 'hr',
  name: 'Human Resources',
  description: 'Employee, attendance, payroll, and HR operations',
  icon: 'FiUsers',
  category: 'Human Resources',
  businessCategory: 'Business ERP',
  pages: [
    { id: 'dashboard', name: 'HR Dashboard', path: '/hr' },
    { id: 'user-creation', name: 'Create New User', path: '/hr/user-creation' },
    { id: 'employees', name: 'Employees', path: '/hr/employees' },
    
    // ✅ ADD YOUR NEW PAGE HERE
    { id: 'employee-onboarding', name: 'Employee Onboarding', path: '/hr/employee-onboarding' },
    
    { id: 'attendance', name: 'Attendance', path: '/hr/attendance' },
    // ... other pages
  ],
},
```

**⚠️ CRITICAL:** The `id` in `master-modules.js` **MUST match** the `id` in `page-registry.ts`

---

#### **STEP 4: Restart Backend Server**

The backend loads `master-modules.js` at startup. You MUST restart it:

```bash
# Navigate to backend directory
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend

# Kill existing process
pkill -f "node.*app.js"

# Start backend
nohup node app.js > backend.log 2>&1 &

# Verify it's running
ps aux | grep "node.*app.js"

# Check logs
tail -f backend.log
```

**Verification:**
- Backend should log: `✅ Enterprise Admin routes loaded (protected)`
- Check: `curl http://localhost:3001/api/enterprise-admin/master-modules` (requires auth token)

---

#### **STEP 5: Assign Permissions via UI**

1. **Login as Super Admin** or **Enterprise Admin**
   - Navigate to: `http://localhost:3000/system/roles-users-report`

2. **Find Your Module**
   - Scroll to "Human Resources" section
   - Verify your new page appears: "Employee Onboarding"

3. **Assign to Roles**
   - Click on a role (e.g., "HR Manager")
   - Expand the "Human Resources" module
   - Toggle ON: "Employee Onboarding"
   - Click **Save Permissions**

4. **Database Update**
   - Backend saves to: `rbac_user_permissions.allowed_pages`
   - Column stores: `["user-creation", "employee-onboarding", ...]`

---

#### **STEP 6: Test User Access**

1. **Login as HR User**
   - Email: `demo_hr@bisman.demo`
   - Password: `hr123`

2. **Check Sidebar**
   - Sidebar should show: "Employee Onboarding" link
   - Click to navigate: `/hr/employee-onboarding`

3. **Verify Access**
   - Page loads successfully
   - No "Access Denied" error

4. **Test Denial**
   - Login as different role without permission
   - Page should NOT appear in sidebar
   - Direct URL access → Redirected to `/access-denied`

---

## 💾 Database Schema

### Key Tables

#### 1. `users` - User Information
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,  -- 'SUPER_ADMIN', 'HR', 'FINANCE', etc.
  tenant_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `rbac_user_permissions` - Page Permissions
```sql
CREATE TABLE rbac_user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_name VARCHAR(100),
  allowed_pages TEXT[],  -- Array: ['user-creation', 'employee-onboarding']
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_user_permissions_user_id ON rbac_user_permissions(user_id);
```

#### 3. `module_assignments` - Super Admin Module Access
```sql
CREATE TABLE module_assignments (
  id SERIAL PRIMARY KEY,
  super_admin_id INTEGER REFERENCES users(id),
  module_id INTEGER REFERENCES modules(id),
  page_permissions TEXT[],  -- Specific pages within module
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. `modules` - Module Definitions
```sql
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  module_name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  description TEXT,
  route VARCHAR(255),
  icon VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⚙️ Backend Configuration

### File Structure

```
my-backend/
├── config/
│   └── master-modules.js          ← ALL modules & pages defined here
├── routes/
│   ├── permissions.js             ← Permission check API
│   ├── enterpriseAdminModules.js  ← Module management API
│   └── auth.js                    ← Authentication & user info
├── middleware/
│   └── auth.js                    ← JWT verification
└── prisma/
    └── schema.prisma              ← Database models
```

### API Endpoints

#### 1. Get User Permissions
```http
GET /api/permissions?userId=55

Response:
{
  "success": true,
  "data": {
    "userId": 55,
    "allowedPages": ["user-creation", "user-settings", "about-me"]
  }
}
```

#### 2. Check Page Access
```http
GET /api/permissions/check-page?pageId=user-creation

Headers:
  Authorization: Bearer <JWT_TOKEN>

Response:
{
  "hasAccess": true,
  "reason": "User has permission via HR role"
}
```

#### 3. Get All Master Modules
```http
GET /api/enterprise-admin/master-modules

Headers:
  Authorization: Bearer <JWT_TOKEN>

Response:
{
  "modules": [
    {
      "id": "hr",
      "name": "Human Resources",
      "pages": [
        { "id": "user-creation", "name": "Create New User", "path": "/hr/user-creation" }
      ]
    }
  ]
}
```

#### 4. Save User Permissions
```http
POST /api/permissions/save

Body:
{
  "userId": 55,
  "roleName": "HR",
  "allowedPages": ["user-creation", "employee-onboarding", "attendance"]
}

Response:
{
  "success": true,
  "message": "Permissions saved successfully"
}
```

---

## 🎨 Frontend Integration

### DynamicSidebar Component

Location: `/my-frontend/src/common/components/DynamicSidebar.tsx`

**How it works:**

```typescript
// 1. Fetch user permissions from database
useEffect(() => {
  const fetchUserPermissions = async () => {
    const response = await fetch(`/api/permissions?userId=${user.id}`);
    const result = await response.json();
    setUserAllowedPages(result.data.allowedPages);
  };
  fetchUserPermissions();
}, [user.id]);

// 2. Filter pages based on permissions
const visiblePages = useMemo(() => {
  return PAGE_REGISTRY.filter(page => {
    // Common module: Always visible to authenticated users
    if (page.module === 'common') return true;
    
    // Check if user has permission for this page
    return userAllowedPages.includes(page.id);
  });
}, [userAllowedPages]);

// 3. Render sidebar links
return (
  <nav>
    {visiblePages.map(page => (
      <Link key={page.id} href={page.path}>
        {page.name}
      </Link>
    ))}
  </nav>
);
```

**✅ NEVER DO THIS (Hardcoded checks):**
```typescript
// ❌ BAD - Hardcoded role check
{user.role === 'HR' && <Link href="/hr/user-creation">Create User</Link>}

// ❌ BAD - Manual permission check
{userPermissions.includes('hr-management') && <SidebarItem />}
```

**✅ ALWAYS DO THIS (Dynamic from database):**
```typescript
// ✅ GOOD - Dynamic from PAGE_REGISTRY + database permissions
{visiblePages.map(page => <SidebarItem key={page.id} page={page} />)}
```

---

### Page Protection

Wrap all pages with authentication check:

```tsx
// File: /my-frontend/src/app/hr/employee-onboarding/page.tsx

'use client';

import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { useAuth } from '@/common/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EmployeeOnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // SuperAdminShell handles permission checks automatically
  // No manual checks needed here!

  return (
    <SuperAdminShell>
      {/* Your page content */}
    </SuperAdminShell>
  );
}
```

The `SuperAdminShell` component automatically:
- Checks if user is authenticated
- Validates page permissions via database
- Redirects to `/access-denied` if no access
- Shows loading state while checking

---

## ✅ Testing & Verification

### Test Checklist

#### 1. **Backend Configuration Test**
```bash
# Check master-modules.js syntax
node -c /my-backend/config/master-modules.js

# Verify backend is running
curl http://localhost:3001/health

# Test (requires auth token - test via browser logged in)
# Navigate to: http://localhost:3000/system/roles-users-report
# Verify your new page appears in the module list
```

#### 2. **Frontend Registry Test**
```bash
# TypeScript compilation check
cd my-frontend
npm run type-check

# Search for your page in registry
grep -n "employee-onboarding" src/common/config/page-registry.ts
```

#### 3. **Permission Assignment Test**

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Login as Super Admin | Access granted |
| 2 | Navigate to `/system/roles-users-report` | Page loads |
| 3 | Find "Human Resources" module | Module visible |
| 4 | Expand module | Your new page listed |
| 5 | Toggle ON for "HR" role | Checkbox checked |
| 6 | Click "Save Permissions" | Success toast message |
| 7 | Database check | `rbac_user_permissions` updated |

**SQL Verification:**
```sql
-- Check if permission was saved
SELECT allowed_pages 
FROM rbac_user_permissions 
WHERE role_name = 'HR';

-- Expected: ["user-creation", "employee-onboarding", ...]
```

#### 4. **User Access Test**

| Test Case | User Role | Expected Behavior |
|-----------|-----------|-------------------|
| **With Permission** | HR Manager | Page in sidebar, accessible |
| **Without Permission** | Finance User | Page NOT in sidebar, 403 on direct URL |
| **Super Admin** | Super Admin | All system pages accessible |
| **Enterprise Admin** | Enterprise Admin | Only enterprise pages accessible |

#### 5. **Sidebar Visibility Test**

```bash
# Test as different users:

# 1. HR User (demo_hr@bisman.demo / hr123)
# - Should see: HR module pages with permissions
# - Should NOT see: Finance, Operations pages

# 2. Finance User (create if needed)
# - Should see: Finance module pages
# - Should NOT see: HR pages

# 3. Super Admin
# - Should see: All system + common pages
# - Should NOT see: Enterprise pages
```

---

## 🔧 Troubleshooting

### Common Issues

#### ❌ **Issue 1: Page not appearing in Roles & Users Report**

**Symptoms:**
- New page created, but not listed in `http://localhost:3000/system/roles-users-report`

**Root Cause:**
- Page not added to `master-modules.js`
- Backend not restarted after adding page

**Solution:**
```bash
# 1. Check master-modules.js
grep -n "your-page-id" my-backend/config/master-modules.js

# 2. If missing, add it to the correct module's pages array

# 3. Restart backend
cd my-backend
pkill -f "node.*app.js"
nohup node app.js > backend.log 2>&1 &

# 4. Verify backend loaded config
tail -30 backend.log | grep "Enterprise Admin routes loaded"
```

---

#### ❌ **Issue 2: Page in sidebar but Access Denied on click**

**Symptoms:**
- Page appears in sidebar
- Clicking redirects to `/access-denied`

**Root Cause:**
- `page-registry.ts` has wrong `id` or `path`
- Database has different page ID than registry

**Solution:**
```typescript
// 1. Check page-registry.ts
// Ensure: id, path, module all match

// 2. Check database
// SQL:
SELECT allowed_pages FROM rbac_user_permissions WHERE user_id = YOUR_USER_ID;

// 3. Ensure page ID in allowed_pages matches registry id
```

---

#### ❌ **Issue 3: Sidebar shows wrong pages**

**Symptoms:**
- User sees pages they shouldn't have access to
- Or missing pages they should see

**Root Cause:**
- `DynamicSidebar` caching old permissions
- Database permissions not saved correctly

**Solution:**
```bash
# 1. Clear browser cache & cookies
# 2. Re-login to fetch fresh permissions
# 3. Check database:

SELECT u.email, rp.allowed_pages 
FROM users u
JOIN rbac_user_permissions rp ON u.id = rp.user_id
WHERE u.id = YOUR_USER_ID;

# 4. If incorrect, re-save via UI or SQL:
UPDATE rbac_user_permissions 
SET allowed_pages = ARRAY['user-creation', 'your-page-id']
WHERE user_id = YOUR_USER_ID;
```

---

#### ❌ **Issue 4: Backend permission check fails**

**Symptoms:**
- API returns: `{"hasAccess": false}`
- Even though user has permission

**Root Cause:**
- `/api/permissions/check-page` not reading latest DB state
- Page ID mismatch between frontend and backend

**Solution:**
```javascript
// Check backend route: my-backend/routes/permissions.js

// Ensure query uses correct table:
const result = await prisma.$queryRaw`
  SELECT allowed_pages 
  FROM rbac_user_permissions 
  WHERE user_id = ${userId}
`;

// Debug: Add console.log
console.log('User allowed pages:', result[0]?.allowed_pages);
console.log('Checking page:', pageId);
console.log('Has access:', result[0]?.allowed_pages?.includes(pageId));
```

---

#### ❌ **Issue 5: TypeScript errors in page-registry.ts**

**Symptoms:**
```
Type 'string' is not assignable to type 'ModuleType'
```

**Solution:**
```typescript
// Ensure module matches defined ModuleType union:
module: 'hr' as const,  // Not: 'HR' or 'human-resources'

// Valid modules:
// 'common', 'finance', 'hr', 'operations', 'compliance', 
// 'system', 'enterprise-management'
```

---

## 📋 Best Practices

### 1. **Naming Conventions**

| Element | Convention | Example |
|---------|------------|---------|
| Page ID | kebab-case | `employee-onboarding` |
| Page Name | Title Case | `Employee Onboarding` |
| Route Path | kebab-case with `/` | `/hr/employee-onboarding` |
| Module ID | lowercase | `hr`, `finance`, `system` |
| Permission | kebab-case | `hr-management`, `user-create` |
| Role Name | UPPER_SNAKE_CASE | `HR_MANAGER`, `SUPER_ADMIN` |

---

### 2. **Module Organization**

Group related pages under the same module:

```javascript
// ✅ GOOD - Logical grouping
{
  id: 'hr',
  name: 'Human Resources',
  pages: [
    { id: 'dashboard', name: 'HR Dashboard', path: '/hr' },
    { id: 'employees', name: 'Employees', path: '/hr/employees' },
    { id: 'attendance', name: 'Attendance', path: '/hr/attendance' },
    { id: 'payroll', name: 'Payroll', path: '/hr/payroll' },
  ]
}

// ❌ BAD - Mixed unrelated pages
{
  id: 'hr',
  pages: [
    { id: 'employees', ... },
    { id: 'invoices', ... },  // ❌ Should be in finance module
  ]
}
```

---

### 3. **Permission Granularity**

**Module-Level vs Page-Level:**

```javascript
// Use MODULE-level when:
// - User needs access to ALL pages in module
// - Role naturally owns entire module (e.g., CFO → Finance)

// Use PAGE-level when:
// - User needs selective access
// - Sensitive pages require extra restriction
// - Workflow-based access (onboarding → approval → completion)

// Example: HR Module
{
  pages: [
    { id: 'dashboard', ... },           // All HR users
    { id: 'employees', ... },           // All HR users
    { id: 'payroll', ... },             // HR_MANAGER only (sensitive)
    { id: 'salary-review', ... },       // HR_DIRECTOR only (highly sensitive)
  ]
}
```

---

### 4. **Common Module Usage**

**Common pages** are accessible to ALL authenticated users:

```typescript
// Examples of common pages:
- About Me
- Change Password
- Notifications
- Help Center
- User Settings

// ✅ Add to common module if:
- Page is useful to all users regardless of role
- No sensitive data displayed
- Pure informational or profile pages

// ❌ Don't add to common if:
- Page shows business data (invoices, orders, etc.)
- Page allows actions (create, update, delete)
- Page is role-specific
```

---

### 5. **Security Checklist**

Before deploying a new page:

- [ ] Page added to `page-registry.ts`
- [ ] Page added to `master-modules.js`
- [ ] Backend restarted
- [ ] Permissions assigned via UI
- [ ] Database updated correctly
- [ ] Tested with user having permission
- [ ] Tested with user WITHOUT permission
- [ ] Tested direct URL access (should redirect if no permission)
- [ ] Tested sidebar visibility
- [ ] Backend logs checked for errors
- [ ] TypeScript compilation successful
- [ ] No hardcoded role checks in component

---

### 6. **Performance Optimization**

```typescript
// ✅ GOOD - Memoized permission check
const visiblePages = useMemo(() => {
  return PAGE_REGISTRY.filter(page => 
    userAllowedPages.includes(page.id)
  );
}, [userAllowedPages]);

// ❌ BAD - Re-filter on every render
const visiblePages = PAGE_REGISTRY.filter(page => 
  userAllowedPages.includes(page.id)
);
```

---

## 📖 Quick Reference

### File Locations Cheat Sheet

```bash
# Frontend
/my-frontend/src/common/config/page-registry.ts         # Page definitions
/my-frontend/src/common/components/DynamicSidebar.tsx   # Sidebar generator
/my-frontend/src/app/[module]/[page]/page.tsx           # Page components
/my-frontend/src/components/layouts/SuperAdminShell.tsx # Page wrapper

# Backend
/my-backend/config/master-modules.js                    # Module & page config
/my-backend/routes/permissions.js                       # Permission API
/my-backend/routes/enterpriseAdminModules.js            # Module management
/my-backend/prisma/schema.prisma                        # Database schema

# Database Tables
rbac_user_permissions.allowed_pages                     # User page permissions
module_assignments.page_permissions                     # Super Admin modules
users.role                                              # User role
modules                                                 # Available modules
```

---

### Common SQL Queries

```sql
-- 1. Check user's allowed pages
SELECT u.email, rp.allowed_pages 
FROM users u
LEFT JOIN rbac_user_permissions rp ON u.id = rp.user_id
WHERE u.email = 'demo_hr@bisman.demo';

-- 2. Grant page permission to user
INSERT INTO rbac_user_permissions (user_id, role_name, allowed_pages, created_at, updated_at)
VALUES (55, 'HR', ARRAY['user-creation', 'employees', 'attendance'], NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE
SET allowed_pages = EXCLUDED.allowed_pages, updated_at = NOW();

-- 3. List all users and their permissions
SELECT u.id, u.email, u.role, rp.allowed_pages
FROM users u
LEFT JOIN rbac_user_permissions rp ON u.id = rp.user_id
ORDER BY u.id;

-- 4. Find users with specific page access
SELECT u.email, u.role
FROM users u
JOIN rbac_user_permissions rp ON u.id = rp.user_id
WHERE 'user-creation' = ANY(rp.allowed_pages);

-- 5. Remove page permission from all users
UPDATE rbac_user_permissions
SET allowed_pages = array_remove(allowed_pages, 'old-page-id'),
    updated_at = NOW();
```

---

## 🚀 Deployment Checklist

Before pushing to production:

```bash
# 1. Backend
cd my-backend
npm run build                           # If using TypeScript
node -c config/master-modules.js        # Syntax check
grep -r "TODO\|FIXME" routes/           # Check for unfinished code

# 2. Frontend
cd my-frontend
npm run type-check                      # TypeScript validation
npm run lint                            # ESLint check
npm run build                           # Production build

# 3. Database
# Run migration if schema changed
npx prisma migrate deploy

# 4. Environment Variables
# Ensure all env vars set:
# - DATABASE_URL
# - JWT_SECRET
# - NEXT_PUBLIC_API_URL
# - NODE_ENV=production

# 5. Security
# - All API endpoints require authentication
# - Permission checks on ALL protected routes
# - No hardcoded credentials
# - CORS configured correctly
```

---

## 📞 Support & Maintenance

### If You Get Stuck

1. **Check Documentation**
   - This guideline
   - `page-registry.ts` header comments
   - Backend API comments in `routes/permissions.js`

2. **Debug Steps**
   ```bash
   # Backend logs
   tail -f my-backend/backend.log
   
   # Frontend console
   # Open browser DevTools → Console tab
   # Look for: [Sidebar] permission logs
   
   # Database state
   psql -U your_user -d your_database
   SELECT * FROM rbac_user_permissions;
   ```

3. **Common Fixes**
   - Clear browser cache
   - Restart backend
   - Re-login to fetch fresh permissions
   - Check database directly

---

## 🎓 Summary

### The Golden Rules

1. **NEVER hardcode page visibility** - Always use database permissions
2. **ALWAYS add new pages to:**
   - `page-registry.ts` (frontend)
   - `master-modules.js` (backend)
3. **ALWAYS restart backend** after editing `master-modules.js`
4. **ALWAYS test with multiple roles** - admin and non-admin users
5. **ALWAYS use the UI** at `/system/roles-users-report` to manage permissions

### The Permission Flow

```
New Page Created 
→ Added to Registry 
→ Added to Master Modules 
→ Backend Restarted 
→ Appears in Roles & Users Report 
→ Admin Assigns to Role 
→ Saved to Database 
→ User Logs In 
→ Sidebar Fetches Permissions 
→ Page Appears/Hidden Based on Access
```

---

**Version Control:**
- Track changes to this document in Git
- Update version number when making changes
- Document breaking changes in CHANGELOG.md

**Questions or Issues?**
- Create a ticket in project management system
- Tag: `permissions`, `access-control`, `rbac`

---

**END OF GUIDELINE**
