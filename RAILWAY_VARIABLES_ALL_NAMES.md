# 🎯 Railway Environment Variables - All Accepted Names

Your frontend code checks **multiple environment variable names**. Use **any one** of these:

---

## ✅ Option 1: NEXT_PUBLIC_API_URL (Recommended)

```
Name:  NEXT_PUBLIC_API_URL
Value: https://bisman-erp-backend-production.up.railway.app
```

---

## ✅ Option 2: NEXT_PUBLIC_API_BASE

```
Name:  NEXT_PUBLIC_API_BASE
Value: https://bisman-erp-backend-production.up.railway.app
```

---

## ✅ Option 3: NEXT_PUBLIC_API_BASE_URL

```
Name:  NEXT_PUBLIC_API_BASE_URL
Value: https://bisman-erp-backend-production.up.railway.app
```

---

## 🔍 Priority Order (from next.config.js)

Your code checks in this order:
1. **NEXT_PUBLIC_API_URL** (first)
2. **NEXT_PUBLIC_API_BASE** (if #1 not found)
3. **NEXT_PUBLIC_API_BASE_URL** (if #1 and #2 not found)
4. null (uses same-origin - won't work on Railway)

---

## 📋 Complete Railway Variables to Add

In Railway Dashboard → **frontend** service → **Variables** tab:

### Required Variables:

```
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app
NODE_ENV=production
PORT=3000
```

### Optional (if you see CORS issues):

```
RAILWAY=1
```

---

## 🔧 Where These Variables Are Used

Your code uses these in multiple places:

### 1. next.config.js (API Proxy)
```javascript
const API_URL = 
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  null;

// Then proxies /api/* to ${API_URL}/api/*
```

### 2. useSocket.ts (WebSocket)
```javascript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
```

### 3. src/pages/api/[...slug].ts (API Handler)
```javascript
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### 4. src/pages/api/health.ts (Health Check)
```javascript
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### 5. DynamicSidebar.tsx (Frontend Component)
```javascript
const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
```

---

## ✅ Quick Action Steps

1. Go to Railway Dashboard
2. Click **frontend** service
3. Click **Variables** tab
4. Add **ONE** of these:
   - `NEXT_PUBLIC_API_URL` (recommended - used most places)
   - `NEXT_PUBLIC_API_BASE` (alternative)
   - `NEXT_PUBLIC_API_BASE_URL` (alternative)
5. Set value: `https://bisman-erp-backend-production.up.railway.app`
6. Add `NODE_ENV=production`
7. Add `PORT=3000`
8. Click **Deployments** tab → **Deploy** button
9. Wait 2-3 minutes

---

## 🎯 Which Name to Use?

**Use `NEXT_PUBLIC_API_URL`** because:
- ✅ It's checked first (highest priority)
- ✅ Most of your code uses this name
- ✅ Matches your .env.local.example
- ✅ Standard Next.js convention

---

## 🔍 Verify It Worked

After deployment, open browser console on your frontend:

```javascript
// Type this in browser console:
console.log(window.location.origin);
// Should show: https://frontend-production-XXXX.up.railway.app

// Check if fetch works:
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
// Should show backend health response, not error
```

---

## ⚠️ Common Mistakes

### ❌ Wrong: Using without NEXT_PUBLIC_ prefix
```
API_URL=https://... ❌ Won't work in browser!
BACKEND_URL=https://... ❌ Won't work in browser!
```

### ✅ Correct: Using NEXT_PUBLIC_ prefix
```
NEXT_PUBLIC_API_URL=https://... ✅ Works in browser!
```

**Why?** Next.js only exposes variables starting with `NEXT_PUBLIC_` to the browser. Others are server-side only.

---

## 📊 Current Status

### Backend (Working):
- ✅ URL: https://bisman-erp-backend-production.up.railway.app
- ✅ Status: Deployed and running
- ✅ Database: 48 tables, demo data seeded

### Frontend (Deployed but Not Connected):
- ⚠️ Deployed successfully
- ❌ Missing API URL variable
- ❌ Can't communicate with backend

### Fix:
Add **NEXT_PUBLIC_API_URL** → Redeploy → Done! 🚀

---

**Start here**: Railway Dashboard → frontend service → Variables tab → Add variables 
