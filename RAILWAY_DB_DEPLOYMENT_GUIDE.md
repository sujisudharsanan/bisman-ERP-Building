# 🚀 Railway Database Deployment Guide

## Current Status
- ✅ Git changes committed and pushed to `deployment` branch
- ✅ Prisma schema updated with user profile tables
- ✅ Prisma migrations ready in `prisma/migrations/`
- ✅ Railway CLI installed (v4.11.0)
- ⏳ Ready to deploy database changes to Railway

## 🎯 Methods to Push DB Changes to Railway

### Method 1: Automatic Deployment (Recommended)
When you push to git, Railway automatically:
1. Detects changes in your codebase
2. Runs `npm run build` (which includes `prisma generate`)
3. Runs `npm run db:migrate:deploy` (if configured in start script)

**Current Setup:**
- Your `package.json` has: `"start:deploy": "node scripts/start-with-migrate.js"`
- This script should run migrations before starting the server

**To trigger:**
```bash
# Already done - your git push will trigger Railway deployment
git push origin deployment
```

**Check deployment status:**
1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your project
3. Check the deployment logs
4. Look for migration output

---

### Method 2: Manual Migration via Railway CLI

#### Step 1: Link to Railway Project
```bash
cd my-backend
railway link
```

#### Step 2: Run Migrations on Railway Database
```bash
# This connects to Railway's production database and runs migrations
railway run npm run db:migrate:deploy
```

**Expected Output:**
```
Applying migration `20251201_0000_baseline_init`
Applying migration `20251119_add_thread_members_and_call_logs`
... (other migrations)
✔ Applied 5 migrations in 2.3s
```

#### Step 3: Verify Migrations
```bash
# Check migration status
railway run npx prisma migrate status
```

---

### Method 3: Run Seed Script on Railway

If you want to populate demo users on Railway:

```bash
cd my-backend

# Run the comprehensive seed script
railway run npx ts-node prisma/seed-complete-users.ts

# Or if using the simple seed
railway run node scripts/seed-demo-users.js
```

---

### Method 4: Direct Database Access

If you need to manually check or run SQL:

#### Connect to Railway PostgreSQL
```bash
# Open Railway console
railway run psql $DATABASE_URL
```

#### Or get the connection string
```bash
# Get DATABASE_URL from Railway
railway variables

# Then connect locally
psql "postgresql://postgres:PASSWORD@host:port/database?sslmode=require"
```

---

## 🔍 Verification Steps

### 1. Check Tables Were Created
```bash
railway run psql $DATABASE_URL -c "\dt"
```

**Expected tables:**
- users
- user_profiles
- user_addresses
- user_kyc
- user_bank_accounts
- user_education
- user_skills
- user_achievements
- user_emergency_contacts
- user_branch_assignments
- branches
- (... other existing tables)

### 2. Check Migration History
```bash
railway run npx prisma migrate status
```

### 3. Test the Backend on Railway
```bash
# Your Railway backend URL
curl https://your-app.up.railway.app/api/health

# Test login with demo user
curl -X POST https://your-app.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arun.kumar@bisman.demo","password":"Demo@123"}'
```

---

## 📋 Pre-Deployment Checklist

- [x] Prisma schema is up to date
- [x] Migrations are generated
- [x] Code is committed to git
- [x] Code is pushed to `deployment` branch
- [ ] Railway environment variables are set
- [ ] DATABASE_URL is configured in Railway
- [ ] JWT_SECRET is set in Railway
- [ ] REDIS_URL is set in Railway (if using Redis)
- [ ] FRONTEND_URL is set in Railway

---

## 🔐 Railway Environment Variables

Make sure these are set in Railway Dashboard → Variables:

```bash
NODE_ENV=production
DATABASE_URL=<provided by Railway PostgreSQL plugin>
JWT_SECRET=<your-secret-key>
JWT_REFRESH_SECRET=<your-refresh-secret>
ENCRYPTION_KEY=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
REDIS_URL=<provided by Railway Redis plugin, optional>
FRONTEND_URL=https://your-frontend.up.railway.app
PORT=<automatically set by Railway>
```

---

## 🚨 Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution:**
```bash
# Reset migration history (CAUTION: only in development)
railway run npx prisma migrate resolve --applied 20251201_0000_baseline_init

# Or force reset (drops all data)
railway run npx prisma migrate reset --force
```

### Issue: Cannot connect to Railway database
**Solution:**
```bash
# Check if DATABASE_URL is set
railway variables | grep DATABASE_URL

# Test connection
railway run node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => console.log('Connected!')).catch(e => console.error(e))"
```

### Issue: Seed script fails
**Solution:**
1. Make sure super_admin exists in Railway database
2. Make sure client exists in Railway database
3. Run setup script first:
```bash
railway run node setup-eazymiles-client-only.js
```

---

## ⚡ Quick Start Commands

```bash
# 1. Navigate to backend
cd my-backend

# 2. Link to Railway (if not already linked)
railway link

# 3. Run migrations
railway run npm run db:migrate:deploy

# 4. Verify migrations
railway run npx prisma migrate status

# 5. Seed demo users (optional)
railway run npx ts-node prisma/seed-complete-users.ts

# 6. Test the deployment
curl https://your-app.up.railway.app/api/health
```

---

## 📊 Current Database Schema

### New Profile Tables (Added)
- ✅ **user_profiles**: Employee details, personal info
- ✅ **user_addresses**: Permanent, current, office addresses
- ✅ **user_kyc**: PAN, Aadhaar, verification status
- ✅ **user_bank_accounts**: Bank details for salary
- ✅ **user_education**: Degrees, institutions
- ✅ **user_skills**: Skill name, proficiency level
- ✅ **user_achievements**: Awards, recognition
- ✅ **user_emergency_contacts**: Emergency contact details
- ✅ **user_branch_assignments**: User-branch mapping

### Existing Tables (Unchanged)
- users
- super_admins
- clients
- branches
- modules
- routes
- rbac_routes
- rbac_actions
- rbac_permissions
- (... and all other existing tables)

---

## 🎉 Next Steps After Deployment

1. **Verify Backend is Running**
   - Check Railway logs
   - Test health endpoint: `/api/health`

2. **Test Login with Demo Users**
   - Try logging in with: `arun.kumar@bisman.demo` / `Demo@123`
   - Verify user profile data is returned

3. **Monitor Performance**
   - Check Railway metrics dashboard
   - Monitor database connection pool
   - Watch for errors in logs

4. **Setup Frontend**
   - Update `NEXT_PUBLIC_API_URL` to point to Railway backend
   - Deploy frontend to Railway or Vercel
   - Test end-to-end flow

---

## 📞 Support Resources

- **Railway Docs**: https://docs.railway.app/
- **Prisma Docs**: https://www.prisma.io/docs/
- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Status**: https://status.railway.app/

---

**Last Updated**: November 27, 2025
**Commit**: 8082a0b9 - Production readiness and user profiles update
