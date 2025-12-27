# Database Safety Guidelines

> **CRITICAL LESSON LEARNED: December 28, 2025**
> 
> This document exists because we lost 170+ tables due to unsafe Prisma commands.

## ⚠️ NEVER USE THESE COMMANDS

### 1. `npx prisma db push --force-reset`
```bash
# ❌ DANGEROUS - NEVER USE THIS
npx prisma db push --accept-data-loss --force-reset
```
**What it does:** DROPS THE ENTIRE DATABASE and recreates only tables defined in `schema.prisma`

**Incident:** This command dropped our database from **242 tables to ~69 tables** - losing all Railway-specific tables.

### 2. `npx prisma db push --accept-data-loss`
```bash
# ❌ DANGEROUS - AVOID THIS
npx prisma db push --accept-data-loss
```
**What it does:** Drops tables that exist in the database but are NOT in `schema.prisma`

**Incident:** This command dropped an additional **32 tables** that were imported from Railway but not defined in Prisma schema.

---

## ✅ SAFE ALTERNATIVES

### For Schema Changes:
```bash
# Create migration file without applying
npx prisma migrate dev --create-only --name your_migration_name

# Review the migration file, then apply
npx prisma migrate deploy
```

### For Adding Missing Tables:
```bash
# Export from Railway (production)
pg_dump "postgresql://..." --schema-only -t table_name > table.sql

# Import to local
psql postgres://postgres@localhost:5432/BISMAN -f table.sql
```

### For Syncing with Production:
```bash
# ALWAYS backup first
pg_dump postgres://postgres@localhost:5432/BISMAN > backup_$(date +%Y%m%d_%H%M%S).sql

# Export production schema
pg_dump "RAILWAY_URL" --schema-only --no-owner > production_schema.sql

# Import to local (additive - won't drop existing)
psql postgres://postgres@localhost:5432/BISMAN -f production_schema.sql
```

---

## 📊 Database Comparison Commands

### Count tables:
```bash
# Local
psql postgres://postgres@localhost:5432/BISMAN -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"

# Railway
psql "RAILWAY_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
```

### Compare tables between databases:
```bash
# List tables only in Railway (missing locally)
comm -23 <(psql "RAILWAY_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1" | tr -d ' ' | sort) \
         <(psql "LOCAL_URL" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1" | tr -d ' ' | sort)
```

---

## 🔄 Recovery Steps (If Tables Are Lost)

1. **Check Railway for missing tables:**
   ```bash
   # Compare local vs Railway
   ```

2. **Export missing tables from Railway:**
   ```bash
   pg_dump "RAILWAY_URL" --schema-only -t missing_table_1 -t missing_table_2 > missing.sql
   ```

3. **Import to local:**
   ```bash
   psql postgres://postgres@localhost:5432/BISMAN -f missing.sql
   ```

4. **Import data if needed:**
   ```bash
   pg_dump "RAILWAY_URL" --data-only -t table_name > data.sql
   psql postgres://postgres@localhost:5432/BISMAN -f data.sql
   ```

---

## 📅 Incident Timeline (Dec 28, 2025)

| Step | Event | Tables |
|------|-------|--------|
| 1 | Dec 26 Backup | 242 |
| 2 | `prisma db push --force-reset` | **69** (173 LOST!) |
| 3 | Railway schema import | 240 |
| 4 | `prisma db push --accept-data-loss` | **208** (32 more lost) |
| 5 | Re-import missing tables | **240** ✅ |

---

## 🛡️ Pre-Command Checklist

Before running ANY Prisma or database command:

- [ ] Backup the database first
- [ ] Count current tables
- [ ] Understand what the command will do
- [ ] NEVER use `--force-reset` or `--accept-data-loss`
- [ ] Use `--create-only` to preview migrations

---

## 📁 Important Files

- **Railway Schema Backup:** `railway_schema_backup.sql`
- **Local Backup (Dec 26):** `backups/bisman_backup_20251226_113710.sql`
- **Missing Tables Import:** `railway_missing_tables.sql`
- **Admin Data:** `railway_admin_data.sql`

---

## 🔑 Current Database Stats

- **Local Tables:** 240
- **Railway Tables:** 238
- **Extra Local Tables:** `approval_delegation`, `approval_notifications` (needed for workflow)

---

*Last Updated: December 28, 2025*
