# P3 Scaling & Performance Implementation

## Overview

This document describes the P3 scaling and performance optimizations implemented for the BISMAN ERP system.

## 1. Database Indexes

### New Composite Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `thread_messages` | `idx_thread_messages_thread_created` | Fast message retrieval by thread |
| `thread_messages` | `idx_thread_messages_thread_not_deleted` | Active messages only |
| `thread_messages` | `idx_thread_messages_sender_created` | Messages by sender |
| `thread_messages` | `idx_thread_messages_reactions_gin` | JSONB search on reactions |
| `thread_messages` | `idx_thread_messages_readby_gin` | JSONB search on read receipts |
| `client_usage_events` | `idx_client_usage_events_composite` | Multi-column lookup |
| `client_usage_events` | `idx_client_usage_events_type_date` | Event type analysis |
| `client_usage_events` | `idx_client_usage_events_user_date` | User activity tracking |
| `user_sessions` | `idx_user_sessions_user_active` | Active sessions lookup |
| `user_sessions` | `idx_user_sessions_expires` | Session expiration |
| `approvals` | `idx_approvals_expense_status` | Approval workflow |
| `approvals` | `idx_approvals_approver_pending` | Pending approvals |

### GIN Indexes for JSONB

```sql
-- Fast JSONB queries on reactions
CREATE INDEX idx_thread_messages_reactions_gin ON thread_messages USING GIN (reactions);

-- Fast JSONB queries on read receipts
CREATE INDEX idx_thread_messages_readby_gin ON thread_messages USING GIN ("readBy");
```

## 2. Table Partitioning

### Partitioned Tables

Three high-volume tables are now partitioned by month:

| Table | Partition Key | Partitions Created |
|-------|---------------|-------------------|
| `thread_messages_partitioned` | `createdAt` | 15 months (3 past + 12 future) |
| `client_usage_events_partitioned` | `occurred_at` | 15 months |
| `audit_logs_partitioned` | `created_at` | 6 months |

### Partition Naming Convention

```
{table_name}_p{YYYY_MM}
```

Examples:
- `thread_messages_p2025_12`
- `client_usage_events_p2026_01`
- `audit_logs_p2025_12`

### Partition Management Functions

```sql
-- Create future partitions (run monthly via cron)
SELECT * FROM create_future_partitions('thread_messages', 3);
SELECT * FROM create_future_partitions('client_usage_events', 3);
SELECT * FROM create_future_partitions('audit_logs', 3);

-- Drop old partitions (archive first!)
SELECT * FROM drop_old_partitions('thread_messages', 12);
SELECT * FROM drop_old_partitions('client_usage_events', 6);
```

### Migration to Partitioned Tables

To migrate existing data to partitioned tables:

```sql
-- For thread_messages
INSERT INTO thread_messages_partitioned 
SELECT * FROM thread_messages;

-- Then swap tables
ALTER TABLE thread_messages RENAME TO thread_messages_old;
ALTER TABLE thread_messages_partitioned RENAME TO thread_messages;
```

## 3. Normalized JSON Fields

### New Tables

#### `message_reads`
Normalized read receipts (replaces `readBy` JSONB):

```sql
CREATE TABLE message_reads (
    id BIGSERIAL PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES thread_messages(id),
    user_id INTEGER NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);
```

#### `message_reactions`
Normalized reactions (replaces `reactions` JSONB):

```sql
CREATE TABLE message_reactions (
    id BIGSERIAL PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES thread_messages(id),
    user_id INTEGER NOT NULL,
    emoji VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);
```

### Migration Functions

```sql
-- Migrate existing readBy data
SELECT * FROM migrate_readby_to_normalized();

-- Migrate existing reactions data
SELECT * FROM migrate_reactions_to_normalized();
```

### Query Comparison

**Before (JSONB):**
```sql
SELECT * FROM thread_messages 
WHERE "readBy" @> '[{"userId": 123}]';
```

**After (Normalized):**
```sql
SELECT tm.* FROM thread_messages tm
JOIN message_reads mr ON mr.message_id = tm.id
WHERE mr.user_id = 123;
```

## 4. Redis Session & Permission Cache

### Session Cache

Location: `my-backend/cache/services/sessionCache.js`

```javascript
const { sessionCache } = require('./cache');

// Store session
await sessionCache.setSession(tokenHash, {
  user_id: 123,
  expires_at: '2024-12-05T00:00:00Z'
});

// Get session (with DB fallback)
const session = await sessionCache.getSessionWithFallback(token);

// Invalidate user's sessions
await sessionCache.invalidateUserSessions(userId);
```

### Permission Cache

Location: `my-backend/cache/services/permissionCache.js`

```javascript
const { permissionCache } = require('./cache');

// Get permissions (with DB fallback)
const perms = await permissionCache.getUserPermissionsWithFallback(userId, userType);

// Check module access
const hasAccess = await permissionCache.hasModulePermission(userId, userType, 'payments');

// Check page access
const canView = await permissionCache.hasPagePermission(userId, userType, 'payments', 'list');

// Invalidate on permission change
await permissionCache.invalidateUserPermissions(userId);
await permissionCache.invalidateSuperAdminPermissions(superAdminId);
```

### Cache TTLs

| Cache Type | TTL | Notes |
|------------|-----|-------|
| Sessions | 1 hour | Extended on activity |
| Refresh Tokens | 7 days | For session list tracking |
| User Permissions | 5 minutes | Short for security |
| Role Permissions | 10 minutes | Medium |
| Module Assignments | 15 minutes | Longer, changes rarely |

### Cache Invalidation Events

The cache automatically invalidates on these events:

| Event | Triggers |
|-------|----------|
| `USER_PERMISSIONS_CHANGED` | Role assignment, permission edit |
| `MODULE_ASSIGNMENTS_CHANGED` | Module assignment to Super Admin |
| `USER_LOGGED_OUT` | Logout, password change |
| `USER_PASSWORD_CHANGED` | Password reset/change |
| `SUPER_ADMIN_DEACTIVATED` | Super Admin deactivation |

### Using Invalidation

```javascript
const { invalidate } = require('./cache');

// On user logout
await invalidate('USER_LOGGED_OUT', userId);

// On permission change
await invalidate('USER_PERMISSIONS_CHANGED', userId);

// On module assignment change
await invalidate('MODULE_ASSIGNMENTS_CHANGED', superAdminId);
```

## 5. Database Fallback

### Permission Cache Table

For environments without Redis:

```sql
CREATE TABLE permission_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    user_id INTEGER,
    tenant_id UUID,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Get cached permission
SELECT get_cached_permission('perm:user:123');

-- Set cached permission
SELECT set_cached_permission('perm:user:123', '{"role":"ADMIN"}'::JSONB, 300);

-- Cleanup expired entries
SELECT cleanup_expired_permission_cache();
```

## 6. Performance Monitoring Views

### Slow Queries Analysis

```sql
SELECT * FROM v_slow_queries;
-- Shows queries taking > 100ms in the last 24 hours
```

### Table Access Patterns

```sql
SELECT * FROM v_table_access_patterns;
-- Shows which tables are accessed most and by which operations
```

## 7. Configuration

### Environment Variables

```bash
# Redis connection (required for caching)
REDIS_URL=redis://localhost:6379

# Disable caching (for testing)
REDIS_URL=disabled

# Use in-memory fallback
REDIS_URL=memory
```

### Cron Jobs

Add to crontab for partition maintenance:

```bash
# Create future partitions (monthly)
0 0 1 * * psql -U postgres -d BISMAN -c "SELECT create_future_partitions('thread_messages', 3);"
0 0 1 * * psql -U postgres -d BISMAN -c "SELECT create_future_partitions('client_usage_events', 3);"

# Cleanup expired permission cache (hourly)
0 * * * * psql -U postgres -d BISMAN -c "SELECT cleanup_expired_permission_cache();"
```

## 8. Migration Files

- `database/migrations/012_p3_scaling_performance.sql`

## 9. Files Created/Modified

### New Files
- `my-backend/cache/index.js` - Cache module exports
- `my-backend/cache/services/sessionCache.js` - Session caching
- `my-backend/cache/services/permissionCache.js` - Permission caching

### Modified Files
- `my-backend/cache/namespaces.js` - Added new namespaces
- `my-backend/cache/invalidation/handlers.js` - Added invalidation events

## 10. Performance Benchmarks

### Expected Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Session lookup | ~50ms (DB) | ~2ms (Redis) | 25x faster |
| Permission check | ~30ms (DB) | ~1ms (Redis) | 30x faster |
| Message query (1M rows) | ~500ms | ~50ms (partitioned) | 10x faster |
| Read receipt query | ~100ms (JSONB) | ~10ms (normalized) | 10x faster |

### Monitoring

Check cache hit rates:

```javascript
const { redis } = require('./cache');
const info = await redis.info('stats');
// Look for keyspace_hits and keyspace_misses
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-04  
**Author**: Performance Team
