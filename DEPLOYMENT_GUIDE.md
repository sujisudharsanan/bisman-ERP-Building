# 🚀 Railway Deployment Guide - Separate Services

## ✅ What Was Fixed

The issue was: **Railway was still using the old monolithic `Dockerfile`**

### Solution Applied:
1. Updated `railway.toml` to point to `Dockerfile.frontend`
2. Created `railway.backend.toml` for backend deployments
3. Pushed changes to trigger automatic Railway deployment

## Current Status

### Frontend Service (Active):
- ✅ `railway.toml` → `Dockerfile.frontend`
- ✅ Auto-deploys from GitHub `deployment` branch
- ✅ Service: bisman-ERP-frontend

### Backend Service (Needs Manual Config):
- 📝 Template: `railway.backend.toml`
- ⚠️ Needs Railway Dashboard configuration

## How to Deploy Each Service

### Deploy Frontend (Current - AUTO):
```bash
# Already configured! Just push:
git push origin deployment
# Railway auto-deploys using Dockerfile.frontend
```

### Deploy Backend (Manual Setup Required):

**Option 1: Railway Dashboard (Recommended)**
1. Go to Railway Dashboard
2. Select **bisman-ERP-backend** service
3. Settings → Build → Dockerfile Path: `Dockerfile.backend`
4. Save and redeploy

**Option 2: Switch railway.toml**
```bash
# Backup current config
cp railway.toml railway.frontend.toml

# Use backend config
cp railway.backend.toml railway.toml

# Deploy
git add railway.toml
git commit -m "chore: switch to backend deployment config"
git push origin deployment

# Then switch back to frontend
cp railway.frontend.toml railway.toml
git add railway.toml
git commit -m "chore: switch back to frontend config"
git push origin deployment
```

## Files Overview

| File | Purpose |
|------|---------|
| `railway.toml` | **Active config** (currently: frontend) |
| `railway.backend.toml` | Backend template config |
| `railway.json` | Additional JSON config (frontend) |
| `Dockerfile.frontend` | Frontend build instructions |
| `Dockerfile.backend` | Backend build instructions |

## Verification

Check if frontend is deploying correctly:
```bash
railway logs
```

Expected output:
- Should show `Using Detected Dockerfile`
- Should reference `Dockerfile.frontend`
- Should start Next.js server

## Next Steps

1. ✅ Frontend deploys automatically (done)
2. ⚠️ Configure backend service in Railway Dashboard
3. ✅ Monitor logs: `railway logs`

## Important Notes

- **One railway.toml per repo** - Railway reads from root
- **Separate services need dashboard config** for different Dockerfiles
- **Best practice**: Configure Dockerfile path in Railway Dashboard UI for each service
