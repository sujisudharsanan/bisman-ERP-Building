# 🚂 Railway Configuration Setup

## ✅ Configuration Files Created

I've created `railway.json` files for both services to handle the monorepo structure:

### 📁 Files Created:

1. **`my-backend/railway.json`** - Backend service configuration
2. **`my-frontend/railway.json`** - Frontend service configuration

---

## 📋 What These Files Do

Railway will automatically detect these files and:
- ✅ Know which Dockerfile to use
- ✅ Set the correct build context
- ✅ Configure health checks
- ✅ Set restart policies

---

## 🔧 Backend Configuration (`my-backend/railway.json`)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**What it configures:**
- ✅ Uses Dockerfile builder
- ✅ Health check at `/api/health`
- ✅ 5 minute timeout for health checks
- ✅ Restarts on failure (max 10 retries)
- ✅ Starts with `node server.js`

---

## 🎨 Frontend Configuration (`my-frontend/railway.json`)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server.js",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**What it configures:**
- ✅ Uses Dockerfile builder
- ✅ Health check at `/` (homepage)
- ✅ 5 minute timeout
- ✅ Restarts on failure
- ✅ Starts with `node server.js` (Next.js standalone)

---

## 🚀 How to Use in Railway

### Step 1: Commit and Push These Files

```bash
# Stage the new railway.json files
git add my-backend/railway.json my-frontend/railway.json

# Commit
git commit -m "Add Railway configuration files for monorepo"

# Push to deployment branch
git push origin deployment
```

---

### Step 2: Create Backend Service

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"+ New"** → **"GitHub Repo"**
3. Select: `bisman-ERP-Building`
4. Branch: `deployment`
5. Railway will ask: **"Which service?"**
   - Select **`my-backend`** (Railway detects the railway.json)

**Railway will automatically:**
- ✅ Detect `my-backend/railway.json`
- ✅ Use `my-backend/Dockerfile`
- ✅ Set build context to `my-backend/`
- ✅ Configure health checks

---

### Step 3: Add Backend Environment Variables

Click on the backend service → **Variables** tab:

```bash
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}
NODE_ENV=production
PORT=8080
JWT_SECRET=your-strong-jwt-secret-min-32-characters
SESSION_SECRET=your-strong-session-secret-min-32-characters
```

---

### Step 4: Deploy Backend

- Railway will automatically deploy after you add variables
- Or click **Deploy** button manually
- Wait 3-5 minutes

---

### Step 5: Get Backend URL

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy URL: `https://bisman-erp-backend-production.up.railway.app`
4. **Save this** - you need it for frontend!

---

### Step 6: Create Frontend Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select: `bisman-ERP-Building`
3. Branch: `deployment`
4. Railway asks: **"Which service?"**
   - Select **`my-frontend`** (Railway detects the railway.json)

**Railway will automatically:**
- ✅ Detect `my-frontend/railway.json`
- ✅ Use `my-frontend/Dockerfile`
- ✅ Set build context to `my-frontend/`
- ✅ Configure health checks

---

### Step 7: Add Frontend Environment Variables

Click on frontend service → **Variables** tab:

```bash
# CRITICAL: Use your actual backend URL from Step 5
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NODE_ENV=production
PORT=3000
RAILWAY=1
NEXT_TELEMETRY_DISABLED=1
```

---

### Step 8: Deploy Frontend

- Railway will automatically deploy
- Or click **Deploy** button
- Wait 5-8 minutes (Next.js build takes longer)

---

### Step 9: Get Frontend URL

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy URL: `https://frontend-production-XXXX.up.railway.app`
4. **Save this** - you need it for backend CORS!

---

### Step 10: Update Backend CORS

1. Go back to **backend service** → **Variables**
2. Add/Update these variables:

```bash
FRONTEND_URL=https://frontend-production-XXXX.up.railway.app
FRONTEND_URLS=https://frontend-production-XXXX.up.railway.app
CORS_ORIGIN=https://frontend-production-XXXX.up.railway.app
ALLOWED_ORIGINS=https://frontend-production-XXXX.up.railway.app
```

3. Click **Deployments** → **Deploy** (redeploy with new variables)

---

## ✅ Verification Checklist

### Backend:
- [ ] `railway.json` exists in `my-backend/`
- [ ] Service created and deployed
- [ ] Health check responds: `curl https://backend.../api/health`
- [ ] Logs show: "Server listening on port 8080"
- [ ] Environment variables set (DATABASE_URL, PORT, etc.)

### Frontend:
- [ ] `railway.json` exists in `my-frontend/`
- [ ] Service created and deployed
- [ ] Homepage loads: `curl https://frontend.../`
- [ ] Logs show: "Server started on port 3000"
- [ ] `NEXT_PUBLIC_API_URL` points to backend

### Connection:
- [ ] Backend CORS updated with frontend URL
- [ ] Backend redeployed after CORS update
- [ ] Login works in browser
- [ ] No CORS errors in console
- [ ] Dashboard loads after login

---

## 🔍 How Railway Detects Services

When you connect your GitHub repo, Railway will:

1. **Scan for `railway.json` files** in subdirectories
2. **Show you a list** of detected services:
   ```
   ✅ my-backend (has railway.json)
   ✅ my-frontend (has railway.json)
   ```
3. **Let you choose** which service to deploy

This means:
- ❌ No "Root Directory" setting needed
- ❌ No manual path configuration
- ✅ Railway handles it automatically
- ✅ Each service deploys independently

---

## 🎯 Benefits of railway.json

### Before (Manual Configuration):
- ❌ Had to set "Root Directory" manually
- ❌ Railway UI changed, setting disappeared
- ❌ Confusing for monorepo setups
- ❌ Had to configure health checks manually

### After (railway.json):
- ✅ Railway auto-detects services
- ✅ Configuration lives in your repo (version controlled)
- ✅ Health checks configured in code
- ✅ Restart policies defined
- ✅ Works consistently across Railway UI updates

---

## 📊 What Happens During Deployment

### Backend Deployment Flow:
```
1. Railway detects my-backend/railway.json
2. Reads: builder = DOCKERFILE
3. Looks for: my-backend/Dockerfile
4. Sets build context: my-backend/
5. Runs: docker build -f my-backend/Dockerfile my-backend/
6. Starts: node server.js
7. Health check: GET /api/health
8. If healthy → Service Active ✅
```

### Frontend Deployment Flow:
```
1. Railway detects my-frontend/railway.json
2. Reads: builder = DOCKERFILE
3. Looks for: my-frontend/Dockerfile
4. Sets build context: my-frontend/
5. Runs: docker build -f my-frontend/Dockerfile my-frontend/
6. Starts: node server.js (Next.js standalone)
7. Health check: GET /
8. If healthy → Service Active ✅
```

---

## 🚨 Troubleshooting

### Issue: Railway doesn't detect services

**Solution:**
1. Make sure `railway.json` files are committed:
   ```bash
   git status
   git add my-backend/railway.json my-frontend/railway.json
   git commit -m "Add railway.json"
   git push origin deployment
   ```

2. Check Railway is using correct branch:
   - Service Settings → **Source** → Branch = `deployment`

---

### Issue: Build fails with "Dockerfile not found"

**Solution:**
Check `railway.json` has correct path:
```json
{
  "build": {
    "dockerfilePath": "Dockerfile"  // ← Should be just "Dockerfile"
  }
}
```

NOT:
```json
"dockerfilePath": "my-backend/Dockerfile"  // ❌ Wrong - Railway already in my-backend/
```

---

### Issue: Health check fails

**Backend:**
- Check `/api/health` endpoint exists
- Check server is listening on PORT from environment
- Check logs for startup errors

**Frontend:**
- Check homepage loads
- Check Next.js build succeeded
- Check `server.js` exists in standalone output

---

## 🎉 Success!

With `railway.json` files:
- ✅ Railway knows how to build each service
- ✅ No manual "Root Directory" configuration
- ✅ Health checks configured
- ✅ Restart policies set
- ✅ Works with current Railway UI
- ✅ Future-proof for Railway updates

---

## 📚 Next Steps

1. **Commit the railway.json files:**
   ```bash
   git add my-backend/railway.json my-frontend/railway.json RAILWAY_CONFIG_SETUP.md
   git commit -m "Add Railway configuration for monorepo deployment"
   git push origin deployment
   ```

2. **Follow the deployment steps above**
   - Create backend service
   - Add backend variables
   - Get backend URL
   - Create frontend service  
   - Add frontend variables (with backend URL)
   - Get frontend URL
   - Update backend CORS (with frontend URL)

3. **Test everything:**
   - Backend health check
   - Frontend loads
   - Login works
   - Dashboard accessible

---

**Time to deploy:** 25-30 minutes total ⏱️

**Documentation:** This guide + `RAILWAY_DOCKER_COMPLETE_REBUILD_GUIDE.md`

🚀 **You're ready to deploy!**
