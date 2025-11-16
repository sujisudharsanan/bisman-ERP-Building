Planned migration (not yet applied) to add foreign keys from `routes` and `rbac_routes` tables referencing `modules.module_name`.

Rationale:
- Strengthen referential integrity
- Allow cascading updates if module slugs change (prefer no change; registry ensures stability)
- Non-destructive: will add columns only if missing or create partial index using existing `module` string value

Implementation Outline:
1. Ensure `module` values in routes / rbac_routes either null or match an existing modules.module_name.
2. Create an index on modules.module_name if not already present.
3. (Option A) Replace `module` VARCHAR with `module_name` referencing column.
4. (Option B - chosen) Keep existing `module` column; add `module_id` int nullable referencing modules(id) resolved by a backfill script.
5. Backfill: UPDATE routes SET module_id = m.id FROM modules m WHERE routes.module = m.module_name;
6. Add FK constraint routes(module_id) REFERENCES modules(id) ON DELETE SET NULL.
7. Repeat analogous steps for rbac_routes.

Backfill Script (example to run before applying FK):
```sql
ALTER TABLE routes ADD COLUMN IF NOT EXISTS module_id INT;
UPDATE routes SET module_id = m.id FROM modules m WHERE routes.module = m.module_name;
ALTER TABLE rbac_routes ADD COLUMN IF NOT EXISTS module_id INT;
UPDATE rbac_routes SET module_id = m.id FROM modules m WHERE rbac_routes.module = m.module_name;
```
After backfill, apply constraints in migration SQL.
