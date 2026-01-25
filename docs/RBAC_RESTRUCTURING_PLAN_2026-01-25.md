# BISMAN ERP - RBAC Restructuring Plan
**Generated:** 2026-01-25  
**Author:** RBAC Architect  
**Status:** Implementation Ready

---

## Executive Summary

This document provides a complete RBAC restructuring plan based on analysis of 313 active pages and 39 roles. The current system has significant cross-module leakage and unrealistic page counts (roles with 99-259 pages).

### Current Issues Identified:
- **Super Admin leakage:** 28 violations (BISMAN_BILLING has access to `/super-admin/*`)
- **Admin Console leakage:** 12 violations (CEO, BISMAN_FINANCE have `/admin/*` access)
- **6 redundant login pages** (should be 1)
- **24 pages without role assignments** (correct for PUBLIC pages)
- **Unrealistic page counts:** SYSTEM_ADMIN/ENTERPRISE_ADMIN/SUPER_ADMIN each have 259 pages

---

## DELIVERABLE A: Role Grouping

### A.1 Platform Roles (System-level)
```
┌─────────────────────────────────────────────────────────────────┐
│ ROLE              │ SCOPE                    │ ACCESS LEVEL     │
├───────────────────┼──────────────────────────┼──────────────────┤
│ SYSTEM_ADMIN      │ Full platform access     │ ROOT             │
│ ENTERPRISE_ADMIN  │ Enterprise management    │ Platform Admin   │
│ SUPER_ADMIN       │ Super admin functions    │ Platform Admin   │
└─────────────────────────────────────────────────────────────────┘
```

### A.2 Tenant Admin Roles
```
┌─────────────────────────────────────────────────────────────────┐
│ ROLE              │ SCOPE                    │ ACCESS LEVEL     │
├───────────────────┼──────────────────────────┼──────────────────┤
│ ADMIN             │ Tenant administration    │ Tenant Root      │
│ ADMIN_OPS         │ Operations admin         │ Tenant Admin     │
│ IT_ADMIN          │ IT administration        │ Tenant Admin     │
└─────────────────────────────────────────────────────────────────┘
```

### A.3 Business Roles (Inherit BASE_USER)
```
┌─────────────────────────────────────────────────────────────────┐
│ TIER 1: EXECUTIVES        │ CEO, CFO, COO, CTO                  │
├───────────────────────────┼─────────────────────────────────────┤
│ TIER 2: MANAGERS          │ MANAGER, HR_MANAGER,                │
│                           │ OPERATIONS_MANAGER, FINANCE_CTRL    │
├───────────────────────────┼─────────────────────────────────────┤
│ TIER 3: SUPERVISORS       │ SUPERVISOR, HUB_INCHARGE,           │
│                           │ HUB_INCHARGE_SR, STORE_INCHARGE,    │
│                           │ STORE_INCHARGE_SR, BRANCH_INCHARGE  │
├───────────────────────────┼─────────────────────────────────────┤
│ TIER 4: SPECIALISTS       │ ACCOUNTANT, AUDITOR, BANKER,        │
│                           │ COMPLIANCE, LEGAL, TREASURY,        │
│                           │ PROCUREMENT_OFFICER, ACCOUNTS,      │
│                           │ ACCOUNTS_PAYABLE                    │
├───────────────────────────┼─────────────────────────────────────┤
│ TIER 5: STAFF             │ STAFF, DATA_ENTRY, HR, INTERN       │
└───────────────────────────┴─────────────────────────────────────┘
```

### A.4 Internal Bisman Support Roles
```
┌─────────────────────────────────────────────────────────────────┐
│ ROLE                  │ PURPOSE                                 │
├───────────────────────┼─────────────────────────────────────────┤
│ BISMAN_ENGINEERING    │ Platform development & QA               │
│ BISMAN_SUPPORT        │ Customer support                        │
│ BISMAN_CUSTOMER_CARE  │ Customer care                           │
│ BISMAN_BILLING        │ Billing administration                  │
│ BISMAN_FINANCE        │ Internal finance                        │
│ QA                    │ Quality assurance                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## DELIVERABLE B: Page Registry Structure

### B.1 Page Categories
```sql
-- Category definitions
CREATE TYPE page_category AS ENUM (
  'PUBLIC',              -- No login required (landing, login, signup)
  'RESTRICTED_COMMON',   -- Login required, shared across roles (BASE_USER)
  'ROLE_SPECIFIC',       -- Only specific roles
  'INTERNAL_SUPPORT',    -- Bisman internal team only
  'SYSTEM_ONLY'          -- SYSTEM_ADMIN only
);

-- Page types
CREATE TYPE page_type AS ENUM (
  'UI_PAGE',             -- Actual UI page with component
  'API_ROUTE',           -- Backend API only (no sidebar)
  'REDIRECT',            -- Redirect to another page
  'EXTERNAL'             -- External link
);
```

### B.2 Enhanced pages_master Schema
```sql
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'ROLE_SPECIFIC';
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS page_type VARCHAR(20) DEFAULT 'UI_PAGE';
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS sidebar_order INTEGER DEFAULT 999;
ALTER TABLE pages_master ADD COLUMN IF NOT EXISTS requires_base_user BOOLEAN DEFAULT false;
```

### B.3 Page Category Assignments

#### PUBLIC Pages (24 pages - No roles needed)
| Route | Page Code | Action |
|-------|-----------|--------|
| `/landing` | PUBLIC_LANDING | category=PUBLIC |
| `/login` | PUBLIC_LOGIN | category=PUBLIC |
| `/signup` | PUBLIC_SIGNUP | category=PUBLIC |
| `/access-denied` | PUBLIC_ACCESS_DENIED | category=PUBLIC |
| `/unauthorized` | PUBLIC_UNAUTHORIZED | category=PUBLIC |
| `/status` | PUBLIC_STATUS | category=PUBLIC |
| `/pricing` | PUBLIC_PRICING | category=PUBLIC |
| `/get-started` | PUBLIC_GET_STARTED | category=PUBLIC |
| `/legal/agreements` | PUBLIC_LEGAL_AGREEMENTS | category=PUBLIC |
| `/trust-security` | PUBLIC_TRUST_SECURITY | category=PUBLIC |
| `/privacy` | PRIVACY | category=PUBLIC |
| `/terms` | TERMS | category=PUBLIC |
| `/auth/*` | AUTH_* | category=PUBLIC, is_active=false (deprecated) |

#### RESTRICTED_COMMON Pages (BASE_USER inherits - 18 pages)
| Route | Sidebar Order | Purpose |
|-------|---------------|---------|
| `/dashboard` | 1 | Kanban Dashboard (BASE_USER default) |
| `/common/notifications` | 2 | Notifications |
| `/common/messages` | 3 | Messages |
| `/common/calendar` | 4 | Calendar |
| `/common/about-me` | 5 | Profile |
| `/common/user-settings` | 6 | User Settings |
| `/common/task-approvals` | 10 | Task Approvals |
| `/common/payment-request` | 11 | Payment Request |
| `/common/documentation` | 12 | Documentation |
| `/common/security-settings` | 13 | Security Settings |
| `/common/help-center` | 14 | Help Center |
| `/common/change-password` | 15 | Change Password |
| `/task-dashboard` | 20 | Task Dashboard |
| `/tasks/create` | 21 | Create Task |
| `/tasks/clarifications` | 22 | Clarifications |
| `/tasks/reviews` | 23 | Reviews |
| `/approvals` | 24 | Approvals |
| `/assistant` | 25 | AI Assistant |

### B.4 Login Page Cleanup
```sql
-- Keep only /auth/login as standard login
-- Deactivate redundant login pages

UPDATE pages_master SET is_active = false, show_in_sidebar = false 
WHERE route IN (
  '/auth/admin-login',
  '/auth/hub-incharge-login', 
  '/auth/standard-login',
  '/qa/login',
  '/login'  -- Duplicate of /auth/login
);

-- Mark /auth/login as the canonical login
UPDATE pages_master 
SET display_name = 'Login', category = 'PUBLIC'
WHERE route = '/auth/login';
```

---

## DELIVERABLE C: Final RBAC Mapping

### C.1 BASE_USER System Role (New)
```
BASE_USER inherits: 18 RESTRICTED_COMMON pages
Applied to: All business roles (TIER 1-5)
NOT applied to: ENTERPRISE_ADMIN, SUPER_ADMIN, ADMIN, SYSTEM_ADMIN
```

### C.2 Platform Roles Mapping

#### SYSTEM_ADMIN (Root - Full Access)
- All `/super-admin/*` pages
- All `/enterprise-admin/*` pages  
- All `/admin/*` pages
- All `/system/*` pages
- All `/governance/*` pages
- **Total: ~80 pages** (not 259)

#### ENTERPRISE_ADMIN
| Module | Pages | Sidebar Order |
|--------|-------|---------------|
| Dashboard | `/enterprise-admin/dashboard` | 1 |
| Roles | `/enterprise-admin/roles` | 10 |
| Super Admins | `/enterprise-admin/super-admins`, `/enterprise-admin/super-admins/create` | 11 |
| Users | `/enterprise-admin/users` | 12 |
| Activity Logs | `/enterprise-admin/activity-logs`, `/enterprise-admin/logs` | 20 |
| Audit | `/enterprise-admin/audit` | 21 |
| Monitoring | `/enterprise-admin/monitoring`, `/enterprise-admin/monitoring/*` | 30 |
| Security | `/enterprise-admin/rbac-security`, `/enterprise-admin/security-operations` | 40 |
| Billing | `/enterprise-admin/billing` | 50 |
| Subscriptions | `/enterprise-admin/subscriptions`, `/enterprise-admin/subscription-access` | 51 |
| Integrations | `/enterprise-admin/integrations` | 60 |
| Reports | `/enterprise-admin/reports`, `/enterprise-admin/pages-report` | 70 |
| Organizations | `/enterprise-admin/organizations` | 80 |
| Notifications | `/enterprise-admin/notifications` | 90 |
| **Total** | **~27 pages** | |

#### SUPER_ADMIN
| Module | Pages | Sidebar Order |
|--------|-------|---------------|
| Dashboard | `/super-admin` | 1 |
| System | `/super-admin/system`, `/super-admin/system/*` | 10 |
| Security | `/super-admin/security` | 20 |
| Subscriptions | `/super-admin/subscriptions`, `/super-admin/subscriptions/*` | 30 |
| Decision Load | `/super-admin/decision-load` | 40 |
| Orders | `/super-admin/orders` | 50 |
| **Total** | **~25 pages** | |

### C.3 Tenant Admin Mapping

#### ADMIN
| Module | Pages | Sidebar Order |
|--------|-------|---------------|
| Dashboard | `/admin/client-dashboard` | 1 |
| Users | `/admin/users`, `/admin/users/create`, `/admin/user-management`, `/admin/user-usage` | 10 |
| Clients | `/admin/clients`, `/admin/clients/[id]/permissions` | 20 |
| Branches | `/admin/branches`, `/admin/branches/create` | 25 |
| Roles | `/admin/roles-permissions`, `/admin/permissions` | 30 |
| Billing | `/admin/billing`, `/admin/billing/tenants`, `/admin/subscription`, `/admin/subscription-billing` | 40 |
| Settings | `/admin/settings`, `/admin/system-configuration` | 50 |
| AI | `/admin/ai`, `/admin/ai-analytics`, `/admin/rag-sources` | 60 |
| Integrations | `/admin/integrations`, `/admin/api-management`, `/admin/developer` | 70 |
| Reports | `/admin/reports`, `/admin/audit` | 80 |
| Modules | `/admin/modules`, `/admin/tenant-management` | 90 |
| Contracts | `/admin/contracts`, `/admin/contracts/create` | 100 |
| Support | `/admin/support`, `/admin/sla` | 110 |
| **Total** | **~35 pages** | |

### C.4 Business Roles Mapping

#### CEO (Executive Tier)
```
Inherits: BASE_USER (18 pages)
Direct Access:
  - /cfo-dashboard (Financial overview)
  - /finance/executive-dashboard
  - /analytics
  - /governance/security-overview
  - /compliance/compliance-dashboard
Total: 18 + 5 = 23 pages
```

#### CFO (Executive Tier)
```
Inherits: BASE_USER (18 pages)
Direct Access:
  - /cfo-dashboard
  - /finance/* (all 35 finance pages)
  - /reconciliation, /reconciliation/*
  - /settlements, /settlements/*
  - /accounts, /accounts-payable
Total: 18 + 42 = 60 pages
```

#### HR_MANAGER
```
Inherits: BASE_USER (18 pages)
Direct Access:
  - /hr/policy
  - /hr/attendance-tracking
  - /hr/performance-review
  - /hr/training
  - /hr/user-creation
  - /common/user-creation
Total: 18 + 6 = 24 pages
```

#### OPERATIONS_MANAGER
```
Inherits: BASE_USER (18 pages)
Direct Access:
  - /operations/* (all operations pages)
  - /store-incharge
  - /operations-manager
  - /procurement/* (view only)
Total: 18 + 20 = 38 pages
```

#### HUB_INCHARGE
```
Inherits: BASE_USER (18 pages)
Direct Access:
  - /hub-incharge
  - /operations/inventory-management
  - /operations/stock-entry
  - /operations/stock-ledger
  - /operations/delivery-note
Total: 18 + 5 = 23 pages
```

#### ACCOUNTANT
```
Inherits: BASE_USER (18 pages)
Direct Access:
  - /finance/general-ledger
  - /finance/journal-entries
  - /finance/chart-of-accounts
  - /finance/trial-balance
  - /finance/accounts-payable-summary
  - /finance/accounts-receivable-summary
  - /accounts
Total: 18 + 7 = 25 pages
```

#### STAFF (Base level)
```
Inherits: BASE_USER (18 pages)
Direct Access:
  - /staff
Total: 18 + 1 = 19 pages
```

### C.5 Internal Bisman Roles Mapping

#### BISMAN_ENGINEERING
```
Direct Access (NO BASE_USER):
  - /internal/teams
  - /internal/support-sessions
  - /internal/playbooks
  - /qa/*
  - /system/error-logs
  - /system/server-logs
  - /system/deployment-tools
Total: 12 pages
```

#### BISMAN_SUPPORT
```
Direct Access (NO BASE_USER):
  - /internal/customers
  - /internal/support-sessions
  - /internal/playbooks
Total: 5 pages
```

#### BISMAN_BILLING
```
Direct Access (NO BASE_USER):
  - /internal/customers
  - /billing/* (internal billing views only)
  - NOT /super-admin/* (REMOVE current access)
  - NOT /admin/* (REMOVE current access)
Total: 8 pages (down from 13)
```

---

## DELIVERABLE D: Database Migration Plan

### D.1 Create BASE_USER Role
```sql
-- Create BASE_USER in rbac_roles
INSERT INTO rbac_roles (name, display_name, description, is_system_role, is_active, created_at)
VALUES ('BASE_USER', 'Base User', 'Default permissions for all logged-in business users', true, true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Create base_user_pages table for inheritance
CREATE TABLE IF NOT EXISTS base_user_pages (
  id SERIAL PRIMARY KEY,
  page_id INTEGER NOT NULL REFERENCES pages_master(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(page_id)
);
```

### D.2 Assign BASE_USER Pages
```sql
-- Get BASE_USER common page IDs
INSERT INTO base_user_pages (page_id)
SELECT id FROM pages_master 
WHERE route IN (
  '/dashboard',
  '/common/notifications',
  '/common/messages', 
  '/common/calendar',
  '/common/about-me',
  '/common/user-settings',
  '/common/task-approvals',
  '/common/payment-request',
  '/common/documentation',
  '/common/security-settings',
  '/common/help-center',
  '/common/change-password',
  '/task-dashboard',
  '/tasks/create',
  '/tasks/clarifications',
  '/tasks/reviews',
  '/approvals',
  '/assistant'
)
AND is_active = true
ON CONFLICT DO NOTHING;
```

### D.3 Update Page Categories
```sql
-- Mark PUBLIC pages
UPDATE pages_master SET category = 'PUBLIC'
WHERE route IN (
  '/landing', '/login', '/signup', '/access-denied', '/unauthorized',
  '/status', '/pricing', '/get-started', '/legal/agreements', 
  '/trust-security', '/privacy', '/terms'
) OR route LIKE '/auth/%';

-- Mark RESTRICTED_COMMON (BASE_USER) pages  
UPDATE pages_master SET category = 'RESTRICTED_COMMON'
WHERE route IN (
  '/dashboard', '/common/notifications', '/common/messages',
  '/common/calendar', '/common/about-me', '/common/user-settings',
  '/common/task-approvals', '/common/payment-request', '/common/documentation',
  '/common/security-settings', '/common/help-center', '/common/change-password',
  '/task-dashboard', '/tasks/create', '/tasks/clarifications', '/tasks/reviews',
  '/approvals', '/assistant'
);

-- Mark INTERNAL_SUPPORT pages
UPDATE pages_master SET category = 'INTERNAL_SUPPORT'
WHERE route LIKE '/internal/%' OR route LIKE '/qa/%';

-- Mark SYSTEM_ONLY pages
UPDATE pages_master SET category = 'SYSTEM_ONLY'
WHERE route IN (
  '/system/deployment-tools', '/system/error-logs', '/system/server-logs',
  '/super-admin/system/fallback-recovery', '/super-admin/system/deployment-tools'
);
```

### D.4 Fix Cross-Module Leakage
```sql
-- Remove BISMAN_BILLING from /super-admin/* 
DELETE FROM role_page_access 
WHERE role_name = 'BISMAN_BILLING'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/super-admin%');

-- Remove BISMAN_BILLING from /admin/*
DELETE FROM role_page_access 
WHERE role_name = 'BISMAN_BILLING'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- Remove BISMAN_FINANCE from /admin/*
DELETE FROM role_page_access 
WHERE role_name = 'BISMAN_FINANCE'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- Remove CEO from /admin/*
DELETE FROM role_page_access 
WHERE role_name = 'CEO'
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');

-- Remove all business roles from /enterprise-admin/*
DELETE FROM role_page_access 
WHERE role_name NOT IN ('ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN')
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/enterprise-admin%');

-- Remove all business roles from /super-admin/*
DELETE FROM role_page_access 
WHERE role_name NOT IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/super-admin%');

-- Remove all non-admin roles from /admin/*
DELETE FROM role_page_access 
WHERE role_name NOT IN ('ADMIN', 'ADMIN_OPS', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN')
  AND page_id IN (SELECT id FROM pages_master WHERE route LIKE '/admin%');
```

### D.5 Deactivate Redundant Login Pages
```sql
UPDATE pages_master 
SET is_active = false, show_in_sidebar = false
WHERE route IN (
  '/auth/admin-login',
  '/auth/hub-incharge-login',
  '/auth/standard-login',
  '/qa/login'
);

-- Keep /auth/login and /login (redirect)
UPDATE pages_master 
SET page_type = 'REDIRECT', category = 'PUBLIC'
WHERE route = '/login';
```

### D.6 Set Sidebar Order
```sql
-- Dashboard always first for each role type
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/dashboard';
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/enterprise-admin/dashboard';
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/super-admin';
UPDATE pages_master SET sidebar_order = 1 WHERE route = '/admin/client-dashboard';

-- Common pages order
UPDATE pages_master SET sidebar_order = 2 WHERE route = '/common/notifications';
UPDATE pages_master SET sidebar_order = 3 WHERE route = '/common/messages';
UPDATE pages_master SET sidebar_order = 4 WHERE route = '/common/calendar';
UPDATE pages_master SET sidebar_order = 5 WHERE route = '/common/about-me';
UPDATE pages_master SET sidebar_order = 6 WHERE route = '/common/user-settings';
```

### D.7 Create Role-Specific Assignments
```sql
-- ENTERPRISE_ADMIN: Only enterprise-admin pages
DELETE FROM role_page_access WHERE role_name = 'ENTERPRISE_ADMIN';
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'ENTERPRISE_ADMIN', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/enterprise-admin%';

-- SUPER_ADMIN: Only super-admin pages
DELETE FROM role_page_access WHERE role_name = 'SUPER_ADMIN';
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'SUPER_ADMIN', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND (route LIKE '/super-admin%' OR route LIKE '/system%');

-- ADMIN: Only admin pages
DELETE FROM role_page_access WHERE role_name = 'ADMIN';
INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete, granted_at)
SELECT 'ADMIN', id, true, true, true, NOW()
FROM pages_master 
WHERE is_active = true 
  AND route LIKE '/admin%';
```

---

## DELIVERABLE E: Backend Enforcement

### E.1 Permission Resolution with BASE_USER Inheritance

```javascript
// my-backend/middleware/rbacResolver.js

/**
 * Resolve effective permissions including BASE_USER inheritance
 */
async function resolveEffectivePermissions(userId, userRole) {
  const pool = getPool();
  
  // Platform roles do NOT inherit BASE_USER
  const platformRoles = ['SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'ADMIN_OPS'];
  const internalRoles = ['BISMAN_ENGINEERING', 'BISMAN_SUPPORT', 'BISMAN_BILLING', 'BISMAN_FINANCE', 'BISMAN_CUSTOMER_CARE', 'QA'];
  
  const inheritsBaseUser = !platformRoles.includes(userRole) && !internalRoles.includes(userRole);
  
  let query;
  if (inheritsBaseUser) {
    // Business roles: Get BASE_USER pages + role-specific pages
    query = `
      SELECT DISTINCT pm.id, pm.route, pm.page_code, pm.display_name, pm.icon,
             pm.show_in_sidebar, pm.sidebar_order, mm.module_code,
             COALESCE(rpa.can_view, true) as can_view,
             COALESCE(rpa.can_edit, false) as can_edit
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      LEFT JOIN role_page_access rpa ON rpa.page_id = pm.id AND rpa.role_name = $1
      WHERE pm.is_active = true
        AND pm.category != 'PUBLIC'
        AND (
          -- BASE_USER inherited pages
          pm.id IN (SELECT page_id FROM base_user_pages)
          OR
          -- Role-specific pages
          rpa.role_name = $1
        )
      ORDER BY pm.sidebar_order, pm.display_name
    `;
  } else {
    // Platform/Internal roles: Only role-specific pages
    query = `
      SELECT DISTINCT pm.id, pm.route, pm.page_code, pm.display_name, pm.icon,
             pm.show_in_sidebar, pm.sidebar_order, mm.module_code,
             rpa.can_view, rpa.can_edit
      FROM pages_master pm
      LEFT JOIN modules_master mm ON pm.module_id = mm.id
      INNER JOIN role_page_access rpa ON rpa.page_id = pm.id
      WHERE pm.is_active = true
        AND rpa.role_name = $1
        AND rpa.can_view = true
      ORDER BY pm.sidebar_order, pm.display_name
    `;
  }
  
  const result = await pool.query(query, [userRole]);
  return result.rows;
}

module.exports = { resolveEffectivePermissions };
```

### E.2 Sidebar API with Enforcement

```javascript
// my-backend/routes/menuRoutes.js - Updated

router.get('/sidebar', authenticate, async (req, res) => {
  try {
    const userRole = req.user?.role || req.user?.roleName;
    
    // Get effective permissions with BASE_USER inheritance
    const pages = await resolveEffectivePermissions(req.user.id, userRole);
    
    // Filter to sidebar-visible pages only
    const sidebarPages = pages.filter(p => p.show_in_sidebar === true);
    
    // Ensure dashboard is first
    sidebarPages.sort((a, b) => {
      // Dashboard routes always first
      const dashboardRoutes = ['/dashboard', '/enterprise-admin/dashboard', '/super-admin', '/admin/client-dashboard'];
      const aIsDash = dashboardRoutes.some(d => a.route === d);
      const bIsDash = dashboardRoutes.some(d => b.route === d);
      if (aIsDash && !bIsDash) return -1;
      if (bIsDash && !aIsDash) return 1;
      return (a.sidebar_order || 999) - (b.sidebar_order || 999);
    });
    
    // Group by module
    const moduleMap = new Map();
    for (const page of sidebarPages) {
      const moduleCode = page.module_code || 'COMMON';
      if (!moduleMap.has(moduleCode)) {
        moduleMap.set(moduleCode, []);
      }
      moduleMap.get(moduleCode).push(page);
    }
    
    res.json({
      success: true,
      role: userRole,
      totalPages: sidebarPages.length,
      modules: Array.from(moduleMap.entries()).map(([code, pages]) => ({
        code,
        pages: pages.map(p => ({
          id: p.id,
          code: p.page_code,
          name: p.display_name,
          route: p.route,
          icon: p.icon,
          canEdit: p.can_edit
        }))
      }))
    });
  } catch (error) {
    console.error('[Sidebar API] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load sidebar' });
  }
});
```

### E.3 Route Access Guard

```javascript
// my-backend/middleware/routeGuard.js

const ROUTE_RESTRICTIONS = {
  '/enterprise-admin': ['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'],
  '/super-admin': ['SUPER_ADMIN', 'SYSTEM_ADMIN'],
  '/admin': ['ADMIN', 'ADMIN_OPS', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN'],
  '/internal': ['BISMAN_ENGINEERING', 'BISMAN_SUPPORT', 'BISMAN_CUSTOMER_CARE', 'BISMAN_BILLING', 'BISMAN_FINANCE', 'SYSTEM_ADMIN'],
  '/qa': ['QA', 'BISMAN_ENGINEERING', 'SYSTEM_ADMIN'],
  '/system': ['SYSTEM_ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN']
};

function routeGuard(req, res, next) {
  const userRole = req.user?.role || req.user?.roleName;
  const requestedPath = req.path;
  
  // Check route restrictions
  for (const [prefix, allowedRoles] of Object.entries(ROUTE_RESTRICTIONS)) {
    if (requestedPath.startsWith(prefix)) {
      if (!allowedRoles.includes(userRole)) {
        console.warn(`[RouteGuard] BLOCKED: ${userRole} tried to access ${requestedPath}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `Role ${userRole} is not authorized for ${prefix} routes`
        });
      }
    }
  }
  
  next();
}

module.exports = { routeGuard, ROUTE_RESTRICTIONS };
```

---

## DELIVERABLE F: Frontend Changes

### F.1 Updated Sidebar Hook

```typescript
// my-frontend/src/hooks/useSidebar.ts

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

interface SidebarPage {
  id: number;
  code: string;
  name: string;
  route: string;
  icon: string;
  canEdit: boolean;
}

interface SidebarModule {
  code: string;
  pages: SidebarPage[];
}

interface SidebarData {
  role: string;
  totalPages: number;
  modules: SidebarModule[];
}

export function useSidebar() {
  const { user, token } = useAuth();
  const [data, setData] = useState<SidebarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchSidebar() {
      try {
        setLoading(true);
        const response = await fetch('/api/menu/sidebar', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load sidebar');
        
        const json = await response.json();
        if (json.success) {
          setData(json);
        } else {
          throw new Error(json.error || 'Unknown error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sidebar');
      } finally {
        setLoading(false);
      }
    }

    fetchSidebar();
  }, [token, user?.role]);

  return { data, loading, error };
}
```

### F.2 Updated BaseSidebar Component

```tsx
// my-frontend/src/components/layout/BaseSidebar.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/hooks/useSidebar';
import { getIcon } from '@/utils/iconMap';
import { Loader2 } from 'lucide-react';

export default function BaseSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { data, loading, error } = useSidebar();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-4 text-red-500">Failed to load menu</div>;
  }

  // Flatten all pages from modules
  const allPages = data.modules.flatMap(m => m.pages);

  return (
    <nav className="flex-1 overflow-y-auto p-2 space-y-1">
      {allPages.map((page) => {
        const Icon = getIcon(page.icon);
        const isActive = pathname === page.route || pathname?.startsWith(page.route + '/');
        
        return (
          <Link
            key={page.id}
            href={page.route}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
              ${isActive 
                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-white' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}
              ${collapsed ? 'justify-center' : ''}
            `}
            title={page.name}
          >
            <Icon size={20} />
            {!collapsed && <span className="text-sm font-medium">{page.name}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
```

### F.3 Dashboard Detection

```typescript
// my-frontend/src/utils/dashboard.ts

const ROLE_DASHBOARDS: Record<string, string> = {
  'ENTERPRISE_ADMIN': '/enterprise-admin/dashboard',
  'SUPER_ADMIN': '/super-admin',
  'SYSTEM_ADMIN': '/super-admin',
  'ADMIN': '/admin/client-dashboard',
  'ADMIN_OPS': '/admin/client-dashboard',
  // All other roles use /dashboard (BASE_USER default)
};

export function getDashboardForRole(role: string): string {
  return ROLE_DASHBOARDS[role] || '/dashboard';
}

export function isDashboardRoute(route: string): boolean {
  const dashboardRoutes = [
    '/dashboard',
    '/enterprise-admin/dashboard',
    '/super-admin',
    '/admin/client-dashboard'
  ];
  return dashboardRoutes.includes(route);
}
```

---

## DELIVERABLE G: Validation Checks

### G.1 Test Queries

```sql
-- 1. Verify PUBLIC pages have 0 roles
SELECT 'PUBLIC pages with roles (should be 0)' as test,
       COUNT(*) as violations
FROM pages_master pm
JOIN role_page_access rpa ON rpa.page_id = pm.id
WHERE pm.category = 'PUBLIC';

-- 2. Verify each role has exactly 1 dashboard
WITH role_dashboards AS (
  SELECT rpa.role_name, 
         COUNT(*) FILTER (WHERE pm.route IN ('/dashboard', '/enterprise-admin/dashboard', '/super-admin', '/admin/client-dashboard')) as dash_count
  FROM role_page_access rpa
  JOIN pages_master pm ON rpa.page_id = pm.id
  GROUP BY rpa.role_name
)
SELECT 'Roles without exactly 1 dashboard' as test,
       array_agg(role_name) as violations
FROM role_dashboards
WHERE dash_count != 1;

-- 3. Verify no cross-module leakage
SELECT 'Enterprise Admin leakage' as test,
       COUNT(*) as violations
FROM role_page_access rpa
JOIN pages_master pm ON rpa.page_id = pm.id
WHERE pm.route LIKE '/enterprise-admin%'
  AND rpa.role_name NOT IN ('ENTERPRISE_ADMIN', 'SYSTEM_ADMIN');

SELECT 'Super Admin leakage' as test,
       COUNT(*) as violations
FROM role_page_access rpa
JOIN pages_master pm ON rpa.page_id = pm.id
WHERE pm.route LIKE '/super-admin%'
  AND rpa.role_name NOT IN ('SUPER_ADMIN', 'SYSTEM_ADMIN');

SELECT 'Admin Console leakage' as test,
       COUNT(*) as violations
FROM role_page_access rpa
JOIN pages_master pm ON rpa.page_id = pm.id
WHERE pm.route LIKE '/admin%'
  AND rpa.role_name NOT IN ('ADMIN', 'ADMIN_OPS', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN');

-- 4. Verify realistic page counts
SELECT role_name, COUNT(*) as page_count,
       CASE 
         WHEN role_name IN ('SYSTEM_ADMIN') AND COUNT(*) > 100 THEN 'WARNING: Too many pages'
         WHEN role_name IN ('ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN') AND COUNT(*) > 50 THEN 'WARNING: Too many pages'
         WHEN role_name NOT IN ('SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'CFO') AND COUNT(*) > 40 THEN 'WARNING: Too many pages'
         ELSE 'OK'
       END as status
FROM role_page_access
GROUP BY role_name
ORDER BY page_count DESC;

-- 5. Verify BASE_USER pages exist
SELECT 'BASE_USER pages count' as test,
       COUNT(*) as count,
       CASE WHEN COUNT(*) >= 15 THEN 'OK' ELSE 'WARNING: Too few BASE_USER pages' END as status
FROM base_user_pages;

-- 6. Verify dashboard sidebar_order = 1
SELECT 'Dashboards with sidebar_order != 1' as test,
       array_agg(route) as violations
FROM pages_master
WHERE route IN ('/dashboard', '/enterprise-admin/dashboard', '/super-admin', '/admin/client-dashboard')
  AND sidebar_order != 1;

-- 7. Verify redundant logins are deactivated
SELECT 'Active redundant logins (should be 0)' as test,
       COUNT(*) as violations
FROM pages_master
WHERE route IN ('/auth/admin-login', '/auth/hub-incharge-login', '/auth/standard-login', '/qa/login')
  AND is_active = true;
```

### G.2 Automated Validation Script

```javascript
// scripts/validate-rbac.js

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function validateRBAC() {
  console.log('=== RBAC VALIDATION REPORT ===\n');
  let passed = 0;
  let failed = 0;

  // Test 1: PUBLIC pages should have 0 roles
  const publicRoles = await pool.query(`
    SELECT COUNT(*) as count FROM pages_master pm
    JOIN role_page_access rpa ON rpa.page_id = pm.id
    WHERE pm.category = 'PUBLIC'
  `);
  if (parseInt(publicRoles.rows[0].count) === 0) {
    console.log('✅ PUBLIC pages have 0 roles');
    passed++;
  } else {
    console.log(`❌ PUBLIC pages have ${publicRoles.rows[0].count} role assignments`);
    failed++;
  }

  // Test 2: No Enterprise Admin leakage
  const eaLeakage = await pool.query(`
    SELECT COUNT(*) as count FROM role_page_access rpa
    JOIN pages_master pm ON rpa.page_id = pm.id
    WHERE pm.route LIKE '/enterprise-admin%'
      AND rpa.role_name NOT IN ('ENTERPRISE_ADMIN', 'SYSTEM_ADMIN')
  `);
  if (parseInt(eaLeakage.rows[0].count) === 0) {
    console.log('✅ No Enterprise Admin leakage');
    passed++;
  } else {
    console.log(`❌ Enterprise Admin leakage: ${eaLeakage.rows[0].count} violations`);
    failed++;
  }

  // Test 3: No Super Admin leakage
  const saLeakage = await pool.query(`
    SELECT COUNT(*) as count FROM role_page_access rpa
    JOIN pages_master pm ON rpa.page_id = pm.id
    WHERE pm.route LIKE '/super-admin%'
      AND rpa.role_name NOT IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')
  `);
  if (parseInt(saLeakage.rows[0].count) === 0) {
    console.log('✅ No Super Admin leakage');
    passed++;
  } else {
    console.log(`❌ Super Admin leakage: ${saLeakage.rows[0].count} violations`);
    failed++;
  }

  // Test 4: Realistic page counts
  const pageCounts = await pool.query(`
    SELECT role_name, COUNT(*) as count 
    FROM role_page_access 
    GROUP BY role_name 
    HAVING COUNT(*) > 100
  `);
  if (pageCounts.rows.length === 0) {
    console.log('✅ All role page counts are realistic (<100)');
    passed++;
  } else {
    console.log(`❌ Roles with >100 pages: ${pageCounts.rows.map(r => r.role_name).join(', ')}`);
    failed++;
  }

  // Test 5: Redundant logins deactivated
  const logins = await pool.query(`
    SELECT COUNT(*) as count FROM pages_master
    WHERE route IN ('/auth/admin-login', '/auth/hub-incharge-login', '/auth/standard-login', '/qa/login')
      AND is_active = true
  `);
  if (parseInt(logins.rows[0].count) === 0) {
    console.log('✅ Redundant login pages deactivated');
    passed++;
  } else {
    console.log(`❌ ${logins.rows[0].count} redundant login pages still active`);
    failed++;
  }

  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  
  pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

validateRBAC();
```

---

## APPENDIX: Complete Role-Page Mapping Table

### Platform Roles

| Role | Dashboard | Total Pages | Module Access |
|------|-----------|-------------|---------------|
| SYSTEM_ADMIN | /super-admin | ~80 | All |
| ENTERPRISE_ADMIN | /enterprise-admin/dashboard | 27 | enterprise-admin/* |
| SUPER_ADMIN | /super-admin | 25 | super-admin/*, system/* |

### Tenant Admin Roles

| Role | Dashboard | Total Pages | Module Access |
|------|-----------|-------------|---------------|
| ADMIN | /admin/client-dashboard | 35 | admin/* |
| ADMIN_OPS | /admin/client-dashboard | 20 | admin/* (subset) |
| IT_ADMIN | /admin/client-dashboard | 15 | admin/*, system/* (subset) |

### Business Roles (BASE_USER + Role-Specific)

| Role | Dashboard | BASE_USER | Direct | Total |
|------|-----------|-----------|--------|-------|
| CEO | /dashboard | 18 | 5 | 23 |
| CFO | /dashboard | 18 | 42 | 60 |
| COO | /dashboard | 18 | 15 | 33 |
| CTO | /dashboard | 18 | 10 | 28 |
| HR_MANAGER | /dashboard | 18 | 6 | 24 |
| OPERATIONS_MANAGER | /dashboard | 18 | 20 | 38 |
| FINANCE_CONTROLLER | /dashboard | 18 | 25 | 43 |
| MANAGER | /dashboard | 18 | 8 | 26 |
| SUPERVISOR | /dashboard | 18 | 5 | 23 |
| HUB_INCHARGE | /dashboard | 18 | 5 | 23 |
| HUB_INCHARGE_SR | /dashboard | 18 | 3 | 21 |
| STORE_INCHARGE | /dashboard | 18 | 4 | 22 |
| STORE_INCHARGE_SR | /dashboard | 18 | 3 | 21 |
| BRANCH_INCHARGE | /dashboard | 18 | 3 | 21 |
| ACCOUNTANT | /dashboard | 18 | 7 | 25 |
| AUDITOR | /dashboard | 18 | 10 | 28 |
| PROCUREMENT_OFFICER | /dashboard | 18 | 9 | 27 |
| COMPLIANCE | /dashboard | 18 | 14 | 32 |
| LEGAL | /dashboard | 18 | 10 | 28 |
| BANKER | /dashboard | 18 | 3 | 21 |
| TREASURY | /dashboard | 18 | 5 | 23 |
| ACCOUNTS | /dashboard | 18 | 5 | 23 |
| ACCOUNTS_PAYABLE | /dashboard | 18 | 3 | 21 |
| STAFF | /dashboard | 18 | 1 | 19 |
| DATA_ENTRY | /dashboard | 18 | 3 | 21 |
| HR | /dashboard | 18 | 5 | 23 |
| INTERN | /dashboard | 18 | 0 | 18 |

### Internal Bisman Roles (NO BASE_USER)

| Role | Dashboard | Total Pages | Module Access |
|------|-----------|-------------|---------------|
| BISMAN_ENGINEERING | /internal/teams | 12 | internal/*, qa/*, system/logs |
| BISMAN_SUPPORT | /internal/customers | 5 | internal/* |
| BISMAN_CUSTOMER_CARE | /internal/customers | 5 | internal/* |
| BISMAN_BILLING | /internal/customers | 8 | internal/*, billing/* |
| BISMAN_FINANCE | /internal/teams | 6 | internal/*, billing/* |
| QA | /qa | 8 | qa/* |

---

## Implementation Order

1. **Phase 1: Schema Updates** (Day 1)
   - Add new columns to pages_master
   - Create base_user_pages table
   - Create BASE_USER role

2. **Phase 2: Data Cleanup** (Day 1-2)
   - Fix cross-module leakage (DELETE wrong assignments)
   - Deactivate redundant login pages
   - Update page categories

3. **Phase 3: BASE_USER Setup** (Day 2)
   - Populate base_user_pages
   - Update sidebar_order values

4. **Phase 4: Role Reassignment** (Day 2-3)
   - Reassign platform roles (EA, SA, ADMIN)
   - Keep business role direct pages, let BASE_USER handle common

5. **Phase 5: Backend Updates** (Day 3)
   - Implement rbacResolver.js
   - Update sidebar API
   - Add route guards

6. **Phase 6: Frontend Updates** (Day 3-4)
   - Update useSidebar hook
   - Update BaseSidebar component
   - Test all role layouts

7. **Phase 7: Validation** (Day 4)
   - Run validation script
   - Fix any remaining issues
   - Document final state

---

*End of RBAC Restructuring Plan*
