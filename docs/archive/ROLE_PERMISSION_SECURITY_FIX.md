# 🔐 Role Permission & Sidebar Security Fix

## 🚨 CRITICAL ISSUES IDENTIFIED

### 1. **Enterprise Admin Seeing All Modules**
**Problem**: Enterprise Admin sidebar shows Super Admin modules (business/pump operations)
**Should See**: Only Enterprise-level pages (super-admins management, clients, modules, billing)
**Currently Showing**: Everything including operational modules

### 2. **Super Admin Seeing Enterprise Pages**
**Problem**: Super Admin might see Enterprise Admin-only pages
**Should See**: Only assigned business modules (finance, operations, HR, etc.)
**Currently Showing**: May include enterprise-level management pages

### 3. **No Backend Route Protection**
**Problem**: Even if sidebar hides pages, users can directly access URLs
**Risk**: Type `/enterprise-admin/super-admins` as Super Admin → might work
**Needed**: Backend middleware to block unauthorized access

### 4. **Page Registry Missing Role Hierarchy**
**Problem**: PAGE_REGISTRY doesn't distinguish:
- Enterprise-level pages (ENTERPRISE_ADMIN only)
- Business-level pages (SUPER_ADMIN + their users)
- Common pages (everyone)

---

## ✅ COMPREHENSIVE FIX PLAN

### Fix 1: Add Role Hierarchy to Page Registry
**File**: `/my-frontend/src/common/config/page-registry.ts`

```typescript
export interface PageMetadata {
  id: string;
  name: string;
  path: string;
  icon: any;
  module: string;
  permissions: string[];
  roles: string[];
  status: 'active' | 'coming-soon' | 'disabled';
  description?: string;
  order?: number;
  badge?: string | number;
  
  // NEW: Add role hierarchy
  accessLevel?: 'enterprise' | 'business' | 'common';  // ← Add this
}
```

**Rules**:
- `enterprise`: Only ENTERPRISE_ADMIN
- `business`: SUPER_ADMIN + ADMIN + MANAGER + STAFF + USER
- `common`: Everyone (About Me, Profile, etc.)

### Fix 2: Update Backend Permission API
**File**: `/my-backend/app.js`
**Endpoint**: `GET /api/auth/me/permissions`

```javascript
app.get('/api/auth/me/permissions', authenticate, async (req, res) => {
  try {
    // ENTERPRISE_ADMIN
    if (req.user.role === 'ENTERPRISE_ADMIN') {
      return res.json({
        ok: true,
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: 'ENTERPRISE_ADMIN',
          permissions: {
            assignedModules: ['enterprise-management'],  // Only enterprise module
            accessLevel: 'enterprise',
            pagePermissions: {
              'enterprise-management': ['super-admins', 'clients', 'modules', 'billing', 'analytics']
            }
          }
        }
      });
    }

    // SUPER_ADMIN
    if (req.user.role === 'SUPER_ADMIN') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: req.user.id },
        include: { moduleAssignments: { include: { module: true } } }
      });

      const assignedModules = [];
      const pagePermissions = {};

      superAdmin.moduleAssignments.forEach(assignment => {
        const moduleName = assignment.module.module_name;
        assignedModules.push(moduleName);
        pagePermissions[moduleName] = assignment.page_permissions || [];
      });

      return res.json({
        ok: true,
        user: {
          id: superAdmin.id,
          username: superAdmin.name,
          email: superAdmin.email,
          role: 'SUPER_ADMIN',
          permissions: {
            assignedModules,
            accessLevel: 'business',  // Business level access
            pagePermissions
          }
        }
      });
    }

    // Regular users...
  }
});
```

### Fix 3: Update DynamicSidebar Filtering
**File**: `/my-frontend/src/common/components/DynamicSidebar.tsx`

```typescript
const navigation = useMemo(() => {
  if (!user) return {};

  // Enterprise Admin: Only enterprise-level pages
  if (user.role === 'ENTERPRISE_ADMIN') {
    const grouped: Record<string, PageMetadata[]> = {};
    
    Object.keys(MODULES).forEach(moduleId => {
      grouped[moduleId] = PAGE_REGISTRY
        .filter(page => 
          page.accessLevel === 'enterprise' ||  // Enterprise pages
          page.accessLevel === 'common'          // Common pages (About Me, etc.)
        )
        .filter(page => page.module === moduleId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    
    return grouped;
  }

  // Super Admin: Only assigned business modules + common pages
  if (isSuperAdmin) {
    const grouped: Record<string, PageMetadata[]> = {};
    
    Object.keys(MODULES).forEach(moduleId => {
      // Only include assigned modules OR common pages
      if (superAdminModules.includes(moduleId) || moduleId === 'common') {
        grouped[moduleId] = PAGE_REGISTRY
          .filter(page => 
            page.accessLevel === 'business' ||    // Business pages
            page.accessLevel === 'common'         // Common pages
          )
          .filter(page => page.module === moduleId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    });
    
    return grouped;
  }

  // Regular users: Database-driven permissions
  const grouped: Record<string, PageMetadata[]> = {};
  
  Object.keys(MODULES).forEach(moduleId => {
    grouped[moduleId] = PAGE_REGISTRY
      .filter(page => 
        userAllowedPages.includes(page.id) ||    // Explicitly granted
        page.permissions.includes('authenticated') // Common pages
      )
      .filter(page => page.module === moduleId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  });
  
  return grouped;
}, [user, userAllowedPages, isSuperAdmin, superAdminModules]);
```

### Fix 4: Backend Route Protection Middleware
**File**: `/my-backend/middleware/roleProtection.js` (NEW)

```javascript
const requireEnterpriseAdmin = (req, res, next) => {
  if (req.user.role !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Enterprise Admin access required' 
    });
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Super Admin access required' 
    });
  }
  next();
};

const requireBusinessLevel = (req, res, next) => {
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'USER'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Business access required' 
    });
  }
  next();
};

module.exports = { requireEnterpriseAdmin, requireSuperAdmin, requireBusinessLevel };
```

**Apply to routes**:
```javascript
// Enterprise Admin routes
app.use('/api/enterprise-admin/*', requireEnterpriseAdmin);

// Super Admin routes
app.use('/api/super-admin/*', requireSuperAdmin);

// Business-level routes
app.use('/api/finance/*', requireBusinessLevel);
app.use('/api/operations/*', requireBusinessLevel);
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Page Registry Update
- [ ] Add `accessLevel` field to PageMetadata interface
- [ ] Tag all enterprise pages with `accessLevel: 'enterprise'`
- [ ] Tag all business pages with `accessLevel: 'business'`
- [ ] Tag common pages with `accessLevel: 'common'`

### Phase 2: Backend API Update
- [ ] Update `/api/auth/me/permissions` for ENTERPRISE_ADMIN
- [ ] Ensure SUPER_ADMIN only gets assigned modules
- [ ] Add `accessLevel` to response

### Phase 3: Frontend Sidebar Update
- [ ] Update DynamicSidebar filtering logic
- [ ] Test Enterprise Admin sees only enterprise pages
- [ ] Test Super Admin sees only assigned business modules
- [ ] Test regular users see database-granted pages

### Phase 4: Backend Route Protection
- [ ] Create roleProtection.js middleware
- [ ] Apply middleware to enterprise routes
- [ ] Apply middleware to business routes
- [ ] Test unauthorized access blocked

### Phase 5: Testing
- [ ] Enterprise Admin cannot access business routes
- [ ] Super Admin cannot access enterprise routes
- [ ] Super Admin cannot access unassigned modules
- [ ] Regular users cannot access admin pages

---

## 🎯 EXPECTED RESULTS

### Enterprise Admin Should See:
```
└── 🏢 Enterprise Management
    ├── Super Admins Management
    ├── Clients Management  
    ├── Modules Management
    ├── Billing & Subscriptions
    ├── Analytics Dashboard
    └── System Settings

└── 👤 Common
    └── About Me
```

### Super Admin (Finance modules assigned) Should See:
```
└── 💰 Finance
    ├── Executive Dashboard
    ├── General Ledger
    ├── Accounts Payable
    └── ... (other finance pages)

└── 📦 Operations (if assigned)
    └── ... (operations pages)

└── 👤 Common
    └── About Me
```

### Super Admin Should NOT See:
```
❌ Enterprise Management module
❌ Super Admins Management
❌ Clients Management
❌ Unassigned business modules
```

---

## 🚀 NEXT STEPS

1. **Implement Phase 1**: Update PAGE_REGISTRY with accessLevel
2. **Implement Phase 2**: Update backend /api/auth/me/permissions
3. **Implement Phase 3**: Update DynamicSidebar.tsx filtering
4. **Implement Phase 4**: Add backend route protection
5. **Test thoroughly**: All roles and access scenarios

---

**Priority**: 🔴 **CRITICAL** - Security issue affecting multi-tenant isolation
**Estimated Time**: 2-3 hours
**Impact**: High - Prevents unauthorized access across role boundaries
