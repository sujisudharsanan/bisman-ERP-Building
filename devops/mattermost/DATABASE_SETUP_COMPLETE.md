# ✅ Mattermost Database Setup Complete

## 🎯 What Was Done

### 1. Created Dedicated Mattermost Database
- **Database Name:** `mattermost_db`
- **User:** `mm_user`
- **Password:** `Suji@335960`
- **Host:** `crossover.proxy.rlwy.net:32852`

### 2. SQL Executed Successfully
```sql
-- Created database: mattermost_db
-- Created user: mm_user with password
-- Granted all privileges to mm_user on mattermost_db
```

### 3. Updated Railway Environment Variables
```bash
MM_SQLSETTINGS_DATASOURCE=postgres://mm_user:Suji%40335960@crossover.proxy.rlwy.net:32852/mattermost_db?sslmode=require
```

**Note:** The `%40` is the URL-encoded version of `@` in the password `Suji@335960`

### 4. Redeployed Mattermost
- Deployment initiated at: 8 Nov 2025, 12:56 AM
- Build logs: https://railway.com/project/431928cb-4615-4651-8963-5d85b3843545/service/ae640dfd-bee7-4aa5-aafd-7fc85c1c3a71

## 🔍 Verification

### Test Database Connection
```bash
PGPASSWORD='Suji@335960' psql -h crossover.proxy.rlwy.net -p 32852 -U mm_user -d mattermost_db -c "SELECT current_database(), current_user;"
```

**Expected Output:**
```
 current_database | current_user 
------------------+--------------
 mattermost_db    | mm_user
```

### Test Mattermost API
```bash
curl https://mattermost-production.up.railway.app/api/v4/system/ping
```

**Expected Response:**
```json
{"status":"OK"}
```

## 📊 Database Schema

On first boot, Mattermost will automatically create all necessary tables in the `mattermost_db` database:

- Users, Teams, Channels
- Posts, Reactions, Files
- Permissions, Roles, Schemes
- Webhooks, Integrations, Tokens
- Audit logs, Compliance data
- And 60+ other tables

This process takes **1-2 minutes** on first deployment.

## 🔐 Security Notes

✅ **Dedicated database** - Mattermost has its own isolated database  
✅ **Dedicated user** - `mm_user` has access only to `mattermost_db`  
✅ **SSL enabled** - Connection uses `sslmode=require`  
✅ **Strong password** - Password includes special characters  

## 🚀 Next Steps (After Deployment Completes)

### 1. Wait for Deployment (90 seconds)
The current deployment should complete around **12:58 AM**

### 2. Verify Mattermost is Running
```bash
curl https://mattermost-production.up.railway.app/api/v4/system/ping
```

### 3. Access Mattermost Web UI
Open: https://mattermost-production.up.railway.app

### 4. Create Admin Account
- Click "Create an account"
- Email: your-admin-email@example.com
- Username: admin
- Password: (secure password)
- **First user becomes System Admin**

### 5. Generate Personal Access Token
1. Log in as admin
2. Profile → Security → Personal Access Tokens
3. Click "Create Token"
4. Description: `ERP Integration`
5. **Copy the token** (shown only once!)

### 6. Update Frontend Configuration
Edit: `my-frontend/.env.local`

```bash
# Add these lines
MM_BASE_URL=https://mattermost-production.up.railway.app
MM_ADMIN_TOKEN=<paste-your-token-here>
NEXT_PUBLIC_MM_TEAM_SLUG=erp
```

### 7. Restart Frontend
```bash
# In the terminal running npm run dev:both
# Press Ctrl+C to stop

cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev
```

### 8. Test Integration
- Health: http://localhost:3000/api/mattermost/health
- Chat: http://localhost:3000/chat

## 📝 Database Credentials Reference

**For Manual Connection:**
```bash
Host: crossover.proxy.rlwy.net
Port: 32852
Database: mattermost_db
User: mm_user
Password: Suji@335960
SSL Mode: require
```

**Connection String (for code):**
```
postgres://mm_user:Suji%40335960@crossover.proxy.rlwy.net:32852/mattermost_db?sslmode=require
```

**Connection String (for terminal):**
```bash
PGPASSWORD='Suji@335960' psql -h crossover.proxy.rlwy.net -p 32852 -U mm_user -d mattermost_db
```

## 🔧 Troubleshooting

### If Deployment Fails

**Check logs:**
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
railway logs --lines 100
```

**Common Issues:**

1. **Database connection error**
   - Verify: `PGPASSWORD='Suji@335960' psql -h crossover.proxy.rlwy.net -p 32852 -U mm_user -d mattermost_db -c "SELECT 1"`
   - Should return: `?column? ---------- 1`

2. **Port binding error**
   - Check: Railway sets `PORT` variable dynamically
   - Our `docker-entrypoint.sh` handles this automatically

3. **Slow first boot**
   - Normal: Database schema initialization takes 1-2 minutes
   - Wait: Up to 3 minutes total for first deployment

### View Railway Dashboard

```bash
railway open
```

Go to: Deployments → Latest → Logs

## ✅ Checklist

- [x] Created `mattermost_db` database
- [x] Created `mm_user` with password
- [x] Granted database privileges
- [x] Updated Railway environment variable
- [x] Redeployed Mattermost
- [ ] Wait for deployment to complete (90 seconds)
- [ ] Verify health endpoint returns `{"status":"OK"}`
- [ ] Create admin account in web UI
- [ ] Generate Personal Access Token
- [ ] Update `my-frontend/.env.local`
- [ ] Test frontend integration

## 📚 Related Files

- Configuration: `devops/mattermost/railway/.env.railway`
- Dockerfile: `devops/mattermost/railway/Dockerfile`
- Entrypoint: `devops/mattermost/railway/docker-entrypoint.sh`
- Railway Config: `devops/mattermost/railway/railway.json`
- Full Guide: `devops/mattermost/RAILWAY_POSTGRES_SETUP.md`

---

**Status:** ⏳ Deployment in progress (started 8 Nov 2025, 12:56 AM)  
**Next:** Wait for deployment, then test health endpoint
