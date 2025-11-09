# 🔍 Mattermost Deployment Troubleshooting - Current Status

## 📊 Current Configuration

**Project:** discerning-creativity (Railway)  
**Service:** mattermost  
**Domain:** https://mattermost-production-a73f.up.railway.app  
**Status:** ❌ 502 Bad Gateway (Application not responding)

### Database Connection
```
Host: crossover.proxy.rlwy.net:32852
Database: railway
User: postgres
Password: wIFJmwSmTyGGjAxYdLScYEwFHFMwDqku
Connection: ✅ Verified working
```

### Environment Variables Set
```bash
MM_SERVICESETTINGS_SITEURL=https://mattermost-production-a73f.up.railway.app
MM_SQLSETTINGS_DRIVERNAME=postgres
MM_SQLSETTINGS_DATASOURCE=postgresql://postgres:wIFJmwSmTyGGjAxYdLScYEwFHFMwDqku@crossover.proxy.rlwy.net:32852/railway?sslmode=require
MM_FILESETTINGS_DRIVERNAME=local
MM_FILESETTINGS_DIRECTORY=/mattermost/data
MM_PLUGINSETTINGS_ENABLE=true
MM_SERVICESETTINGS_ENABLEPERSONALACCESSTOKENS=true
MM_SERVICESETTINGS_ENABLEUSERACCESSTOKENS=true
MM_TEAM_SLUG=erp
```

## 🚨 Issue: 502 Bad Gateway

**What this means:**
- The container is running (not 404)
- But Mattermost application is not responding
- Likely causes:
  1. Application crashed during startup
  2. Port binding issue
  3. Database schema initialization hanging
  4. Missing required environment variable

## 🔍 Debugging Steps

### 1. Check Railway Dashboard Logs

**Dashboard URL:** https://railway.com/project/0b8483e1-21c1-4547-93b6-f9fccdfc5443/service/709e60b3-e717-437b-a458-914dedb54c0a

**Look for these error patterns:**

#### Database Connection Errors:
```
ERROR: could not connect to database
FATAL: password authentication failed
ERROR: database "railway" does not exist
```

#### Port Binding Errors:
```
ERROR: bind: address already in use
ERROR: listen tcp :8065: bind: cannot assign requested address
```

#### Mattermost Startup Errors:
```
panic: runtime error
ERROR: Failed to initialize database
ERROR: failed to ping DB
```

### 2. Common Fixes

#### If you see "database does not exist":
```bash
# Create mattermost schema in railway database
PGPASSWORD='wIFJmwSmTyGGjAxYdLScYEwFHFMwDqku' psql -h crossover.proxy.rlwy.net -p 32852 -U postgres -d railway -c "CREATE SCHEMA IF NOT EXISTS mattermost;"
```

#### If you see port binding errors:
The docker-entrypoint.sh should handle this, but verify Railway sets PORT variable.

#### If you see "failed to ping DB":
Database is accessible (we verified), so this would be a connection string format issue.

### 3. Test Commands

#### Verify database from Railway's perspective:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
railway run psql $MM_SQLSETTINGS_DATASOURCE -c "SELECT 1;"
```

#### Check all environment variables:
```bash
railway variables
```

#### Force rebuild:
```bash
railway up --detach
```

## 🛠️ Potential Solutions

### Solution 1: Simplify Database Connection

Instead of using `railway` database, create a dedicated `mattermost` database:

```bash
# Connect to Railway PostgreSQL
PGPASSWORD='wIFJmwSmTyGGjAxYdLScYEwFHFMwDqku' psql -h crossover.proxy.rlwy.net -p 32852 -U postgres -d railway

# Create mattermost database
CREATE DATABASE mattermost;

# Exit
\q
```

Then update Railway:
```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
railway variables --set "MM_SQLSETTINGS_DATASOURCE=postgresql://postgres:wIFJmwSmTyGGjAxYdLScYEwFHFMwDqku@crossover.proxy.rlwy.net:32852/mattermost?sslmode=require"
railway up --detach
```

### Solution 2: Use Railway Variable Reference

If PostgreSQL is in the same Railway project:

```bash
railway variables --set 'MM_SQLSETTINGS_DATASOURCE=${{Postgres.DATABASE_URL}}'
railway up --detach
```

### Solution 3: Check Dockerfile Entrypoint

Verify the entrypoint script is executable and correct:

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/devops/mattermost/railway"
ls -la docker-entrypoint.sh
cat docker-entrypoint.sh
```

Should show:
- Executable permissions: `-rwxr-xr-x`
- Shebang: `#!/bin/sh`
- PORT handling: `export MM_SERVICESETTINGS_LISTENADDRESS=":${PORT:-8065}"`

### Solution 4: Add Healthcheck Delay

Mattermost might need more time to start. Update railway.json:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/api/v4/system/ping",
    "healthcheckTimeout": 600,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 📋 What to Share

Please share from Railway dashboard:

1. **Last 30-50 lines of deployment logs**
2. **Any error messages** (especially in red)
3. **Build status** (Building, Deployed, Failed, Crashed)
4. **Deployment timeline** (how long it's been running)

## 🎯 Next Steps

1. ✅ Open Railway dashboard (already opened)
2. ⏳ Find and copy the error logs
3. ⏳ Share the logs here
4. ⏳ Apply appropriate fix based on error

## 📚 Reference

**Project Structure:**
```
devops/mattermost/railway/
├── Dockerfile
├── docker-entrypoint.sh
├── railway.json
├── .env.railway
├── deploy.sh
└── check-deployment.sh
```

**Railway Build Logs:** https://railway.com/project/0b8483e1-21c1-4547-93b6-f9fccdfc5443/service/709e60b3-e717-437b-a458-914dedb54c0a?id=32cf0a81-3cd4-42fe-8b80-36bf39302a85

---

**Status:** 🔍 Awaiting Railway dashboard logs to diagnose 502 error  
**Time:** 8 Nov 2025, 1:10 AM
