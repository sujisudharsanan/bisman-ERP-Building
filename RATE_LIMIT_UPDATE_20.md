# Rate Limit Update - Set to 20 for All Endpoints
## November 25, 2024

## 🎯 What Changed

Updated all rate limiters across the application to use a **consistent limit of 20 requests** per time window to prevent "Too Many Requests" (429) errors during development and normal usage.

## 📊 Rate Limit Configuration

### Before (Various Limits):

| Endpoint Type | Time Window | Old Limit | Issues |
|--------------|-------------|-----------|---------|
| Login | 15 minutes | 5 | Too strict |
| Auth (moderate) | 10 minutes | 20 | OK |
| Standard API | 5 minutes | 100 | Too high |
| Public | 1 minute | 60 | Too high |
| Expensive Ops | 1 hour | 10 | Too strict |
| Chat | 1 minute | 30 | Too high |
| Calls | 5 minutes | 50 | Too high |

### After (Unified Limits):

| Endpoint Type | Time Window | New Limit | Status |
|--------------|-------------|-----------|--------|
| **Login** | 15 minutes | **20** | ✅ Updated |
| **Auth (moderate)** | 10 minutes | **20** | ✅ No change |
| **Standard API** | 5 minutes | **20** | ✅ Updated |
| **Public** | 1 minute | **20** | ✅ Updated |
| **Expensive Ops** | 1 hour | **20** | ✅ Updated |
| **Chat** | 1 minute | **20** | ✅ Updated |
| **Calls** | 5 minutes | **20** | ✅ Updated |

## 🔧 Files Modified

### 1. `/my-backend/middleware/advancedRateLimiter.js`

**Updated Rate Limiters:**

```javascript
// Login Limiter
max: process.env.LOGIN_RATE_LIMIT || 20, // Was: 5

// Standard API Limiter
max: process.env.API_RATE_LIMIT || 20, // Was: 100

// Public Limiter
max: process.env.PUBLIC_RATE_LIMIT || 20, // Was: 60

// Expensive Operation Limiter
max: process.env.EXPENSIVE_RATE_LIMIT || 20, // Was: 10
```

### 2. `/my-backend/app.js`

**Updated Adaptive Limiters:**

```javascript
// Chat Limiter
const chatLimiter = createAdaptiveRateLimiter({ 
  windowMs: 60 * 1000, 
  max: 20 // Was: 30
});

// Call Limiter
const callLimiter = createAdaptiveRateLimiter({ 
  windowMs: 5 * 60 * 1000, 
  max: 20 // Was: 50
});
```

## 📝 Endpoint Protection

### Rate Limited Endpoints:

```javascript
// Login endpoints (20 per 15 minutes)
- /api/login
- /api/auth/login
- /api/auth/register
- /api/password-reset
- /api/security/otp

// Auth endpoints (20 per 10 minutes)
- /api/auth/refresh
- /api/auth/logout
- /api/session

// General API (20 per 5 minutes)
- /api/*
- /v1/*

// Public endpoints (20 per minute)
- /api/health
- /health
- /metrics

// Expensive operations (20 per hour)
- /api/ai/*
- /api/reports/*
- /api/analytics/export

// Chat endpoints (20 per minute)
- /api/chat/*
- /api/messages/*

// Call endpoints (20 per 5 minutes)
- /api/calls/*
- /api/voice/*
- /api/video/*
```

## 🔄 How to Apply Changes

### Option 1: Restart Backend (Recommended)
```bash
# Stop current backend
Ctrl+C in terminal

# Restart both services
npm run dev:both
```

### Option 2: Clear Rate Limits (Development Only)
```bash
# Call the dev endpoint to reset rate limits
curl -X POST http://localhost:5000/api/dev/clear-rate-limits
```

## 🛡️ Benefits

### 1. **Consistency**
- All endpoints use the same base limit (20)
- Easier to understand and manage
- Predictable behavior across the app

### 2. **Development Friendly**
- Higher limit for login (5 → 20) prevents lockout during testing
- Reasonable limits prevent accidental DOS
- Easy to test without hitting limits

### 3. **Production Ready**
- Can be overridden with environment variables
- Protects against abuse
- Logs violations for monitoring

## ⚙️ Environment Variables

You can override these limits using environment variables in `.env`:

```bash
# Rate Limit Configuration
LOGIN_RATE_LIMIT=20          # Login attempts per 15 minutes
AUTH_RATE_LIMIT=20           # Auth requests per 10 minutes
API_RATE_LIMIT=20            # API requests per 5 minutes
PUBLIC_RATE_LIMIT=20         # Public endpoint requests per minute
EXPENSIVE_RATE_LIMIT=20      # Expensive operations per hour

# Optional: Whitelist IPs (comma-separated)
RATE_LIMIT_WHITELIST=127.0.0.1,::1
```

## 📊 Rate Limit Headers

When a request is made, the API returns headers showing rate limit status:

```http
RateLimit-Limit: 20
RateLimit-Remaining: 15
RateLimit-Reset: 1700000000
```

### Example Response When Limit Exceeded:

```json
{
  "error": "API rate limit exceeded",
  "message": "Too many requests. Please slow down.",
  "type": "API_RATE_LIMIT",
  "retryAfter": 300
}
```

## 🔍 Monitoring

Rate limit violations are logged to console:

```
🚨 [RateLimit] IP 192.168.1.100 exceeded limit for /api/tasks
```

## 🚨 Troubleshooting

### Issue: Still getting 429 errors

**Solutions:**

1. **Clear rate limits** (development):
   ```bash
   curl -X POST http://localhost:5000/api/dev/clear-rate-limits
   ```

2. **Restart backend**:
   ```bash
   npm run dev:both
   ```

3. **Check current limits**:
   Look at response headers for `RateLimit-*` information

4. **Increase limit temporarily**:
   Set environment variable:
   ```bash
   export API_RATE_LIMIT=100
   npm run dev:both
   ```

### Issue: Need different limits for different endpoints

**Solution:**
The code supports environment variables. Update `.env`:

```bash
# Example: Higher limits for specific use cases
LOGIN_RATE_LIMIT=50
API_RATE_LIMIT=100
PUBLIC_RATE_LIMIT=30
```

## 🎯 Best Practices

### For Development:
1. Use generous limits (current: 20)
2. Clear limits when needed with dev endpoint
3. Monitor console for rate limit warnings

### For Production:
1. Set appropriate limits via environment variables
2. Monitor rate limit violations
3. Whitelist trusted IPs (monitoring services, etc.)
4. Use Redis for distributed rate limiting (already supported)

## 📈 Rate Limit Strategy

### Current Strategy:
```
Time Window → Limit
───────────────────────
1 minute → 20 (public, chat)
5 minutes → 20 (API, calls)
10 minutes → 20 (auth)
15 minutes → 20 (login)
1 hour → 20 (expensive ops)
```

### Why 20?
- ✅ High enough for normal usage
- ✅ Low enough to prevent abuse
- ✅ Easy to remember
- ✅ Consistent across endpoints
- ✅ Good for development and production

## 🔐 Security Features

### Bypass for Trusted Sources:
- Health check endpoints (`/health`, `/api/health`)
- Cloudflare health checks
- Whitelisted IPs

### Advanced Key Generation:
Rate limits are per:
- IP address (primary)
- Forwarded IP (behind proxy)
- User ID (if authenticated)

### Violation Tracking:
- Logs to console
- Can be extended to database
- Helps identify attack patterns

## ✅ Summary

**All rate limiters now use a consistent limit of 20 requests per their respective time windows.**

This provides:
- 🛡️ Protection against abuse
- 🚀 Better development experience
- 📊 Predictable behavior
- ⚙️ Easy configuration via environment variables

---

**Status**: ✅ Applied
**Date**: November 25, 2024
**Action Required**: Restart backend to apply changes
