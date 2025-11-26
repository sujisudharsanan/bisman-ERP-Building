# ✅ Railway-Only Configuration

## Cleanup Complete

All non-Railway deployment configurations have been removed from the codebase.

---

## What Was Removed

### ❌ Removed URLs:
- ~~`http://localhost:3001`~~ (Backend self-testing port)
- ~~`https://bisman.erp`~~ (Custom domain)
- ~~`https://bisman-erp-frontend.vercel.app`~~ (Vercel deployment)
- ~~`https://bisman-erp-frontend-production.up.railway.app`~~ (Old Railway frontend)

### ❌ Removed Platform Checks:
- ~~`process.env.VERCEL`~~ detection in auth middleware
- ~~Vercel~~ references in platform detection

---

## Current Configuration

### ✅ Allowed Origins (CORS):
1. **Local Development:** `http://localhost:3000`
   - For frontend development on your machine
   
2. **Railway Production:** `https://bisman-erp-backend-production.up.railway.app`
   - Your live Railway deployment

### ✅ Files Updated:

#### 1. `my-backend/app.js`
```javascript
// Build allowed origins list - Railway only
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000', // Local dev
  'https://bisman-erp-backend-production.up.railway.app', // Railway backend
].filter(Boolean);
```

#### 2. `my-backend/server.js` (4 locations)
- Socket.IO CORS configuration
- Health check endpoint CORS (3 instances)

```javascript
// Socket.IO CORS - Railway only
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://bisman-erp-backend-production.up.railway.app'
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST']
  }
});
```

#### 3. `my-backend/middleware/auth.secure.js`
```javascript
// Production detection - Railway only
const isProduction = 
  process.env.RAILWAY === '1' ||
  process.env.NODE_ENV === 'production'

// Platform detection
platform: process.env.RAILWAY ? 'Railway' : 'local'
```

#### 4. `my-frontend/.env.local`
```env
# Backend URL - Railway production (default)
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# For local development, uncomment this line:
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Environment Variables

### Required in Railway:
```bash
# Database (auto-provided by Railway Postgres)
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=your-jwt-secret-key
NODE_ENV=production

# Railway auto-sets these:
RAILWAY=1
PORT=8080

# Optional (for frontend URL override)
FRONTEND_URL=http://localhost:3000  # or your custom domain
```

### Not Needed:
- ~~`PRODUCTION_URL`~~ (removed)
- ~~`VERCEL`~~ (removed)
- ~~`NEXT_PUBLIC_FRONTEND_URL`~~ (using Railway backend only)

---

## Testing Configuration

### 1. Test Local Development
```bash
# Start backend
cd my-backend
npm run dev  # Should run on http://localhost:5000

# Start frontend (in another terminal)
cd my-frontend
npm run dev  # Should run on http://localhost:3000
```

**Expected:** Frontend at `localhost:3000` can call backend at `localhost:5000`

### 2. Test Railway Production
```bash
# Health check
curl https://bisman-erp-backend-production.up.railway.app/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-26T...",
  "environment": "production",
  "version": "1.0.0"
}
```

### 3. Test CORS
```bash
# Should be allowed (Railway backend)
curl -H "Origin: https://bisman-erp-backend-production.up.railway.app" \
     https://bisman-erp-backend-production.up.railway.app/api/health

# Should be allowed (localhost dev)
curl -H "Origin: http://localhost:3000" \
     http://localhost:5000/api/health

# Should be rejected (random origin)
curl -H "Origin: https://random-site.com" \
     https://bisman-erp-backend-production.up.railway.app/api/health
```

---

## Benefits of Railway-Only Setup

### ✅ Simplified Configuration
- Only 2 allowed origins (local + Railway)
- No confusion about which URL to use
- Easier to debug CORS issues

### ✅ Better Security
- Reduced attack surface (fewer allowed origins)
- No unnecessary platform checks
- Clear production/development separation

### ✅ Easier Maintenance
- Single deployment platform
- No split configuration between services
- Consistent environment variables

### ✅ Cost Effective
- One platform = one bill
- No cross-platform data transfer fees
- Simpler scaling strategy

---

## Migration Guide (If You Had Vercel Before)

### Step 1: Remove Vercel Project
```bash
# In Vercel dashboard:
1. Go to your project
2. Settings → General
3. Click "Delete Project"
```

### Step 2: Update Local .env Files
```bash
# my-frontend/.env.local
NEXT_PUBLIC_API_URL=https://bisman-erp-backend-production.up.railway.app

# my-backend/.env (if any)
# Remove any VERCEL-related variables
```

### Step 3: Update Railway Environment Variables
```bash
# In Railway dashboard:
1. Remove: PRODUCTION_URL
2. Remove: NEXT_PUBLIC_FRONTEND_URL
3. Keep: DATABASE_URL, JWT_SECRET, NODE_ENV
```

### Step 4: Redeploy
```bash
git add .
git commit -m "chore: Remove Vercel config, Railway-only deployment"
git push origin deployment
```

Railway will auto-deploy with the new configuration.

---

## Troubleshooting

### Issue: CORS errors in production
**Solution:** Make sure your frontend is making requests to:
```
https://bisman-erp-backend-production.up.railway.app
```

### Issue: CORS errors in local development
**Solution:** Update `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Issue: "Origin not allowed" error
**Solution:** Check Railway logs for the origin being rejected:
```bash
[CORS] ❌ Rejecting origin: https://...
```

Add it to `allowedOrigins` array in `app.js` if needed.

### Issue: Can't connect to backend
**Solution:** Verify backend is running:
```bash
# Check Railway deployment status
curl https://bisman-erp-backend-production.up.railway.app/api/health

# Check local backend
curl http://localhost:5000/api/health
```

---

## Next Steps

1. ✅ **Commit changes** (current task)
2. ✅ **Push to Railway** - Auto-deploys
3. 🧪 **Test CORS** - Verify frontend can call backend
4. 📊 **Monitor logs** - Watch for CORS rejections
5. 🚀 **Use OCR feature** - Test with real invoices

---

## Production Checklist

- [x] Remove Vercel URLs from CORS
- [x] Remove localhost:3001 from CORS
- [x] Remove custom domain references
- [x] Update auth.secure.js platform detection
- [x] Update .env.local to use Railway
- [x] Test health check endpoint
- [ ] Test CORS with real requests
- [ ] Test OCR file upload from frontend
- [ ] Monitor logs for CORS rejections
- [ ] Update any documentation with new URLs

---

## Support & References

**Railway Dashboard:** https://railway.app/dashboard  
**Backend URL:** https://bisman-erp-backend-production.up.railway.app  
**Health Check:** https://bisman-erp-backend-production.up.railway.app/api/health  

**Documentation:**
- [DEPLOYMENT_SUCCESS_GUIDE.md](./DEPLOYMENT_SUCCESS_GUIDE.md)
- [RAILWAY_QUICK_FIX.md](./RAILWAY_QUICK_FIX.md)
- [RAILWAY_ENV_VARS_FIX.md](./RAILWAY_ENV_VARS_FIX.md)

---

🎉 **Configuration Cleanup Complete!** Your app is now Railway-exclusive.
