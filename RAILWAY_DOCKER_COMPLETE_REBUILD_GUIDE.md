# 🚀 Complete Railway Docker Rebuild Guide - Frontend & Backend

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Docker Rebuild](#backend-docker-rebuild)
3. [Frontend Docker Rebuild](#frontend-docker-rebuild)
4. [Database Connection](#database-connection)
5. [Environment Variables](#environment-variables)
6. [Deployment & Testing](#deployment--testing)
7. [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

### What You Need:
- ✅ Railway account (logged in)
- ✅ GitHub repository: `bisman-ERP-Building` (branch: deployment)
- ✅ Railway Database already set up (PostgreSQL)
- ✅ Railway CLI installed (optional but recommended)

### Repository Structure:
```
bisman-ERP-Building/
├── my-backend/          # Backend service
│   ├── Dockerfile       # ✅ Ready
│   ├── package.json
│   ├── prisma/
│   └── server.js
├── my-frontend/         # Frontend service
│   ├── Dockerfile       # ✅ Ready
│   ├── package.json
│   ├── next.config.js
│   └── src/
└── docker-compose.yml
```

---

## 🔧 Part 1: Backend Docker Rebuild

### Step 1.1: Clean Up Old Backend Service

**Option A: Via Railway Dashboard (Recommended)**
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your project
3. Click on **bisman-erp-backend** service
4. Click **Settings** tab (bottom left)
5. Scroll down to **Danger Zone**
6. Click **Remove Service from All Environments**
7. Type service name to confirm
8. Click **Remove**

**Option B: Via Railway CLI**
```bash
# List services
railway service list

# Delete backend service
railway service delete bisman-erp-backend
```

---

### Step 1.2: Create New Backend Service

#### Railway Dashboard Method:

1. **Click "+ New" button** (top right)
2. Select **"GitHub Repo"**
3. Choose repository: **bisman-ERP-Building**
4. Railway will auto-detect `Dockerfile` in `my-backend/`

#### Configure Backend Service:

1. **Service Name**: Change to `bisman-erp-backend`
2. **Root Directory**: Set to `my-backend`
3. **Branch**: Select `deployment`

---

### Step 1.3: Configure Backend Settings

Click on **bisman-erp-backend** service → **Settings**:

#### Build Settings:
```
Builder: Dockerfile
Dockerfile Path: my-backend/Dockerfile
Build Command: (leave empty - Docker handles this)
```

#### Deploy Settings:
```
Custom Start Command: (leave empty - uses CMD from Dockerfile)
Healthcheck Path: /api/health
Healthcheck Timeout: 300 seconds
```

#### Service Domain:
1. Click **Generate Domain** under **Networking**
2. Railway will create: `https://bisman-erp-backend-production.up.railway.app`
3. Copy this URL (you'll need it for frontend)

---

### Step 1.4: Add Backend Environment Variables

Go to **Variables** tab and add these:

```bash
# Database Connection (Railway provides this)
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}

# Or if DATABASE_URL is not available, use:
DATABASE_URL=${{bisman-erp-db.DATABASE_PRIVATE_URL}}

# Node Environment
NODE_ENV=production

# Port (Railway expects 8080 for backend)
PORT=8080

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Session Secret
SESSION_SECRET=your-session-secret-change-this

# Frontend URL (we'll update this after frontend is deployed)
FRONTEND_URL=https://frontend-production.up.railway.app
FRONTEND_URLS=https://frontend-production.up.railway.app

# CORS Settings
ALLOW_LOCALHOST=0
CORS_ORIGIN=https://frontend-production.up.railway.app

# Optional: Database connection pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Optional: Logging
LOG_LEVEL=info
```

**Important Variables to Update Later:**
- `FRONTEND_URL` - Update after frontend deployment
- `FRONTEND_URLS` - Update after frontend deployment
- `CORS_ORIGIN` - Update after frontend deployment

---

### Step 1.5: Deploy Backend

1. Click **Deployments** tab
2. Click **Deploy** button (top right)
3. Watch build logs:
   - ✅ "Building Docker image..."
   - ✅ "Running npm ci..."
   - ✅ "Generating Prisma client..."
   - ✅ "Starting server..."
   - ✅ "Server listening on port 8080"

**Expected Build Time:** 3-5 minutes

---

### Step 1.6: Verify Backend Deployment

#### Check Health Endpoint:
```bash
curl https://bisman-erp-backend-production.up.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-27T...",
  "uptime": 123.456
}
```

#### Check Logs:
Railway Dashboard → bisman-erp-backend → **Logs** tab

Look for:
```
✅ Prisma client generated
✅ Database connected
✅ Server listening on port 8080
✅ Ready to accept connections
```

---

## 🎨 Part 2: Frontend Docker Rebuild

### Step 2.1: Clean Up Old Frontend Service

**Via Railway Dashboard:**
1. Click on **frontend** service (if exists)
2. Settings → Danger Zone → **Remove Service**
3. Confirm deletion

---

### Step 2.2: Create New Frontend Service

1. **Click "+ New" button**
2. Select **"GitHub Repo"**
3. Choose repository: **bisman-ERP-Building**
4. Railway will auto-detect `Dockerfile` in `my-frontend/`

#### Configure Frontend Service:

1. **Service Name**: `frontend`
2. **Root Directory**: `my-frontend`
3. **Branch**: `deployment`

---

### Step 2.3: Configure Frontend Settings

Click on **frontend** service → **Settings**:

#### Build Settings:
```
Builder: Dockerfile
Dockerfile Path: my-frontend/Dockerfile
Build Command: (leave empty)
```

#### Build Arguments (Important!):
Click **Add Variable** in Build section:
```
NEXT_PUBLIC_API_URL=/api
```

#### Deploy Settings:
```
Custom Start Command: (leave empty - uses CMD from Dockerfile)
Healthcheck Path: /
Healthcheck Timeout: 300 seconds
```

#### Service Domain:
1. Click **Generate Domain** under **Networking**
2. Railway creates: `https://frontend-production-XXXX.up.railway.app`
3. **Copy this URL** (you'll need it for backend CORS)

---

### Step 2.4: Add Frontend Environment Variables

Go to **Variables** tab and add these:

```bash
# Backend API URL (CRITICAL - use your actual backend URL)
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# Alternative names (your code checks these too)
NEXT_PUBLIC_API_BASE=https://bisman-erp-backend-production.up.railway.app
NEXT_PUBLIC_API_BASE_URL=https://bisman-erp-backend-production.up.railway.app

# Node Environment
NODE_ENV=production

# Port (Railway assigns dynamically, but Next.js expects 3000)
PORT=3000

# Railway Environment Flag
RAILWAY=1

# Disable Next.js Telemetry
NEXT_TELEMETRY_DISABLED=1

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENV=production

# Mattermost (if using)
NEXT_PUBLIC_MM_TEAM_SLUG=erp
MM_BASE_URL=http://localhost:8065
```

**Critical Variables:**
- `NEXT_PUBLIC_API_URL` - **MUST match your backend URL**
- `NODE_ENV` - Must be "production"
- `PORT` - Should be 3000

---

### Step 2.5: Deploy Frontend

1. Click **Deployments** tab
2. Click **Deploy** button
3. Watch build logs:
   - ✅ "Building Docker image..."
   - ✅ "Stage 1: Dependencies..."
   - ✅ "Stage 2: Builder..."
   - ✅ "Running next build..."
   - ✅ "Stage 3: Runtime..."
   - ✅ "Starting Next.js server..."

**Expected Build Time:** 5-8 minutes (Next.js build is slower)

---

### Step 2.6: Verify Frontend Deployment

#### Check Frontend is Live:
```bash
curl https://frontend-production-XXXX.up.railway.app/
```

**Expected:** HTML response (your app's homepage)

#### Check Logs:
Railway Dashboard → frontend → **Logs** tab

Look for:
```
✅ Server started on port 3000
✅ Ready on http://0.0.0.0:3000
✅ No build errors
```

---

## 🔗 Part 3: Connect Frontend & Backend

### Step 3.1: Update Backend CORS

Now that frontend is deployed, update backend variables:

1. Go to **bisman-erp-backend** service → **Variables**
2. **Update these variables** with your actual frontend URL:

```bash
FRONTEND_URL=https://frontend-production-XXXX.up.railway.app
FRONTEND_URLS=https://frontend-production-XXXX.up.railway.app
CORS_ORIGIN=https://frontend-production-XXXX.up.railway.app
```

3. Click **Deployments** → **Deploy** to apply changes

---

### Step 3.2: Verify Connection

#### Test from Browser:

1. Open frontend URL: `https://frontend-production-XXXX.up.railway.app`
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. Navigate to `/auth/login`

**Check for:**
- ✅ No "CORS blocked" errors
- ✅ No "Failed to fetch" errors
- ✅ API calls to backend visible in **Network** tab

---

## 🔐 Part 4: Database Connection & Migration

### Step 4.1: Verify Database Service

Railway Dashboard → **bisman-erp-db** service:

#### Check Variables:
- ✅ `DATABASE_URL` exists
- ✅ `DATABASE_PRIVATE_URL` exists
- ✅ Database is running

#### Get Connection String:
```bash
# Public URL (for external access)
postgresql://postgres:PASSWORD@gondola.proxy.rlwy.net:53308/railway

# Private URL (for internal Railway services)
postgresql://postgres:PASSWORD@postgres.railway.internal:5432/railway
```

---

### Step 4.2: Run Database Migrations

**Option A: Via Railway CLI**

```bash
# Install Railway CLI if not installed
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Select backend service
railway service

# Run migration
railway run npx prisma migrate deploy
```

**Option B: Via Backend Container**

1. Railway Dashboard → bisman-erp-backend → **Logs** tab
2. Check if Prisma migrations ran automatically during deployment
3. Look for: "Prisma migrate deployed successfully"

**Option C: Manual Migration (if needed)**

```bash
# Install psql (if not installed)
brew install postgresql  # macOS
# or
sudo apt install postgresql-client  # Linux

# Connect to Railway database
psql "postgresql://postgres:PASSWORD@gondola.proxy.rlwy.net:53308/railway"

# Check tables
\dt

# You should see 48 tables
# If not, run baseline migration manually
```

---

### Step 4.3: Verify Demo Data

```bash
# Connect to database
psql "postgresql://postgres:PASSWORD@gondola.proxy.rlwy.net:53308/railway"

# Check super admin
SELECT id, email, "firstName", "lastName" FROM "SuperAdmin";

# Check demo user
SELECT id, email, username, role FROM users WHERE email = 'demo_hub_incharge@bisman.demo';

# Exit
\q
```

**Expected:**
- ✅ Super Admin: admin@bisman.com exists
- ✅ Demo User: demo_hub_incharge@bisman.demo exists

**If no data:** Run seed script from earlier setup (setup-railway-basic.js)

---

## 🧪 Part 5: End-to-End Testing

### Test 1: Backend Health Check

```bash
curl https://bisman-erp-backend-production.up.railway.app/api/health
```

**Expected:** `{"status":"ok",...}`

---

### Test 2: Frontend Loads

1. Open: `https://frontend-production-XXXX.up.railway.app`
2. Should see homepage/login page
3. No console errors

---

### Test 3: Login Flow

1. Navigate to: `/auth/login`
2. Enter credentials:
   - Email: `demo_hub_incharge@bisman.demo`
   - Password: `Demo@123`
3. Click **Login**

**Expected:**
- ✅ No errors in console
- ✅ Network tab shows POST to `/api/auth/login`
- ✅ Response status 200
- ✅ Redirects to dashboard
- ✅ Dashboard loads successfully

---

### Test 4: API Communication

Open Browser Console and run:

```javascript
// Test API call
fetch('/api/health')
  .then(r => r.json())
  .then(data => console.log('Backend health:', data))
  .catch(err => console.error('Error:', err));
```

**Expected:** Backend health response logged, no errors

---

## 🔍 Part 6: Verify Both Services

### Backend Checklist:

- ✅ Service deployed from Docker
- ✅ `/api/health` returns 200
- ✅ Database connected (check logs)
- ✅ Prisma client generated
- ✅ Port 8080 exposed
- ✅ Environment variables set
- ✅ CORS configured with frontend URL

### Frontend Checklist:

- ✅ Service deployed from Docker
- ✅ Homepage loads (no 404)
- ✅ Next.js started on port 3000
- ✅ `NEXT_PUBLIC_API_URL` points to backend
- ✅ No build errors in logs
- ✅ API calls reach backend
- ✅ No CORS errors

### Database Checklist:

- ✅ 48 tables exist
- ✅ Super admin exists
- ✅ Demo users exist
- ✅ Backend can connect
- ✅ Migrations applied

---

## 🚨 Part 7: Troubleshooting

### Issue 1: Backend Build Fails

**Symptom:** "Docker build failed" in logs

**Solutions:**

1. **Check Dockerfile path:**
   - Settings → Root Directory = `my-backend`
   - Dockerfile Path = `my-backend/Dockerfile`

2. **Check package.json exists:**
   ```bash
   # In your local repo
   ls my-backend/package.json
   ```

3. **Check Prisma schema:**
   ```bash
   ls my-backend/prisma/schema.prisma
   ```

4. **View full build logs:**
   - Railway Dashboard → Backend → Logs
   - Look for exact error message

---

### Issue 2: Frontend Build Fails

**Symptom:** "Next build failed" in logs

**Common Causes:**

1. **TypeScript errors:**
   ```bash
   # Test locally first
   cd my-frontend
   npm run build
   ```

2. **Missing environment variables:**
   - Check `NEXT_PUBLIC_API_URL` is set
   - Check it's set in **Variables** tab, not Build Args

3. **Out of memory:**
   - Railway free tier has memory limits
   - Try: Settings → Resources → Increase memory

4. **ESLint errors:**
   - Check `next.config.js` has:
   ```javascript
   eslint: { ignoreDuringBuilds: true }
   ```

---

### Issue 3: "Failed to fetch" Error

**Symptom:** Frontend console shows "Failed to fetch" when calling API

**Solutions:**

1. **Check NEXT_PUBLIC_API_URL is set:**
   ```bash
   # In Railway frontend Variables tab
   NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
   ```

2. **Redeploy frontend** after adding variable:
   - Variables alone don't trigger rebuild
   - Must click Deploy button

3. **Check backend is running:**
   ```bash
   curl https://bisman-erp-backend-production.up.railway.app/api/health
   ```

---

### Issue 4: CORS Error

**Symptom:** "CORS policy: No 'Access-Control-Allow-Origin'"

**Solutions:**

1. **Update backend CORS variables:**
   ```bash
   FRONTEND_URL=https://frontend-production-XXXX.up.railway.app
   CORS_ORIGIN=https://frontend-production-XXXX.up.railway.app
   ```

2. **Redeploy backend** after updating

3. **Check backend logs:**
   - Look for: "Allowed Origins: ..."
   - Should include your frontend URL

---

### Issue 5: Database Connection Error

**Symptom:** "P1001: Can't reach database server"

**Solutions:**

1. **Check DATABASE_URL variable:**
   ```bash
   # Should be:
   DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}
   ```

2. **Verify database service is running:**
   - Railway Dashboard → bisman-erp-db
   - Status should be "Active"

3. **Check database credentials:**
   ```bash
   # Test connection locally
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

---

### Issue 6: "Module not found" Error

**Symptom:** Node.js errors about missing modules

**Solutions:**

1. **Clear Docker cache:**
   - Railway Dashboard → Service → Settings
   - Click "Clear Build Cache"
   - Redeploy

2. **Check package.json is up to date:**
   ```bash
   git status
   git log package.json -1
   ```

3. **Verify npm install ran:**
   - Check build logs for "npm ci" output
   - Should show all packages installed

---

### Issue 7: Port Already in Use

**Symptom:** "EADDRINUSE: address already in use :::8080"

**Solution:**
- Railway automatically assigns ports
- Don't need to worry about port conflicts
- If error persists, restart service

---

## 📊 Part 8: Service Health Dashboard

### Backend Health Checks:

```bash
# Health endpoint
curl https://bisman-erp-backend-production.up.railway.app/api/health

# Database health
curl https://bisman-erp-backend-production.up.railway.app/api/health/database

# System info
curl https://bisman-erp-backend-production.up.railway.app/api/health/system
```

### Frontend Health Checks:

```bash
# Homepage
curl https://frontend-production-XXXX.up.railway.app/

# API proxy health
curl https://frontend-production-XXXX.up.railway.app/api/health
```

---

## 📝 Part 9: Post-Deployment Checklist

### Immediate Tasks:
- [ ] Backend deployed and responding to `/api/health`
- [ ] Frontend deployed and homepage loads
- [ ] `NEXT_PUBLIC_API_URL` set in frontend
- [ ] Backend CORS updated with frontend URL
- [ ] Both services redeployed with correct variables
- [ ] Login works with demo credentials
- [ ] Dashboard loads after login
- [ ] No console errors in browser

### Security Tasks:
- [ ] Change `JWT_SECRET` to strong random string
- [ ] Change `SESSION_SECRET` to strong random string
- [ ] Update database password (if using default)
- [ ] Enable HTTPS redirect (Railway does this automatically)
- [ ] Review CORS origins (restrict to your domain only)

### Monitoring Tasks:
- [ ] Set up Railway alerting (Settings → Notifications)
- [ ] Add custom domain (if needed)
- [ ] Configure Railway metrics
- [ ] Set up log aggregation
- [ ] Test error scenarios

---

## 🎯 Quick Reference Commands

### Railway CLI Commands:

```bash
# Login
railway login

# Link project
railway link

# List services
railway service list

# View logs
railway logs

# Run commands in service context
railway run npm run migrate

# Check environment variables
railway variables

# Deploy manually
railway up

# Check status
railway status
```

### Docker Commands (Local Testing):

```bash
# Build backend locally
cd my-backend
docker build -t backend:test .
docker run -p 8080:8080 --env-file .env backend:test

# Build frontend locally
cd my-frontend
docker build -t frontend:test \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8080 .
docker run -p 3000:3000 frontend:test

# Test both with docker-compose
docker-compose up --build
```

---

## 🔐 Environment Variables Summary

### Backend Variables:
```bash
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}
NODE_ENV=production
PORT=8080
JWT_SECRET=your-strong-secret-here
SESSION_SECRET=your-session-secret-here
FRONTEND_URL=https://frontend-production-XXXX.up.railway.app
FRONTEND_URLS=https://frontend-production-XXXX.up.railway.app
CORS_ORIGIN=https://frontend-production-XXXX.up.railway.app
ALLOW_LOCALHOST=0
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
LOG_LEVEL=info
```

### Frontend Variables:
```bash
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NEXT_PUBLIC_API_BASE=https://bisman-erp-backend-production.up.railway.app
NODE_ENV=production
PORT=3000
RAILWAY=1
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENV=production
```

---

## 🚀 Expected Timeline

| Task | Time | Status |
|------|------|--------|
| Delete old services | 2 min | ⏰ |
| Create backend service | 1 min | ⏰ |
| Configure backend | 3 min | ⏰ |
| Deploy backend | 3-5 min | ⏰ |
| Create frontend service | 1 min | ⏰ |
| Configure frontend | 3 min | ⏰ |
| Deploy frontend | 5-8 min | ⏰ |
| Update CORS | 2 min | ⏰ |
| Testing | 5 min | ⏰ |
| **Total** | **25-35 min** | ⏰ |

---

## ✅ Success Indicators

You'll know everything is working when:

1. **Backend:**
   - ✅ `https://backend.../api/health` returns `{"status":"ok"}`
   - ✅ Logs show "Server listening on port 8080"
   - ✅ No database connection errors

2. **Frontend:**
   - ✅ Homepage loads without errors
   - ✅ Login page accessible
   - ✅ No "Failed to fetch" in console
   - ✅ No CORS errors

3. **Integration:**
   - ✅ Can login with demo credentials
   - ✅ Dashboard loads after login
   - ✅ API calls visible in Network tab
   - ✅ All features working

---

## 📞 Need Help?

### Check Logs First:
- Railway Dashboard → Service → **Logs** tab
- Look for red error messages
- Copy exact error text

### Common Log Locations:
- Build errors: **Build Logs** section
- Runtime errors: **Deploy Logs** section
- Application errors: Live logs stream

### Debug Mode:
Add to backend variables:
```bash
DEBUG=*
LOG_LEVEL=debug
```

---

## 🎉 You're Done!

Both frontend and backend are now:
- ✅ Deployed from Docker
- ✅ Running on Railway
- ✅ Connected to database
- ✅ Communicating with each other
- ✅ Ready for production use

**Next Steps:**
1. Test all features thoroughly
2. Set up custom domain (optional)
3. Configure monitoring and alerts
4. Update DNS records (if custom domain)
5. Enable auto-deployments from GitHub

---

**Need to rebuild again?** Just follow this guide from the top! 🚀
