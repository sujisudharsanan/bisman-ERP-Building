# 🔐 Authentication Flow - Visual Reference

## Complete Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                          │
│                    (Vercel Frontend → Render Backend)                │
└─────────────────────────────────────────────────────────────────────┘

1️⃣  USER VISITS APP (Not Logged In)
═══════════════════════════════════════════════════════════════════════

   Frontend (Vercel)                          Backend (Render)
   ┌──────────────┐                          ┌──────────────┐
   │              │                          │              │
   │ AuthContext  │  GET /api/me             │  app.js      │
   │  useEffect() │─────────────────────────>│  (line 256)  │
   │              │  credentials: include    │              │
   │              │                          │  Check token │
   │              │<─────────────────────────│  ❌ No token │
   │              │  401 Unauthorized        │              │
   │              │  {error: "Not auth"}     │              │
   │              │                          │              │
   │ setUser(null)│                          └──────────────┘
   │ loading=false│
   │              │
   │ → Shows      │
   │   Login Page │
   └──────────────┘


2️⃣  USER LOGS IN
═══════════════════════════════════════════════════════════════════════

   Frontend (Vercel)                          Backend (Render)
   ┌──────────────┐                          ┌──────────────┐
   │              │                          │              │
   │ Login Form   │  POST /api/login         │  app.js      │
   │              │─────────────────────────>│  (line 447)  │
   │              │  credentials: include    │              │
   │              │  {email, password}       │  1. Verify   │
   │              │                          │     password │
   │              │                          │  2. Generate │
   │              │                          │     tokens   │
   │              │                          │  3. Store in │
   │              │<─────────────────────────│     DB       │
   │              │  200 OK                  │              │
   │              │  Set-Cookie headers:     │              │
   │              │    access_token=...      │              │
   │              │    refresh_token=...     │              │
   │              │  {user: {...}}           │              │
   │              │                          └──────────────┘
   │ 🍪 Browser    │
   │ saves cookies │
   │              │
   │ setUser(data)│
   │ → Redirect   │
   │   Dashboard  │
   └──────────────┘


3️⃣  AUTHENTICATED REQUEST
═══════════════════════════════════════════════════════════════════════

   Frontend (Vercel)                          Backend (Render)
   ┌──────────────┐                          ┌──────────────┐
   │              │                          │              │
   │ Dashboard    │  GET /api/me             │  app.js      │
   │ (loads)      │─────────────────────────>│  (line 256)  │
   │              │  credentials: include    │              │
   │              │  Cookie: access_token=..│  1. Extract  │
   │              │                          │     token    │
   │              │                          │  2. Verify   │
   │              │                          │     JWT      │
   │              │<─────────────────────────│  3. Query DB │
   │              │  200 OK                  │  ✅ Valid    │
   │              │  {ok: true, user: {...}} │              │
   │              │                          └──────────────┘
   │ setUser(data)│
   │              │
   │ Shows user   │
   │ dashboard    │
   └──────────────┘


4️⃣  PAGE REFRESH (Token Still Valid)
═══════════════════════════════════════════════════════════════════════

   Frontend (Vercel)                          Backend (Render)
   ┌──────────────┐                          ┌──────────────┐
   │              │                          │              │
   │ AuthContext  │  GET /api/me             │  app.js      │
   │  useEffect() │─────────────────────────>│  (line 256)  │
   │ (on mount)   │  credentials: include    │              │
   │              │  Cookie: access_token=..│  Verify token│
   │              │                          │  ✅ Valid    │
   │              │<─────────────────────────│              │
   │              │  200 OK                  │              │
   │              │  {ok: true, user: {...}} │              │
   │              │                          └──────────────┘
   │ setUser(data)│
   │              │
   │ User stays   │
   │ logged in    │
   └──────────────┘


5️⃣  ACCESS TOKEN EXPIRES
═══════════════════════════════════════════════════════════════════════

   Frontend (Vercel)                          Backend (Render)
   ┌──────────────┐                          ┌──────────────┐
   │              │                          │              │
   │ Any API call │  GET /api/data           │              │
   │              │─────────────────────────>│              │
   │              │  credentials: include    │  Verify token│
   │              │  Cookie: access_token=..│  ❌ Expired  │
   │              │<─────────────────────────│              │
   │              │  401 Unauthorized        │              │
   │              │                          └──────────────┘
   │              │
   │ Intercept    │  POST /api/refresh       ┌──────────────┐
   │ 401 →        │─────────────────────────>│  app.js      │
   │ Try refresh  │  credentials: include    │  (line 587)  │
   │              │  Cookie: refresh_token=..│              │
   │              │                          │  1. Verify   │
   │              │                          │     refresh  │
   │              │                          │  2. Check DB │
   │              │<─────────────────────────│  3. Issue new│
   │              │  200 OK                  │     access   │
   │              │  Set-Cookie:             │  ✅ Valid    │
   │              │    access_token=new...   │              │
   │              │                          └──────────────┘
   │ Retry        │  GET /api/data
   │ original     │─────────────────────────>
   │ request      │  With new token
   │              │<─────────────────────────
   │              │  200 OK + data
   └──────────────┘


6️⃣  USER LOGS OUT
═══════════════════════════════════════════════════════════════════════

   Frontend (Vercel)                          Backend (Render)
   ┌──────────────┐                          ┌──────────────┐
   │              │                          │              │
   │ Logout Btn   │  POST /api/logout        │  app.js      │
   │              │─────────────────────────>│  (line 656)  │
   │              │  credentials: include    │              │
   │              │  Cookie: refresh_token=..│  1. Delete   │
   │              │                          │     session  │
   │              │                          │     from DB  │
   │              │<─────────────────────────│  2. Clear    │
   │              │  200 OK                  │     cookies  │
   │              │  Set-Cookie:             │              │
   │              │    (empty cookies)       │              │
   │              │                          └──────────────┘
   │ setUser(null)│
   │              │
   │ → Redirect   │
   │   Login Page │
   └──────────────┘
```

---

## Cookie Configuration Details

### Development (localhost)
```javascript
res.cookie('access_token', token, {
  httpOnly: true,
  secure: false,      // HTTP allowed
  sameSite: 'lax',    // Same-site OK
  path: '/',
  maxAge: 3600000     // 1 hour
});
```

### Production (Vercel + Render)
```javascript
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,       // HTTPS required ⚠️
  sameSite: 'none',   // Cross-site allowed ⚠️
  path: '/',
  maxAge: 3600000     // 1 hour
});
```

**Why `sameSite: 'none'` and `secure: true`?**
- Frontend: `bisman-erp-building.vercel.app` (different domain)
- Backend: `bisman-erp-rr6f.onrender.com` (different domain)
- Browsers require these settings for cross-origin cookies

---

## CORS Configuration

### Backend (app.js)
```javascript
app.use(cors({
  origin: [
    'https://bisman-erp-building.vercel.app',
    // ... other domains
  ],
  credentials: true,  // ⚠️ Required for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Accept', 'Origin', 'Content-Type', 'Authorization', 'Cookie']
}));
```

### Frontend (all fetch calls)
```javascript
fetch('https://bisman-erp-rr6f.onrender.com/api/me', {
  credentials: 'include',  // ⚠️ Required to send cookies
  // ...
});
```

---

## HTTP Request Headers (Production)

### Request from Frontend to Backend
```http
GET /api/me HTTP/1.1
Host: bisman-erp-rr6f.onrender.com
Origin: https://bisman-erp-building.vercel.app
Cookie: access_token=eyJhbG...; refresh_token=eyJhbG...
Content-Type: application/json
```

### Response from Backend to Frontend
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://bisman-erp-building.vercel.app
Access-Control-Allow-Credentials: true
Set-Cookie: access_token=eyJhbG...; Secure; HttpOnly; SameSite=None; Path=/
Content-Type: application/json

{"ok":true,"user":{"id":1,"email":"user@example.com","role":"ADMIN"}}
```

---

## JWT Token Structure

### Access Token (Short-lived, 1 hour)
```javascript
{
  id: 123,
  email: "user@example.com",
  role: "ADMIN",
  iat: 1697539200,  // Issued at
  exp: 1697542800   // Expires (1 hour later)
}
```

### Refresh Token (Long-lived, 7 days)
```javascript
{
  id: 123,
  email: "user@example.com",
  role: "ADMIN",
  iat: 1697539200,
  exp: 1698144000   // Expires (7 days later)
}
```

**Storage:**
- Access token: Cookie + Database (hashed)
- Refresh token: Cookie + Database (hashed)

---

## Common Error Scenarios

### ❌ CORS Error
```
Access to fetch at 'https://bisman-erp-rr6f.onrender.com/api/me'
from origin 'https://bisman-erp-building.vercel.app'
has been blocked by CORS policy
```

**Cause:** Backend CORS config missing frontend origin  
**Fix:** Add frontend URL to `FRONTEND_URL` in Render

---

### ❌ 401 Unauthorized (No Token)
```json
{"error":"Not authenticated"}
```

**Cause:** Cookie not sent or expired  
**Fix:** Check `credentials: 'include'` in fetch

---

### ❌ 401 Unauthorized (Invalid Token)
```json
{"error":"Invalid or expired token"}
```

**Cause:** JWT verification failed  
**Fix:** Check `ACCESS_TOKEN_SECRET` matches on backend

---

### ❌ Cookies Not Saved
```
Set-Cookie sent, but browser doesn't save it
```

**Cause:** Missing `Secure` or `SameSite=None` in production  
**Fix:** Ensure `NODE_ENV=production` in Render

---

## Testing Checklist

```
✅ Health check works:
   curl https://bisman-erp-rr6f.onrender.com/api/health

✅ CORS preflight succeeds:
   curl -X OPTIONS -H "Origin: https://bisman-erp-building.vercel.app" \
        https://bisman-erp-rr6f.onrender.com/api/me -v

✅ Login returns cookies:
   Check DevTools → Network → /api/login → Response Headers → Set-Cookie

✅ Cookies are stored:
   Check DevTools → Application → Cookies → bisman-erp-rr6f.onrender.com

✅ /api/me returns user when authenticated:
   Should return 200 OK with user data

✅ Page refresh maintains authentication:
   Refresh page → User stays logged in

✅ Token refresh works:
   Wait 1 hour → API calls should auto-refresh token

✅ Logout clears cookies:
   Logout → Cookies should be removed
```

---

## Environment Variables Summary

### Render (Backend)
```bash
NODE_ENV=production
FRONTEND_URL=https://bisman-erp-building.vercel.app
ACCESS_TOKEN_SECRET=<generated-secret>
REFRESH_TOKEN_SECRET=<generated-secret>
DATABASE_URL=<postgres-connection-string>
```

### Vercel (Frontend)
```bash
NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com
```

---

**Reference**: See `AUTH_FIX_DEPLOYMENT_GUIDE.md` for deployment steps
