# BISMAN ERP – Standardization & No-Drift Guidelines

Goal: centralized, DB-driven control with international-standard practices. No destructive changes; every artifact is registered.

## 1) Source of truth
- Modules, menus, and RBAC are DB-driven.
- `my-backend/registry/modules.json` defines required modules (slugs, names, routes, icons, productType, sort_order).
- Run `npm run registry:modules` to upsert missing or update presentation fields (non-destructive).

## 2) Route/page registration
- Backend routes live in `my-backend/routes/*`. Use consistent module slugs in filenames when possible.
- Generate a manifest with `npm run registry:routes:index` — writes `my-backend/registry/routes-manifest.json` with per-file and per-module endpoint counts.
- Map routes to module slugs in code or via `routes`/`rbac_routes` table with a foreign key to `modules`.

## 3) Drift prevention
- Run `npm run registry:drift-check` in CI to fail if DB differs from registry.
- Do not delete modules via code or migrations; mark inactive if needed.
- Backups: keep daily dumps; restore into temp DB and copy selectively.

## 4) Naming conventions
- Module slug: kebab-case (e.g., `enterprise-admin`, `super-admin`, `common`).
- Display name: Title Case.
- Routes: prefer `/api/<module-slug>/...` paths or protect segment when nested.

## 5) Safety
- Upserts only; never drop tables/rows in automation.
- Use transactions for multi-table writes.
- Add Redis or in-memory caching for registry and permissions with TTL.

## 6) When adding a new feature
- Add/update the module entry in `registry/modules.json`.
- Implement route file(s) under `my-backend/routes/` using the module slug.
- Run: `registry:modules`, `registry:routes:index`, and `registry:drift-check`.
- Commit the generated manifest for visibility.

## 7) Known historical issues (and fixes)
- Data drift between backups and code: use temp-DB restores, never direct overwrite; lock with drift-check.
- Naming mismatch (super-admin vs superAdmin): standardize slugs and enforce in lint/PR reviews.
- Missing module rows for existing routes (e.g., Enterprise Admin): fix via registry upsert.
- Prisma db push overwriting expectations: prefer migrations; when blocked, `db push` to dev only.

## 8) Optional CI wiring
- Add a GitHub Action: install deps, prisma generate, run `npm run registry:drift-check`.
- Block merge on failure; include manifest diff in PR.
