# 🎉 Mattermost Database Setup Complete!

## ✅ Database Created Successfully

**Database Details:**
- **Host:** shuttle.proxy.rlwy.net
- **Port:** 15067
- **Database:** mattermost_db
- **User:** mm_user
- **Password:** Suji@335960 (URL-encoded: Suji%40335960)

**Connection String:**
```
postgres://mm_user:Suji%40335960@shuttle.proxy.rlwy.net:15067/mattermost_db?sslmode=require
```

## 📋 Next Steps: Deploy Mattermost

### Option 1: Using Railway Dashboard (Recommended)

1. **Go to Railway Dashboard:**
   - Open https://railway.com
   - Select project: `discerning-creativity`

2. **Add Mattermost Service:**
   - Click "New Service" → "Empty Service"
   - Name it: `Mattermost`

3. **Configure the Service:**
   - Go to Settings → Source
   - Connect to GitHub and select this repo
   - Set Root Directory: `devops/mattermost/railway`
   - Set Builder: `Dockerfile`

4. **Set Environment Variables:**
   Go to Variables tab and add these:

```bash
MM_SQLSETTINGS_DATASOURCE=postgres://mm_user:Suji%40335960@shuttle.proxy.rlwy.net:15067/mattermost_db?sslmode=require
MM_SQLSETTINGS_DRIVERNAME=postgres
MM_SERVICESETTINGS_LISTENADDRESS=:8065
MM_LOGSETTINGS_ENABLECONSOLE=true
MM_FILESETTINGS_DIRECTORY=/mattermost/data
MM_FILESETTINGS_DRIVERNAME=local
MM_PLUGINSETTINGS_ENABLE=true
MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true
MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true
MM_TEAM_SLUG=erp
PORT=8065
```

5. **Generate Domain:**
   - Go to Settings → Networking
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://mattermost-production-xyz.up.railway.app`)

6. **Set Site URL:**
   - Go back to Variables
   - Add: `MM_SERVICESETTINGS_SITEURL=<your-generated-domain>`

7. **Deploy:**
   - Service should auto-deploy
   - Check Deployments tab for logs
   - Wait 2-3 minutes for database initialization

### Option 2: Using Railway CLI (when network is stable)

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"

# Link to project (select Mattermost service when created)
railway link

# Set all environment variables
railway variables --set "MM_SQLSETTINGS_DATASOURCE=postgres://mm_user:Suji%40335960@shuttle.proxy.rlwy.net:15067/mattermost_db?sslmode=require"
railway variables --set "MM_SQLSETTINGS_DRIVERNAME=postgres"
railway variables --set "MM_SERVICESETTINGS_LISTENADDRESS=:8065"
railway variables --set "MM_LOGSETTINGS_ENABLECONSOLE=true"
railway variables --set "MM_FILESETTINGS_DIRECTORY=/mattermost/data"
railway variables --set "MM_FILESETTINGS_DRIVERNAME=local"
railway variables --set "MM_PLUGINSETTINGS_ENABLE=true"
railway variables --set "MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true"
railway variables --set "MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true"
railway variables --set "MM_TEAM_SLUG=erp"
railway variables --set "PORT=8065"

# Deploy
railway up --detach

# Get domain and set site URL
DOMAIN=$(railway domain)
railway variables --set "MM_SERVICESETTINGS_SITEURL=$DOMAIN"
railway up --detach

# Test after 2-3 minutes
curl $DOMAIN/api/v4/system/ping
```

## 🔍 Testing & Verification

### 1. Test Health Endpoint
```bash
curl https://your-mattermost-url.up.railway.app/api/v4/system/ping
```

**Expected Response:**
```json
{"status":"OK"}
```

### 2. Access Web Interface
Open `https://your-mattermost-url.up.railway.app` in browser

### 3. Create Admin Account
- First user to register becomes System Admin
- Email: admin@yourdomain.com
- Password: (secure password)

### 4. Generate Personal Access Token
1. Login as admin
2. Profile → Security → Personal Access Tokens
3. Click "Create Token"
4. Description: `ERP Integration`
5. **Copy the token** (shown only once!)

## 🔧 Frontend Integration

### Update `.env.local`

```bash
# In my-frontend/.env.local
MM_BASE_URL=https://your-mattermost-url.up.railway.app
MM_ADMIN_TOKEN=<your-personal-access-token>
NEXT_PUBLIC_MM_TEAM_SLUG=erp
```

### Test Integration

```bash
# Restart frontend
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"
npm run dev

# Test endpoints
curl http://localhost:3000/api/mattermost/health
```

Expected: `{"status":"ok","ping":"OK"}`

## 📁 Files Ready for Deployment

All files are already in place:
- ✅ `Dockerfile` - Mattermost container configuration
- ✅ `railway.json` - Railway build settings  
- ✅ `.env.railway` - Environment variable template
- ✅ Frontend API routes - health, login, provision

## 🎯 Summary

- ✅ **Database:** mattermost_db created on Railway PostgreSQL
- ✅ **User:** mm_user with full privileges
- ✅ **Connection:** Verified working
- ⏳ **Next:** Deploy Mattermost service using Option 1 or 2 above

---

**Ready to deploy!** Choose Option 1 (Dashboard) if you prefer visual interface, or Option 2 (CLI) when network is stable.
