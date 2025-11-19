# Cross-Origin Cookie Issue - Root Cause Found

## Problem Diagnosis (Via Playwright)

### Test Results Summary:
✅ **Login succeeds**: HTTP 200, returns `{"ok":true,"email":"staff@business.com","role":"STAFF"}`
✅ **Cookies ARE set**: 2 cookies created (access_token, refresh_token) for `localhost` domain
✅ **Redirect works**: Successfully navigates to `/hub-incharge`  
❌ **Auth check fails**: `/api/me` returns 401 "missing or malformed token"
❌ **Final result**: Redirects back to `/auth/login`

### Key Findings:
```
6. Cookies after login: 2
   Cookie details:
   - access_token: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik... (domain: localhost, path: /)
   - refresh_token: c24eed62-1867-41cd-b99a-e58d33... (domain: localhost, path: /)

8. Current URL: http://localhost:3000/hub-incharge
✅ SUCCESS: Navigated to hub-incharge dashboard

→ REQUEST: GET http://localhost:3001/api/me
← RESPONSE: 401 http://localhost:3001/api/me
   Body: {"error":"missing or malformed token"}
```

## Root Cause

### The Issue: Cross-Origin Cookies Not Sent

1. **Backend (`:3001`) sets cookies** with domain=`localhost`, path=`/`
2. **Frontend (`:3000`) navigates** to `/hub-incharge`
3. **Frontend makes request** to `http://localhost:3001/api/me` with `credentials: 'include'`
4. **BUT cookies are NOT sent** because:
   - Cookies were set by `:3001` for domain `localhost`
   - Browser considers `:3000` and `:3001` as different origins
   - Cookies don't automatically cross port boundaries

### Why This Happens in Development:

**Problem:** Backend sets cookies like this:
```javascript
res.cookie('access_token', accessToken, { 
  httpOnly: true, 
  secure: false,  // localhost
  sameSite: 'lax',
  path: '/',
  // NO domain specified - defaults to current host:port
})
```

When no `domain` is specified, the cookie is set for the **exact hostname:port** (`localhost:3001`), NOT for all `localhost` ports.

**Solution:** Explicitly set domain to `localhost` (without port) so cookies work across ports in development:
```javascript
res.cookie('access_token', accessToken, { 
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/',
  domain: 'localhost'  // ← This makes it work across :3000 and :3001
})
```

## The Fix

### Backend Cookie Settings (`my-backend/app.js`)

**Current (Lines ~236-239):**
```javascript
const accessCookie = { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 1000 }
const refreshCookie = { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }
if (!isProduction && isLocalHost) { delete accessCookie.domain; delete refreshCookie.domain }
```

**Problem:** Line 238 **DELETES** the domain for localhost! This breaks cross-port cookies.

**Fix:** Set domain to `'localhost'` explicitly for development:
```javascript
const accessCookie = { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 1000 }
const refreshCookie = { httpOnly: true, secure: cookieSecure, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }

// For localhost, explicitly set domain to allow cross-port cookies
if (!isProduction && isLocalHost) {
  accessCookie.domain = 'localhost';
  refreshCookie.domain = 'localhost';
}
```

## Video Evidence

Playwright recorded the entire flow. Video saved at:
```
test-results/debug-hub-login-Hub-Inchar-5b1df-e-to-hub-incharge-dashboard-chromium/video.webm
```

Screenshots showing the issue:
- `01-login-page.png` - Login form
- `02-credentials-filled.png` - Credentials entered (staff@business.com / staff123)
- `03-after-login-click.png` - Success message
- `04-current-page.png` - Navigated to /hub-incharge  ✅
- `05-hub-dashboard.png` - Hub dashboard attempting to load
- `06-after-manual-nav.png` - Redirected back to login ❌

## Correct Hub Incharge Credentials

**Found in backend:** `my-backend/app.js` line 162:
```javascript
{ id: 3, email: 'staff@business.com', password: 'staff123', role: 'STAFF' }
```

**NOT:**
- ❌ `super@bisman.local` (this is SUPER_ADMIN)
- ❌ `staff@bisman.local` (doesn't exist)

**USE:**
- ✅ `staff@business.com` / `staff123`

## Implementation Plan

### Step 1: Fix Backend Cookie Domain
Edit `/my-backend/app.js` around line 236-239 to set explicit domain for localhost.

### Step 2: Restart Backend
```bash
cd my-backend
pkill -f "node.*index.js"
PORT=3001 node index.js
```

### Step 3: Clear Browser Cookies
Before testing, clear all cookies for `localhost` to start fresh.

### Step 4: Test Login Flow
1. Go to `http://localhost:3000/auth/login`
2. Enter: `staff@business.com` / `staff123`
3. Should navigate to `/hub-incharge` and STAY there ✅

## Related Issues

### Why 300ms Delay Didn't Help
The delay we added earlier doesn't solve this because the cookies ARE being set immediately. The problem is they're not being SENT with subsequent requests due to domain mismatch.

### Why window.location.replace() Didn't Help
The redirect method doesn't matter if cookies aren't accessible to the frontend origin.

## Status
🔍 **ROOT CAUSE IDENTIFIED** via Playwright video + console logs
⏳ **FIX READY** - Need to update backend cookie domain setting
📹 **VIDEO RECORDED** - Full login flow captured for review

---
**Debug Session:** October 8, 2025  
**Method:** Playwright automated testing with video recording  
**Key Tool:** Console logging + Network interception + Screenshots
