# 🔧 Authentication & Deployment Fix Guide

## Overview
This guide fixes all 401 (Unauthorized) and "Load failed" errors for the BISMAN ERP application deployed on Vercel (frontend) and Render (backend).

**Backend URL**: `https://bisman-erp-rr6f.onrender.com`  
**Frontend URL**: `https://bisman-erp-building.vercel.app`

---

## ✅ What Was Fixed

### 1. Backend CORS Configuration (`my-backend/app.js`)
- ✅ Added main Vercel production domain: `https://bisman-erp-building.vercel.app`
- ✅ Added regex patterns for dynamic Vercel preview deployments
- ✅ Maintained `credentials: true` for cookie support
- ✅ Kept `sameSite: 'none'` and `secure: true` for production cookies

### 2. Backend Routes
- ✅ Added `/api/refresh` alias route (redirects to `/api/token/refresh`)
- ✅ Verified `/api/me` returns proper user data with role information
- ✅ Enhanced logging for debugging authentication issues

### 3. Frontend Configuration
- ✅ Updated `src/config/api.ts` to use correct backend URL: `https://bisman-erp-rr6f.onrender.com`
- ✅ All fetch calls use `credentials: 'include'` 
- ✅ AuthContext properly handles authentication state

### 4. Environment Variables
- ✅ Updated `.env.example` files with correct values
- ✅ Added missing JWT secrets configuration

---

## 🚀 Deployment Steps

### **Backend (Render) - CRITICAL STEPS**

1. **Set Environment Variables in Render Dashboard**

   Navigate to your Render service → Environment → Add these variables:

   ```bash
   NODE_ENV=production
   PORT=10000
   
   # CORS - Add ALL your frontend domains
   FRONTEND_URL=https://bisman-erp-building.vercel.app
   FRONTEND_URLS=https://bisman-erp-building.vercel.app,https://bisman-erp-building-git-diployment-sujis-projects-dfb64252.vercel.app
   
   # Database (use your actual Render PostgreSQL connection string)
   DATABASE_URL=postgres://your_user:your_password@your_host/your_db
   
   # JWT Secrets - Generate with: openssl rand -base64 32
   ACCESS_TOKEN_SECRET=<generate-strong-secret>
   REFRESH_TOKEN_SECRET=<generate-strong-secret>
   JWT_SECRET=<generate-strong-secret>
   ```

2. **Generate JWT Secrets**

   Run this locally to generate secure secrets:
   ```bash
   openssl rand -base64 32
   ```
   
   Generate 3 different secrets and add them to Render environment variables.

3. **Deploy Backend**

   ```bash
   cd my-backend
   git add .
   git commit -m "Fix: CORS and authentication configuration"
   git push origin main
   ```

   Render will auto-deploy. Wait for deployment to complete.

4. **Verify Backend is Running**

   Test in browser or curl:
   ```bash
   curl https://bisman-erp-rr6f.onrender.com/api/health
   ```

   Should return: `{"status":"ok"}`

---

### **Frontend (Vercel) - CRITICAL STEPS**

1. **Set Environment Variables in Vercel Dashboard**

   Navigate to your Vercel project → Settings → Environment Variables:

   ```bash
   NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com
   ```

   **Important**: Add for all environments (Production, Preview, Development)

2. **Deploy Frontend**

   ```bash
   cd my-frontend
   git add .
   git commit -m "Fix: Update backend URL and credentials handling"
   git push origin main
   ```

   Vercel will auto-deploy.

3. **Trigger Manual Redeploy (Recommended)**

   Sometimes environment variables need a fresh deploy:
   - Go to Vercel Dashboard → Deployments
   - Click "..." on latest deployment → Redeploy

---

## 🧪 Testing & Validation

### 1. **Test in Browser Console**

After deploying both frontend and backend, open your deployed app and run in console:

```javascript
// Test backend connectivity
fetch("https://bisman-erp-rr6f.onrender.com/api/health", {
  credentials: "include"
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test authentication endpoint (before login)
fetch("https://bisman-erp-rr6f.onrender.com/api/me", {
  credentials: "include"
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 2. **Login Test**

1. Open your deployed app: `https://bisman-erp-building.vercel.app`
2. Try logging in with credentials
3. Open DevTools → Application → Cookies
4. Verify cookies are set:
   - `access_token` (Domain: `.onrender.com`)
   - `refresh_token` (Domain: `.onrender.com`)

### 3. **Check Network Tab**

1. Open DevTools → Network
2. Filter by "Fetch/XHR"
3. After login, check `/api/me` request:
   - ✅ Status: **200 OK**
   - ✅ Request Headers: `Cookie: access_token=...`
   - ✅ Response: `{"ok":true,"user":{...}}`

### 4. **Refresh Test**

1. After successful login, refresh the page (F5)
2. You should stay logged in
3. Check Network tab → `/api/me` should return 200 OK

---

## 🐛 Troubleshooting

### ❌ Still Getting 401 Errors?

**Check 1: CORS Origins**
```bash
# Test CORS from your frontend domain
curl -H "Origin: https://bisman-erp-building.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://bisman-erp-rr6f.onrender.com/api/me -v
```

Should return:
```
Access-Control-Allow-Origin: https://bisman-erp-building.vercel.app
Access-Control-Allow-Credentials: true
```

**Check 2: Environment Variables**

Backend (Render):
```bash
echo $FRONTEND_URL
echo $NODE_ENV
echo $ACCESS_TOKEN_SECRET
```

Frontend (Vercel - check in dashboard or build logs):
```
NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com
```

**Check 3: Cookie Settings**

Cookies must have:
- `Secure`: true (HTTPS required)
- `SameSite`: None (cross-origin required)
- `HttpOnly`: true (security)
- `Domain`: `.onrender.com` or not set

**Check 4: Browser DevTools**

1. Open Console - look for CORS errors
2. Open Network → Check request/response headers
3. Open Application → Cookies → Verify cookies exist

---

### ❌ Cookies Not Being Set?

**Possible causes:**

1. **Backend not returning Set-Cookie header**
   - Check `/api/login` response headers in Network tab
   - Should see: `Set-Cookie: access_token=...; Secure; HttpOnly; SameSite=None`

2. **Browser blocking third-party cookies**
   - This is expected behavior
   - Cookies work because backend and frontend are on different domains
   - Ensure `SameSite=None; Secure` is set

3. **CORS credentials not configured**
   - Verify `credentials: 'include'` in all fetch calls
   - Check backend `cors({ credentials: true })`

---

### ❌ React Error #419 (Minified Error)?

This happens when user/role is undefined in dashboard.

**Fix in code:**
```typescript
// In your dashboard component
if (!user || !user.role) {
  return <div>Loading...</div>; // or redirect to login
}

return <Dashboard user={user} />;
```

**Root cause**: Authentication failed, so user is null. Fix auth first.

---

## 📋 Checklist Before Going Live

### Backend (Render)
- [ ] `NODE_ENV=production` set
- [ ] `FRONTEND_URL` includes your Vercel domain
- [ ] `FRONTEND_URLS` includes all deployment URLs
- [ ] `ACCESS_TOKEN_SECRET` is strong and unique
- [ ] `REFRESH_TOKEN_SECRET` is strong and unique
- [ ] `DATABASE_URL` is correct and accessible
- [ ] Backend responds to `/api/health`
- [ ] HTTPS is enforced (Render does this automatically)

### Frontend (Vercel)
- [ ] `NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com` set
- [ ] All API calls use `credentials: 'include'`
- [ ] AuthContext checks authentication on mount
- [ ] Login redirects to dashboard on success
- [ ] Logout clears cookies and redirects to login

### Testing
- [ ] Login works from deployed frontend
- [ ] Cookies are set after login
- [ ] Page refresh maintains authentication
- [ ] `/api/me` returns 200 OK when authenticated
- [ ] `/api/refresh` works when access token expires
- [ ] Logout clears cookies and redirects

---

## 🎯 Expected Behavior After Fix

1. **User visits app** → AuthContext calls `/api/me` → Returns 401 (not logged in) → Shows login page
2. **User logs in** → POST `/api/login` → Returns 200 + sets cookies → Redirects to dashboard
3. **User refreshes page** → AuthContext calls `/api/me` → Returns 200 (authenticated) → Shows dashboard
4. **Access token expires** → Frontend calls `/api/refresh` → Returns new access token → User stays logged in
5. **User logs out** → POST `/api/logout` → Clears cookies → Redirects to login

---

## 🔗 Useful Links

- **Render Dashboard**: https://dashboard.render.com/
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Backend Health Check**: https://bisman-erp-rr6f.onrender.com/api/health
- **Frontend Production**: https://bisman-erp-building.vercel.app
- **React Error #419 Docs**: https://react.dev/errors/419

---

## 📞 Quick Debug Commands

**Test backend from terminal:**
```bash
# Health check
curl https://bisman-erp-rr6f.onrender.com/api/health

# Test CORS
curl -H "Origin: https://bisman-erp-building.vercel.app" \
     -X OPTIONS \
     https://bisman-erp-rr6f.onrender.com/api/me -v

# Test login (replace with real credentials)
curl -X POST https://bisman-erp-rr6f.onrender.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}' \
     -c cookies.txt -v

# Test /api/me with cookies
curl https://bisman-erp-rr6f.onrender.com/api/me \
     -b cookies.txt
```

---

## 📝 Summary of Changes

### Files Modified:

1. **`my-backend/app.js`**
   - Added main Vercel domain to CORS allowlist
   - Added `/api/refresh` alias route
   - Enhanced authentication logging

2. **`my-backend/.env.example`**
   - Added JWT secrets configuration
   - Added example FRONTEND_URLS

3. **`my-backend/.env.production`**
   - Updated with production Vercel domains
   - Added JWT secrets placeholders

4. **`my-frontend/src/config/api.ts`**
   - Changed backend URL from `xr6f` to `rr6f`
   - Updated warning messages

5. **`my-frontend/.env.local.example`**
   - Changed backend URL reference

### New Files:
- **`AUTH_FIX_DEPLOYMENT_GUIDE.md`** (this file)

---

## ✨ Success Criteria

After following this guide, you should:
- ✅ No more 401 errors on `/api/me`
- ✅ No more "Load failed" errors
- ✅ Cookies are set and sent properly
- ✅ Login works and persists after page refresh
- ✅ React #419 error is gone
- ✅ All API calls return proper responses

---

**Last Updated**: 2025-10-17  
**Status**: Ready for deployment 🚀
