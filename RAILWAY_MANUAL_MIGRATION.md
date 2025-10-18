# Railway Database Setup - Manual Steps

## 🎯 Goal
Connect to Railway PostgreSQL and create all database tables so login works with real users (not dev fallback).

---

## 📋 Step-by-Step Instructions

### Step 1: Get Railway DATABASE_URL

1. Go to **Railway Dashboard**: https://railway.app/dashboard
2. Select your project: **bisman-erp-backend-production**
3. Click on the **PostgreSQL** service (database icon in your project)
4. Click **Variables** tab
5. Find **DATABASE_URL** and click to copy it

**Example format:**
```
postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:6789/railway
```

### Step 2: Set DATABASE_URL Locally

**Option A: Temporary (current terminal session only)**
```bash
export DATABASE_URL="postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:6789/railway"
```

**Option B: Persistent (create .env file)**
```bash
cd my-backend
echo 'DATABASE_URL="your-railway-url-here"' > .env.railway
```

### Step 3: Test Connection

```bash
cd my-backend
npx prisma db pull
```

**✅ Success:** Should see "Introspected X tables"  
**❌ Error:** Check DATABASE_URL format and network connection

### Step 4: Check Existing Tables

```bash
npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
EOF
```

### Step 5: Apply Migrations

**Method 1: Deploy migrations (recommended)**
```bash
npx prisma migrate deploy
```

**Method 2: Push schema directly (if migrations fail)**
```bash
npx prisma db push --accept-data-loss
```

**What this creates:**
- ✅ `users` table
- ✅ `user_sessions` table
- ✅ `rbac_roles` table
- ✅ `rbac_permissions` table
- ✅ `rbac_routes` table
- ✅ `rbac_actions` table
- ✅ `rbac_user_roles` table
- ✅ `audit_logs` table
- ✅ `recent_activity` table

### Step 6: Verify Tables Exist

```bash
npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF
```

**Expected output:**
```
actions
audit_logs
migration_history
rbac_actions
rbac_permissions
rbac_roles
rbac_routes
rbac_user_roles
recent_activity
roles
routes
user_sessions
users
```

### Step 7: Create Test Users (Optional)

**Option A: Use Prisma seed (if available)**
```bash
npx prisma db seed
```

**Option B: Create users manually with SQL**
```bash
npx prisma db execute --stdin <<EOF
-- Create a super admin user (password: 'password' hashed with bcrypt)
INSERT INTO users (username, email, password, role, created_at, updated_at)
VALUES 
  ('super', 'super@bisman.local', '\$2a\$10\$rI3F9.1HpLBvLcnGm2F8c.K9vXh9kXgYvH5xqgYvH5xqgYvH5xqgY', 'SUPER_ADMIN', NOW(), NOW()),
  ('admin', 'admin@bisman.local', '\$2a\$10\$rI3F9.1HpLBvLcnGm2F8c.K9vXh9kXgYvH5xqgYvH5xqgYvH5xqgY', 'ADMIN', NOW(), NOW());
EOF
```

**Note:** The password above is a bcrypt hash of "password". For production, use proper password hashing.

### Step 8: View Database in Browser

```bash
npx prisma studio
```

This opens a web interface at http://localhost:5555 where you can:
- Browse all tables
- View/edit data
- Verify migrations

---

## 🧪 Testing

### Test Login with Real Database

After migrations are complete, test login:

```bash
# Replace with your Railway URL
export RAILWAY_URL="https://bisman-erp-backend-production.up.railway.app"

# Test login
curl -X POST "$RAILWAY_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"super@bisman.local","password":"password"}' \
  -c cookies.txt -v
```

**Expected:** Set-Cookie headers with `access_token` and `refresh_token`

### Check Railway Logs

After migrations, Railway logs should show:

**✅ Good (using database):**
```
[app.js] Prisma client initialized
[app.js] ✅ Database connection successful
Login: DB user authenticated successfully
```

**❌ Bad (still using fallback):**
```
Login: DB operation failed, falling back to dev users
⚠️  DATABASE MIGRATION REQUIRED: Table does not exist
```

---

## 🔧 Troubleshooting

### Issue: "P2021: Table does not exist"

**Cause:** Migrations not applied

**Solution:**
```bash
cd my-backend
export DATABASE_URL="your-railway-url"
npx prisma migrate deploy
```

### Issue: "P1001: Can't reach database server"

**Cause:** Incorrect DATABASE_URL or network issue

**Check:**
1. DATABASE_URL format correct
2. Railway PostgreSQL service is running
3. No typos in connection string

### Issue: "Migration conflicts"

**Solution:** Reset and apply fresh schema
```bash
# ⚠️ WARNING: This deletes all data
npx prisma migrate reset --skip-seed

# Or push schema directly
npx prisma db push --force-reset
```

### Issue: Still using dev user fallback

**Cause:** Backend not connecting to database

**Check Railway environment variables:**
1. Go to Railway dashboard
2. Click backend service
3. Variables tab
4. Ensure `DATABASE_URL` is set correctly

---

## 🚀 Quick Commands

### Connect to Railway DB
```bash
export DATABASE_URL="postgresql://..."
cd my-backend
npx prisma studio
```

### Apply migrations
```bash
npx prisma migrate deploy
```

### Force schema update
```bash
npx prisma db push --accept-data-loss
```

### Generate Prisma client
```bash
npx prisma generate
```

### View all tables
```bash
npx prisma db execute --stdin <<EOF
\dt
EOF
```

---

## ✅ Success Checklist

After completing these steps:

- [ ] DATABASE_URL from Railway copied
- [ ] Connected to Railway DB successfully
- [ ] Migrations applied without errors
- [ ] Tables verified (users, user_sessions, rbac_* exist)
- [ ] Test users created (optional)
- [ ] Backend redeployed on Railway
- [ ] Login works without "dev user fallback" messages
- [ ] Multiple logins work (no 2-login limit)

---

## 📚 Additional Resources

- [Prisma Migrate Deploy Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production)
- [Railway PostgreSQL Docs](https://docs.railway.app/databases/postgresql)
- [Prisma Studio Docs](https://www.prisma.io/docs/concepts/components/prisma-studio)

---

## 🆘 Need Help?

If migrations still fail, you can:

1. **Check migration files:**
   ```bash
   ls -la my-backend/prisma/migrations/
   ```

2. **View migration status:**
   ```bash
   npx prisma migrate status
   ```

3. **Manual table creation:** Use the SQL from migration files directly

---

**Once migrations are complete, Railway will automatically use the real database on the next deployment!** 🎉
