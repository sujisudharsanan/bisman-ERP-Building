# RBAC Feature Checklist

This checklist should be reviewed for all PRs that modify role-based access control (RBAC) functionality.

## Server-Side Security

- [ ] **Role Level Validation** (`validateRoleLevel`)
  - Function exists in `my-backend/services/rbacService.js`
  - Prevents privilege escalation by checking `assigner.level >= target.level`
  - Throws `{ status: 403, code: 'ROLE_LEVEL_VIOLATION' }` on violation

- [ ] **Bulk Permission Assignment Protection**
  - `PUT /api/privileges/roles/:id/permissions` uses `requireRoleLevelAbove(80)` middleware
  - Validates all permission IDs exist before assignment
  - Uses database transaction for atomic updates

- [ ] **Permission Level Checks**
  - `min_role_level` column exists on `rbac_permissions` table
  - Migration `20251205_add_min_role_level_to_rbac_permissions.sql` applied
  - System-critical permissions have `min_role_level >= 80`

## Middleware

- [ ] **requireRoleLevelAbove Middleware**
  - Exported from `my-backend/middleware/rbacMiddleware.js`
  - Returns 403 with `{ code: 'ROLE_LEVEL_TOO_LOW' }` for insufficient level
  - Attaches `req.userRoleLevel` for downstream use

## Cache & Performance

- [ ] **Redis Cache Invalidation**
  - `_publishPermissionInvalidation(roleId)` called after permission changes
  - Publishes to `permissions:invalidate` channel
  - `invalidateRole()` from `permissionInvalidator.js` is used

## Audit & Logging

- [ ] **Security Event Logging**
  - `_logPermissionChangeAudit()` called after successful permission assignment
  - Uses `auditService.logSecurityEvent('ROLE_PERMISSIONS_UPDATED', {...})`
  - Logs `assignerId`, `roleId`, `permissionIds`, and timestamp

- [ ] **Database Audit Triggers**
  - Existing triggers on `rbac_permissions` still function
  - App-level logging complements DB triggers

## Testing

- [ ] **Unit Tests Pass**
  - `tests/rbac.privilege.test.js` passes
  - Low-privilege user blocked (403) on protected endpoints
  - Invalid permission IDs return 400
  - Super Admin can perform operations (200)

- [ ] **Integration Tests**
  - Cache invalidation triggers verified
  - Audit log entries created

## Frontend

- [ ] **PermissionTreePicker Component**
  - `my-frontend/src/components/privilege-management/PermissionTreePicker.tsx` exists
  - Renders module → page → action tree with checkboxes
  - Emits `onChange(selectedIds[])` on selection change

- [ ] **Create Role Modal Enhanced**
  - Role Level dropdown included
  - PermissionTreePicker integrated (behind feature flag)
  - Shows server error messages (400/403)
  - Submit disabled if no permissions selected (when picker enabled)

- [ ] **Feature Flag**
  - `NEXT_PUBLIC_FEATURE_ROLE_PAGE_PICKER` environment variable controls UI
  - Set to `'true'` to enable permission picker in Create Role modal
  - Default: disabled (backward compatible)

## Documentation

- [ ] **API Documentation Updated**
  - `PUT /api/privileges/roles/:id/permissions` documented
  - Request/response schemas defined
  - Error codes documented

## Rollout Checklist

### Pre-Deployment
1. [ ] Run migration: `20251205_add_min_role_level_to_rbac_permissions.sql`
2. [ ] Verify `min_role_level` column exists: `\d rbac_permissions`
3. [ ] Set feature flag: `NEXT_PUBLIC_FEATURE_ROLE_PAGE_PICKER=false` (initially)

### Deployment
4. [ ] Deploy backend changes
5. [ ] Deploy frontend changes
6. [ ] Verify endpoints respond correctly (smoke test)

### Post-Deployment Verification
7. [ ] Test low-privilege user cannot assign permissions (403)
8. [ ] Test admin can assign permissions (200)
9. [ ] Verify audit logs are created
10. [ ] Check Redis invalidation messages (if monitoring)

### Feature Flag Enablement
11. [ ] Set `NEXT_PUBLIC_FEATURE_ROLE_PAGE_PICKER=true`
12. [ ] Verify Create Role modal shows permission picker
13. [ ] Test role creation with permissions

---

## Related Files

### Backend
- `my-backend/services/rbacService.js` - Core RBAC logic
- `my-backend/middleware/rbacMiddleware.js` - Role level middleware
- `my-backend/routes/privilegeRoutes.js` - API endpoints
- `my-backend/services/auditService.js` - Security event logging
- `my-backend/migrations/20251205_add_min_role_level_to_rbac_permissions.sql`

### Frontend
- `my-frontend/src/components/privilege-management/PermissionTreePicker.tsx`
- `my-frontend/src/components/admin/RolesManagement.tsx`

### Tests
- `my-backend/tests/rbac.privilege.test.js`

---

## CI Integration

The following tests are run automatically:

```yaml
# In .github/workflows/ci.yml
- name: Run RBAC privilege tests
  run: npm test -- --testPathPattern=rbac.privilege
```

## Role Level Reference

| Level | Role Type | Capabilities |
|-------|-----------|--------------|
| 100 | Enterprise Admin | Full system access, can create any role |
| 90 | Super Admin | Business-wide admin, can create roles up to level 90 |
| 80 | Admin | Standard admin, can assign permissions up to level 80 |
| 50 | Manager | Team management, limited role creation |
| 30 | Staff | Basic access, no role management |
| 10 | Basic | Read-only access |
