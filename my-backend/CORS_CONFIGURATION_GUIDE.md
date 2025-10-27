# 🔒 CORS Configuration Guide - BISMAN ERP Backend

## 📋 Overview

This document explains the complete CORS (Cross-Origin Resource Sharing) configuration for the BISMAN ERP backend server, ensuring secure and reliable communication between the Next.js frontend and Node.js/Express backend.

---

## 🎯 Current Setup

### Development Environment
- **Frontend URL**: `http://localhost:3000`
- **Backend URL**: `http://localhost:3001`
- **Environment**: `NODE_ENV=development`

### Production Environment
- **Frontend URL**: `https://bisman.erp` (configurable via `.env`)
- **Backend URL**: Production deployment URL
- **Environment**: `NODE_ENV=production`

---

## 🛠️ Configuration Files

### 1. Environment Variables (`.env`)

```bash
NODE_ENV=development
PORT=3001
JWT_SECRET=local_dev_jwt_secret
DATABASE_URL="postgresql://postgres@localhost:5432/BISMAN"

# Frontend URLs for CORS configuration
FRONTEND_URL=http://localhost:3000
PRODUCTION_URL=https://bisman.erp

# Optional: Enable detailed CORS debugging
# DEBUG_CORS=1
```

### 2. CORS Middleware (`app.js`)

**Location**: Lines 110-175 in `app.js`

**Features**:
- ✅ Environment-aware origin validation
- ✅ Dynamic localhost port support in development
- ✅ Credentials enabled for JWT/cookie authentication
- ✅ Comprehensive logging with debug mode
- ✅ Preflight request handling (OPTIONS)
- ✅ Whitelisted origins from environment variables

**Allowed Methods**: `GET, POST, PUT, DELETE, PATCH, OPTIONS`

**Allowed Headers**: `Content-Type, Authorization, X-Requested-With, Cookie`

**Exposed Headers**: `Set-Cookie`

### 3. Health Check Endpoint (`server.js`)

**Location**: Lines 35-95 in `server.js`

**Endpoint**: `/api/health`

**Features**:
- ✅ Early-mounted before app.js middleware (always available)
- ✅ Explicit CORS headers (bypasses app.js CORS)
- ✅ Handles both GET and OPTIONS (preflight)
- ✅ Returns environment and version information

**Response Format**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T00:00:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

---

## 🚀 Startup Logs

When the server starts successfully, you'll see:

```
======================================================================
🚀 BISMAN ERP Backend Server Started Successfully
======================================================================
📡 Server URL:        http://0.0.0.0:3001
🏥 Health Check:      http://0.0.0.0:3001/api/health
🌍 Environment:       DEVELOPMENT
🔒 CORS Enabled:      YES
🌐 Allowed Origins:   http://localhost:3000, https://bisman.erp
🍪 Credentials:       ENABLED (JWT/Cookies)
⚡ Next.js Frontend:  API-ONLY MODE
======================================================================

🔒 CORS Configuration:
   - Environment: DEVELOPMENT
   - Credentials Enabled: true
   - Allowed Origins: [
       'http://localhost:3000',
       'http://localhost:3001',
       'https://bisman.erp',
       'https://bisman-erp-frontend.vercel.app',
       'https://bisman-erp-frontend-production.up.railway.app',
       'https://bisman-erp-backend-production.up.railway.app'
     ]
   - Allowed Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
   - Debug Mode: OFF
```

---

## 🧪 Testing CORS

### Test 1: Health Check from Terminal

```bash
curl -v -H "Origin: http://localhost:3000" http://localhost:3001/api/health
```

**Expected Headers**:
```
< Access-Control-Allow-Origin: http://localhost:3000
< Access-Control-Allow-Credentials: true
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "environment": "development",
  "version": "1.0.0"
}
```

### Test 2: Preflight Request (OPTIONS)

```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v http://localhost:3001/api/health
```

**Expected**: `200 OK` with CORS headers

### Test 3: Frontend Fetch

```javascript
// In Next.js frontend
fetch('http://localhost:3001/api/health', {
  method: 'GET',
  credentials: 'include', // Important for cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log('Health check:', data))
  .catch(err => console.error('CORS Error:', err));
```

---

## 🐛 Debugging CORS Issues

### Enable Debug Mode

Set in `.env`:
```bash
DEBUG_CORS=1
```

This will log every CORS request with detailed information:
```
[CORS] 🔍 Request from origin: http://localhost:3000
[CORS] ✅ Allowing whitelisted origin: http://localhost:3000
```

### Common Issues & Solutions

#### Issue 1: "Origin not allowed by Access-Control-Allow-Origin"
**Cause**: Origin not in whitelist  
**Solution**: 
- Check if origin is in `FRONTEND_URL` or `allowedOrigins` array
- In development, ensure it starts with `http://localhost:`
- Check browser console for actual origin being sent

#### Issue 2: "Credentials flag is 'true', but the 'Access-Control-Allow-Credentials' header is ''"
**Cause**: CORS not allowing credentials  
**Solution**: 
- Verify `credentials: true` in `corsOptions`
- Ensure frontend uses `credentials: 'include'` in fetch

#### Issue 3: Health check returns 200 but no CORS headers
**Cause**: Request has no `Origin` header  
**Solution**: 
- Browser automatically includes origin for cross-origin requests
- If testing with curl, add `-H "Origin: http://localhost:3000"`

#### Issue 4: Preflight (OPTIONS) request failing
**Cause**: OPTIONS handler not configured  
**Solution**: 
- Verify `app.options('*', cors(corsOptions))` in app.js
- Check health check OPTIONS handler in server.js (lines 75-95)

---

## 📝 Error Handling

### 404 - Route Not Found
```json
{
  "success": false,
  "error": "Route not found",
  "path": "/api/nonexistent",
  "method": "GET"
}
```

### 403 - CORS Violation
```json
{
  "success": false,
  "error": "CORS policy violation",
  "message": "Origin not allowed",
  "origin": "http://malicious-site.com"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error"
}
```
*Note: Stack traces only shown in development mode*

---

## 🔐 Security Best Practices

### ✅ Implemented
1. **Whitelist-based origin validation** - Only specific origins allowed
2. **Credentials enabled** - Secure cookie-based authentication
3. **Environment-aware** - Different configs for dev/prod
4. **Detailed logging** - Track CORS issues in real-time
5. **Error handling** - Graceful degradation on failures

### 🚨 Important Notes
1. **Never use `origin: '*'` with `credentials: true`** - Browser will reject
2. **Always validate origin** - Don't trust client-provided data
3. **Use HTTPS in production** - HTTP cookies vulnerable to interception
4. **Rotate JWT secrets** - Use strong, unique secrets per environment
5. **Monitor CORS logs** - Watch for suspicious origin attempts

---

## 🚀 Deployment Checklist

### Before Production Deploy

- [ ] Update `PRODUCTION_URL` in `.env` to actual frontend URL
- [ ] Set `NODE_ENV=production`
- [ ] Rotate `JWT_SECRET` to production secret
- [ ] Disable `DEBUG_CORS` (or set to 0)
- [ ] Update `allowedOrigins` array with production domains
- [ ] Test health check from production frontend
- [ ] Verify SSL certificates (HTTPS)
- [ ] Configure production database URL
- [ ] Test authentication flow end-to-end

### Post-Deploy Verification

```bash
# Test from production frontend
curl -v -H "Origin: https://bisman.erp" https://your-backend.com/api/health

# Expected: CORS headers present + 200 OK response
```

---

## 📞 Troubleshooting

### Server Won't Start
1. Check if port 3001 is already in use: `lsof -i :3001`
2. Verify `.env` file exists and is properly formatted
3. Check database connection string
4. Look for syntax errors in app.js or server.js

### CORS Still Blocking
1. Clear browser cache and cookies
2. Check Network tab in DevTools for actual origin
3. Enable `DEBUG_CORS=1` and check server logs
4. Verify middleware order (CORS must be before routes)

### Health Check Failing
1. Test with curl first (bypasses browser CORS)
2. Check if server is actually running on expected port
3. Verify firewall/network settings
4. Check server logs for startup errors

---

## 📚 Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS Package](https://www.npmjs.com/package/cors)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## 📄 File Structure

```
my-backend/
├── server.js           # Server entry point with health check
├── app.js              # Express app with CORS middleware
├── .env                # Environment configuration
├── index.js            # Server startup script
└── CORS_CONFIGURATION_GUIDE.md  # This file
```

---

**Last Updated**: October 27, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
