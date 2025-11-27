# ✅ Railway Frontend Connection Checklist

## 🎯 Quick Fix (5 Minutes)

### Step 1: Add Variables to Frontend ⏰ 2 min

In Railway Dashboard → **frontend** service → **Variables** tab:

**Variable 1:**
```
Name:  NEXT_PUBLIC_API_URL
Value: https://bisman-erp-backend-production.up.railway.app
```

**Variable 2:**
```
Name:  NODE_ENV
Value: production
```

**Variable 3:**
```
Name:  PORT
Value: 3000
```

✅ Click **Add** after each variable

---

### Step 2: Redeploy Frontend ⏰ 3 min

1. Click **Deployments** tab
2. Click **Deploy** button (purple, top right)
3. Wait for build to complete (watch the logs)

---

### Step 3: Get Frontend URL ⏰ 30 sec

1. Go to **Settings** → **Networking**
2. Click **Generate Domain** (if not exists)
3. Copy URL: `https://frontend-production-XXXX.up.railway.app`

---

### Step 4: Test ⏰ 1 min

Open your frontend URL in browser:
```
https://frontend-production-XXXX.up.railway.app/auth/login
```

Try login:
- Email: `demo_hub_incharge@bisman.demo`
- Password: `Demo@123`

---

## ✅ Success Indicators

After completing above steps, you should see:

- ✅ Frontend loads without errors
- ✅ Login page displays correctly
- ✅ No "Failed to fetch" errors in console
- ✅ Can login successfully
- ✅ Dashboard loads after login

---

## ⚠️ If Login Shows CORS Error

### Additional Step: Update Backend CORS

Go to **bisman-erp-backend** service → **Variables**:

Add/Update:
```
Name:  FRONTEND_URL
Value: https://frontend-production-XXXX.up.railway.app
       ^^^ (use your actual frontend URL)
```

Then redeploy backend (click Deploy button)

---

## 🔍 Debug Commands (If Issues)

### Check Frontend Logs:
```
Railway → frontend service → Logs tab
```

Look for:
- ✅ "Server started on port 3000"
- ❌ "ECONNREFUSED" or "Failed to fetch" = missing API URL

### Check Backend Logs:
```
Railway → bisman-erp-backend service → Logs tab
```

Look for:
- ✅ "Server listening on port 8080"
- ❌ "CORS blocked" = frontend URL not allowed

### Check Browser Console:
```
Open frontend → Press F12 → Console tab
```

Look for:
- ✅ No errors
- ❌ "CORS policy" error = backend needs frontend URL
- ❌ "Failed to fetch" = frontend missing API URL

---

## 📊 Current Status

### Working:
- ✅ Backend: https://bisman-erp-backend-production.up.railway.app
- ✅ Database: 48 tables, demo data seeded
- ✅ Frontend: Deployed successfully

### Not Working (Yet):
- ❌ Frontend → Backend connection
- ❌ API calls

### Fix:
- 🔧 Add 3 environment variables
- 🔧 Redeploy frontend
- ✅ Done!

---

## 🎯 The One Variable That Matters Most

```
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
```

This tells your frontend where to find the backend API.

**Without it**: Frontend tries to call localhost (doesn't exist)
**With it**: Frontend calls Railway backend URL (works!)

---

**Start here**: Railway Dashboard → frontend service → Variables tab → Add variables → Deploy 🚀
