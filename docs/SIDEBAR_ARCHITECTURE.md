# Sidebar Navigation: DB-First Architecture

## Overview

The sidebar navigation has been refactored to use the **database as the single source of truth** for menu items and access control. This eliminates drift between the frontend `PAGE_REGISTRY` and the backend.

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

## Troubleshooting

### "Using fallback menu" warning

This means the DB API failed. Check:
1. Backend is running
2. `/api/menu/sidebar` endpoint is responding
3. User is authenticated with valid session

### Page not showing in sidebar

1. Check if page exists in `pages_master` table
2. Check if user's role has access via `role_page_access`
3. Check if page's module is enabled for user's tenant

### Duplicate page IDs

Run this to find duplicates:
```bash
grep -o "id: '[^']*'" page-registry.ts | sort | uniq -d
```

## Database Schema

### pages_master

```sql
CREATE TABLE pages_master (
  id SERIAL PRIMARY KEY,
  page_key VARCHAR(100) UNIQUE NOT NULL,
  page_name VARCHAR(100) NOT NULL,
  page_path VARCHAR(200) NOT NULL,
  module_id INTEGER REFERENCES modules_master(id),
  icon_key VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  show_in_sidebar BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active'
);
```

### role_page_access

```sql
CREATE TABLE role_page_access (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id),
  page_id INTEGER REFERENCES pages_master(id),
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  UNIQUE(role_id, page_id)
);
```
