# BISMAN ERP - Permanent Page Governance Solution

**Implemented:** January 19, 2025  
**Status:** ✅ Complete  
**Author:** BISMAN ERP Team

---

## 📋 EXECUTIVE SUMMARY

This document describes the **permanent solution** implemented to ensure page governance consistency across:
- **Database** (`pages_master` table) - Single Source of Truth
- **Frontend** (Next.js App Router filesystem)
- **RBAC** (`role_page_access` table)
- **Subscription gating** (module-level access control)

### Before vs After

| Metric | Before | After |
|--------|--------|-------|
| Pages in Database | 174 | 317 |
| Pages in Filesystem | 309 | 309 |
| Sync Status | ❌ Manual, inconsistent | ✅ Automated, continuous |
| RBAC Enforcement | Partial | Complete |
| Subscription Gating | Layout-level only | DB-driven |
| Sidebar Generation | page-registry.ts (hardcoded) | Database (API-driven) |

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BISMAN ERP Page Governance                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Filesystem  │───►│ sync-pages-  │───►│ pages_master (DB)     │  │
│  │ page.tsx    │    │ master.js    │    │ - route               │  │
│  │ files       │    │              │    │ - route_pattern       │  │
│  └─────────────┘    └──────────────┘    │ - is_governed         │  │
│                                         │ - is_dynamic          │  │
│                                         │ - module_id           │  │
│                                         │ - sync_status         │  │
│                                         └───────────┬───────────┘  │
│                                                     │              │
│  ┌───────────────────────────────────────────────────┘              │
│  │                                                                  │
│  ▼                                                                  │
│  ┌───────────────────┐    ┌────────────────────────────────────┐   │
│  │ role_page_access  │    │ Middleware Stack                   │   │
│  │ - role_name       │───►│ 1. routeGovernance (exists check)  │   │
│  │ - page_id         │    │ 2. RBAC (role_page_access check)   │   │
│  │ - can_view        │    │ 3. Subscription (module check)     │   │
│  │ - can_edit        │    └──────────────┬─────────────────────┘   │
│  └───────────────────┘                   │                         │
│                                          │                         │
│  ┌───────────────────────────────────────┴──────────────────────┐  │
│  │                     Frontend                                  │  │
│  │  ┌─────────────────┐    ┌──────────────────┐                 │  │
│  │  │ DbDrivenSidebar │◄───│ /api/modules/menu│                 │  │
│  │  │ (React)         │    │ (menuRoutes.js)  │                 │  │
│  │  └─────────────────┘    └──────────────────┘                 │  │
│  │                                                               │  │
│  │  ┌───────────────────┐  ┌─────────────────────┐              │  │
│  │  │ useRouteGovernance│◄─│/api/governance/my-  │              │  │
│  │  │ (React Hook)      │  │routes               │              │  │
│  │  └───────────────────┘  └─────────────────────┘              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 FILES CREATED/MODIFIED

### New Files

| File | Purpose |
|------|---------|
| `database/migrations/20250119_permanent_page_governance.sql` | Schema migration adding governance columns |
| `scripts/sync-pages-master.js` | Filesystem → DB sync script |
| `scripts/seed-role-page-access.js` | RBAC auto-seeder script |
| `scripts/ci-page-sync.sh` | CI/CD guard script |
| `my-backend/middleware/routeGovernance.js` | "No DB = No Access" middleware |
| `my-backend/lib/rbac/checkPageAccess.js` | Shared RBAC access checker |
| `my-backend/routes/governanceRoutes.js` | Governance API endpoints |
| `my-frontend/src/hooks/useRouteGovernance.tsx` | Frontend route validation hook |
| `my-frontend/src/components/layout/DbDrivenSidebar.tsx` | DB-driven sidebar component |

### Modified Files

| File | Change |
|------|--------|
| `my-backend/app.js` | Added governance routes registration |

---

## 🔧 IMPLEMENTATION DETAILS

### Phase 1: Database Schema

New columns added to `pages_master`:

```sql
is_governed     BOOLEAN DEFAULT TRUE    -- Requires RBAC check
is_dynamic      BOOLEAN DEFAULT FALSE   -- Contains [id] params
route_pattern   TEXT                    -- Normalized route (/admin/users/:id)
filesystem_path TEXT                    -- Source file path
last_synced_at  TIMESTAMP              -- Last sync verification
sync_status     VARCHAR(20)             -- ACTIVE, ORPHANED, PENDING_REVIEW
```

New table created:

```sql
unregistered_route_access  -- Logs blocked access attempts
```

New view created:

```sql
v_sidebar_menu  -- Pre-filtered sidebar menu items
```

New function created:

```sql
check_route_access(route, role)  -- Validate route + RBAC
```

### Phase 2: Sync Script

`scripts/sync-pages-master.js`:

```bash
# Normal sync
node scripts/sync-pages-master.js

# Preview only
node scripts/sync-pages-master.js --dry-run

# CI mode (fail on unregistered)
node scripts/sync-pages-master.js --ci

# Generate report
node scripts/sync-pages-master.js --report
```

Features:
- Scans all `my-frontend/src/app/**/page.tsx` files
- Converts filesystem paths to routes
- Auto-detects module from route prefix
- Upserts into database
- Marks removed pages as ORPHANED
- Prints summary report

### Phase 3: Route Governance Middleware

`my-backend/middleware/routeGovernance.js`:

```javascript
// Apply to all protected routes
app.use('/api/*', routeGovernanceMiddleware({ strict: true }));
```

Logic:
1. Normalize incoming route
2. Check if route exists in `pages_master`
3. If not found → 404 + log to `unregistered_route_access`
4. If found + governed → Check RBAC
5. If RBAC fails → 403
6. If subscription fails → 402

### Phase 4: Governance API

New endpoints at `/api/governance`:

| Endpoint | Purpose |
|----------|---------|
| `GET /validate-route?route=/path` | Check single route access |
| `GET /my-routes` | Get all accessible routes for user |
| `GET /unregistered-attempts` | View blocked attempts (admin) |
| `GET /sync-status` | View sync statistics (admin) |
| `GET /rbac-missing` | View governed pages missing RBAC (admin) |

### Phase 5: RBAC Auto-Seeder

`scripts/seed-role-page-access.js`:

```bash
# Preview RBAC changes
node scripts/seed-role-page-access.js --dry-run

# Apply RBAC mappings
node scripts/seed-role-page-access.js --apply

# CI mode (fail if gaps)
node scripts/seed-role-page-access.js --ci
```

Strategy:
- SUPER_ADMIN, ENTERPRISE_ADMIN, SYSTEM_ADMIN → access ALL governed pages
- Module-specific roles → access their module's pages only
- Default deny: no mapping = no access

### Phase 6: Frontend Integration

**DbDrivenSidebar Component:**
- Fetches menu from `/api/modules/menu`
- No dependency on `page-registry.ts`
- Respects subscription gating
- Shows lock icons on inaccessible modules

**useRouteGovernance Hook:**
- Pre-fetches allowed routes
- Provides `checkRoute()` for access validation
- Caches in sessionStorage

### Phase 7: CI/CD Guard

`scripts/ci-page-sync.sh`:

```bash
# In CI pipeline (GitHub Actions / Railway)
./scripts/ci-page-sync.sh
```

Behavior:
1. Runs page sync script in CI mode
2. If new pages found without DB entry → FAIL
3. Runs RBAC seeder in CI mode
4. If governed pages without RBAC → FAIL
5. Can be bypassed with `SKIP_PAGE_SYNC=1` (emergency only)

---

## 📊 CURRENT DATABASE STATE

After running sync and RBAC seeder:

| Metric | Count |
|--------|-------|
| **Total Pages** | 317 |
| **Governed Pages** | 289 |
| **Non-Governed Pages** | 28 |
| **Dynamic Routes** | 14 |
| **Active (synced)** | 309 |
| **Orphaned (DB only)** | 8 |
| **RBAC Mappings** | 2,405 |
| **Unique Roles** | 39 |

### Pages by Module

| Module | Count |
|--------|-------|
| COMMON | ~80 |
| FINANCE | ~45 |
| ENTERPRISE_ADMIN | ~25 |
| SUPER_ADMIN | ~20 |
| ADMIN | ~25 |
| OPERATIONS | ~15 |
| COMPLIANCE | ~15 |
| PROCUREMENT | ~10 |
| Others | ~80 |

---

## ✅ PERMANENT RULES

1. **Database is SSOT**: Every deployed page route MUST exist in `pages_master`
2. **No DB = No Access**: Unregistered routes return 404 and log the attempt
3. **RBAC Required**: Governed pages require `role_page_access` entry
4. **Subscription Gating**: Module access checked against tenant subscription
5. **Sidebar from DB**: Navigation menu generated from DB, not hardcoded
6. **CI Guard**: Build fails if new pages aren't registered

---

## 🚀 USAGE GUIDE

### Adding a New Page

1. Create page file: `my-frontend/src/app/[module]/[page]/page.tsx`
2. Run sync: `node scripts/sync-pages-master.js`
3. Configure RBAC: Add entry to `role_page_access`
4. Deploy

### Removing a Page

1. Delete page file
2. Run sync: `node scripts/sync-pages-master.js`
3. Page marked as ORPHANED (not deleted from DB)
4. Optionally: Set `is_active = FALSE` in DB

### Checking Sync Status

```bash
# View sync summary
node scripts/sync-pages-master.js --dry-run

# API: GET /api/governance/sync-status
```

---

## 🔒 SECURITY CONSIDERATIONS

1. **Fail Secure**: Empty routes list = deny access
2. **Logging**: All unregistered access attempts logged
3. **Super Roles**: ENTERPRISE_ADMIN bypasses RBAC (still needs route to exist)
4. **Subscription**: Module-level, not page-level (simplifies management)

---

## 📈 FUTURE IMPROVEMENTS

1. **Webhook on Deploy**: Auto-sync pages on deployment
2. **Admin UI**: Manage pages_master from Enterprise Admin
3. **Page Templates**: Generate new pages from DB definitions
4. **Access Analytics**: Dashboard for route access patterns
5. **Bulk RBAC**: Assign roles to all pages in a module at once

---

## 📚 RELATED DOCUMENTS

- `docs/PAGE_MAPPING_SIDEBAR_AUDIT.md` - Original audit report
- `docs/PAGE_SYNC_REPORT.md` - Latest sync report
- `RBAC_Implementation_Guide.md` - RBAC setup guide

---

**Document Version:** 1.0  
**Last Updated:** January 19, 2025
