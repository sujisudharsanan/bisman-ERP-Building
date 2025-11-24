# Database Reconciliation Plan (Baseline + Sequences)

## Goal
Bring an existing PostgreSQL database with legacy tables & sequences into alignment with the current Prisma schema without destructive drops.

## High-Level Strategy
1. Snapshot current state.
2. Apply missing tables (chat/calls) via manual bootstrap if absent.
3. Generate baseline migration diff.
4. Normalize sequences & constraints.
5. Adopt Prisma migrations moving forward.

## 1. Snapshot
```bash
pg_dump --schema-only "$DATABASE_URL" > pre-baseline-schema.sql
pg_dump --data-only --table=call_logs --table=thread_members "$DATABASE_URL" > chat-calls-data.sql || true
```
Store both in version control (optional) under `db-snapshots/`.

## 2. Ensure Required Tables
If `thread_members` or `call_logs` missing:
```bash
psql "$DATABASE_URL" -f my-backend/migrations/manual-bootstrap-chat-calls.sql
```
Verify:
```sql
SELECT * FROM thread_members LIMIT 1;
SELECT * FROM call_logs LIMIT 1;
```

## 3. Generate Baseline
Use helper script:
```bash
(cd my-backend && ./scripts/generate-prisma-baseline.sh)
```
Review `baseline.sql` and remove any destructive statements (DROP, ALTER that shrinks columns) unless intentional.

Apply baseline:
```bash
psql "$DATABASE_URL" -f baseline-migration-*/baseline.sql
```
Create Prisma migration folder:
```
mkdir -p my-backend/prisma/migrations/0000_baseline
echo '-- baseline applied outside Prisma' > my-backend/prisma/migrations/0000_baseline/migration.sql
```
Commit changes.

## 4. Fix Sequences
Detect mismatched sequences (e.g., `SELECT max(id) FROM users;` vs `SELECT nextval('users_id_seq');`).
Reset if needed:
```sql
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id),1) FROM users)+1, false);
```
Repeat for each table with serial/identity mismatch.

## 5. Verify Prisma Operations
```bash
cd my-backend
npx prisma generate
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findFirst().then(r=>{console.log('OK user query');}).finally(()=>p.$disconnect());"
```

## 6. Enable Normal Migrations
Future schema changes:
```bash
npx prisma migrate dev --name add_feature_x
```
On deploy:
```bash
npx prisma migrate deploy
```

## 7. Rollback Strategy
Maintain a copy of `pre-baseline-schema.sql`. To rollback to pre-baseline state you would restore from a full DB backup (recommended: `pg_dump -Fc` before baseline apply).

## 8. Observability Post-Reconciliation
Add checks:
```sql
SELECT relname AS table, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 10;
```
Track sequence health weekly:
```sql
SELECT sequence_schema, sequence_name, last_value FROM information_schema.sequences WHERE sequence_schema='public';
```

## 9. Common Issues & Fixes
| Issue | Cause | Fix |
|-------|-------|-----|
| P3006 migrate shadow error | Missing underlying table for model | Apply manual bootstrap tables first |
| Sequence duplicate key errors | Sequence behind current max(id) | setval() to MAX(id)+1 |
| Constraint creation failure | Duplicate values violate new unique constraint | Identify duplicates, clean or adjust constraint |
| Prisma client fails on new models | Client not regenerated | `npx prisma generate` |

## 10. Production Safeguards
- Perform reconciliation in staging first.
- Tag DB snapshot before baseline: `pg_dump -Fc > snapshot_before_baseline.dump`.
- Use maintenance window for baseline apply.
- Monitor error logs for 24h after change.

---
Generated: 2025-11-24
