# Page Sync Engine Documentation

## Overview

The Page Sync Engine ensures permanent consistency between:
1. **Filesystem (page.tsx)** - Source of truth for page EXISTENCE
2. **Database (pages_master)** - Source of truth for RBAC + sidebar visibility
3. **Registry (PAGE_REGISTRY)** - UI metadata only (icons/labels)

## Single Source of Truth Rules

| Component | Truth For | Purpose |
|-----------|-----------|---------|
| `src/app/**/page.tsx` | Page existence | A page is REAL only if this file exists |
| `pages_master` table | Access control | RBAC, sidebar visibility, permissions |
| `PAGE_REGISTRY` | UI metadata | Icons, labels, navigation hints |

## Reconciliation Rules

### Rule A: FILE_ONLY (page.tsx exists, no DB entry)
- **Action**: Auto-insert into `pages_master`
- **Defaults**: `show_in_sidebar=false`, `is_active=true`
- **Rationale**: New pages should be active but not visible in sidebar until explicitly enabled

### Rule B: DB_ONLY (DB entry exists, no page.tsx)
- **Action**: Set `is_active=false`, `show_in_sidebar=false`
- **Rationale**: Never delete DB records, just deactivate orphans
- **Safety**: Inactive pages won't appear in sidebar or cause RBAC issues

### Rule C: REGISTRY_ONLY (in registry, no page.tsx)
- **Action**: Flag as `registry_broken=true`
- **Rationale**: Manual cleanup required - remove from `page-registry.ts`

## CLI Commands

```bash
# Run audit (default - human readable output)
npm run audit:pages

# Output as JSON (for scripting)
npm run audit:pages:json

# Generate SQL statements
npm run audit:pages:sql

# Apply fixes (dry run first)
node scripts/audit-pages.js --fix

# Apply fixes for real
npm run audit:pages:fix
# or
node scripts/audit-pages.js --fix --commit

# CI/CD health check (exits with code 1 if issues)
npm run ci:page-check
```

## API Endpoints

All endpoints require authentication (SUPER_ADMIN or ENTERPRISE_ADMIN role).

### GET /api/page-sync/audit
Full audit report with counts and detailed lists.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/page-sync/audit
```

Response:
```json
{
  "ok": true,
  "counts": {
    "fs_real_pages": 301,
    "db_pages": 309,
    "ok_matched": 301,
    "file_only": 0,
    "db_only": 8,
    "broken_routes": 8
  },
  "health_score": 100,
  "is_healthy": true,
  "lists": { ... },
  "recommendations": [ ... ]
}
```

### GET /api/page-sync/health
CI/CD health check - returns pass/fail status.

```bash
curl http://localhost:5000/api/page-sync/health
```

Returns HTTP 200 (pass) or HTTP 400 (fail).

### POST /api/page-sync/reconcile
Apply fixes (Super Admin only).

```bash
# Dry run
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  http://localhost:5000/api/page-sync/reconcile

# Apply changes
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}' \
  http://localhost:5000/api/page-sync/reconcile
```

### GET /api/page-sync/sql
Generate SQL statements for manual execution.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/page-sync/sql
```

### GET /api/page-sync/stats
Quick statistics without full audit.

### GET /api/page-sync/broken
List only broken routes.

### GET /api/page-sync/fs-pages
List all filesystem pages.

### GET /api/page-sync/db-pages
List all database pages.

## CI/CD Integration

### Pre-deploy Check

Add to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Page Sync Check
  run: npm run ci:page-check
```

Or in package.json:
```json
{
  "scripts": {
    "predeploy": "npm run ci:page-check"
  }
}
```

### What Triggers Failure

The CI check fails if:
1. **Active orphans exist** - DB entries with `is_active=true` but no `page.tsx` file
2. This ensures broken routes never reach production

### What Passes

- All filesystem pages have corresponding DB entries
- All active DB entries have corresponding page files
- Inactive DB entries are ignored (they don't affect users)
- Registry-only entries are warnings, not failures

## Preventing Future Drift

### When Adding New Pages

1. Create `page.tsx` file in `src/app/`
2. Run `npm run audit:pages` to verify detection
3. Either:
   - Run `npm run audit:pages:fix` to auto-add to DB
   - Or manually add via admin UI

### When Removing Pages

1. Delete `page.tsx` file
2. Run `npm run ci:page-check` - it will fail if the DB entry is still active
3. Run `npm run audit:pages:fix` to deactivate DB entry
4. Optionally clean up inactive entries later

### Automated Prevention

The CI check ensures:
- No deployment if active orphans exist
- Clear error messages for developers
- Self-documenting fix commands

## Database Schema

```sql
-- pages_master table (relevant columns)
CREATE TABLE pages_master (
  id SERIAL PRIMARY KEY,
  page_code VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  route VARCHAR(300) NOT NULL,
  is_active BOOLEAN DEFAULT true,        -- Page is functional
  show_in_sidebar BOOLEAN DEFAULT true,  -- Appears in menu
  is_public BOOLEAN DEFAULT false,       -- No auth required
  layout_group VARCHAR(50) DEFAULT 'common',
  module_id INTEGER REFERENCES modules_master(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pages_master_active ON pages_master(is_active);
CREATE INDEX idx_pages_master_route ON pages_master(route);
CREATE INDEX idx_pages_master_sidebar ON pages_master(show_in_sidebar);
```

## Rollback Procedure

If something goes wrong after applying fixes:

1. Check the generated SQL for rollback statements
2. Or manually reactivate pages:

```sql
-- Reactivate specific page
UPDATE pages_master 
SET is_active = true, show_in_sidebar = true, updated_at = NOW()
WHERE route = '/path/to/page';

-- Reactivate all recently deactivated
UPDATE pages_master 
SET is_active = true
WHERE updated_at > NOW() - INTERVAL '1 hour' AND is_active = false;
```

## Troubleshooting

### "CI CHECK FAILED"

Run the audit to see details:
```bash
npm run audit:pages
```

Then fix:
```bash
npm run audit:pages:fix
```

### "Page not appearing in sidebar"

Check:
1. Does `page.tsx` exist? → Run audit
2. Is `is_active=true` in DB? → Check admin panel
3. Is `show_in_sidebar=true`? → Update via admin panel
4. Does user have role access? → Check `role_page_access`

### "Route works but shows 404 for some users"

Check RBAC:
1. Is page in `role_page_access` for user's role?
2. Is `is_active=true`?
3. Is user's role allowed in `required_roles`?

## Files

| File | Purpose |
|------|---------|
| `my-backend/routes/pageSyncAudit.js` | API endpoints |
| `my-backend/scripts/audit-pages.js` | CLI tool |
| `my-backend/scripts/ci-page-check.js` | CI/CD check |
| `database/migrations/fix-page-sync-gaps.sql` | Migration SQL |
| `docs/PAGE_SYNC_ENGINE.md` | This documentation |
