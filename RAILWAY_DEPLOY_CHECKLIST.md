# 🚀 Railway Deployment Checklist

## ✅ Pre-Deployment (Complete)

- ✅ All old Railway configs removed
- ✅ Fresh `railway.json` (root) created
- ✅ Fresh `railway.toml` (root) with monorepo config created
- ✅ `my-frontend/Dockerfile` ready (node:20-bullseye-slim + Prisma)
- ✅ `my-backend/Dockerfile` ready (node:20-alpine)
- ✅ Git repository clean and ready

## 📋 Railway Dashboard Setup (YOU MUST DO THIS)

### Step 1: Create Frontend Service
- [ ] Railway Dashboard → New Project
- [ ] Connect to: `sujisudharsanan/bisman-ERP-Building`
- [ ] Branch: `deployment`
- [ ] Service name: `bisman-erp-frontend`
- [ ] **Settings → Root Directory:** `my-frontend` ⚠️ CRITICAL
- [ ] Builder: Dockerfile (should auto-detect)

### Step 2: Frontend Environment Variables
- [ ] `DATABASE_URL` = (from Railway Postgres)
- [ ] `NEXT_PUBLIC_API_URL` = (backend Railway URL)
- [ ] `NEXTAUTH_URL` = (frontend Railway URL)
- [ ] `NEXTAUTH_SECRET` = (random 32 chars)
- [ ] `NODE_ENV` = `production`
- [ ] `NEXT_TELEMETRY_DISABLED` = `1`

### Step 3: Create Backend Service
- [ ] Railway Dashboard → New Service (in same project)
- [ ] Connect to: `sujisudharsanan/bisman-ERP-Building` (same repo)
- [ ] Branch: `deployment`
- [ ] Service name: `bisman-erp-backend`
- [ ] **Settings → Root Directory:** `my-backend` ⚠️ CRITICAL
- [ ] Builder: Dockerfile (should auto-detect)

### Step 4: Backend Environment Variables
- [ ] `DATABASE_URL` = (same as frontend)
- [ ] `PORT` = `3001`
- [ ] `NODE_ENV` = `production`
- [ ] `JWT_SECRET` = (random string)
- [ ] `SESSION_SECRET` = (random string)
- [ ] `FRONTEND_URL` = (frontend Railway URL for CORS)

### Step 5: Create Database (if needed)
- [ ] Railway → New → Database → PostgreSQL
- [ ] Copy `DATABASE_URL`
- [ ] Add to both frontend and backend env vars

## 🚦 Deploy

### Step 6: Initial Deploy
- [ ] Push to GitHub (if not already):
  ```bash
  git add .
  git commit -m "feat: clean Railway monorepo config"
  git push origin deployment
  ```
- [ ] Railway should auto-deploy both services

### Step 7: Verify Deployment

#### Frontend Verification:
- [ ] Build logs show: `FROM node:20-bullseye-slim`
- [ ] No errors about `libssl.so.1.1`
- [ ] Build completes successfully
- [ ] Healthcheck passes: `curl https://frontend.railway.app/`
- [ ] Status: 200 OK

#### Backend Verification:
- [ ] Build logs show: `FROM node:20-alpine`
- [ ] Build completes successfully
- [ ] Starts with: `node index.js`
- [ ] Healthcheck passes: `curl https://backend.railway.app/api/health`
- [ ] Returns: `{"status":"ok"}`

## 🐛 Troubleshooting

### If Frontend Fails:
1. Check Root Directory is set to `my-frontend`
2. Verify `DATABASE_URL` is set
3. Check logs for Prisma errors
4. Confirm Dockerfile uses `bullseye-slim` (NOT bookworm)

### If Backend Fails:
1. Check Root Directory is set to `my-backend`
2. Verify start command is `node index.js` (NOT server.js)
3. Check `DATABASE_URL` is set
4. Verify `PORT=3001` is set

### If Build Says "Dockerfile not found":
- **Root Directory is NOT set!** Go to Settings → Root Directory

## 📚 Documentation

- **Comprehensive Guide:** `RAILWAY_MONOREPO_DEPLOYMENT.md`
- **Config Files:**
  - `railway.json` (root, minimal)
  - `railway.toml` (root, monorepo definitions)

---

**Last Updated:** 2025-11-29  
**Status:** Ready for deployment  
**Next Action:** Set Root Directory in Railway Dashboard for BOTH services
