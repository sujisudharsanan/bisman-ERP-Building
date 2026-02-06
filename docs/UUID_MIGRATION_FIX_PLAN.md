# UUID Migration Fix Plan

## Current State Analysis

### ID Column Type Distribution:
| Column | UUID | TEXT | VARCHAR | INT |
|--------|------|------|---------|-----|
| user_id | 5 | 68 | 8 | 0 (but Prisma has Int) |
| tenant_id | 107 | 2 | 13 | 1 |
| created_by | 12 | 25 | 0 | 1 (bigint) |
| updated_by | 4 | 14 | 0 | 0 |
| assignee_id | 0 | 2 | 0 | 3 |
| super_admin_id | 0 | 0 | 0 | 13 |

### Key Issues:
1. **Prisma schema** has `user_id Int` but DB has `user_id TEXT/UUID`
2. **Raw SQL queries** compare incompatible types
3. **Triggers** have type mismatches (already fixed one)
4. **tenant_quota** model missing in Prisma

## Fix Priority Order:

### Phase 1: Critical Runtime Fixes (Immediate)
1. ✅ Fix `invalidate_effective_access_cache` trigger (DONE)
2. Fix raw SQL queries with type casting
3. Add `tenant_quota` model to Prisma (or fix the reference)
4. Fix `tenant_usage` unique key reference

### Phase 2: Prisma Schema Alignment
1. Pull current DB schema into Prisma
2. Regenerate Prisma client
3. Update type definitions

### Phase 3: Data Normalization
1. Standardize on TEXT for all user_id columns
2. Add proper foreign key constraints
3. Clean up legacy INT data

## Immediate Fixes Needed:

### 1. Chat Thread 403 Error
The screenshot shows `/api/chat/threads` returning 403.
Need to check authentication and authorization.

### 2. WebSocket Connection Failures
Multiple websocket errors to localhost:5000.
Production should use Railway backend URL.
