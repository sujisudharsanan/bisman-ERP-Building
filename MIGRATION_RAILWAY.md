# Railway PostgreSQL Migration Guide

This guide explains how to migrate the local Postgres database (`erp_main` / `BISMAN`) to a Railway-hosted PostgreSQL instance and apply multi-tenant + AI schema fixes.

## 1. Preparation
- Ensure local containers are running (`docker-compose up -d postgres`).
- Install Railway CLI: `npm i -g @railway/cli` (optional, for viewing connection info).
- Collect Railway DB credentials (Host, Port, Database, User, Password, SSL requirement).
- Confirm you are OK to replace existing Railway data (backup first if not empty).

## 2. Create/Locate Railway Database
In Railway dashboard:
1. Create a new PostgreSQL service.
2. Open the Connect tab and copy the connection parameters.
3. If SSL is required, append `?sslmode=require` later in `DATABASE_URL`.

## 3. Run Migration Script
```
chmod +x scripts/migrate_to_railway.sh
./scripts/migrate_to_railway.sh <railway_host> <railway_port> <railway_db> <railway_user> <railway_password>
```
Script actions:
1. Dumps local DB via `pg_dump` (saved under /tmp).
2. Drops existing public tables on Railway (clean slate).
3. Imports dump.
4. Applies multi-tenant tables & users column updates (`create-railway-tables.sql`).
5. Applies AI/cache schema fixes (`fix-railway-db-schema.sql`).
6. Optionally updates demo user password hashes (`fix-railway-passwords.sql`).
7. Prints verification counts.

## 4. Update Environment Variables
Set in deployment / Railway variables:
```
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
# If SSL needed:
# DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>?sslmode=require
```
Frontend may use an API base URL only; ensure backend has correct `DATABASE_URL`.

## 5. Verify
Run verification SQL:
```
psql "${DATABASE_URL}" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"
psql "${DATABASE_URL}" -f verify-railway-db.sql || true
```
Attempt login with demo credentials (see `fix-railway-passwords.sql`).

## 6. Rollback Plan
- Local dump file retained in `/tmp/<db>_YYYYMMDD_HHMMSS.sql.gz`.
- To restore Railway from that dump again, repeat step 3 using same file.
- To restore locally:
```
gunzip -c /tmp/<dumpfile>.sql.gz | psql -h localhost -U erp_admin -d erp_main
```

## 7. Edge Cases & Notes
- If Railway DB already populated: remove drop phase (comment block in script).
- If extension `pg_cron` absent: scheduled jobs skipped silently.
- Ensure `gen_random_uuid()` works (enable `pgcrypto` extension if missing):
```
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```
- Password mismatch issues: rerun `fix-railway-passwords.sql`.
- Performance: for very large data sets add `--jobs=4` to `pg_dump` using custom format; adapt script.

## 8. Next Improvements
- Automate in CI/CD with a safe flag `CONFIRM_IMPORT=true` (implemented via workflow + AUTO_CONFIRM).
- Add checksum comparison of table row counts before/after.
- Integrate Prisma migrations instead of raw SQL patches.
- Add notification & diff artifacts.

## 8.1 GitHub Actions CI Automation
Workflow: `.github/workflows/railway-migrate.yml`

### Trigger & Inputs
Manual dispatch with inputs:
- `no_drop` (true/false): skip destructive drop phase.
- `dry_run` (true/false): create dump only, no import.

### Required Secrets
`RAILWAY_HOST`, `RAILWAY_PORT`, `RAILWAY_DB`, `RAILWAY_USER`, `RAILWAY_PASSWORD`

### Execution Flow
1. Checkout & install `postgresql-client`.
2. Validate secrets.
3. Run wrapper `scripts/migrate_to_railway_ci.sh` (non-interactive with `--yes`).
4. (Optional) `npx prisma migrate deploy` if backend `package.json` exists.
5. Post-migration verification using `verify-railway-db.sql`.
6. Upload artifacts: dump, row diff JSON, verification SQL.

### Safety Controls
- Use `no_drop=true` for additive merges.
- Always pilot with `dry_run=true` to gauge dump size.
- Destructive runs require proper backups (download previous artifact).

### Rollback
Use artifact dump: `gunzip -c <dump>.sql.gz | psql -h <host> -U <user> -d <db>`.

### Future Enhancements
- Data checksum / hash of critical tables for integrity.
- Automated seed diff & reconciliation report.
- Slack success threading & failure escalation tagging.
- Automatic pg_cron extension enable guidance if supported.

## 9. Security
- Never commit real Railway credentials.
- After migration rotate privileged password and update `DATABASE_URL`.

---
✅ Migration artifacts prepared. Execute script when ready.
