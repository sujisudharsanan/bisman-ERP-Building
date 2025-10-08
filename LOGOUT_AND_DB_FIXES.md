# Logout and Database Connection Fixes

## Issues Identified

### 1. Logout Not Working (Users Can Login After Logout)
**Root Causes:**
- Cookie clearing may fail if cookie attributes don't match exactly between set and clear operations
- Redis not running → token revocation not persisting
- Potential race condition with client-side navigation

### 2. Database Connection Not Establishing
**Root Causes:**
- PostgreSQL server not running
- Database `BISMAN` may not exist
- Connection string in `.env` may be incorrect

## Fixes Applied

### Backend Logout Fix (`my-backend/app.js`)
✅ **Enhanced cookie clearing**:
- Now attempts multiple clearCookie calls with different option combinations
- Added explicit message in response for debugging
- Keeps token revocation logic (works with in-memory fallback if Redis down)

### Frontend Already Good (`my-frontend/src/contexts/AuthContext.tsx`)
✅ Client logout already:
- Calls backend `/api/logout`
- Clears all cookies client-side (multiple attempts with different paths)
- Clears localStorage and sessionStorage
- Resets Zustand store
- Forces full page reload to `/auth/portals`

## Steps to Verify and Fix

### Step 1: Start PostgreSQL Database

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# If not running, start it (macOS with Homebrew):
brew services start postgresql@14
# OR
brew services start postgresql

# Check if database exists
psql -U postgres -l | grep BISMAN

# If database doesn't exist, create it:
psql -U postgres -c "CREATE DATABASE \"BISMAN\";"

# Test connection:
psql "postgresql://postgres@localhost:5432/BISMAN" -c "SELECT version();"
```

### Step 2: Start Redis (Required for Token Revocation)

```bash
# Option A: Via Homebrew
brew services start redis

# Option B: Direct command
redis-server --daemonize yes

# Verify Redis is running:
redis-cli ping
# Should return: PONG
```

### Step 3: Restart Backend

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"

# Stop any existing backend
pkill -f "node .*index.js" || true

# Start backend (with logs)
PORT=3001 node index.js &> ../logs/backend-out.log &
echo $! > /tmp/bisman_backend.pid

# Check logs
tail -f ../logs/backend-out.log
# Should see: "Server listening on port 3001"
# Should NOT see: "Redis error ECONNREFUSED" if Redis is running
```

### Step 4: Start Frontend

```bash
cd "/Users/abhi/Desktop/BISMAN ERP/my-frontend"

# Start Next dev
npm run dev > ../logs/next-dev.log 2>&1 &
echo $! > /tmp/next_dev.pid

# Check it's running
curl -I http://localhost:3000
```

### Step 5: Test Logout End-to-End

```bash
# Create test directory
mkdir -p /tmp/bisman_test

# 1. Login (use correct dev password from my-backend/app.js devUsers array)
curl -i -X POST 'http://localhost:3001/api/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@business.com","password":"password"}' \
  -c /tmp/bisman_test/cookies.txt

# 2. Verify cookies were set
cat /tmp/bisman_test/cookies.txt
# Should show access_token and refresh_token

# 3. Access protected page (should work)
curl -i 'http://localhost:3000/super-admin' \
  -b /tmp/bisman_test/cookies.txt | head -n 20
# Should return 200 or redirect to actual page

# 4. Logout
curl -i -X POST 'http://localhost:3001/api/logout' \
  -b /tmp/bisman_test/cookies.txt \
  -c /tmp/bisman_test/cookies_after_logout.txt

# 5. Check response
# Should see: {"ok":true,"message":"Logged out successfully"}

# 6. Verify cookies cleared in response
cat /tmp/bisman_test/cookies_after_logout.txt
# Should show expires in past or empty

# 7. Try accessing protected page again (should fail/redirect)
curl -i 'http://localhost:3000/super-admin' \
  -b /tmp/bisman_test/cookies_after_logout.txt | head -n 20
# Should redirect to /auth/login (307 or 302)
```

## Browser Test

1. Open browser: `http://localhost:3000`
2. Login with credentials from `my-backend/app.js` devUsers:
   - Email: `manager@business.com`
   - Password: `password`
3. Verify you can access `/super-admin`
4. Click Logout button
5. Try to manually navigate to `/super-admin`
6. Should be redirected to `/auth/login`
7. Open DevTools → Application → Cookies
8. Verify `access_token` and `refresh_token` are gone

## Common Issues and Solutions

### Issue: "Redis error ECONNREFUSED"
**Solution:** Start Redis (see Step 2 above)

### Issue: Database connection error
**Solution:** 
```bash
# Start PostgreSQL
brew services start postgresql

# Create database if missing
psql -U postgres -c "CREATE DATABASE \"BISMAN\";"
```

### Issue: Still logged in after logout
**Check:**
1. Backend logs for logout request: `tail -f logs/backend-out.log`
2. Browser DevTools → Network tab → check `/api/logout` response
3. Browser DevTools → Application → Cookies → verify cookies cleared
4. If cookies persist, check if `domain` was set during login and add it to clearCookie call

### Issue: "Cannot connect to database"
**Check:**
```bash
# Verify DATABASE_URL in .env
cat my-backend/.env | grep DATABASE_URL

# Test connection manually
psql "postgresql://postgres@localhost:5432/BISMAN" -c "SELECT 1;"
```

## Files Modified

- ✅ `my-backend/app.js` - Enhanced logout cookie clearing
- ✅ `my-backend/lib/redisClient.js` - Added in-memory fallback (already done)
- ✅ `my-frontend/src/contexts/AuthContext.tsx` - Already has comprehensive logout

## Next Steps After Fixes

1. ✅ Start PostgreSQL and Redis
2. ✅ Restart backend and frontend
3. ✅ Test logout flow (manual browser test + curl test)
4. Run Playwright E2E tests:
   ```bash
   cd my-frontend
   npx playwright test tests/playwright/logout.spec.ts --headed
   ```

## Monitoring

Watch backend logs in real-time:
```bash
tail -f "/Users/abhi/Desktop/BISMAN ERP/logs/backend-out.log"
```

Watch for:
- ✅ "Server listening on port 3001"
- ✅ No Redis errors (if Redis running)
- ✅ POST /api/logout requests logging
- ❌ Any 404 or 500 errors

## Summary

**Logout Fix:** Backend now tries multiple cookie clearing strategies to ensure HttpOnly cookies are removed.

**DB Fix:** Need to start PostgreSQL service and ensure database exists.

Both services (PostgreSQL + Redis) must be running for full functionality.
