# 🔧 Railway Monorepo Deployment Fix

## 🚨 Problem: Both Services Deploy the Same Code

**Issue:** Railway doesn't ask which service to deploy and deploys the same code for both backend and frontend.

**Cause:** Railway's monorepo detection doesn't always work automatically.

---

## ✅ Solution: Manual Service Configuration

Since Railway isn't auto-detecting the services, we'll create them **manually** with specific configurations.

---

## 🎯 Method 1: Using Railway Dashboard (Recommended)

### Step 1: Delete Existing Services (If Any)

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. For each existing service:
   - Click on service
   - Settings → Danger Zone → **Remove Service**
   - Confirm deletion

---

### Step 2: Create Backend Service Manually

#### A. Create Empty Service
1. Click **"+ New"**
2. Select **"Empty Service"** (NOT "GitHub Repo")
3. Name it: `backend`

#### B. Connect to GitHub
1. Click on the new `backend` service
2. Go to **Settings** tab
3. Under **Source**, click **"Connect Repo"**
4. Select repository: `bisman-ERP-Building`
5. Branch: `deployment`
6. **Important:** Set **Service Root**: `my-backend`

#### C. Configure Build
In Settings:
```
Build:
  Builder: Dockerfile
  Dockerfile Path: Dockerfile
  Build Command: (leave empty)
```

#### D. Add Environment Variables
Go to **Variables** tab:
```bash
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}
NODE_ENV=production
PORT=8080
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this
SESSION_SECRET=your-session-secret-min-32-chars-change-this
```

#### E. Generate Domain
1. Settings → **Networking**
2. Click **"Generate Domain"**
3. Copy URL: `https://backend-production-XXXX.up.railway.app`
4. **SAVE THIS** - you need it for frontend!

#### F. Deploy
1. Go to **Deployments** tab
2. Click **"Deploy"**
3. Wait 3-5 minutes

---

### Step 3: Create Frontend Service Manually

#### A. Create Empty Service
1. Click **"+ New"**
2. Select **"Empty Service"**
3. Name it: `frontend`

#### B. Connect to GitHub
1. Click on the `frontend` service
2. Go to **Settings** tab
3. Under **Source**, click **"Connect Repo"**
4. Select repository: `bisman-ERP-Building`
5. Branch: `deployment`
6. **Important:** Set **Service Root**: `my-frontend`

#### C. Configure Build
In Settings:
```
Build:
  Builder: Dockerfile
  Dockerfile Path: Dockerfile
  Build Command: (leave empty)
```

#### D. Add Environment Variables
Go to **Variables** tab:
```bash
# CRITICAL: Use your actual backend URL from Step 2E
NEXT_PUBLIC_API_URL=https://backend-production-XXXX.up.railway.app
NODE_ENV=production
PORT=3000
RAILWAY=1
NEXT_TELEMETRY_DISABLED=1
```

#### E. Generate Domain
1. Settings → **Networking**
2. Click **"Generate Domain"**
3. Copy URL: `https://frontend-production-YYYY.up.railway.app`
4. **SAVE THIS** - you need it for backend CORS!

#### F. Deploy
1. Go to **Deployments** tab
2. Click **"Deploy"**
3. Wait 5-8 minutes

---

### Step 4: Update Backend CORS

1. Go back to **backend** service
2. Click **Variables** tab
3. Add these variables:
```bash
FRONTEND_URL=https://frontend-production-YYYY.up.railway.app
FRONTEND_URLS=https://frontend-production-YYYY.up.railway.app
CORS_ORIGIN=https://frontend-production-YYYY.up.railway.app
ALLOWED_ORIGINS=https://frontend-production-YYYY.up.railway.app
```

4. Go to **Deployments** tab
5. Click **"Deploy"** to redeploy with new CORS settings

---

## 🎯 Method 2: Using Railway CLI (Alternative)

If Railway Dashboard doesn't have "Service Root" option, use CLI:

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login and Link
```bash
railway login
railway link
```

### Step 3: Create Backend Service
```bash
# Create service
railway service create backend

# Link to backend
railway service backend

# Add variables
railway variables set DATABASE_URL="$DATABASE_URL_FROM_RAILWAY"
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set JWT_SECRET="your-secret-here"
railway variables set SESSION_SECRET="your-secret-here"

# Deploy from my-backend directory
cd my-backend
railway up
```

### Step 4: Create Frontend Service
```bash
# Go back to root
cd ..

# Create frontend service
railway service create frontend

# Link to frontend
railway service frontend

# Add variables (use backend URL from previous step)
railway variables set NEXT_PUBLIC_API_URL="https://backend-production-XXXX.up.railway.app"
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set RAILWAY=1

# Deploy from my-frontend directory
cd my-frontend
railway up
```

### Step 5: Update Backend CORS
```bash
# Switch to backend service
railway service backend

# Add CORS variables
railway variables set FRONTEND_URL="https://frontend-production-YYYY.up.railway.app"
railway variables set CORS_ORIGIN="https://frontend-production-YYYY.up.railway.app"

# Redeploy
cd ../my-backend
railway up
```

---

## 🎯 Method 3: Using railway.toml (Most Reliable)

Create a `railway.toml` file at the **root** of your repository:

### Create `railway.toml` at repo root:

```toml
# Backend Service
[[services]]
name = "backend"
source = "my-backend"
dockerfile = "my-backend/Dockerfile"
healthcheckPath = "/api/health"
healthcheckTimeout = 300

  [services.build]
  builder = "dockerfile"
  dockerfilePath = "Dockerfile"

  [services.deploy]
  startCommand = "node server.js"
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 10

# Frontend Service
[[services]]
name = "frontend"
source = "my-frontend"
dockerfile = "my-frontend/Dockerfile"
healthcheckPath = "/"
healthcheckTimeout = 300

  [services.build]
  builder = "dockerfile"
  dockerfilePath = "Dockerfile"

  [services.deploy]
  startCommand = "node server.js"
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 10
```

Then:
```bash
git add railway.toml
git commit -m "Add Railway monorepo configuration"
git push origin deployment
```

Now when you connect the repo, Railway will detect both services!

---

## 📊 Verification

### Check Each Service is Deploying Correctly:

#### Backend Service:
```bash
# Check logs
railway logs --service backend

# Should see:
✅ "npm ci" in my-backend/
✅ "Prisma client generated"
✅ "Server listening on port 8080"

# Test health endpoint
curl https://backend-production-XXXX.up.railway.app/api/health
# Should return: {"status":"ok"}
```

#### Frontend Service:
```bash
# Check logs
railway logs --service frontend

# Should see:
✅ "npm ci" in my-frontend/
✅ "next build"
✅ "Creating standalone build"
✅ "Server started on port 3000"

# Test homepage
curl https://frontend-production-YYYY.up.railway.app/
# Should return: HTML
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Both Services Deploy Same Code

**Symptom:** Backend and frontend both show same build logs

**Solution:**
- Use **Method 1** (Manual Service Creation)
- Make sure **Service Root** is set correctly:
  - Backend: `my-backend`
  - Frontend: `my-frontend`

---

### Issue 2: "Service Root" Option Not Visible

**Solution:**
- Use **Method 2** (Railway CLI)
- Or use **Method 3** (railway.toml)

---

### Issue 3: Railway Keeps Deploying from Root

**Solution:**
Create `.railwayignore` in repo root:
```
# .railwayignore
*
!my-backend
!my-frontend
```

This tells Railway to ignore everything except the service directories.

---

## 📝 Quick Checklist

### Backend Service:
- [ ] Service created (named `backend`)
- [ ] Connected to GitHub repo
- [ ] Service Root: `my-backend`
- [ ] Dockerfile Path: `Dockerfile`
- [ ] Variables added (DATABASE_URL, PORT, etc.)
- [ ] Domain generated
- [ ] Deployed successfully
- [ ] Health check passes: `/api/health`

### Frontend Service:
- [ ] Service created (named `frontend`)
- [ ] Connected to GitHub repo
- [ ] Service Root: `my-frontend`
- [ ] Dockerfile Path: `Dockerfile`
- [ ] Variables added (NEXT_PUBLIC_API_URL, etc.)
- [ ] Domain generated
- [ ] Deployed successfully
- [ ] Homepage loads

### Connection:
- [ ] Backend CORS updated with frontend URL
- [ ] Backend redeployed
- [ ] Login works in browser
- [ ] No CORS errors
- [ ] Dashboard accessible

---

## 🎯 Recommended Approach

**For your situation, I recommend Method 3 (railway.toml)** because:
- ✅ Most explicit and clear
- ✅ Works reliably with monorepos
- ✅ Configuration in version control
- ✅ Railway definitely detects multiple services

**Next Steps:**
1. Create `railway.toml` at repo root (I'll create this for you)
2. Commit and push
3. Delete existing services in Railway
4. Reconnect GitHub repo
5. Railway will now show: "Found 2 services: backend, frontend"
6. Create both services separately

---

## 🚀 Let's Create railway.toml Now

I'll create the `railway.toml` file for you in the next step!
