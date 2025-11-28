# 🚂 Railway Monorepo Deployment Guide - BISMAN ERP

**Last Updated:** November 29, 2025  
**Project Type:** Monorepo (Frontend + Backend)  
**Railway Config:** Clean, fresh setup

---

## 📁 Project Structure

```
BISMAN-ERP/                    ← Root of the repository
├── railway.json               ← Root Railway config (minimal)
├── railway.toml               ← Monorepo service definitions
│
├── my-frontend/               ← Next.js 15.5.6 + Prisma
│   ├── Dockerfile            ← Frontend Docker build
│   ├── package.json
│   ├── next.config.js
│   └── prisma/
│       └── schema.prisma
│
└── my-backend/                ← Node.js Express API
    ├── Dockerfile            ← Backend Docker build
    ├── package.json
    ├── index.js              ← Entry point (NOT server.js!)
    └── routes/
```

---

## 🎯 Railway Setup - Step by Step

### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose: `sujisudharsanan/bisman-ERP-Building`
5. Branch: `deployment`

### Step 2: Create Frontend Service

1. In your Railway project, click **"New"** → **"GitHub Repo"**
2. Select: `bisman-ERP-Building`
3. **Service Name:** `bisman-erp-frontend`
4. Go to **Settings** tab
5. **CRITICAL:** Set **Root Directory** to: `my-frontend`
6. **Builder:** Should auto-detect "Dockerfile"

#### Frontend Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Next.js
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXTAUTH_URL=https://your-frontend.railway.app
NEXTAUTH_SECRET=your-secret-here
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Optional
MM_BASE_URL=your-mattermost-url
MM_ADMIN_TOKEN=your-token
```

### Step 3: Create Backend Service

1. In your Railway project, click **"New"** → **"GitHub Repo"**
2. Select: `bisman-ERP-Building` (same repo)
3. **Service Name:** `bisman-erp-backend`
4. Go to **Settings** tab
5. **CRITICAL:** Set **Root Directory** to: `my-backend`
6. **Builder:** Should auto-detect "Dockerfile"

#### Backend Environment Variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Server
PORT=3001
NODE_ENV=production

# JWT & Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# CORS (Frontend URL)
FRONTEND_URL=https://your-frontend.railway.app

# Optional
REDIS_URL=redis://...
```

### Step 4: Create Database (Optional)

If you don't have an external database:

1. Click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will create a PostgreSQL database
3. Copy the `DATABASE_URL` from database settings
4. Add it to both frontend and backend environment variables

---

## ⚙️ Configuration Files Explained

### `railway.json` (Root)

This is a minimal placeholder. Railway primarily uses `railway.toml` for monorepos.

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {}
}
```

### `railway.toml` (Root) - **PRIMARY CONFIG**

This defines both services in the monorepo:

```toml
# Frontend Service
[[services]]
name = "bisman-erp-frontend"
source = "my-frontend"                # Tells Railway to look in my-frontend/

[services.build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"         # Uses my-frontend/Dockerfile

[services.deploy]
startCommand = "node server.js"
healthcheckPath = "/"

[services.watch]
patterns = ["my-frontend/**/*"]       # Only redeploy on frontend changes

# Backend Service
[[services]]
name = "bisman-erp-backend"
source = "my-backend"                 # Tells Railway to look in my-backend/

[services.build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"         # Uses my-backend/Dockerfile

[services.deploy]
startCommand = "node index.js"        # Correct: index.js (NOT server.js)
healthcheckPath = "/api/health"

[services.watch]
patterns = ["my-backend/**/*"]        # Only redeploy on backend changes
```

---

## 🐳 Dockerfile Details

### Frontend Dockerfile (`my-frontend/Dockerfile`)

**Base Image:** `node:20-bullseye-slim` (Debian 11)  
**Why:** Prisma requires OpenSSL 1.1.x (libssl1.1), which is in Debian Bullseye

**Key Points:**
- ✅ Multi-stage build (deps → builder → runner)
- ✅ Installs `openssl`, `libssl1.1`, `ca-certificates`
- ✅ Runs Prisma generate during build
- ✅ Next.js standalone output
- ✅ Runs as non-root user (`nextjs`)
- ✅ Port 3000

### Backend Dockerfile (`my-backend/Dockerfile`)

**Base Image:** `node:20-alpine`  
**Why:** Smaller image, no Prisma dependency

**Key Points:**
- ✅ Lightweight Alpine Linux
- ✅ Simple Node.js app
- ✅ Port 3001
- ✅ Entry point: `index.js`

---

## 🔥 Critical Settings Checklist

### ✅ Before Deployment:

- [ ] **Root Directory set for Frontend:** `my-frontend`
- [ ] **Root Directory set for Backend:** `my-backend`
- [ ] Both services connected to same GitHub repo
- [ ] Both services watching `deployment` branch
- [ ] Database `DATABASE_URL` set in both services
- [ ] Frontend has `NEXT_PUBLIC_API_URL` pointing to backend
- [ ] Backend has `FRONTEND_URL` for CORS
- [ ] JWT secrets configured

### ⚠️ Common Mistakes:

1. **NOT setting Root Directory** → Railway builds from project root → FAIL
2. **Using `server.js` for backend** → Should be `index.js`
3. **Wrong DATABASE_URL** → Check Railway database connection string
4. **CORS errors** → Set `FRONTEND_URL` in backend env vars
5. **Prisma errors** → Frontend must use `node:20-bullseye-slim` (NOT bookworm)

---

## 🚀 Deployment Process

### Initial Deployment:

1. **Push to GitHub** (branch: `deployment`)
   ```bash
   git add .
   git commit -m "chore: Railway monorepo config"
   git push origin deployment
   ```

2. **Railway Auto-Deploys:**
   - Frontend builds from `my-frontend/`
   - Backend builds from `my-backend/`
   - Both watch their respective directories

3. **Verify Deployment:**
   - Frontend: Check logs for "FROM node:20-bullseye-slim"
   - Backend: Check logs for "FROM node:20-alpine"
   - Both should show "Build successful"

### Continuous Deployment:

- **Push to `deployment` branch** → Railway auto-deploys
- **Change `my-frontend/`** → Only frontend rebuilds
- **Change `my-backend/`** → Only backend rebuilds
- **Change root files** → No rebuild (unless config changes)

---

## 🐛 Troubleshooting

### Issue 1: "Dockerfile does not exist"

**Cause:** Root Directory not set  
**Solution:**
1. Go to Railway Dashboard
2. Click service (Frontend or Backend)
3. Settings → **Root Directory**
4. Set to `my-frontend` or `my-backend`
5. Click "Redeploy"

### Issue 2: "Prisma: libssl.so.1.1 not found"

**Cause:** Wrong base image in Frontend Dockerfile  
**Solution:**
- Frontend Dockerfile MUST use `node:20-bullseye-slim`
- Do NOT use `bookworm-slim` (has OpenSSL 3.x)
- Verify: `docker image inspect` shows Debian 11 (Bullseye)

### Issue 3: Backend fails to start

**Cause:** Wrong start command  
**Solution:**
- Backend uses `node index.js` (NOT `server.js`)
- Check `my-backend/index.js` exists
- Railway Settings → Deploy → Start Command: `node index.js`

### Issue 4: Frontend can't connect to Backend

**Cause:** CORS or wrong API URL  
**Solution:**
1. Backend env: `FRONTEND_URL=https://your-frontend.railway.app`
2. Frontend env: `NEXT_PUBLIC_API_URL=https://your-backend.railway.app`
3. Check backend CORS middleware allows frontend origin

### Issue 5: Database connection fails

**Cause:** Wrong `DATABASE_URL`  
**Solution:**
1. Railway Database → Connection → Copy `DATABASE_URL`
2. Format: `postgresql://user:pass@host.railway.internal:5432/railway`
3. Set in BOTH frontend and backend environment variables

---

## 📊 Health Checks

### Frontend Health Check:

```bash
curl https://your-frontend.railway.app/
# Should return: Next.js homepage (status 200)
```

### Backend Health Check:

```bash
curl https://your-backend.railway.app/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Database Health Check:

```bash
# From backend service logs
Railway Logs → Backend → Search for "Database connected"
```

---

## 🔐 Environment Variables Reference

### Frontend (my-frontend)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ Yes | `postgresql://...` |
| `NEXT_PUBLIC_API_URL` | ✅ Yes | `https://backend.railway.app` |
| `NEXTAUTH_URL` | ✅ Yes | `https://frontend.railway.app` |
| `NEXTAUTH_SECRET` | ✅ Yes | Random 32-char string |
| `NODE_ENV` | ✅ Yes | `production` |
| `NEXT_TELEMETRY_DISABLED` | No | `1` |
| `MM_BASE_URL` | No | Mattermost URL |
| `MM_ADMIN_TOKEN` | No | Mattermost token |

### Backend (my-backend)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | ✅ Yes | `postgresql://...` |
| `PORT` | ✅ Yes | `3001` |
| `NODE_ENV` | ✅ Yes | `production` |
| `JWT_SECRET` | ✅ Yes | Random string |
| `SESSION_SECRET` | ✅ Yes | Random string |
| `FRONTEND_URL` | ✅ Yes | `https://frontend.railway.app` |
| `REDIS_URL` | No | Redis connection string |

---

## 📝 Quick Commands

### Local Development:

```bash
# Frontend
cd my-frontend
npm install
npm run dev    # Port 3000

# Backend
cd my-backend
npm install
node index.js  # Port 3001
```

### Deploy to Railway:

```bash
git add .
git commit -m "feat: your changes"
git push origin deployment
# Railway auto-deploys
```

### Manual Redeploy:

Railway Dashboard → Service → Deployments → "⚡ Redeploy"

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Frontend builds without errors
- ✅ Backend builds without errors
- ✅ Frontend health check returns 200
- ✅ Backend health check returns `{"status":"ok"}`
- ✅ Frontend can connect to backend API
- ✅ Prisma connects to database (no libssl errors)
- ✅ Users can login and use the app

---

## 🆘 Getting Help

### Check Railway Logs:

```
Railway Dashboard → Service → Deployments → Latest → View Logs
```

### Common Log Searches:

- **Build errors:** Search for "ERROR" or "FAILED"
- **Prisma errors:** Search for "libssl" or "PrismaClient"
- **Connection errors:** Search for "ECONNREFUSED" or "timeout"
- **Start errors:** Search for "Cannot find module"

### If Still Stuck:

1. Verify Root Directory is set correctly
2. Check all environment variables are set
3. Confirm Dockerfile uses correct base images
4. Check database connection string format
5. Verify branch is `deployment`

---

**Generated:** 2025-11-29  
**Status:** ✅ Clean monorepo configuration ready for deployment  
**Next Step:** Set Root Directory in Railway Dashboard for both services
