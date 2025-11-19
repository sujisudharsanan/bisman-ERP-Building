## SUPER_ADMIN → ADMIN Permission Mapping (2025-11-16)

### Goal
Remove legacy `SUPER_ADMIN` role entries in `permissions` table; ensure all modules with `SUPER_ADMIN` full CRUD are mirrored under `ADMIN` (already full access) and optionally introduce `SYSTEM_ADMIN` with same full access.

### Strategy
1. Query all `permissions` rows where role = 'SUPER_ADMIN'.
2. For each module_id ensure an `ADMIN` row exists with `can_view/create/edit/delete = true`.
3. (Optional) Ensure a `SYSTEM_ADMIN` row exists with identical flags (future proof).
4. Delete all `SUPER_ADMIN` rows to avoid confusion.
5. Update any hardcoded references.

### SQL (Conceptual)
```sql
-- Copy to ADMIN if missing
INSERT INTO permissions (role, module_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 'ADMIN', module_id, true, true, true, true, now(), now()
FROM permissions p
WHERE role = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM permissions x WHERE x.role='ADMIN' AND x.module_id=p.module_id
  );
-- Optional SYSTEM_ADMIN
INSERT INTO permissions (role, module_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 'SYSTEM_ADMIN', module_id, true, true, true, true, now(), now()
FROM permissions p
WHERE role = 'SUPER_ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM permissions x WHERE x.role='SYSTEM_ADMIN' AND x.module_id=p.module_id
  );
-- Remove legacy
DELETE FROM permissions WHERE role='SUPER_ADMIN';
```

### Node Migration Script Outline
Implemented at `my-backend/scripts/migrate_permissions_super_admin_to_admin.js`.

### Verification Checklist
- [ ] Count of SUPER_ADMIN rows before > 0
- [ ] After migration count of SUPER_ADMIN rows = 0
- [ ] ADMIN has permissions for all modules (compare module count)
- [ ] SYSTEM_ADMIN entries exist (if desired)
- [ ] Application role checks no longer reference 'SUPER_ADMIN'

### Rollback Plan
If rollback required, re-create SUPER_ADMIN entries by cloning from ADMIN rows (reverse of above) before removing ADMIN if necessary.
