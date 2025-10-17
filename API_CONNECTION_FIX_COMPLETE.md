# API Connection Fix - Complete ✅

## Problem Summary
The Next.js frontend was unable to connect to the Express backend API, showing:
- "Could not connect to the server"
- CORS errors on `/api/me` and `/login` endpoints
- 404 errors on API routes

## Solution Implemented

### 1. Backend Fixes (Express - `my-backend/app.js`)

#### ✅ CORS Configuration
- **Added explicit localhost origins** (with and without ports):
  ```javascript
  const localDefaults = [
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:3000',  // Frontend
    'http://127.0.0.1:3000',
    'http://localhost:3001',  // Backend
    'http://127.0.0.1:3001',
  ]
  ```

#### ✅ Environment-Aware Cookie Settings
- Development: `secure: false`, `sameSite: 'lax'` (works with http://)
- Production: `secure: true`, `sameSite: 'none'` (works with https://)

#### ✅ Route Aliases for Compatibility
- Added `/login` → `/api/login` alias
- Added `/me` → `/api/me` alias
- Ensures frontend health checks work regardless of path format

#### ✅ Dev User Authentication
- Defined `devUserSessions` in-memory store
- Marked all dev users with `isDev: true` flag
- Skips database persistence for dev users (prevents foreign key errors)
- Supports testing without database setup

### 2. Frontend Fixes (Next.js - `my-frontend/`)

#### ✅ Smart API URL Detection (`src/config/api.ts`)
```typescript
function getApiBaseUrl(): string {
  // 1. Explicit env var (highest priority)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Auto-detect based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Vercel production
    if (hostname.includes('vercel.app')) {
      return 'https://bisman-erp-xr6f.onrender.com';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }

  // 3. Default fallback
  return 'http://localhost:3001';
}
```

#### ✅ Enhanced Health Check (`src/utils/apiHealth.ts`)
- Tests `/api/health` endpoint first
- Shows clear console messages:
  - ✅ Backend reachable
  - ❌ Backend unreachable with troubleshooting steps
- Tests auth endpoints (`/api/me`, `/api/login`)
- Displays connection details (frontend hostname, API base URL)

#### ✅ Environment Configuration
Created `.env.local.example`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_HEALTH=1
```

Existing `.env.local` already configured:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Connection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT (localhost)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (localhost:3000)  ────────────►  Backend (:3001)     │
│  • Auto-detects localhost                  • CORS: allows      │
│  • Uses http://localhost:3001                localhost origins  │
│  • Credentials: include                    • secure: false     │
│  • Health check on startup                 • sameSite: lax     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   PRODUCTION (Vercel + Render)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (vercel.app)  ─────────────►  Backend (render.com)   │
│  • Auto-detects vercel.app              • CORS: allows         │
│  • Uses NEXT_PUBLIC_API_URL               vercel.app origins   │
│    or fallback Render URL               • secure: true         │
│  • Credentials: include                 • sameSite: none       │
│  • Health check on startup              • Rate limiting: 5/15m │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Testing Results ✅

### Backend Endpoints
```bash
✅ GET  /api/health       → 200 OK
✅ GET  /me               → 401 Unauthorized (expected without auth)
✅ POST /login            → 200 OK (with Set-Cookie)
✅ GET  /api/me           → 200 OK (with valid cookie)
✅ OPTIONS /login         → 200 OK (CORS preflight)
```

### CORS Headers
```http
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Headers: Accept,Origin,Content-Type,Authorization,Cookie
```

### Login Response
```json
{
  "message": "Login successful",
  "user": {
    "id": 0,
    "email": "super@bisman.local"
  }
}
```

Cookies set:
- `access_token` (1 hour, HttpOnly, SameSite=Lax)
- `refresh_token` (7 days, HttpOnly, SameSite=Lax)

## Demo Users Available

All these users work WITHOUT database setup:

| Email                    | Password  | Role                 |
|--------------------------|-----------|----------------------|
| super@bisman.local       | password  | SUPER_ADMIN          |
| super@bisman.local       | changeme  | SUPER_ADMIN          |
| admin@business.com       | admin123  | ADMIN                |
| admin@bisman.local       | changeme  | ADMIN                |
| manager@business.com     | password  | MANAGER              |
| manager@bisman.local     | changeme  | MANAGER              |
| staff@business.com       | staff123  | STAFF                |
| hub@bisman.local         | changeme  | STAFF                |
| it@bisman.local          | changeme  | IT_ADMIN             |
| cfo@bisman.local         | changeme  | CFO                  |

...and 12 more finance/operations roles

## How to Run

### 1. Start Backend
```bash
cd my-backend
npm install
NODE_ENV=development npm run dev
# or
NODE_ENV=development node index.js
```

Server starts on: http://0.0.0.0:3001

### 2. Start Frontend
```bash
cd my-frontend
npm install
npm run dev
```

Frontend starts on: http://localhost:3000

### 3. Test Login
1. Open http://localhost:3000/login
2. Use credentials: `super@bisman.local` / `password`
3. Check browser console for health check messages:
   ```
   🔍 API Health Check
   📍 Frontend running on: localhost
   🌐 API Base URL: http://localhost:3001
   ✅ Backend is reachable! Status: 200
   ```

## Production Deployment

### Vercel (Frontend)
Add environment variable:
```bash
NEXT_PUBLIC_API_URL=https://bisman-erp-xr6f.onrender.com
```

### Render (Backend)
Add environment variables:
```bash
NODE_ENV=production
FRONTEND_URL=https://bisman-erp-building-git-diployment-sujis-projects-dfb64252.vercel.app
```

## Troubleshooting

### "Could not connect to the server"
1. **Check backend is running:** `curl http://localhost:3001/api/health`
2. **Check port 3001 is free:** `lsof -i :3001`
3. **Check .env.local:** Verify `NEXT_PUBLIC_API_URL=http://localhost:3001`

### CORS Errors
1. **Check Origin header:** Must match CORS allowlist
2. **Check credentials:** Should be `include` in fetch/axios
3. **Check preflight:** Backend should respond to OPTIONS requests

### Cookies Not Set
1. **Check secure flag:** Must be `false` for http:// in dev
2. **Check SameSite:** Should be `lax` for localhost
3. **Check HttpOnly:** Cookies won't be visible in JS (by design)

### 404 on /api/login or /api/me
1. **Check backend logs:** `tail -f my-backend/server.log`
2. **Verify routes registered:** Should see "Server listening on http://0.0.0.0:3001"
3. **Test direct:** `curl -i http://localhost:3001/api/health`

## Files Modified

### Backend
- ✅ `my-backend/app.js` - CORS, cookies, aliases, dev users

### Frontend
- ✅ `my-frontend/src/config/api.ts` - Smart URL detection
- ✅ `my-frontend/src/utils/apiHealth.ts` - Enhanced health check
- ✅ `my-frontend/.env.local.example` - Environment template

## Next Steps

1. ✅ Backend running on port 3001
2. ✅ CORS properly configured
3. ✅ Dev user authentication working
4. ✅ Frontend API client configured
5. ✅ Health checks implemented

**Ready to test login!** 🚀

Open your browser and try logging in with:
- Email: `super@bisman.local`
- Password: `password`

Check the browser console for detailed connection diagnostics.
