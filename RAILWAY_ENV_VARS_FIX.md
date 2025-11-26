# Railway Environment Variables Setup

## 🚨 CRITICAL FIX: Backend Startup Failure

**Problem:** Backend server exits during environment validation, causing healthcheck failures.

**Root Cause:** `envValidator.js` was calling `process.exit(1)` when required environment variables were missing, preventing the server from starting at all.

**Solution Applied:** Modified `envValidator.js` to:
- Only exit for critical variables (DATABASE_URL, JWT_SECRET)
- Warn about non-critical missing variables
- Allow server to start with degraded functionality
- Enable Railway healthcheck to succeed

---

## Required Environment Variables for Railway

### 🔴 **CRITICAL** (Server won't start without these)

1. **DATABASE_URL**
   ```
   postgresql://postgres:password@host:port/database?sslmode=require
   ```
   - Get from Railway PostgreSQL service
   - Should be auto-injected by Railway
   - Format: `postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require`

2. **JWT_SECRET**
   ```
   At least 32 characters long
   ```
   - Generate with: `openssl rand -base64 32`
   - Example: `your-very-secure-random-32-character-secret-key-here-123`

### 🟡 **IMPORTANT** (Degraded functionality without these)

3. **Database Connection Variables**
   ```
   DB_USER=postgres
   DB_PASSWORD=your-password
   DB_HOST=railway-host.railway.app
   DB_PORT=5432
   DB_NAME=railway
   ```
   - Usually extracted from DATABASE_URL
   - Railway auto-provides these

4. **Frontend Configuration**
   ```
   FRONTEND_URL=https://your-app.railway.app
   NODE_ENV=production
   PORT=3000
   ```

5. **Security Tokens**
   ```
   ACCESS_TOKEN_SECRET=your-access-token-secret
   REFRESH_TOKEN_SECRET=your-refresh-token-secret
   OTP_HASH_SECRET=your-otp-hash-secret
   ```

### 🟢 **OPTIONAL** (Recommended for production)

6. **Redis** (for rate limiting)
   ```
   REDIS_URL=redis://default:password@host:port
   ```

7. **Rate Limiting**
   ```
   DISABLE_RATE_LIMIT=false
   ```

8. **OCR/File Upload**
   ```
   UPLOAD_DIR=/app/uploads
   MAX_FILE_SIZE=10485760
   ```

---

## Quick Setup for Railway

### Step 1: Add to Railway Dashboard

Go to your service → Variables → Add these:

```bash
# Critical
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generate-with-openssl-rand-base64-32>

# Important
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://${{RAILWAY_STATIC_URL}}

# Security
ACCESS_TOKEN_SECRET=<generate-random-string>
REFRESH_TOKEN_SECRET=<generate-random-string>
OTP_HASH_SECRET=<generate-random-string>

# Optional but recommended
REDIS_URL=${{Redis.REDIS_URL}}
DISABLE_RATE_LIMIT=false
```

### Step 2: Verify Variables

Run this command in Railway CLI:
```bash
railway variables
```

Or check in Railway dashboard:
```
Service → Variables tab
```

### Step 3: Generate Secrets

Use these commands to generate secure secrets:
```bash
# JWT Secret (32 chars minimum)
openssl rand -base64 32

# Access Token Secret
openssl rand -base64 48

# Refresh Token Secret
openssl rand -base64 48

# OTP Hash Secret
openssl rand -base64 24
```

---

## Debugging Deployment Failures

### Check Logs
```bash
railway logs --service=backend
```

Look for:
- `❌ Environment validation failed`
- `Missing required environment variable`
- `Cannot start server`

### Common Issues

**Issue 1: DATABASE_URL not set**
```
Solution: Link PostgreSQL service to backend in Railway dashboard
```

**Issue 2: JWT_SECRET too short**
```
Solution: Generate with `openssl rand -base64 32`
```

**Issue 3: Healthcheck timeout**
```
Solution: 
1. Check if server is actually starting (railway logs)
2. Verify DATABASE_URL is correct
3. Ensure Prisma client is generated (should happen in Dockerfile)
```

---

## Testing Locally

Create `.env` file in `my-backend/`:

```bash
# Copy from .env.example
cp .env.example .env

# Edit with your values
nano .env
```

Test environment validation:
```bash
cd my-backend
node -e "require('./utils/envValidator')"
```

Should output:
```
✅ Environment validation passed
```

Or warnings about missing optional variables.

---

## Healthcheck Configuration

Railway healthcheck expects:
- **Path:** `/api/health`
- **Response:** `200 OK` with `{"status":"ok"}`
- **Timeout:** 5 minutes
- **Interval:** 10 seconds

The health endpoint does NOT require authentication and returns immediately.

If healthcheck fails:
1. Server never started (check env vars)
2. Port not bound correctly (check PORT env var)
3. Database connection blocking startup (check DATABASE_URL)

---

## Rollback Plan

If deployment continues to fail:

1. **Temporarily disable strict validation:**
   ```javascript
   // In envValidator.js, comment out process.exit(1)
   ```

2. **Deploy with minimal variables:**
   ```
   DATABASE_URL
   JWT_SECRET
   NODE_ENV=production
   ```

3. **Add variables incrementally** and redeploy

---

## Success Checklist

- [ ] `DATABASE_URL` set and accessible
- [ ] `JWT_SECRET` generated (32+ chars)
- [ ] Frontend/backend environment variables match
- [ ] Prisma migrations completed successfully
- [ ] Server starts without errors
- [ ] `/api/health` returns 200 OK
- [ ] Healthcheck passes within 5 minutes

---

## Next Steps After Fixing

1. **Set MM_ADMIN_TOKEN** (for Mattermost chat)
2. **Set MM_BASE_URL** (for chat integration)
3. **Configure Redis** (for production rate limiting)
4. **Set up monitoring** (error tracking)

---

## Support

If healthcheck still fails after setting variables:
1. Check Railway logs: `railway logs --service=backend --tail=100`
2. Verify database connection: Test DATABASE_URL with psql
3. Check Prisma client: Ensure it's generated in Docker build
4. Review startup script: `/app/start-railway.sh` logs

**Modified Files:**
- `my-backend/utils/envValidator.js` - Relaxed validation to prevent premature exit
