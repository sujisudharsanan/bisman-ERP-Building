# Railway Database Setup Guide

## 🎯 GOAL
Fix Prisma and authentication issues after deploying fullstack ERP (Next.js + Node.js + Prisma) to Railway.

## 🔍 CONTEXT
**Current Issue:**
- Backend deployed to Railway ✅
- Frontend deployed to Railway ✅
- **Problem:** Database tables don't exist
  - Tables "users", "user_sessions", "rbac_user_roles" missing
  - Prisma falls back to dev users (in-memory)
  - Login succeeds twice (dev fallback), then fails
  - CORS origin sometimes undefined (expected for same-origin SSR)

**Root Cause:** Prisma migrations were never run on Railway's PostgreSQL database.

---

## ✅ SOLUTION IMPLEMENTED

### 1. Automatic Migrations on Railway
Created `start-railway.sh` that runs migrations before starting the server:

```bash
#!/bin/sh
set -e

echo "🚀 Railway startup script"

# Run Prisma migrations (only on Railway with DATABASE_URL)
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Running database migrations..."
  npx prisma migrate deploy
  echo "✅ Migrations complete"
else
  echo "⚠️  No DATABASE_URL found, skipping migrations"
fi

# Start the application
echo "🎬 Starting server..."
exec node server.js
```

**What this does:**
- Checks if `DATABASE_URL` exists (Railway provides this automatically)
- Runs `prisma migrate deploy` to create all tables
- Starts the Node.js server

### 2. Updated Dockerfile
Modified Docker CMD to use startup script:
```dockerfile
# Copy startup script that runs migrations
COPY start-railway.sh /app/start-railway.sh
RUN chmod +x /app/start-railway.sh

ENTRYPOINT ["dumb-init", "--"]
CMD ["/app/start-railway.sh"]
```

---

## 🔧 LOCAL DATABASE SETUP

### Option A: Connect to Railway PostgreSQL Locally

1. **Get DATABASE_URL from Railway:**
   ```bash
   # In Railway dashboard:
   # Project → Variables → Copy DATABASE_URL
   ```

2. **Add to local `.env`:**
   ```bash
   DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"
   ```

3. **Test connection:**
   ```bash
   cd my-backend
   npx prisma db pull
   ```

### Option B: Use Local PostgreSQL

1. **Create `.env` in project root:**
   ```env
   # Backend Configuration
   NODE_ENV=development
   PORT=8080
   
   # Database (local PostgreSQL)
   DATABASE_URL="postgresql://postgres:password@localhost:5432/bisman_erp"
   
   # JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   JWT_SECRET=your-secret-here-32-chars-minimum
   ACCESS_TOKEN_SECRET=your-access-token-secret-here
   REFRESH_TOKEN_SECRET=your-refresh-token-secret-here
   
   # Cookie Configuration
   COOKIE_DOMAIN=localhost
   SECURE_COOKIES=false
   SAME_SITE_POLICY=lax
   
   # Redis (optional - will use in-memory if not provided)
   # REDIS_URL=redis://localhost:6379
   ```

2. **Create local database:**
   ```bash
   # Using psql
   psql -U postgres
   CREATE DATABASE bisman_erp;
   \q
   ```

3. **Run migrations:**
   ```bash
   cd my-backend
   npx prisma migrate deploy
   ```

   Or if you need to create a new migration:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed the database (if needed):**
   ```bash
   npx prisma db seed
   ```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Verify Railway Environment Variables

In Railway dashboard, ensure these are set:

**Required:**
- `DATABASE_URL` → Auto-provided by Railway PostgreSQL plugin ✅
- `NODE_ENV` → `production`
- `JWT_SECRET` → (generate below)
- `ACCESS_TOKEN_SECRET` → (generate below)
- `REFRESH_TOKEN_SECRET` → (generate below)

**Optional:**
- `REDIS_URL` → If using Redis for sessions
- `COOKIE_DOMAIN` → `.railway.app` (auto-detected)
- `SECURE_COOKIES` → `true` (auto-detected)
- `SAME_SITE_POLICY` → `lax` (default)

**Generate JWT Secrets:**
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ACCESS_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Push Changes to GitHub

```bash
git add -A
git commit -m "feat: add automatic Prisma migrations on Railway startup"
git push origin diployment
```

### Step 3: Railway Auto-Deploys

Railway will automatically:
1. Pull latest code from GitHub
2. Build Docker image
3. Run `start-railway.sh` which:
   - Runs `prisma migrate deploy`
   - Starts the server
4. Deploy to production

### Step 4: Monitor Deployment Logs

In Railway dashboard, watch for these log messages:

```
✅ Expected Success Logs:
🚀 Railway startup script
📦 Running database migrations...
✅ Migrations complete
🎬 Starting server...
[startup] Next.js loaded from frontend/node_modules
[app.js] Prisma client initialized
✅ Server listening on http://0.0.0.0:8080
```

```
❌ If You See Errors:
- "relation 'users' does not exist" → Migrations didn't run
- "Can't reach database server" → DATABASE_URL incorrect
- "Migration failed" → Check migration files for conflicts
```

### Step 5: Verify Tables Exist

After deployment, check Railway PostgreSQL:

**Via Railway CLI:**
```bash
railway run psql $DATABASE_URL -c "\dt"
```

**Expected tables:**
- users
- user_sessions
- rbac_roles
- rbac_permissions
- rbac_role_permissions
- rbac_user_roles
- (and others from your schema)

---

## 🧪 TESTING

### Test 1: Login with Database Users

```bash
# Replace with your Railway URL
export RAILWAY_URL="https://bisman-erp-backend-production.up.railway.app"

# Test login
curl -X POST "$RAILWAY_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"super@bisman.local","password":"password"}' \
  -c cookies.txt -v

# Should see: Set-Cookie with access_token and refresh_token
```

### Test 2: Verify User Endpoint

```bash
curl "$RAILWAY_URL/api/me" -b cookies.txt -v

# Should return user data from DATABASE, not dev fallback
```

### Test 3: Check Logs for DB Queries

Look for these in Railway logs:
```
✅ Good (using real database):
[authenticate] Authentication successful, user: super@bisman.local
[authenticate] User found in database

❌ Bad (still using fallback):
Database not available, using development user lookup
[authenticate] Using dev user lookup for subjectId: 100
```

---

## 🔒 CORS CONFIGURATION

The `my-backend/app.js` already handles CORS correctly:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, SSR, mobile apps, Postman)
    if (!origin) {
      console.log('[CORS] Request from origin: undefined');
      console.log('[CORS] Origin undefined is allowed.');
      return callback(null, true);
    }
    
    // Check against allowlist
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('.railway.app')) {
      console.log(`[CORS] Origin ${origin} is allowed.`);
      callback(null, true);
    } else {
      console.log(`[CORS] Origin ${origin} is BLOCKED.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
```

**Key Points:**
- `origin: undefined` is **ALLOWED** (same-origin SSR requests)
- `credentials: true` enables cookies
- Wildcard for `.railway.app` domains

---

## 🐛 DEBUGGING

### Issue: "Tables don't exist" after deployment

**Solution:**
1. Check Railway logs for migration output
2. Verify DATABASE_URL is set in Railway variables
3. Manually run migrations:
   ```bash
   railway run npx prisma migrate deploy
   ```

### Issue: Still using dev user fallback

**Cause:** Prisma client can't connect to database

**Check:**
1. DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
2. Railway PostgreSQL plugin is added to project
3. No firewall blocking Railway → PostgreSQL connection

**Fix:**
```bash
# In Railway console
railway run npx prisma db pull
railway run npx prisma migrate deploy
```

### Issue: Login succeeds twice then fails

**Cause:** In-memory token store reaches limit (2 tokens)

**Solution:** Database migrations will enable DB-backed sessions

---

## 📋 VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Railway logs show "✅ Migrations complete"
- [ ] Railway logs show "Prisma client initialized" (not fallback mode)
- [ ] Login returns Set-Cookie headers with access_token
- [ ] `/api/me` returns user data without "dev user lookup" logs
- [ ] Multiple logins work (not limited to 2)
- [ ] Sessions persist after server restart
- [ ] No "table does not exist" errors in logs

---

## 🎉 EXPECTED OUTCOME

After these changes:

1. ✅ Railway automatically runs migrations on every deployment
2. ✅ All database tables created (users, sessions, roles, permissions)
3. ✅ Login uses real database users, not dev fallback
4. ✅ Sessions stored in PostgreSQL, not in-memory
5. ✅ Unlimited logins (no 2-login limit)
6. ✅ CORS works correctly for same-origin SSR
7. ✅ No more "table does not exist" errors

---

## 📚 ADDITIONAL RESOURCES

- [Railway Docs: Database Setup](https://docs.railway.app/databases/postgresql)
- [Prisma Migrate Deploy](https://www.prisma.io/docs/concepts/components/prisma-migrate/migrate-development-production)
- [Railway CLI](https://docs.railway.app/develop/cli)

---

## 🆘 NEED HELP?

If migrations fail:
1. Check Railway logs for error details
2. Verify DATABASE_URL connection string
3. Try manual migration: `railway run npx prisma migrate deploy`
4. Reset database (⚠️ DELETES DATA): `railway run npx prisma migrate reset`
