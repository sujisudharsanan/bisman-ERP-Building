# SOP: How to Add a New Page Safely

**System:** BISMAN ERP  
**Version:** 1.0  
**Date:** 2026-01-20  
**Status:** ✅ PRODUCTION READY

---

## Overview

This SOP ensures that every new page added to the BISMAN ERP system is:
1. Tracked in the database (`pages_master`)
2. Protected by RBAC (role-based access control)
3. Subject to subscription gating (if applicable)
4. Validated before deployment

**RULE: No DB Entry = No Access**

---

## Step-by-Step Process

### Step 1: Create the Page File

Create the new `page.tsx` in the filesystem following the correct module path:

```
my-frontend/src/app/
├── (dashboard)/
│   ├── finance/
│   │   └── new-report/
│   │       └── page.tsx    ← New page
│   ├── operations/
│   ├── compliance/
│   └── ...
```

**Guidelines:**
- Use the correct module folder (`/finance/*`, `/operations/*`, etc.)
- Follow Next.js App Router conventions
- Use route groups `(dashboard)` for layout organization

### Step 2: Run Page Sync (DB Must Know the Route)

```bash
node scripts/sync-pages-master.js
```

**Expected Output:**
- New route inserted into `pages_master`
- Marked `is_active = true`
- Marked `is_governed = true` (unless it's a public/auth page)
- `sync_status = 'ACTIVE'`

**Preview Only (Dry Run):**
```bash
node scripts/sync-pages-master.js --dry-run
```

### Step 3: Run RBAC Seeder (Ensure Access is Configured)

```bash
node scripts/seed-role-page-access.js --apply
```

**Expected Output:**
- `SUPER_ADMIN` gets full access
- `ENTERPRISE_ADMIN` gets full access
- `SYSTEM_ADMIN` gets full access
- Module-specific roles get access based on module
- Everyone else remains denied by default (DEFAULT DENY)

**Preview Only (Dry Run):**
```bash
node scripts/seed-role-page-access.js --dry-run
```

### Step 4: Verify Locally with CI Guard

```bash
./scripts/ci-page-sync.sh
```

**Expected Output:**
```
✅ Page sync check passed!
✅ All governance checks passed!
   - Pages synced: OK
   - RBAC mappings: OK
```

### Step 5: Merge / Deploy

**If CI Passes:**
- Create PR with the new page
- CI will automatically run governance checks
- Deploy after approval

**If CI Fails:**
- Developer MUST fix governance before deploying
- Check for:
  - Missing DB entry for the route
  - Missing RBAC mappings
  - Incorrect module assignment

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Sync pages (preview) | `node scripts/sync-pages-master.js --dry-run` |
| Sync pages (apply) | `node scripts/sync-pages-master.js` |
| Seed RBAC (preview) | `node scripts/seed-role-page-access.js --dry-run` |
| Seed RBAC (apply) | `node scripts/seed-role-page-access.js --apply` |
| CI governance check | `./scripts/ci-page-sync.sh` |
| RBAC coverage check | `node scripts/seed-role-page-access.js --ci` |

---

## Troubleshooting

### Issue: Page shows 404 after deployment

**Cause:** Page not synced to database  
**Fix:**
```bash
node scripts/sync-pages-master.js
```

### Issue: Page shows 403 for authorized role

**Cause:** Missing RBAC mapping  
**Fix:**
```bash
node scripts/seed-role-page-access.js --apply
```

Or manually add mapping:
```sql
INSERT INTO role_page_access (page_id, role_name, can_view, can_edit, can_delete, can_export)
SELECT p.id, 'ROLE_NAME', TRUE, FALSE, FALSE, FALSE
FROM pages_master p WHERE p.route = '/path/to/page';
```

### Issue: CI fails with "missing RBAC"

**Cause:** New governed page without RBAC configuration  
**Fix:** Run the seeder or manually configure access

---

## Emergency Bypass (NOT RECOMMENDED)

For critical hotfixes only:
```bash
SKIP_PAGE_SYNC=1 ./scripts/ci-page-sync.sh
```

⚠️ **WARNING:** This bypasses governance checks. Use only for emergencies and fix immediately after.

---

**Document Owner:** Engineering Team  
**Review Schedule:** Quarterly
