# 🚀 Railway Database Setup - Complete Guide

## Problem
Login fails on Railway with error: **"Table 'users' does not exist"**

**Root Cause:** Database tables were never created. The `start-railway.sh` script runs `prisma migrate deploy`, but Railway's PostgreSQL is empty.

---

## ✅ Solution: Run Migrations Locally to Railway DB

You need to connect from your local machine to the Railway PostgreSQL database and create all tables.

---

## 🎯 Quick Setup (Recommended)

### 1. Get DATABASE_URL from Railway

1. Go to: https://railway.app/dashboard
2. Select project: **bisman-erp-backend-production**
3. Click **PostgreSQL** service
4. Click **Variables** tab
5. Copy the **DATABASE_URL** value

Example:
```
postgresql://postgres:abc123xyz@containers-us-west-123.railway.app:5432/railway
```

### 2. Run Quick Setup Script

```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
./quick-railway-setup.sh "YOUR_DATABASE_URL_HERE"
```

**That's it!** The script will:
- ✅ Connect to Railway database
- ✅ Create all tables (users, user_sessions, rbac_*, etc.)
- ✅ Verify tables exist
- ✅ Generate Prisma client

### 3. Verify in Railway Logs

After the next deployment, Railway logs should show:
```
🚀 Railway startup script
📦 Running database migrations...
✅ Migrations complete
[app.js] ✅ Database connection successful
```

### 4. Test Login

```bash
curl -X POST "https://bisman-erp-backend-production.up.railway.app/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"super@bisman.local","password":"password"}' \
  -v
```

Should return **Set-Cookie** headers with tokens.

---

## 📋 Manual Setup (Alternative)

If the quick script doesn't work, follow these manual steps:

### Step 1: Set DATABASE_URL

```bash
export DATABASE_URL="postgresql://postgres:PASSWORD@railway.app:PORT/railway"
```

### Step 2: Navigate to Backend

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"
```

### Step 3: Test Connection

```bash
npx prisma db pull
```

Expected: "Introspected X tables" or "Database is empty"

### Step 4: Push Schema (Creates All Tables)

```bash
npx prisma db push --accept-data-loss
```

This creates:
- ✅ users
- ✅ user_sessions  
- ✅ rbac_roles
- ✅ rbac_permissions
- ✅ rbac_routes
- ✅ rbac_actions
- ✅ rbac_user_roles
- ✅ audit_logs
- ✅ recent_activity
- ✅ migration_history

### Step 5: Verify Tables

```bash
npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
EOF
```

Should list all tables above.

### Step 6: Generate Client

```bash
npx prisma generate
```

---

## 🧪 Testing

### Test 1: View Database

```bash
cd my-backend
export DATABASE_URL="your-railway-url"
npx prisma studio
```

Opens http://localhost:5555 where you can browse all tables.

### Test 2: Check Railway Logs

After redeployment, look for:

**✅ Success:**
```
🚀 Railway startup script
📦 Running database migrations...
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database
✅ Migrations complete
[app.js] ✅ Database connection successful
```

**❌ Still broken:**
```
⚠️  DATABASE MIGRATION REQUIRED: Table does not exist
Login: DB operation failed, falling back to dev users
```

### Test 3: API Login

```bash
curl -X POST "https://bisman-erp-backend-production.up.railway.app/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"super@bisman.local","password":"password"}' \
  -c cookies.txt -v

# Then test /api/me
curl "https://bisman-erp-backend-production.up.railway.app/api/me" \
  -b cookies.txt
```

Should return user data from database (not dev fallback).

---

## 🔧 Troubleshooting

### Issue: "P1001: Can't reach database server"

**Cause:** Wrong DATABASE_URL or network issue

**Fix:**
1. Double-check DATABASE_URL from Railway (no typos)
2. Ensure PostgreSQL service is running in Railway
3. Check your internet connection

### Issue: "P2021: Table does not exist" (after migration)

**Cause:** Migration didn't actually run

**Fix:**
```bash
export DATABASE_URL="your-railway-url"
cd my-backend
npx prisma db push --force-reset
```

### Issue: Still using dev user fallback

**Cause:** Railway environment variable not set

**Fix:**
1. Go to Railway dashboard
2. Click your **backend service** (not database)
3. Variables tab
4. Ensure `DATABASE_URL` exists (should be auto-set by Railway)
5. If missing, copy from PostgreSQL service variables

### Issue: "Migration conflicts"

**Cause:** Old migration file incompatible with schema

**Fix:** Delete old migration and push fresh schema
```bash
cd my-backend
rm -rf prisma/migrations/20250926_add_roles_table
npx prisma db push --force-reset
```

---

## 📊 What Tables Should Exist?

After successful migration, you should have:

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `user_sessions` | Login sessions & tokens |
| `rbac_roles` | User roles (SUPER_ADMIN, ADMIN, etc.) |
| `rbac_permissions` | Role-based permissions |
| `rbac_routes` | Protected API routes |
| `rbac_actions` | Available actions (create, read, etc.) |
| `rbac_user_roles` | User → Role mappings |
| `audit_logs` | Activity tracking |
| `recent_activity` | Recent user actions |
| `roles` | Legacy roles table |
| `routes` | Legacy routes table |
| `actions` | Legacy actions table |
| `migration_history` | Migration tracking |

---

## 🎉 Success Criteria

After completing setup:

- [ ] ✅ DATABASE_URL copied from Railway
- [ ] ✅ Connected to Railway database successfully
- [ ] ✅ Schema pushed (`npx prisma db push`)
- [ ] ✅ All tables exist (verified with `prisma studio` or SQL query)
- [ ] ✅ Railway logs show "Database connection successful"
- [ ] ✅ Login works without "dev user fallback" messages
- [ ] ✅ Multiple logins work (no 2-login limit)
- [ ] ✅ Sessions persist after Railway redeploys

---

## 🚨 Important Notes

1. **`prisma db push` vs `prisma migrate deploy`:**
   - `db push`: Fast, directly syncs schema (good for setup)
   - `migrate deploy`: Uses migration files (requires valid migrations)
   - Use `db push` for initial setup, then Railway will handle migrations

2. **Dev users vs Database users:**
   - Dev users: In-memory fallback (limited to 2 sessions)
   - Database users: Real PostgreSQL storage (unlimited)
   - Once tables exist, dev fallback won't be used

3. **Railway auto-migration:**
   - `start-railway.sh` runs `prisma migrate deploy` on every deployment
   - Once tables exist, it maintains schema automatically
   - No manual intervention needed after initial setup

---

## 📞 Need Help?

If you're still having issues:

1. **Check migration status:**
   ```bash
   cd my-backend
   export DATABASE_URL="your-railway-url"
   npx prisma migrate status
   ```

2. **View full schema:**
   ```bash
   npx prisma db pull
   cat prisma/schema.prisma
   ```

3. **Reset everything (⚠️ deletes data):**
   ```bash
   npx prisma migrate reset --force
   npx prisma db push
   ```

---

## 📚 Reference

- **Quick setup:** `./quick-railway-setup.sh "DATABASE_URL"`
- **Manual setup:** See "Manual Setup" section above
- **Full guide:** See `RAILWAY_MANUAL_MIGRATION.md`
- **Troubleshooting:** See "Troubleshooting" section above

---

**Once you run the setup script or manual steps, Railway will have all the tables it needs!** 🎉
