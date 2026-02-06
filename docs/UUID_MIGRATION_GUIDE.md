# UUID Migration Guide (Migration 053)

## Overview

This migration standardizes all ID columns across core tables to use UUID instead of mixed INT/TEXT types. This resolves the cascading 403/500 errors caused by type mismatches when joining tables.

## Problem Statement

Before migration:
| Table | id Type | user_id Type | Issue |
|-------|---------|--------------|-------|
| `users_enhanced` | UUID | - | ✅ Correct |
| `chat_conversations` | INT | VARCHAR | ❌ Can't join to users |
| `chat_messages` | INT | VARCHAR | ❌ Can't join to users |
| `workflow_tasks` | INT | TEXT | ❌ Can't join to users |
| `task_messages` | INT | TEXT | ❌ Can't join to users |
| `threads` | TEXT | - | ⚠️ Should be UUID |
| `thread_messages` | TEXT | - | ⚠️ Should be UUID |

## Migration Strategy

### Phase 1: Add UUID Columns
- Add `*_uuid` columns alongside existing columns
- No data loss, no downtime

### Phase 2: Populate UUIDs
- Generate new UUIDs for ID columns
- Link user columns to `users_enhanced.id`

### Phase 3: Link Foreign Keys
- Update FK UUID columns to reference parent UUIDs

### Phase 4: Drop Old Constraints
- Remove old FK constraints that reference INT columns

### Phase 5: Rename Columns
- `id` → `id_old` (backup)
- `id_uuid` → `id` (new primary)

### Phase 6: Create New Constraints
- Add new PK constraints on UUID columns
- Add new FK constraints referencing UUID columns

### Phase 7: Create Indexes
- Add indexes on new UUID columns for performance

### Phase 8: Cleanup (Optional)
- Remove `*_old` backup columns after verification

## Usage

### 1. Backup Database First!
```bash
pg_dump -Fc your_database > backup_before_uuid_migration.dump
```

### 2. Preview Changes (Dry Run)
```bash
cd /path/to/project
node scripts/migrate-to-uuid.js --dry-run
```

### 3. Execute Migration
```bash
node scripts/migrate-to-uuid.js --execute
```

### 4. Verify Migration
```bash
node scripts/migrate-to-uuid.js --verify
```

### 5. Cleanup Old Columns (After Verification)
```bash
node scripts/migrate-to-uuid.js --cleanup --execute
```

## Rollback

If something goes wrong, the old columns are preserved with `_old` suffix:

```sql
-- Restore old columns
ALTER TABLE chat_conversations RENAME COLUMN id TO id_failed;
ALTER TABLE chat_conversations RENAME COLUMN id_old TO id;
-- Repeat for other tables...
```

A mapping table `_migration_id_mapping_053` stores old→new ID mappings for reference.

## Post-Migration Checklist

- [ ] Run `--verify` to confirm all UUIDs populated
- [ ] Test chat functionality (create conversation, send message)
- [ ] Test task functionality (create task, add message)
- [ ] Test thread functionality (create thread, add message)
- [ ] Verify RBAC permissions work
- [ ] Update Prisma schema if needed (`npx prisma db pull`)
- [ ] Regenerate Prisma client (`npx prisma generate`)
- [ ] Deploy updated backend code

## Affected Backend Code

After migration, ensure these files use UUID:

1. **Chat routes** (`/modules/chat/`)
   - Message creation uses UUID for user_id
   - Conversation queries use UUID

2. **Task routes** (`/routes/tasks/`)
   - Task creation uses UUID for creator_id/assignee_id
   - Message attachments use UUID

3. **Thread routes** (`/modules/chat/routes/thread-messages.js`)
   - Thread IDs are now UUID
   - Member references use UUID

4. **RBAC** (`/middleware/roleProtection.js`, `/routes/permissions.js`)
   - User permission checks use UUID joins

## Prisma Schema Updates

After migration, update the Prisma schema:

```prisma
model chat_conversations {
  id         String   @id @default(uuid()) @db.Uuid
  user_id    String?  @db.Uuid
  // ... other fields
  user       users_enhanced? @relation(fields: [user_id], references: [id])
}

model chat_messages {
  id              String   @id @default(uuid()) @db.Uuid
  conversation_id String   @db.Uuid
  user_id         String?  @db.Uuid
  // ... other fields
}
```

Then regenerate:
```bash
npx prisma db pull
npx prisma generate
```

## Troubleshooting

### "Column not found" errors
The column names changed - check if code uses old names.

### "Invalid UUID" errors
Some old data may have non-UUID values in the `_old` columns.
Check the mapping table for these cases.

### Foreign key violations
Parent records must be migrated before children.
The script handles this ordering automatically.

## Support

If issues occur:
1. Check `_migration_id_mapping_053` for ID mappings
2. Review the `*_old` columns for original values
3. Contact the development team with error details
