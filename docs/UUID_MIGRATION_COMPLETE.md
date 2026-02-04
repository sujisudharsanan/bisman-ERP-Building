# UUID Standardization Migration

## Overview

This migration standardizes all user identifiers across the BISMAN ERP system to use **UUID** format, eliminating legacy integer-based IDs.

## Migration Status: ✅ COMPLETED

**Date:** February 5, 2026

## Changes Made

### 1. Database Schema Migration

All user-related columns have been converted from INTEGER to TEXT (UUID-compatible):

- **152 columns** across **100 tables** converted
- Column types changed: `user_id`, `*_by`, `*_user_id`, `actor_id`, `owner_id`, `legacy_id`
- Views and RLS policies updated to work with TEXT columns

### 2. Key Tables Updated

| Table | Column | Old Type | New Type |
|-------|--------|----------|----------|
| users_enhanced | id | UUID | UUID (unchanged) |
| users_enhanced | legacy_id | INTEGER | TEXT |
| audit_logs | user_id | INTEGER | TEXT |
| security_access_log | user_id | INTEGER | TEXT |
| security_events | user_id | INTEGER | TEXT |
| All *_by columns | various | INTEGER | TEXT |

### 3. Backend Code Changes

- Removed `parseInt()` and `Number()` calls on user IDs
- Replaced `legacy_id || id` patterns with just `id`
- Updated SQL casts from `::INTEGER` to `::TEXT`
- Added UUID validation middleware

### 4. Files Updated

- `middleware/authorize.js` - Removed legacyId fallbacks
- `middleware/auditContext.js` - Changed INTEGER casts to TEXT
- `middleware/routeAuthorizationGuardrail.js` - Updated user ID extraction
- `controllers/rbacController.js` - Removed parseInt
- `controllers/superAdminController.js` - Removed parseInt
- `routes/assets.js` - Removed legacy_id fallbacks
- `routes/effectiveAccessRoutes.js` - Updated user ID extraction
- `routes/menuRoutesSecure.js` - Removed legacy_id fallbacks
- `routes/taskRequestRoutes.js` - Updated user ID extraction

### 5. New Files Created

- `scripts/uuid-migration/001_analyze_dependencies.js` - Dependency analyzer
- `scripts/uuid-migration/002_migrate_schema.js` - Schema migration script
- `scripts/uuid-migration/003_migrate_data.js` - Data migration script
- `scripts/uuid-migration/run-migration.js` - Master migration runner
- `scripts/uuid-migration/uuid-audit-scanner.js` - Legacy pattern scanner
- `scripts/uuid-migration/refactor-code.js` - Code refactoring tool
- `my-backend/middleware/uuidValidation.js` - UUID validation middleware

## Usage Guidelines

### Getting User ID (After Migration)

```javascript
// ✅ CORRECT - Use id directly (it's a UUID)
const userId = req.user.id;

// ❌ DEPRECATED - Don't use legacy_id
const userId = req.user.legacy_id || req.user.id; // Remove this pattern
```

### Validating UUIDs

```javascript
const { isValidUUID, validateUserUUID } = require('../middleware/uuidValidation');

// In routes
router.get('/users/:id', validateParamUUID('id'), handler);

// In code
if (!isValidUUID(userId)) {
  return res.status(400).json({ error: 'Invalid user ID format' });
}
```

### Database Queries

```javascript
// ✅ CORRECT - No cast needed for TEXT columns
await pool.query('SELECT * FROM audit_logs WHERE user_id = $1', [userId]);

// ❌ DEPRECATED - Don't cast to INTEGER
await pool.query('SELECT * FROM audit_logs WHERE user_id = $1::INTEGER', [userId]);
```

## Verification

Run the audit scanner to check for remaining legacy patterns:

```bash
node scripts/uuid-migration/uuid-audit-scanner.js --fix-suggestions --database
```

## Backward Compatibility

The `legacy_id` column in `users_enhanced` is retained as TEXT for backward compatibility during the transition period. It should be removed in a future release after confirming all systems have migrated.

## Known Issues

Some task-related controllers still reference `legacy_id` for joining with old task tables. These should be updated when the task system is migrated.

## Rollback (if needed)

1. Restore from backup
2. Or run reverse migration (not provided - would need manual column type changes)

## Next Steps

1. Update remaining controllers that reference `legacy_id` in SQL joins
2. Update task tables to use UUID references
3. Remove `legacy_id` column after transition period
4. Add CI check to fail on legacy patterns
