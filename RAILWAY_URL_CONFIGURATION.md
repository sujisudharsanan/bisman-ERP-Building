# 🔗 Railway Services URL Configuration

## 📍 Your Service URLs

✅ **Backend URL:** `https://bisman-erp-backend-production.up.railway.app`
✅ **Frontend URL:** `https://bisman-erp-frontend-production.up.railway.app`
✅ **Database:** `bisman-erp-db` (already connected)

---

## 🚀 Step-by-Step Configuration

### Step 1: Configure Backend Environment Variables

Go to Railway Dashboard → **bisman-ERP-Backend** service → **Variables** tab

**Add/Update these variables:**

```bash
# Database Connection
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}

# Node Environment
NODE_ENV=production
PORT=8080

# JWT & Session Secrets (CHANGE THESE!)
JWT_SECRET=bisman-erp-production-jwt-secret-2025-change-this
SESSION_SECRET=bisman-erp-production-session-secret-2025-change-this

# Frontend URLs for CORS
FRONTEND_URL=https://bisman-erp-frontend-production.up.railway.app
FRONTEND_URLS=https://bisman-erp-frontend-production.up.railway.app
CORS_ORIGIN=https://bisman-erp-frontend-production.up.railway.app

# Security Settings
ALLOW_LOCALHOST=0

# Database Pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Logging
LOG_LEVEL=info
```

---

### Step 2: Configure Frontend Environment Variables

Go to Railway Dashboard → **bisman-ERP-frontend** service → **Variables** tab

**Add/Update these variables:**

```bash
# Backend API URL (CRITICAL!)
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NEXT_PUBLIC_API_BASE=https://bisman-erp-backend-production.up.railway.app
NEXT_PUBLIC_API_BASE_URL=https://bisman-erp-backend-production.up.railway.app

# Node Environment
NODE_ENV=production
PORT=3000

# Railway Flag
RAILWAY=1

# Next.js Settings
NEXT_TELEMETRY_DISABLED=1

# Feature Flags
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_ENV=production

# Mattermost (Optional)
NEXT_PUBLIC_MM_TEAM_SLUG=erp
MM_BASE_URL=http://localhost:8065
```

---

### Step 3: Redeploy Both Services

#### Backend:
1. Go to **bisman-ERP-Backend** service
2. Click **Deployments** tab
3. Click **Deploy** button (top right)
4. Wait for deployment to complete (~3-5 minutes)

#### Frontend:
1. Go to **bisman-ERP-frontend** service
2. Click **Deployments** tab
3. Click **Deploy** button (top right)
4. Wait for deployment to complete (~5-8 minutes)

---

## ✅ Verification Steps

### Test 1: Backend Health Check

Open Terminal and run:

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

---

### Test 2: Frontend Loads

Open in browser:
```
https://bisman-erp-frontend-production.up.railway.app
```

**Expected:**
- ✅ Homepage/Login page loads
- ✅ No console errors
- ✅ No "Failed to fetch" errors

---

### Test 3: Login Flow

1. Navigate to: `https://bisman-erp-frontend-production.up.railway.app/auth/login`
2. Open Developer Tools (F12) → Console tab
3. Enter credentials:
   - **Email:** `demo_hub_incharge@bisman.demo`
   - **Password:** `Demo@123`
4. Click **Login**

**Expected:**
- ✅ No CORS errors
- ✅ Network tab shows POST to backend
- ✅ Response status 200
- ✅ Redirects to dashboard

---

## 🔍 Check Backend Logs

Railway Dashboard → **bisman-ERP-Backend** → **Logs** tab

Look for:
```
✅ Server listening on port 8080
✅ Database connected
✅ Prisma client generated
✅ Allowed origins: https://bisman-erp-frontend-production.up.railway.app
```

---

## 🔍 Check Frontend Logs

Railway Dashboard → **bisman-ERP-frontend** → **Logs** tab

Look for:
```
✅ Server started on port 3000
✅ Ready on http://0.0.0.0:3000
✅ Compiled successfully
✅ No build errors
```

---

## 🚨 Common Issues & Fixes

### Issue: CORS Error

**Symptom:** Console shows "CORS policy: No 'Access-Control-Allow-Origin'"

**Fix:**
1. Verify backend `CORS_ORIGIN` is set to: `https://bisman-erp-frontend-production.up.railway.app`
2. Redeploy backend
3. Wait 2-3 minutes
4. Try again

---

### Issue: "Failed to fetch" Error

**Symptom:** Frontend can't connect to backend

**Fix:**
1. Verify frontend `NEXT_PUBLIC_API_URL` is set to: `https://bisman-erp-backend-production.up.railway.app`
2. Redeploy frontend
3. Clear browser cache
4. Try again

---

### Issue: Database Connection Error

**Symptom:** Backend logs show "Can't reach database server"

**Fix:**
1. Go to backend Variables
2. Verify `DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}`
3. Check database service is running
4. Redeploy backend

---

## 📋 Final Checklist

Before testing, ensure:

- [ ] Backend has `FRONTEND_URL` set to frontend URL
- [ ] Backend has `CORS_ORIGIN` set to frontend URL
- [ ] Frontend has `NEXT_PUBLIC_API_URL` set to backend URL
- [ ] Both services redeployed after variable changes
- [ ] Backend health endpoint returns 200
- [ ] Frontend homepage loads
- [ ] No CORS errors in browser console
- [ ] Login works with demo credentials

---

## 🎉 Success!

Once all checks pass, your application is:
- ✅ Fully deployed on Railway
- ✅ Backend and frontend connected
- ✅ Database connected
- ✅ CORS configured correctly
- ✅ Ready for production use

---

## 🔐 Next Steps (Optional but Recommended)

### 1. Change Secrets
Generate strong random strings for:
- `JWT_SECRET`
- `SESSION_SECRET`

```bash
# Generate random secrets (macOS/Linux)
openssl rand -base64 32
```

### 2. Set Up Custom Domain
- Railway Dashboard → Service → Settings → Domains
- Add your custom domain
- Update DNS records

### 3. Enable Auto-Deploy
- Railway Dashboard → Service → Settings
- Enable "Auto-deploy on push"
- Deployments trigger automatically on git push

### 4. Set Up Monitoring
- Railway Dashboard → Service → Settings → Notifications
- Add Slack/Discord webhook for alerts

---

## 📞 Quick Test Commands

```bash
# Test backend health
curl https://bisman-erp-backend-production.up.railway.app/api/health

# Test frontend (should return HTML)
curl https://bisman-erp-frontend-production.up.railway.app/

# Test login endpoint (should return JSON)
curl -X POST https://bisman-erp-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}'
```

---

**All set! 🚀** Follow the steps above and let me know if you encounter any issues.
