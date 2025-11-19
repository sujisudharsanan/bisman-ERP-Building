# 🚀 BISMAN ERP - CORS Quick Reference Card

## ⚡ Quick Status Check

```bash
# Check if servers are running
curl http://localhost:3001/api/health
curl http://localhost:3000

# Test CORS from terminal
curl -H "Origin: http://localhost:3000" http://localhost:3001/api/health

# Restart backend
cd my-backend && npm run dev

# Restart frontend
cd my-frontend && npm run dev
```

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `my-backend/.env` | Environment variables (PORT, URLs, secrets) |
| `my-backend/server.js` | Server entry point with health check |
| `my-backend/app.js` | Express app with CORS middleware (lines 110-175) |

---

## 🌐 CORS Configuration Summary

### Allowed Origins (Development)
- ✅ `http://localhost:3000` (Next.js frontend)
- ✅ `http://localhost:3001` (Backend itself)
- ✅ `http://localhost:*` (Any localhost port in dev mode)

### Allowed Origins (Production)
- ✅ `https://bisman.erp` (Production frontend)
- ✅ Vercel deployments
- ✅ Railway deployments

### Allowed Methods
`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`

### Credentials
✅ **ENABLED** - Supports cookies and JWT authentication

---

## 🧪 Testing Checklist

### ✅ Backend Tests
```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test with CORS headers
curl -H "Origin: http://localhost:3000" http://localhost:3001/api/health

# Test preflight
curl -X OPTIONS -H "Origin: http://localhost:3000" http://localhost:3001/api/health

# Enable debug mode (add to .env)
DEBUG_CORS=1
```

### ✅ Frontend Tests
```javascript
// Test in browser console (http://localhost:3000)
fetch('http://localhost:3001/api/health', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
  .then(res => res.json())
  .then(data => console.log('✅ Backend healthy:', data))
  .catch(err => console.error('❌ CORS Error:', err));
```

---

## 🐛 Troubleshooting

### Issue: "Origin not allowed"
**Quick Fix:**
1. Check `.env` has `FRONTEND_URL=http://localhost:3000`
2. Restart backend: `npm run dev`
3. Clear browser cache
4. Check Network tab for actual origin

### Issue: Credentials not working
**Quick Fix:**
1. Frontend must use `credentials: 'include'`
2. Backend has `credentials: true` ✅ (already configured)
3. Check cookies in DevTools Application tab

### Issue: Preflight (OPTIONS) failing
**Quick Fix:**
1. OPTIONS handler already configured ✅
2. Check allowed methods and headers
3. Test with curl: `curl -X OPTIONS -v http://localhost:3001/api/health`

### Issue: Port already in use
**Quick Fix:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process (replace PID)
kill -9 <PID>

# Or use killall
killall node
```

---

## 📊 Expected Response

### Health Check
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T06:46:58.833Z",
  "environment": "development",
  "version": "1.0.0"
}
```

### Response Headers
```http
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 🔐 Security Checklist

- [x] Whitelist-based origin validation
- [x] Credentials enabled (JWT/cookies)
- [x] Environment-aware (dev/prod)
- [x] Error handling
- [x] Logging enabled
- [x] HTTPS in production
- [x] Secrets in environment variables

---

## 📚 Documentation

| Document | Location |
|----------|----------|
| Complete CORS Guide | `/my-backend/CORS_CONFIGURATION_GUIDE.md` |
| Fix Summary | `/CORS_FIX_COMPLETE.md` |
| Example Server | `/my-backend/server-example-production-ready.js` |
| Quick Reference | `/CORS_QUICK_REFERENCE.md` (this file) |

---

## 🎯 One-Line Status

```bash
# Copy-paste this to check everything
echo "Backend: $(curl -s http://localhost:3001/api/health | jq -r .status 2>/dev/null || echo '❌ DOWN')" && echo "Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q 200 && echo '✅ UP' || echo '❌ DOWN')"
```

---

## 🚀 Start Everything

```bash
# Terminal 1: Start backend
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend
npm run dev

# Terminal 2: Start frontend
cd /Users/abhi/Desktop/BISMAN\ ERP/my-frontend
npm run dev

# Terminal 3: Monitor logs
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend
tail -f *.log
```

---

## 📞 Support

**Debug Mode:**
```bash
# Add to .env
DEBUG_CORS=1

# Restart backend to see detailed CORS logs
```

**Check Logs:**
```bash
# Backend logs
cd my-backend && npm run dev

# Look for these lines:
# [CORS] ✅ Allowing whitelisted origin: http://localhost:3000
# [CORS] ❌ BLOCKED origin: ...
```

**Browser DevTools:**
- Network tab → Check request headers (Origin)
- Console → Look for CORS errors
- Application → Check cookies

---

**Status**: ✅ **FULLY OPERATIONAL**  
**Last Updated**: October 27, 2025  
**Version**: 1.0.0
