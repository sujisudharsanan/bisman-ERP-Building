# Mattermost Railway Deployment - Railway PostgreSQL

## ✅ Current Configuration

**Database:** Railway PostgreSQL  
**Host:** crossover.proxy.rlwy.net:32852  
**Database Name:** mattermost_db  
**User:** mm_user  
**Password:** Suji@335960 (URL-encoded as Suji%40335960)  
**Connection String:** `postgres://mm_user:Suji%40335960@crossover.proxy.rlwy.net:32852/mattermost_db?sslmode=require`  
**Mattermost URL:** https://mattermost-production.up.railway.app

## 🚀 Deployment Status

### Environment Variables Set:
- ✅ `MM_SERVICESETTINGS_SITEURL=https://mattermost-production.up.railway.app`
- ✅ `MM_SQLSETTINGS_DRIVERNAME=postgres`
- ✅ `MM_SQLSETTINGS_DATASOURCE=postgres://mm_user:Suji%40335960@crossover.proxy.rlwy.net:32852/mattermost_db?sslmode=require`
- ✅ `MM_FILESETTINGS_DRIVERNAME=local`
- ✅ `MM_FILESETTINGS_DIRECTORY=/mattermost/data`
- ✅ `MM_PLUGINSETTINGS_ENABLE=true`
- ✅ `MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true`
- ✅ `MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true`
- ✅ `MM_TEAM_SLUG=erp`

### Files Created:
- ✅ `Dockerfile` - Uses official Mattermost image with custom entrypoint
- ✅ `docker-entrypoint.sh` - Handles Railway's dynamic PORT variable
- ✅ `railway.json` - Railway build configuration
- ✅ `.env.railway` - Environment variable template

## 🔍 Testing Deployment

### Quick Test:
```bash
curl https://mattermost-production.up.railway.app/api/v4/system/ping
```

**Expected Response:**
```json
{"status":"OK"}
```

### Check Logs:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
railway logs --lines 100
```

### Open Dashboard:
```bash
railway open
```

## 📝 Next Steps

### 1. Access Mattermost
Open in browser: https://mattermost-production.up.railway.app

### 2. Create Admin Account
- The first user to register becomes the System Admin
- Use a secure email and password
- Complete the setup wizard

### 3. Generate Personal Access Token
1. Log in as admin
2. Click profile picture → System Console
3. Go to: Integrations → Integration Management
4. Ensure "Enable Personal Access Tokens" is ON (should be)
5. Go back to your profile → Security → Personal Access Tokens
6. Click "Create Token"
7. Description: `ERP Integration`
8. Copy the token (you'll only see it once!)

### 4. Update Frontend Configuration
Edit `my-frontend/.env.local`:
```bash
# Add these lines
MM_BASE_URL=https://mattermost-production.up.railway.app
MM_ADMIN_TOKEN=<paste-your-token-here>
NEXT_PUBLIC_MM_TEAM_SLUG=erp
```

### 5. Restart Frontend
```bash
# Stop the current dev server (Ctrl+C)
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev
```

### 6. Test Integration
- Health check: http://localhost:3000/api/mattermost/health
- Chat UI: http://localhost:3000/chat

## 🔧 Troubleshooting

### If Mattermost doesn't start:

**Check build logs:**
```bash
railway logs --lines 200
```

**Common issues:**
1. **Database connection error** - Verify Railway PostgreSQL is in the same project
2. **Port binding error** - The entrypoint script should handle this automatically
3. **Database schema initialization** - First boot takes 1-2 minutes to set up tables

### Update Database Connection:

If you need to use a different database or update credentials:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"

# Using Railway reference (if PostgreSQL is in same project)
railway variables --set 'MM_SQLSETTINGS_DATASOURCE=${{Postgres.DATABASE_URL}}'

# Or manual connection
railway variables --set "MM_SQLSETTINGS_DATASOURCE=postgresql://user:password@host:port/database?sslmode=require"

# Redeploy
railway up --detach
```

## 📊 Railway Database Info

**Connection Details:**
- **Host:** crossover.proxy.rlwy.net
- **Port:** 32852
- **Database:** railway (or check Railway dashboard)
- **User:** postgres (or check Railway dashboard)

**Get credentials from Railway:**
1. Open Railway dashboard
2. Click PostgreSQL service
3. Go to "Variables" tab
4. Copy `PGUSER`, `PGPASSWORD`, `PGDATABASE`

## 🔄 Redeploying

After any configuration changes:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
railway up --detach

# Wait 60-90 seconds, then test
sleep 60
curl https://mattermost-production.up.railway.app/api/v4/system/ping
```

## 📚 Additional Resources

- [Mattermost Documentation](https://docs.mattermost.com/)
- [Mattermost API Reference](https://api.mattermost.com/)
- [Railway Documentation](https://docs.railway.app/)
- [Personal Access Tokens](https://docs.mattermost.com/developer/personal-access-tokens.html)
