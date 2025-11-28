# ✅ Railway Monorepo Configuration - COMPLETE

**Date:** November 29, 2025  
**Status:** 🟢 READY FOR DEPLOYMENT  
**Commit:** `e7e073be`

---

## 🎯 What Was Done

### ✅ Cleaned Up (Removed)
- ❌ `my-frontend/railway.json` (removed)
- ❌ `my-frontend/railway.toml` (removed)
- ❌ `my-backend/railway.json` (removed)
- ❌ `my-backend/railway.toml` (removed)
- ❌ `railway-frontend.toml` (removed)
- ❌ `railway-backend.toml` (removed)
- ❌ `railway.backend.toml` (removed)
- ❌ `railway.json.old-monorepo` (removed)
- ❌ `railway.toml.old-monorepo` (removed)

**Total removed:** 9 conflicting/duplicate config files

### ✅ Created (Fresh)
- ✅ `railway.json` (root, minimal placeholder)
- ✅ `railway.toml` (root, **PRIMARY CONFIG** for monorepo)
- ✅ `RAILWAY_MONOREPO_DEPLOYMENT.md` (comprehensive guide, 400+ lines)
- ✅ `RAILWAY_DEPLOY_CHECKLIST.md` (step-by-step checklist)

**Total created:** 4 new files (clean slate)

---

## 📁 Current Project Structure

```
BISMAN-ERP/                          ← Project root
│
├── railway.json                     ← Minimal Railway config
├── railway.toml                     ← PRIMARY monorepo config ⭐
│
├── my-frontend/                     ← Frontend service
│   ├── Dockerfile                  ← node:20-bullseye-slim (Prisma ready)
│   ├── package.json
│   ├── next.config.js
│   └── prisma/
│       └── schema.prisma
│
└── my-backend/                      ← Backend service
    ├── Dockerfile                  ← node:20-alpine (lightweight)
    ├── package.json
    ├── index.js                    ← Entry point (NOT server.js!)
    └── routes/
```

---

## 🔧 Configuration Details

### `railway.toml` (PRIMARY CONFIG)

This file defines **2 services** in the monorepo:

```toml
# Service 1: Frontend
[[services]]
name = "bisman-erp-frontend"
source = "my-frontend"              ← Railway looks in my-frontend/

[services.build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"       ← Uses my-frontend/Dockerfile

[services.deploy]
startCommand = "node server.js"
healthcheckPath = "/"

[services.watch]
patterns = ["my-frontend/**/*"]     ← Only redeploy on frontend changes

# Service 2: Backend
[[services]]
name = "bisman-erp-backend"
source = "my-backend"               ← Railway looks in my-backend/

[services.build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"       ← Uses my-backend/Dockerfile

[services.deploy]
startCommand = "node index.js"      ← Correct entry point
healthcheckPath = "/api/health"

[services.watch]
patterns = ["my-backend/**/*"]      ← Only redeploy on backend changes
```

---

## 🚨 CRITICAL: Root Directory Setting

**⚠️ Railway REQUIRES you to manually set Root Directory in Dashboard!**

Even with `railway.toml` config, you **MUST** set this in Railway Dashboard:

### For Frontend Service:
1. Railway Dashboard → Frontend Service → Settings
2. Find: **"Root Directory"** field
3. Set to: `my-frontend`
4. Click Save

### For Backend Service:
1. Railway Dashboard → Backend Service → Settings
2. Find: **"Root Directory"** field
3. Set to: `my-backend`
4. Click Save

**Without this, Railway will look in project root and fail!**

---

## 🐳 Dockerfile Summary

### Frontend (`my-frontend/Dockerfile`)

| Property | Value |
|----------|-------|
| Base Image | `node:20-bullseye-slim` |
| OS | Debian 11 (Bullseye) |
| OpenSSL | 1.1.x (libssl1.1) ✅ |
| Prisma | Compatible ✅ |
| Build Type | Multi-stage (deps→builder→runner) |
| User | `nextjs` (non-root) |
| Port | 3000 |
| Command | `node server.js` |

**Why Bullseye?** Prisma requires OpenSSL 1.1.x, which Debian Bullseye has. Bookworm has OpenSSL 3.x (incompatible).

### Backend (`my-backend/Dockerfile`)

| Property | Value |
|----------|-------|
| Base Image | `node:20-alpine` |
| OS | Alpine Linux |
| Size | Small (~40MB base) |
| Prisma | Not used in backend |
| Build Type | Standard |
| Port | 3001 |
| Command | `node index.js` ⚠️ (NOT server.js) |

---

## 🚀 Deployment Steps

### 1. Railway Dashboard Setup

#### Create Frontend Service:
```
Railway → New Project → GitHub Repo
├── Repo: sujisudharsanan/bisman-ERP-Building
├── Branch: deployment
├── Service Name: bisman-erp-frontend
└── Settings → Root Directory: my-frontend ⚠️
```

#### Create Backend Service:
```
Railway → New Service (same project) → GitHub Repo
├── Repo: sujisudharsanan/bisman-ERP-Building (same)
├── Branch: deployment
├── Service Name: bisman-erp-backend
└── Settings → Root Directory: my-backend ⚠️
```

### 2. Set Environment Variables

#### Frontend Env Vars:
```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://backend.railway.app
NEXTAUTH_URL=https://frontend.railway.app
NEXTAUTH_SECRET=random-32-chars
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### Backend Env Vars:
```bash
DATABASE_URL=postgresql://...
PORT=3001
NODE_ENV=production
JWT_SECRET=random-string
SESSION_SECRET=random-string
FRONTEND_URL=https://frontend.railway.app
```

### 3. Deploy

```bash
# Changes are already pushed (commit e7e073be)
# Railway will auto-deploy when you create the services
```

### 4. Verify

```bash
# Frontend
curl https://frontend.railway.app/
# Should return: 200 OK

# Backend
curl https://backend.railway.app/api/health
# Should return: {"status":"ok"}
```

---

## 📊 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Push to GitHub (deployment branch)                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Railway detects changes                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  Frontend    │    │  Backend     │
│  Service     │    │  Service     │
└──────┬───────┘    └──────┬───────┘
       │                   │
       │ Root Directory    │ Root Directory
       │ = my-frontend     │ = my-backend
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Build from   │    │ Build from   │
│ my-frontend/ │    │ my-backend/  │
│ Dockerfile   │    │ Dockerfile   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ Deploy to    │    │ Deploy to    │
│ Railway      │    │ Railway      │
└──────────────┘    └──────────────┘
```

---

## ✅ Success Checklist

### Pre-Deployment:
- ✅ Old configs removed (9 files)
- ✅ New configs created (4 files)
- ✅ Committed and pushed (e7e073be)
- ✅ Frontend Dockerfile ready (bullseye-slim)
- ✅ Backend Dockerfile ready (alpine)

### During Railway Setup:
- ⬜ Frontend service created
- ⬜ Frontend Root Directory set to `my-frontend`
- ⬜ Frontend environment variables set
- ⬜ Backend service created
- ⬜ Backend Root Directory set to `my-backend`
- ⬜ Backend environment variables set
- ⬜ Database created (or external DB connected)

### After Deployment:
- ⬜ Frontend builds without errors
- ⬜ Backend builds without errors
- ⬜ Frontend health check passes (/)
- ⬜ Backend health check passes (/api/health)
- ⬜ Frontend can connect to backend
- ⬜ Prisma connects to database
- ⬜ No libssl errors in frontend logs

---

## 📚 Documentation

### Main Guides:
1. **RAILWAY_MONOREPO_DEPLOYMENT.md** ← Comprehensive 400+ line guide
2. **RAILWAY_DEPLOY_CHECKLIST.md** ← Step-by-step checklist

### Quick Reference:
- **Frontend Dockerfile**: `my-frontend/Dockerfile`
- **Backend Dockerfile**: `my-backend/Dockerfile`
- **Primary Config**: `railway.toml` (root)
- **Minimal Config**: `railway.json` (root)

---

## 🆘 If Deployment Fails

### Common Issues:

1. **"Dockerfile does not exist"**
   - ❌ Root Directory not set
   - ✅ Set in Railway Dashboard Settings

2. **"libssl.so.1.1 not found"**
   - ❌ Frontend using bookworm-slim
   - ✅ Frontend must use bullseye-slim

3. **Backend won't start**
   - ❌ Wrong start command (server.js)
   - ✅ Should be: node index.js

4. **CORS errors**
   - ❌ FRONTEND_URL not set in backend
   - ✅ Set in backend env vars

---

## 🎉 Summary

### What You Have Now:
- ✅ Clean monorepo configuration (no conflicts)
- ✅ One `railway.toml` defining both services
- ✅ Dockerfiles optimized for each service
- ✅ Comprehensive documentation
- ✅ Step-by-step deployment checklist
- ✅ All changes committed and pushed

### What You Need To Do:
1. **Go to Railway Dashboard**
2. **Create 2 services** (frontend + backend)
3. **Set Root Directory** for each service
4. **Set environment variables**
5. **Deploy!**

---

## 🚀 Next Action

**👉 Open Railway Dashboard and follow `RAILWAY_DEPLOY_CHECKLIST.md`**

Railway URL: https://railway.app/dashboard

---

**Generated:** 2025-11-29  
**Commit:** e7e073be  
**Status:** ✅ READY FOR DEPLOYMENT
