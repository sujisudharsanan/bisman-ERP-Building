# 🚂 Railway DB Migration - Quick Start

## ✅ Ready to Migrate!

Your migration script is already in place at:
`scripts/migrate-to-railway.sh`

---

## 🚀 Quick Migration (3 Steps)

### Step 1: Get Railway Database URL

```bash
# Option A: From Railway Dashboard
# 1. Go to your Railway project
# 2. Click PostgreSQL service
# 3. Go to "Variables" tab
# 4. Copy DATABASE_URL value

# Option B: Using Railway CLI
railway variables | grep DATABASE_URL
```

### Step 2: Set Environment Variable

```bash
# Export the Railway database URL
export RAILWAY_DATABASE_URL="postgresql://user:password@host.railway.app:port/railway"
```

### Step 3: Run Migration

```bash
# Navigate to project root
cd "/Users/abhi/Desktop/BISMAN ERP"

# Make script executable (if not already)
chmod +x scripts/migrate-to-railway.sh

# Run FULL migration (schema + data)
bash scripts/migrate-to-railway.sh full
```

---

## 📋 Migration Options

### Option 1: Full Migration (Recommended)
Migrates everything - schema, data, indexes, constraints

```bash
bash scripts/migrate-to-railway.sh full
```

**What it does:**
- ✅ Backs up local database
- ✅ Connects to Railway
- ✅ Drops existing Railway schema (after confirmation)
- ✅ Creates all tables
- ✅ Imports all data
- ✅ Verifies migration

### Option 2: Schema Only
Migrates just the database structure

```bash
bash scripts/migrate-to-railway.sh schema
```

**Use when:**
- You want to keep existing Railway data
- You only need to update table structures
- Testing schema changes

### Option 3: Data Only
Migrates only data (tables must exist)

```bash
bash scripts/migrate-to-railway.sh data
```

**Use when:**
- Schema already exists on Railway
- You want to refresh data only
- Syncing data between environments

---

## 🔍 Verify Migration

After migration, check if everything worked:

```bash
# Connect to Railway database
psql "$RAILWAY_DATABASE_URL"

# List all tables
\dt

# Check row counts
SELECT 
  tablename,
  n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

# Check specific tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM roles;

# Exit psql
\q
```

---

## ⚡ One-Liner Migration

If you have Railway CLI installed:

```bash
# Link to Railway project (first time only)
railway link

# Export Railway database URL
export RAILWAY_DATABASE_URL=$(railway variables get DATABASE_URL)

# Run migration
bash scripts/migrate-to-railway.sh full
```

---

## 🔧 Manual Migration (Alternative)

If you prefer manual control:

```bash
# 1. Export local database
pg_dump -U postgres BISMAN > local_backup.sql

# 2. Import to Railway
psql "$RAILWAY_DATABASE_URL" < local_backup.sql

# 3. Verify
psql "$RAILWAY_DATABASE_URL" -c "\dt"
```

---

## 🚨 Common Issues & Solutions

### Issue: SSL Connection Required

**Error:** `SSL connection required`

**Solution:**
```bash
# Add SSL mode to your URL
export RAILWAY_DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

### Issue: Connection Timeout

**Error:** `Connection timed out`

**Solution:**
```bash
# Check Railway database status in dashboard
# Ensure your IP is not blocked
# Try with SSL explicitly disabled (testing only)
export RAILWAY_DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=disable"
```

### Issue: Permission Denied

**Error:** `Permission denied for schema public`

**Solution:**
```bash
psql "$RAILWAY_DATABASE_URL" -c "
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
"
```

### Issue: Database Already Exists

**Error:** `database already exists`

**Solution:** The script will ask for confirmation before dropping. Answer "yes" to proceed.

---

## 📊 What Gets Migrated

### Tables ✅
- users
- user_sessions  
- tasks
- task_attachments
- task_comments
- chat_conversations
- chat_messages
- roles
- permissions
- role_permissions
- user_roles
- audit_logs
- And all other tables

### Additional ✅
- Indexes
- Constraints
- Foreign keys
- Sequences
- Views (if any)
- Functions (if any)

### Not Migrated ❌
- Database users/roles
- Database-level permissions
- Server configurations

---

## 🎯 Post-Migration Tasks

### 1. Update Backend Configuration

```bash
# Update my-backend/.env.production
DATABASE_URL=your_railway_database_url
NODE_ENV=production
```

### 2. Test Database Connection

```bash
cd my-backend
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'Error: ' + err : 'Connected! ' + res.rows[0].now);
  pool.end();
});
"
```

### 3. Deploy Backend to Railway

```bash
# Commit changes
git add .
git commit -m "Update database configuration for Railway"
git push origin deployment

# Railway will auto-deploy
```

### 4. Update Frontend Environment

```bash
# my-frontend/.env.production
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## 📝 Backup Locations

All backups are saved in:
```
/Users/abhi/Desktop/BISMAN ERP/database-backups/
├── local_backup_20251126_HHMMSS.sql
├── schema_20251126_HHMMSS.sql
└── data_20251126_HHMMSS.sql
```

---

## 🆘 Need Help?

1. **Check script output** - It provides detailed feedback
2. **View logs** - `railway logs` (if using Railway CLI)
3. **Verify URL** - Ensure DATABASE_URL is correct
4. **Check permissions** - Ensure database user has proper access

---

## ✨ Ready to Migrate!

**Your database schema is ready to be migrated to Railway.**

Run this command to start:

```bash
export RAILWAY_DATABASE_URL="your_railway_database_url"
bash scripts/migrate-to-railway.sh full
```

**Good luck with your migration!** 🚀

---

*Last Updated: November 26, 2025*  
*Script Location: scripts/migrate-to-railway.sh*
