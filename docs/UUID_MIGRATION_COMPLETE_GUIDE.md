# UUID Migration Complete Guide

## Executive Summary

This document provides a complete guide for migrating the BISMAN ERP platform from mixed ID types (INTEGER, TEXT, VARCHAR) to UUID-only identity management.

### Current State (Post-Audit)

| Metric | Count |
|--------|-------|
| Total UUID columns | 456 |
| Legacy *_old columns | 25 |
| Non-UUID ID columns requiring migration | 94 |
| Tables affected | ~50 |

### Key Issues Identified

1. **Integer ID columns referencing UUID entities**
   - `users_enhanced.super_admin_id` (int4)
   - `thread_messages.senderId` (int4)
   - `approvals.approverId` (int4)
   - Multiple audit log partition tables

2. **VARCHAR tenant_id columns**
   - Already migrated to UUID ✅

3. **Legacy columns (*_old, *_legacy)**
   - 25 columns across various tables need removal

4. **Type mismatch in foreign keys**
   - `audit_logs.session_id` (varchar) → `user_sessions.id` (int4)

---

## Phase 1: Database Normalization

### Files Created

| File | Purpose |
|------|---------|
| `database/migrations/uuid-normalization-phase1.sql` | Main SQL migration script |
| `database/migrations/uuid-prisma-alignment.sql` | Prisma-specific preparation |
| `scripts/uuid-migration-audit.js` | Comprehensive schema audit |
| `scripts/uuid-migration-execute.js` | Phased migration executor |
| `scripts/uuid-migration-verify.js` | Verification test suite |

### Execution Steps

```bash
# Step 1: Run full audit
cd /Users/abhi/Desktop/BISMAN\ ERP
node scripts/uuid-migration-audit.js

# Step 2: Run migration in dry-run mode first
node scripts/uuid-migration-execute.js --phase=all --dry-run

# Step 3: Execute actual migration
node scripts/uuid-migration-execute.js --phase=2  # Backup & Migrate
node scripts/uuid-migration-execute.js --phase=3  # Drop legacy columns
node scripts/uuid-migration-execute.js --phase=5  # Add constraints

# Step 4: Verify
node scripts/uuid-migration-verify.js
```

---

## Phase 2: Prisma Schema Alignment

### Sync Schema from Database

```bash
cd my-backend
npx prisma db pull
```

### Required Manual Updates

After `prisma db pull`, update the schema with these annotations:

```prisma
// Add @db.Uuid to all UUID columns
model users_enhanced {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id     String?  @db.Uuid
  created_by    String?  @db.Uuid
  updated_by    String?  @db.Uuid
  reports_to    String?  @db.Uuid
  // ... etc
}

// Add compound unique constraints
model tenant_usage {
  id        Int      @id @default(autoincrement())
  tenant_id String   @db.Uuid
  date      DateTime @db.Date
  
  @@unique([tenant_id, date], name: "tenant_usage_tenant_date_unique")
}

// Use @map for camelCase to snake_case
model thread_messages {
  senderId String @map("sender_id") @db.Uuid
  // ...
}
```

### Regenerate Client

```bash
npx prisma generate
```

---

## Phase 3: Query & API Sanitization

### Utility Module

A new utility module has been created at `my-backend/utils/uuid-helpers.js`:

```javascript
const { validateUUID, ensureUUID, sanitizeUserId } = require('./utils/uuid-helpers');

// In route handlers:
const userId = sanitizeUserId(req.user.id);  // Always returns valid UUID or null

// In Prisma queries:
const user = await prisma.users_enhanced.findUnique({
  where: { id: ensureUUID(userId) }
});
```

### Code Patterns to Update

#### BEFORE (Problematic)
```javascript
// ❌ Using parseInt for IDs
const userId = parseInt(req.params.id);

// ❌ Type casting in SQL
await pool.query(`SELECT * FROM users WHERE id = ${id}::INTEGER`);

// ❌ Using Number() for comparison
where: { id: Number(userId) }
```

#### AFTER (Correct)
```javascript
// ✅ Using UUID validation
const { ensureUUID } = require('./utils/uuid-helpers');
const userId = ensureUUID(req.params.id);

// ✅ Parameterized queries with UUID
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// ✅ Direct UUID comparison
where: { id: userId }
```

### Files Requiring Updates

Based on grep search, these files need attention:

| File | Issue | Fix |
|------|-------|-----|
| `middleware/auditContext.js` | `::TEXT` casts | Remove casts |
| `controllers/rbacController.js` | `parseInt(id)` | Use `ensureUUID(id)` |
| `services/privilegeService.js` | `Number(roleId)` | Use `ensureUUID(roleId)` |
| `routes/permissionsRoutes.js` | `parseInt(userId)` | Use `ensureUUID(userId)` |
| `app.js` | Multiple `parseInt(id)` | Use `ensureUUID(id)` |
| `socket/presence.js` | `Number(userId)` | Use `ensureUUID(userId)` |

---

## Phase 4: RBAC & Access Repair

### Verification Queries

```sql
-- Check RBAC role assignments
SELECT r.role_name, COUNT(rpa.id) as page_count
FROM rbac_roles r
LEFT JOIN role_page_access rpa ON r.id = rpa.role_id
GROUP BY r.role_name
ORDER BY page_count DESC;

-- Verify effective access cache
SELECT COUNT(*) as total,
       COUNT(CASE WHEN user_uuid IS NOT NULL THEN 1 END) as with_uuid
FROM effective_access_cache;

-- Check user-role mappings
SELECT u.email, r.role_name
FROM users_enhanced u
JOIN rbac_roles r ON u.role_id = r.id
WHERE u.is_active = true
LIMIT 20;
```

### Rebuild Access Cache

```javascript
// After migration, invalidate and rebuild cache
await prisma.effective_access_cache.deleteMany({});
// Access cache will be rebuilt on next login
```

---

## Phase 5: Legacy Cleanup

### Columns to Remove

```sql
-- Already handled by migration scripts
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS id_old;
ALTER TABLE chat_conversations DROP COLUMN IF EXISTS user_id_old;
ALTER TABLE chat_messages DROP COLUMN IF EXISTS id_old;
-- ... etc (see migration SQL for full list)
```

### Tables to Archive

Consider moving to archive schema:
- `_legacy_users_backup_20260106`
- `_backup_053_thread_messages`
- Other `_*` prefixed tables

---

## Phase 6: Validation & Testing

### Automated Tests

```bash
# Run full verification suite
node scripts/uuid-migration-verify.js --test=all

# Run specific test categories
node scripts/uuid-migration-verify.js --test=schema
node scripts/uuid-migration-verify.js --test=data
node scripts/uuid-migration-verify.js --test=queries
node scripts/uuid-migration-verify.js --test=prisma
```

### Manual Test Checklist

- [ ] **Authentication**
  - [ ] Login with email/password
  - [ ] Session persistence
  - [ ] JWT token contains UUID user_id
  
- [ ] **Task Creation**
  - [ ] Create new task
  - [ ] Assign to user (UUID)
  - [ ] Task appears in Kanban
  
- [ ] **Kanban Loading**
  - [ ] Board loads without errors
  - [ ] Tasks grouped by status
  - [ ] User avatars display
  
- [ ] **Chat Messaging**
  - [ ] Send message
  - [ ] Receive message
  - [ ] Thread creation
  
- [ ] **RBAC Authorization**
  - [ ] Page access control
  - [ ] Role-based permissions
  - [ ] Admin overrides work
  
- [ ] **Usage Metering**
  - [ ] Usage tracking active
  - [ ] No duplicate records
  - [ ] Correct tenant attribution

---

## Deliverables Summary

| Deliverable | Location | Status |
|-------------|----------|--------|
| SQL Migration Script | `database/migrations/uuid-normalization-phase1.sql` | ✅ Created |
| Prisma Alignment SQL | `database/migrations/uuid-prisma-alignment.sql` | ✅ Created |
| Migration Executor | `scripts/uuid-migration-execute.js` | ✅ Created |
| Verification Suite | `scripts/uuid-migration-verify.js` | ✅ Created |
| UUID Helper Utils | `my-backend/utils/uuid-helpers.js` | ✅ Created |
| Rollback Plan | `docs/UUID_MIGRATION_ROLLBACK_PLAN.md` | ✅ Created |
| This Guide | `docs/UUID_MIGRATION_COMPLETE_GUIDE.md` | ✅ Created |

---

## Production Deployment Steps

1. **Preparation**
   ```bash
   # Create database backup
   pg_dump $DATABASE_URL > backup_pre_uuid_migration.sql
   ```

2. **Maintenance Window**
   ```bash
   # Stop application
   pm2 stop all
   
   # Run migration
   psql $DATABASE_URL -f database/migrations/uuid-prisma-alignment.sql
   
   # Update Prisma
   cd my-backend
   npx prisma db pull
   npx prisma generate
   npm run build
   
   # Start application
   pm2 start all
   ```

3. **Post-Deploy Verification**
   ```bash
   node scripts/uuid-migration-verify.js
   ```

4. **Rollback if Needed**
   ```bash
   # See docs/UUID_MIGRATION_ROLLBACK_PLAN.md
   ```

---

## Appendix: Error Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `operator does not exist: uuid = text` | Comparing UUID to TEXT | Ensure both sides are UUID |
| `operator does not exist: uuid = integer` | Legacy INT ID in query | Update query to use UUID |
| `unknown field userId` | Prisma field mismatch | Use `@map("user_id")` |
| `Unique constraint violation` | Duplicate tenant_id/date | Run deduplication SQL |
| `Cannot cast to uuid` | Invalid UUID format | Validate input before query |

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-06
**Author**: AI Migration Assistant
