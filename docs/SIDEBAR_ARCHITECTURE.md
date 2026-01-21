# Sidebar Navigation: DB-First Architecture with RBAC

## Overview

The sidebar navigation has been refactored to use the **database as the single source of truth** for menu items and access control. This eliminates drift between the frontend `PAGE_REGISTRY` and the backend.

**Key Principle:** All RBAC is enforced by the backend. Frontend does NOT filter permissions.

## Architecture

```
┌──────────────────────┐
│   Frontend Client    │
│   (useSidebarMenu)   │
└──────────┬───────────┘
           │ GET /api/menu/sidebar
           ▼
┌──────────────────────┐
│   Backend API        │
│   (dbMenuRoutes.js)  │
└──────────┬───────────┘
           │ Query (with RBAC)
           ▼
┌──────────────────────┐
│   PostgreSQL         │
│   - pages_master     │
│   - modules_master   │
│   - role_page_access │
└──────────────────────┘
```

## Key Files

### Frontend

| File | Purpose |
|------|---------|
| `src/hooks/useSidebarMenu.ts` | **NEW** - Fetches menu from DB via API |
| `src/common/config/page-ui-meta.ts` | **NEW** - UI-only metadata (icons, descriptions) |
| `src/common/components/DBDrivenSidebar.tsx` | **NEW** - Sidebar using DB menu |
| `src/common/components/DynamicSidebar.tsx` | **LEGACY** - Falls back to PAGE_REGISTRY |
| `src/common/config/page-registry.ts` | **LEGACY** - Kept for fallback only |

### Backend

| File | Purpose |
|------|---------|
| `routes/dbMenuRoutes.js` | Menu API endpoints |
| `config/master-modules.js` | Module/page mappings (seed data) |

## API Endpoints

### GET /api/menu/sidebar

Returns the sidebar menu for the authenticated user based on their role and permissions.

**Response:**
```json
{
  "ok": true,
  "modules": [
    {
      "id": "dashboard",
      "name": "Dashboard",
      "items": [
        {
          "id": "admin-dashboard",
          "name": "Dashboard",
          "path": "/admin",
          "iconKey": "LayoutDashboard",
          "order": 1
        }
      ]
    }
  ],
  "flatItems": [...],
  "totalItems": 42,
  "menuType": "admin"
}
```

## Migration Guide

### Phase 1: Parallel Operation (Current)

Both systems run in parallel:
1. `useSidebarMenu` tries DB API first
2. Falls back to `PAGE_REGISTRY` if API fails
3. Warning logged in dev mode when using fallback

### Phase 2: Deprecation (Planned)

1. Monitor logs for fallback usage
2. Ensure all pages exist in `pages_master` table
3. Remove fallback logic from `useSidebarMenu`
4. Mark deprecated functions in `page-registry.ts` as errors

### Phase 3: Cleanup (Future)

1. Remove `getNavigationStructure()` function
2. Remove `getAccessiblePages()` function
3. Remove `getPagesByRole()` function
4. Simplify `PAGE_REGISTRY` to just page metadata

## Deprecated Functions

The following functions in `page-registry.ts` are deprecated:

```typescript
// ❌ DEPRECATED - Use useSidebarMenu hook instead
getAccessiblePages(userPermissions)
getPagesByRole(roleName)
getNavigationStructure(userPermissions)
```

## UI Metadata

For icons and descriptions, use `page-ui-meta.ts`:

```typescript
import { getPageUIMeta, getPageIcon } from '@/common/config/page-ui-meta';

// Get full metadata
const meta = getPageUIMeta('admin-dashboard');
// { iconKey: 'LayoutDashboard', description: '...', displayName: 'Dashboard' }

// Get just the icon
const icon = getPageIcon('admin-dashboard');
// 'LayoutDashboard'
```

## Module IDs vs Page IDs

The following are **module identifiers**, not page IDs. They should be excluded from page sync reports:

- `admin`
- `billing`
- `common`
- `enterprise-management`
- `finance`
- `hr`
- `inventory`
- `legal`
- `operations`
- `procurement`
- `reports`
- `sales`
- `super-admin`
- `system`
- `treasury`

## RBAC Enforcement

### Backend RBAC (Source of Truth)

The `/api/menu/sidebar` endpoint enforces RBAC:

1. **Super Admin**: Sees `/super-admin/*`, `/system/*`, and COMMON module pages
2. **Enterprise Admin**: Sees `/enterprise-admin/*`, `/enterprise/*`, and COMMON module pages
3. **Regular Users**: Only sees pages where `role_page_access.can_view = true` for their role

### SQL Query for Regular Users

```sql
SELECT DISTINCT
  pm.page_code, pm.display_name, pm.route, pm.icon,
  mm.module_code, mm.display_name as module_name,
  rpa.can_view, rpa.can_edit, rpa.can_delete
FROM pages_master pm
LEFT JOIN modules_master mm ON pm.module_id = mm.id
INNER JOIN role_page_access rpa ON rpa.page_id = pm.id
WHERE pm.is_active = true
  AND pm.show_in_sidebar = true
  AND rpa.role_name = 'USER_ROLE_HERE'
  AND rpa.can_view = true
ORDER BY mm.sort_order, pm.sort_order;
```

### Frontend: No Permission Filtering

The frontend does NOT filter permissions. It renders exactly what the backend returns.

```typescript
// ❌ WRONG - Don't do this in frontend
const filtered = pages.filter(p => 
  p.permissions.includes('authenticated') || userPerms.includes(p.perm)
);

// ✅ CORRECT - Use backend result directly
const { menu } = useSidebarMenu();
// menu.flatItems already filtered by backend RBAC
```

## Verification Commands

### 1. Test Sidebar for Different Roles

```bash
# Run the verification script
cd my-backend && node scripts/verify-sidebar-rbac.js

# Or manually with curl:

# Login as Super Admin
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super_admin@bisman.demo","password":"Demo@123"}'

# Get sidebar menu
curl -b cookies.txt http://localhost:5000/api/menu/sidebar | jq '.totalItems, .menuType'

# Check specific page access
curl -b cookies.txt http://localhost:5000/api/menu/check-access/DASHBOARD | jq
```

### 2. Test RBAC for Operations User

```bash
curl -c ops.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}'

curl -b ops.txt http://localhost:5000/api/menu/sidebar | jq '.totalItems'
```

### 3. Test Direct URL Access Blocked

```bash
# Try to access Super Admin page as regular user
curl -b ops.txt http://localhost:5000/api/menu/check-access/SUPER_ADMIN_DASHBOARD | jq

# Should return: { "hasAccess": false, "reason": "No RBAC permission..." }
```

## Rollback Plan

### Feature Flag

Set environment variable to disable DB menu:

```bash
# In .env or docker-compose
USE_DB_MENU=false
```

When disabled, the `/api/menu/sidebar` endpoint returns:
```json
{
  "ok": false,
  "fallback": true,
  "message": "Use PAGE_REGISTRY fallback"
}
```

The frontend `useSidebarMenu` hook will then load from `PAGE_REGISTRY` as fallback.

### Emergency Rollback Steps

1. **Set feature flag:**
   ```bash
   export USE_DB_MENU=false
   pm2 restart backend
   ```

2. **Or in Railway/production:**
   - Add `USE_DB_MENU=false` to environment variables
   - Redeploy

3. **Frontend automatically falls back** to PAGE_REGISTRY when API returns `fallback: true`

### Rollback Verification

```bash
# After setting USE_DB_MENU=false
curl -b cookies.txt http://localhost:5000/api/menu/sidebar | jq '.fallback'
# Should return: true
```

## Troubleshooting

### "Using fallback menu" warning

This means the DB API failed. Check:
1. Backend is running
2. `/api/menu/sidebar` endpoint is responding
3. User is authenticated with valid session
4. `USE_DB_MENU` is not set to `false`

### Page not showing in sidebar

1. Check if page exists in `pages_master` table:
   ```sql
   SELECT * FROM pages_master WHERE page_code = 'PAGE_CODE';
   ```
2. Check if user's role has access:
   ```sql
   SELECT * FROM role_page_access 
   WHERE page_id = (SELECT id FROM pages_master WHERE page_code = 'PAGE_CODE')
     AND role_name = 'USER_ROLE';
   ```
3. Check if page's `show_in_sidebar = true` and `is_active = true`

### User sees too many pages

1. Check `role_page_access` entries for the role:
   ```sql
   SELECT COUNT(*) FROM role_page_access WHERE role_name = 'ROLE_NAME' AND can_view = true;
   ```
2. Review if role was granted too many permissions

### Duplicate page IDs

Run this to find duplicates:
```bash
grep -o "id: '[^']*'" page-registry.ts | sort | uniq -d
```

## Database Schema

### pages_master (Actual)

```sql
CREATE TABLE pages_master (
  id SERIAL PRIMARY KEY,
  page_code VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  route VARCHAR(500),
  description TEXT,
  module_id INTEGER REFERENCES modules_master(id),
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_in_sidebar BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  required_roles TEXT[],
  required_permissions TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### role_page_access (Actual)

```sql
CREATE TABLE role_page_access (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL,
  page_id INTEGER REFERENCES pages_master(id),
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by INTEGER,
  notes TEXT,
  UNIQUE(role_name, page_id)
);
```

### modules_master

```sql
CREATE TABLE modules_master (
  id SERIAL PRIMARY KEY,
  module_code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  base_route VARCHAR(200),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false,
  product_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```
