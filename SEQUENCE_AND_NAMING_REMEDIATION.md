# Sequence & Naming Remediation Summary (2025-11-16)

## Problem
`routes` and `rbac_routes` tables lacked DEFAULT sequence (`nextval`) for primary key `id`, causing Prisma `create()` calls to fail with `Null constraint violation on the fields: (id)`. Additionally, route file names used camelCase (`enterpriseAdmin*.js`, `superAdmin.js`) creating naming drift from kebab-case standards.

## Actions Taken
1. Added diagnostic script `scripts/check-sequences.js` to list sequence defaults.
2. Implemented repair script `scripts/repair-route-sequences.js`:
   - Creates sequences if missing.
   - Sets `ALTER TABLE ... ALTER COLUMN id SET DEFAULT nextval('...')`.
   - Aligns sequence to `MAX(id)+1`.
3. Updated `package.json` with scripts: `check:sequences`, `repair:sequences`.
4. Renamed route files to kebab-case (`enterprise-admin-*.js`, `super-admin.js`).
5. Re-ran registration scripts after repair:
   - Mounted base routes inserted: 36 (total routes now 46).
   - RBAC base routes inserted: 36.
6. Verified naming: `npm run check:routes:naming` passes with no warnings.

## Current Status
| Item | Status |
|------|--------|
| routes.id default | OK (nextval) |
| rbac_routes.id default | OK (nextval) |
| File naming consistency | PASS |
| Mounted routes registered | 46 total |
| RBAC routes registered | 36 base paths |

## Ongoing Safeguards
- Run `npm run check:sequences` in CI if future migrations alter sequences.
- Keep `scripts/check-route-names.js` in pre-commit or CI to prevent regressions.
- FK migration plan prepared in `prisma/migrations/20251116_add_fk_routes_modules/` (apply after approval).

## How to Re-Apply Repair (if needed)
```bash
cd my-backend
npm run repair:sequences
npm run check:sequences
```

## Next Optional Steps
1. Apply FK migration to link `routes.module_id` and `rbac_routes.module_id` to `modules(id)`.
2. Extend route registration to per-endpoint granularity (method + full path).
3. Add pre-commit hook for naming & drift checks.
4. Integrate nightly backup verification (already scheduled via GitHub Action).

---
Generated automatically to document remediation and provide operational continuity.