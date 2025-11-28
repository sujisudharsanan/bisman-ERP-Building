# Railway Deployment Configuration Guide

## 📁 Project Structure

This is a **monorepo** with two separate services:
- **Frontend**: `/my-frontend` - Next.js 15.5.6 + Prisma
- **Backend**: `/my-backend` - Node.js Express API

## 🚂 Railway Configuration Files

### Option 1: Per-Service Configuration (RECOMMENDED)

Create **separate Railway services** in your Railway project:

#### Frontend Service Setup:
1. In Railway Dashboard, create a **New Service**
2. Connect to your GitHub repository
3. **Important**: In Service Settings, set:
   - **Root Directory**: `my-frontend`
   - **Config File**: Use `railway-frontend.toml` (optional)
4. Railway will automatically detect `my-frontend/Dockerfile`

#### Backend Service Setup:
1. In Railway Dashboard, create another **New Service**
2. Connect to the same GitHub repository
3. **Important**: In Service Settings, set:
   - **Root Directory**: `my-backend`
   - **Config File**: Use `railway-backend.toml` (optional)
4. Railway will automatically detect `my-backend/Dockerfile`

### Configuration Files in Root:

```
/
├── railway-frontend.toml  ← Frontend service config
├── railway-backend.toml   ← Backend service config
├── my-frontend/
│   ├── Dockerfile         ← Frontend Docker build
│   ├── railway.json       ← Fallback config
│   └── ...
└── my-backend/
    ├── Dockerfile         ← Backend Docker build
    ├── railway.json       ← Fallback config
    └── ...
```

## 🎯 Critical Setting: Root Directory

**Railway REQUIRES you to manually set the Root Directory in the Dashboard for monorepo projects.**

### How to Set Root Directory:

1. Go to https://railway.app/dashboard
2. Select your project
3. Click on the **Frontend Service**
4. Go to **Settings** tab
5. Scroll to find **"Root Directory"** (or "Service Root")
6. Set to: `my-frontend`
7. Click **Save**

Repeat for Backend Service with `my-backend`.

## 🔧 Configuration Priority

Railway reads configuration in this order:
1. **Dashboard Settings** (Root Directory) ← **HIGHEST PRIORITY**
2. `railway.json` (in the Root Directory you set)
3. `railway.toml` (in the Root Directory you set)
4. Auto-detection

## 📝 Configuration File Details

### `railway-frontend.toml`
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/"
healthcheckTimeout = 300

[watch]
paths = ["my-frontend/**"]  # Watch frontend changes only
```

### `railway-backend.toml`
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node index.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300

[watch]
paths = ["my-backend/**"]  # Watch backend changes only
```

## 🚀 Deployment Steps

### First Time Setup:

1. **Create Frontend Service:**
   ```
   Railway Dashboard → New → Empty Service → GitHub Repo
   Settings → Root Directory = "my-frontend"
   Settings → Config File = "railway-frontend.toml" (optional)
   ```

2. **Create Backend Service:**
   ```
   Railway Dashboard → New → Empty Service → GitHub Repo
   Settings → Root Directory = "my-backend"
   Settings → Config File = "railway-backend.toml" (optional)
   ```

3. **Set Environment Variables:**
   - Frontend: `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, etc.
   - Backend: `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`, etc.

4. **Deploy:**
   - Push to your deployment branch
   - Railway will automatically build and deploy both services

### Subsequent Deployments:

- **Push to GitHub** → Railway auto-deploys
- Frontend changes trigger frontend rebuild only
- Backend changes trigger backend rebuild only

## 🐛 Troubleshooting

### Issue: "Dockerfile does not exist"
**Solution:** You MUST set Root Directory in Railway Dashboard manually.
- Frontend: Root Directory = `my-frontend`
- Backend: Root Directory = `my-backend`

### Issue: Railway builds from project root
**Solution:** Check Dashboard Settings → Root Directory is set correctly.

### Issue: "Dockerfile cannot be empty"
**Solution:** Railway is caching. Set Root Directory in Dashboard, then:
1. Make a small change to your Dockerfile (add a comment)
2. Commit and push
3. Manually trigger redeploy in Railway

### Issue: Build succeeds but app crashes
**Check:**
- Frontend: OpenSSL 1.1.x installed? (Prisma requirement)
- Backend: Correct startCommand? (`node index.js`)
- Environment variables set?
- Database accessible from Railway?

## 📦 Current Dockerfile Details

### Frontend (`my-frontend/Dockerfile`):
- **Base Image**: `node:20-bullseye-slim` (has OpenSSL 1.1.x)
- **Packages**: `openssl`, `libssl1.1`, `ca-certificates`
- **Build**: Multi-stage (deps → builder → runner)
- **Runtime**: Next.js standalone mode, runs as `nextjs` user
- **Port**: 3000
- **Command**: `node server.js`

### Backend (`my-backend/Dockerfile`):
- **Base Image**: `node:20-alpine`
- **Build**: Standard Node.js build
- **Port**: 3001
- **Command**: `node index.js`

## ✅ Verification Checklist

After deployment:

- [ ] Railway Dashboard → Frontend Service → Settings → Root Directory = `my-frontend`
- [ ] Railway Dashboard → Backend Service → Settings → Root Directory = `my-backend`
- [ ] Frontend build logs show: `FROM node:20-bullseye-slim`
- [ ] Backend build logs show: `FROM node:20-alpine`
- [ ] Frontend healthcheck passes: `GET /`
- [ ] Backend healthcheck passes: `GET /api/health`
- [ ] Frontend can connect to database (Prisma)
- [ ] Backend API responds correctly

## 🔗 Useful Links

- [Railway Docs: Monorepo](https://docs.railway.app/guides/monorepo)
- [Railway Docs: Configuration](https://docs.railway.app/reference/config-as-code)
- [Railway Docs: Root Directory](https://docs.railway.app/deploy/deployments#root-directory)

---

**Generated:** 2025-11-29
**Status:** Configuration files created, Root Directory MUST be set in Dashboard
