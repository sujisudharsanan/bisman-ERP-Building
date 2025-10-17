# 🚀 Vercel Deployment Fix - Environment Variables Required

## ❌ Current Issues

Your Vercel deployment is failing with 401 errors because:

1. ❌ **Wrong backend URL** in vercel.json (was pointing to rr6f instead of xr6f)
2. ❌ **Missing NEXT_PUBLIC_API_URL** environment variable in Vercel dashboard
3. ❌ **CORS not configured** for the exact Vercel deployment URL

---

## ✅ FIXES APPLIED LOCALLY

### 1. Fixed vercel.json
Changed backend proxy from:
- ❌ `https://bisman-erp-rr6f.onrender.com` (404 server)
- ✅ `https://bisman-erp-xr6f.onrender.com` (working server)

---

## 🔧 REQUIRED: Vercel Dashboard Configuration

### **Step 1: Add Environment Variable in Vercel**

1. Go to: https://vercel.com/sujis-projects-dfb64252/bisman-erp-building/settings/environment-variables

2. Add this environment variable:
   ```
   Key: NEXT_PUBLIC_API_URL
   Value: https://bisman-erp-xr6f.onrender.com
   ```

3. Select environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. Click **Save**

### **Step 2: Verify Backend CORS (Already Done)**

Your backend at `https://bisman-erp-xr6f.onrender.com` already has CORS configured for:
- ✅ Exact URL: `https://bisman-erp-building-git-diployment-sujis-projects-dfb64252.vercel.app`
- ✅ Wildcard: `regex:^https://.*\\.vercel\\.app$`

### **Step 3: Push Updated vercel.json**

```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
git add vercel.json
git commit -m "fix: Update vercel.json to use correct backend URL (xr6f)"
git push origin diployment
```

This will trigger a new Vercel deployment with the corrected backend URL.

---

## 🧪 Testing After Deployment

### **1. Check Console Logs**

After redeployment, open browser console on Vercel URL and look for:
```
✅ API Base URL: https://bisman-erp-xr6f.onrender.com
✅ API Health Check: https://bisman-erp-xr6f.onrender.com/api/health
✅ /api/health: {"status":"ok"}
```

### **2. Test Login**

1. Go to: https://bisman-erp-building-git-diployment-sujis-projects-dfb64252.vercel.app
2. Login with: `super@bisman.local` / `password`
3. Check console for:
   ```
   ✅ User authenticated with role: SUPER_ADMIN
   ✅ Login successful - Tokens generated with role: SUPER_ADMIN
   ```

### **3. Verify API Calls**

Open Network tab (F12) and check:
- ✅ `/api/me` returns **200 OK** (not 401)
- ✅ `/api/login` returns **200 OK**
- ✅ Response includes `role` and `roleName` fields

---

## 🔍 Debugging Commands

If issues persist, check these in browser console:

```javascript
// Check API URL being used
console.log('API Base:', process.env.NEXT_PUBLIC_API_URL);

// Test backend health
fetch('https://bisman-erp-xr6f.onrender.com/api/health')
  .then(r => r.json())
  .then(d => console.log('Backend health:', d));

// Test CORS
fetch('https://bisman-erp-xr6f.onrender.com/api/me', {
  credentials: 'include'
}).then(r => console.log('CORS test:', r.status));
```

---

## 📊 Error Code Reference

### **401 Unauthorized**
**Causes:**
- Missing or expired JWT token
- Backend not receiving cookies (CORS issue)
- Wrong backend URL (404 pretending to be 401)

**Fix:**
- ✅ Ensure `credentials: 'include'` in all fetch calls (already done)
- ✅ Backend CORS has `credentials: true` (already done)
- ✅ Vercel uses correct backend URL (fixed in vercel.json)

### **404 Not Found**
**Causes:**
- Backend URL wrong (rr6f vs xr6f)
- API route doesn't exist

**Fix:**
- ✅ Updated vercel.json to use xr6f

### **500 Internal Server Error**
**Causes:**
- Backend crash or uncaught exception
- Database connection failure

**Fix:**
- Check Render logs: https://dashboard.render.com/web/srv-XXX/logs
- Verify environment variables on Render

---

## 🎯 Expected Console Output After Fix

### **Successful Login Flow:**
```
[Vercel Console]
✅ API Base URL: https://bisman-erp-xr6f.onrender.com
🎬 App Render Cycle: { pathname: "/auth/login", ... }
✅ Global error listeners attached
✅ API Health Check: https://bisman-erp-xr6f.onrender.com/api/health
✅ /api/health: {"status":"ok"}
✅ /api/me: 200 OK
✅ Frontend running on: localhost
✅ /api/login: 200 OK
✅ User authenticated with role: SUPER_ADMIN
🔐 Manager Page Auth Check: { user: "super@bisman.local", role: "SUPER_ADMIN" }
🔀 SUPER_ADMIN detected, redirecting
🎬 App Render Cycle: { pathname: "/super-admin", ... }
```

### **Network Tab:**
```
✅ POST https://bisman-erp-building-[...].vercel.app/api/login → 200 OK
✅ GET  https://bisman-erp-building-[...].vercel.app/api/me → 200 OK
✅ Cookies: access_token, refresh_token (HttpOnly)
```

---

## ⚠️ Common Pitfalls

### **1. Cached Build**
If you see old errors after redeployment:
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Clear site data in DevTools → Application → Clear storage

### **2. Wrong Environment**
Ensure environment variable is set in **Production** environment:
- Not just Preview or Development
- Must be set for the `diployment` branch

### **3. Backend Not Running**
Check Render dashboard:
- Service must be active (not sleeping)
- Logs should show "Server listening on port 3001"

---

## 📝 Deployment Checklist

Before each deployment, verify:

- [ ] `vercel.json` has correct backend URL (xr6f)
- [ ] `NEXT_PUBLIC_API_URL` set in Vercel dashboard
- [ ] Backend CORS includes Vercel domain
- [ ] Backend is running on Render (not sleeping)
- [ ] Environment variables match between .env.local and Vercel
- [ ] Git branch is `diployment` (not main)

---

## 🚀 Quick Deploy Command

```bash
# After fixing vercel.json locally
cd "/Users/abhi/Desktop/BISMAN ERP"
git add vercel.json VERCEL_DEPLOYMENT_FIX.md
git commit -m "fix: Correct backend URL in vercel.json and add deployment guide"
git push origin diployment
```

This will trigger Vercel auto-deploy. Check deployment status at:
https://vercel.com/sujis-projects-dfb64252/bisman-erp-building/deployments

---

## ✅ Success Criteria

Deployment is successful when:
1. ✅ No 401 errors in console
2. ✅ Login redirects to appropriate dashboard
3. ✅ Dashboard shows content (not blank)
4. ✅ Console shows role: "SUPER_ADMIN" (or appropriate role)
5. ✅ Network tab shows all /api/* calls return 200

---

**Status:** 🔧 Fixes Applied Locally - Push to Deploy
**Next Step:** Add NEXT_PUBLIC_API_URL in Vercel Dashboard, then push changes
