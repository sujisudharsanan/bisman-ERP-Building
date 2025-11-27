# 🔧 Fix Frontend-Backend Connection on Railway

## Problem
- ✅ Frontend deployed successfully
- ✅ Backend deployed successfully
- ❌ Frontend doesn't know where backend is
- ❌ API calls failing (no connection)

## Solution: Add Environment Variables

### Step-by-Step Fix

#### 1. Go to Railway Frontend Service
In your Railway dashboard (where you are now):
1. Click on **frontend** service
2. Click **Variables** tab
3. Add these variables one by one:

```bash
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NODE_ENV=production
PORT=3000
```

#### 2. How to Add Each Variable
For each variable above:
1. Click **"+ New Variable"** button
2. Enter **Variable Name** (e.g., `NEXT_PUBLIC_API_URL`)
3. Enter **Value** (e.g., `https://bisman-erp-backend-production.up.railway.app`)
4. Click **Add** or press Enter

#### 3. Redeploy Frontend
After adding all variables:
1. Go to **Deployments** tab
2. Click **"Deploy"** button (top right)
3. Or click the three dots (...) on latest deployment → **"Redeploy"**

#### 4. Wait for Deployment (2-3 minutes)
Watch the build logs to ensure it completes successfully.

---

## Verification Steps

### After Redeployment Completes:

#### Step 1: Get Your Frontend URL
1. In Railway frontend service
2. Go to **Settings** → **Networking**
3. If no domain exists, click **"Generate Domain"**
4. Copy your URL (e.g., `https://frontend-production-abc.up.railway.app`)

#### Step 2: Test Frontend
Open in browser:
```
https://your-frontend.up.railway.app/
```

You should see the login page or landing page.

#### Step 3: Test API Connection
Open browser console (F12) and check Network tab. You should see API calls going to:
```
https://bisman-erp-backend-production.up.railway.app/api/*
```

#### Step 4: Test Login
Try logging in with:
- **Email**: `demo_hub_incharge@bisman.demo`
- **Password**: `Demo@123`

---

## Update Backend CORS

### After Frontend is Working:

#### 1. Get Your Frontend URL
Example: `https://frontend-production-abc.up.railway.app`

#### 2. Update Backend Variables
Go to **bisman-erp-backend** service → **Variables** tab:

Add/Update these variables:
```bash
FRONTEND_URL=https://frontend-production-abc.up.railway.app
FRONTEND_URLS=https://frontend-production-abc.up.railway.app,https://bisman-erp-backend-production.up.railway.app
```

#### 3. Redeploy Backend
Click **Deploy** button in backend service

---

## Expected Results

### ✅ Frontend Working:
- Login page loads
- No console errors
- API calls visible in Network tab

### ✅ Backend CORS Working:
- No "CORS blocked" errors
- API responses return successfully
- Authentication works

### ✅ Full Flow Working:
- Can login with demo credentials
- Dashboard loads after login
- All features accessible

---

## Quick Checklist

### Frontend Service Variables:
- [ ] `NEXT_PUBLIC_API_URL` = `https://bisman-erp-backend-production.up.railway.app`
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`
- [ ] Variables saved
- [ ] Frontend redeployed

### Backend Service Variables (after frontend URL known):
- [ ] `FRONTEND_URL` = your frontend URL
- [ ] `FRONTEND_URLS` = your frontend URL
- [ ] Variables saved
- [ ] Backend redeployed

### Testing:
- [ ] Frontend URL accessible
- [ ] Login page loads
- [ ] No console errors
- [ ] Can login successfully
- [ ] Dashboard loads

---

## Troubleshooting

### Issue: "Failed to fetch" error
**Cause**: Frontend doesn't know backend URL
**Solution**: Add `NEXT_PUBLIC_API_URL` variable and redeploy

### Issue: "CORS blocked" error
**Cause**: Backend doesn't allow frontend domain
**Solution**: Add frontend URL to backend `FRONTEND_URLS` and redeploy backend

### Issue: Environment variables not working
**Cause**: Variables added but not redeployed
**Solution**: Must click **Deploy** button after adding variables

### Issue: Build fails after adding variables
**Cause**: Invalid URL format
**Solution**: Ensure URL starts with `https://` and has no trailing slash

---

## Screenshot Guide

### Where to Add Variables:
```
Railway Dashboard
└── frontend service (click)
    └── Variables tab (click)
        └── + New Variable button (click)
            ├── Variable Name: NEXT_PUBLIC_API_URL
            └── Value: https://bisman-erp-backend-production.up.railway.app
```

### Where to Redeploy:
```
Railway Dashboard
└── frontend service
    └── Deployments tab
        └── Deploy button (top right)
```

---

## Final Configuration

### Frontend Variables:
```env
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NODE_ENV=production
PORT=3000
```

### Backend Variables (update after getting frontend URL):
```env
DATABASE_URL=${{bisman-erp-db.DATABASE_URL}}
NODE_ENV=production
PORT=8080
JWT_SECRET=<your-secret>
FRONTEND_URL=https://your-frontend.up.railway.app
FRONTEND_URLS=https://your-frontend.up.railway.app
```

---

**Action Required**: Add the 3 variables to frontend service NOW and redeploy! 🚀
