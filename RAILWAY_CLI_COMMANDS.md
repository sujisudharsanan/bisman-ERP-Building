# 🚀 Railway CLI Commands - Copy & Paste

## Step 1: Login to Railway

```bash
railway login --browserless
```

**Follow the instructions:**
1. Visit the URL shown
2. Enter the pairing code
3. Authorize in browser
4. Wait for "Logged in successfully" message

---

## Step 2: Link to Your Project

```bash
railway link
```

Select your project: **discerning-creativity**

---

## Step 3: Set Backend Variables

### Select Backend Service:
```bash
railway service
```
**Choose:** `bisman-ERP-Backend`

### Set Variables (Copy all lines and paste):

```bash
railway variables set NODE_ENV=production
railway variables set PORT=8080
railway variables set FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
railway variables set FRONTEND_URLS=https://bisman-erp-frontend-production.up.railway.app
railway variables set CORS_ORIGIN=https://bisman-erp-frontend-production.up.railway.app
railway variables set ALLOW_LOCALHOST=0
railway variables set DATABASE_POOL_MIN=2
railway variables set DATABASE_POOL_MAX=10
railway variables set LOG_LEVEL=info
railway variables set JWT_SECRET=bisman-erp-jwt-secret-2025-change-this
railway variables set SESSION_SECRET=bisman-erp-session-secret-2025-change-this
```

---

## Step 4: Set Frontend Variables

### Select Frontend Service:
```bash
railway service
```
**Choose:** `bisman-ERP-frontend`

### Set Variables (Copy all lines and paste):

```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set RAILWAY=1
railway variables set NEXT_TELEMETRY_DISABLED=1
railway variables set NEXT_PUBLIC_ENABLE_CHAT=true
railway variables set NEXT_PUBLIC_ENV=production
railway variables set NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
railway variables set NEXT_PUBLIC_API_BASE=https://bisman-erp-backend-production.up.railway.app
railway variables set NEXT_PUBLIC_API_BASE_URL=https://bisman-erp-backend-production.up.railway.app
```

---

## Step 5: Verify Variables Were Set

### Check Backend Variables:
```bash
railway service  # Select backend
railway variables
```

### Check Frontend Variables:
```bash
railway service  # Select frontend
railway variables
```

---

## Step 6: Redeploy Services

### Option A: Using CLI

**Redeploy Backend:**
```bash
railway service  # Select backend
railway up
```

**Redeploy Frontend:**
```bash
railway service  # Select frontend
railway up
```

### Option B: Using Dashboard (Easier)

1. Go to Railway Dashboard
2. Click **bisman-ERP-Backend** → **Deployments** → **Deploy** button
3. Click **bisman-ERP-frontend** → **Deployments** → **Deploy** button

---

## Step 7: Test Everything

### Test Backend Health:
```bash
curl https://bisman-erp-backend-production.up.railway.app/api/health
```

Expected: `{"status":"ok",...}`

### Test Frontend:
```bash
curl -I https://bisman-erp-frontend-production.up.railway.app/
```

Expected: `HTTP/2 200`

### Test Login:
Open in browser:
```
https://bisman-erp-frontend-production.up.railway.app/auth/login
```

Login with:
- Email: `demo_hub_incharge@bisman.demo`
- Password: `Demo@123`

---

## 🎯 Quick Copy-Paste Workflow

**Run these commands in order:**

```bash
# 1. Login
railway login --browserless

# 2. Link project
railway link

# 3. Backend - Select service
railway service
# (Choose: bisman-ERP-Backend)

# 4. Backend - Set all variables at once
railway variables set NODE_ENV=production PORT=8080 FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app FRONTEND_URLS=https://bisman-erp-frontend-production.up.railway.app CORS_ORIGIN=https://bisman-erp-frontend-production.up.railway.app ALLOW_LOCALHOST=0 DATABASE_POOL_MIN=2 DATABASE_POOL_MAX=10 LOG_LEVEL=info JWT_SECRET=bisman-erp-jwt-secret-2025 SESSION_SECRET=bisman-erp-session-secret-2025

# 5. Frontend - Select service
railway service
# (Choose: bisman-ERP-frontend)

# 6. Frontend - Set all variables
railway variables set NODE_ENV=production PORT=3000 RAILWAY=1 NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_ENABLE_CHAT=true NEXT_PUBLIC_ENV=production NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app NEXT_PUBLIC_API_BASE=https://bisman-erp-backend-production.up.railway.app NEXT_PUBLIC_API_BASE_URL=https://bisman-erp-backend-production.up.railway.app

# 7. Verify
railway variables
```

---

## ✅ Done!

After setting variables, go to Railway Dashboard and click **Deploy** on both services!

🎉 Your services will be fully configured and connected!
