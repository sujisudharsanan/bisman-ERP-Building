# 🔧 Local Development Port Configuration - FIXED

## ❌ The Problem

Your frontend was trying to connect to `localhost:3001` but backend was running on `localhost:5000`.

**Error:**
```
🔐 [PROXY] Login proxy failed: TypeError: fetch failed
[cause]: [AggregateError: ] { code: 'ECONNREFUSED' }
```

---

## ✅ The Fix

### Backend Configuration
**File:** `my-backend/.env.local`

**Changed:**
```diff
- PORT=3001
+ PORT=5000
```

### Frontend Configuration
**File:** `my-frontend/.env.local`

**Changed:**
```diff
- NEXT_PUBLIC_API_URL=http://localhost:3001
+ NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 Correct Local Development Setup

### Ports:
- **Backend:** `http://localhost:5000`
- **Frontend:** `http://localhost:3000`
- **AI/Ollama:** `http://localhost:11434`

### Environment Variables:

#### Backend (`my-backend/.env.local`):
```bash
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://127.0.0.1:3000,http://localhost:3000
DATABASE_URL=postgres://user:password@localhost:5432/local_db_name
JWT_SECRET=dev-secret-change-in-production
DISABLE_RATE_LIMIT=true
ALLOW_DEV_USERS=true
```

#### Frontend (`my-frontend/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_DIRECT_BACKEND=false
DEBUG_AUTH=1
DATABASE_URL="postgresql://postgres@localhost:5432/BISMAN"
OLLAMA_HOST=http://localhost:11434
NEXT_PUBLIC_OLLAMA_MODEL=tinyllama:latest
OLLAMA_FORCE_PROXY=true
```

---

## 🔄 Next Steps

1. **Stop the current dev server** (Ctrl+C)
2. **Restart it:**
   ```bash
   npm run dev:both
   ```

3. **Wait for both to start:**
   ```
   Backend:  ✅ Server URL: http://0.0.0.0:5000
   Frontend: ✅ Local:       http://localhost:3000
   ```

4. **Test login:**
   - Open: http://localhost:3000/auth/login
   - Credentials:
     - Email: `demo_hub_incharge@bisman.demo`
     - Password: `Demo@123`

---

## ✅ Verification

After restarting, you should see:

### Backend Console:
```
🚀 BISMAN ERP Backend Server Started Successfully
📡 Server URL:        http://0.0.0.0:5000
🏥 Health Check:      http://0.0.0.0:5000/api/health
🌐 Allowed Origins:   http://localhost:3000, ...
```

### Frontend Console:
```
▲ Next.js 15.5.6
   - Local:        http://localhost:3000
   - Network:      http://192.168.1.8:3000
✓ Ready in 10.9s
```

### No More ECONNREFUSED Errors!

---

## 🧪 Quick Test Commands

```bash
# Test backend health
curl http://localhost:5000/api/health

# Expected: {"status":"ok",...}

# Test frontend
curl -I http://localhost:3000

# Expected: HTTP/1.1 200 OK

# Test login proxy
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}'
```

---

## 📝 Railway vs Local Ports

| Environment | Backend Port | Frontend Port |
|-------------|--------------|---------------|
| **Local Dev** | 5000 | 3000 |
| **Railway Production** | 8080 (internal) | 3000 (internal) |
| **Railway Public** | via Railway URL | via Railway URL |

---

## 🔍 Common Issues

### Issue 1: Still getting ECONNREFUSED

**Solution:** Restart dev servers after changing `.env.local`
```bash
# Stop with Ctrl+C
npm run dev:both
```

### Issue 2: Port already in use

**Solution:** Kill processes using those ports
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Then restart
npm run dev:both
```

### Issue 3: CORS errors

**Solution:** Check CORS origins in backend
```bash
# Should see in backend console:
🌐 Allowed Origins: http://localhost:3000, ...
```

---

## 📚 Related Files

- `my-backend/.env.local` - Backend configuration
- `my-frontend/.env.local` - Frontend configuration
- `my-backend/server.js` - Backend server initialization
- `my-frontend/src/app/api/auth/login/route.ts` - Login proxy
- `package.json` - Dev scripts

---

## ✅ Configuration Now Fixed!

Both ports are now correctly configured:
- ✅ Backend: `PORT=5000` in `.env.local`
- ✅ Frontend: `NEXT_PUBLIC_API_URL=http://localhost:5000`
- ✅ CORS: Backend allows `http://localhost:3000`

**Restart your dev server and it should work!** 🚀

---

**Fixed:** November 27, 2025
**Issue:** Port mismatch (3001 vs 5000)
**Status:** ✅ Resolved
