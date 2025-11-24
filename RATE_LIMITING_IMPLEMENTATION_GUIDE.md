# 🛡️ ENTERPRISE RATE-LIMITING IMPLEMENTATION GUIDE

## Overview
This guide provides a **complete, production-ready rate-limiting solution** with:
- ✅ Multi-layer protection (Cloudflare + Backend)
- ✅ Per-IP rate limiting with Redis support
- ✅ Separate rules for login APIs vs general APIs
- ✅ Zero additional cost (uses free tiers)
- ✅ Enterprise-grade security thresholds

---

## 📊 Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Cloudflare WAF (Free Tier)                     │
│ - DDoS Protection                                        │
│ - Geo-blocking                                           │
│ - Challenge pages for suspicious traffic                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Cloudflare Rate Limiting (Free Rules)          │
│ - Global rate limits                                     │
│ - Path-specific rules                                    │
│ - IP reputation filtering                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Express Backend Rate Limiting                  │
│ - Per-endpoint granular control                         │
│ - Redis-backed distributed limiting                     │
│ - User-aware adaptive limits                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Steps

### Step 1: Install Required Dependencies

```bash
cd my-backend

# If you don't have Redis, install rate-limit-redis
npm install rate-limit-redis

# Your package.json already has:
# - express-rate-limit (✓)
# - ioredis (✓)
```

### Step 2: Set Up Environment Variables

Add to your `.env` file:

```bash
# ============================================
# RATE LIMITING CONFIGURATION
# ============================================

# Redis URL for distributed rate limiting (optional but recommended)
# Free tier: Railway Redis (500MB) or Upstash Redis (10K requests/day)
REDIS_URL=redis://default:password@redis-host:6379

# Rate limit thresholds (requests per window)
LOGIN_RATE_LIMIT=5           # 5 login attempts per 15 minutes
AUTH_RATE_LIMIT=20           # 20 auth operations per 10 minutes
API_RATE_LIMIT=100           # 100 API calls per 5 minutes
PUBLIC_RATE_LIMIT=60         # 60 public requests per minute
EXPENSIVE_RATE_LIMIT=10      # 10 expensive ops per hour

# Whitelisted IPs (comma-separated, optional)
RATE_LIMIT_WHITELIST=127.0.0.1,::1

# Enable detailed rate limit logging
DEBUG_RATE_LIMIT=1
```

### Step 3: Update Backend Application

Replace the existing rate limiters in `my-backend/app.js`:

**Find this section (around line 157-176):**
```javascript
// Rate limiting for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  // ... old config
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  // ... old config
});
```

**Replace with:**
```javascript
// ============================================================================
// ADVANCED RATE LIMITING - Multi-Layer Protection
// ============================================================================
const {
  strictLoginLimiter,
  moderateAuthLimiter,
  standardApiLimiter,
  publicLimiter,
  expensiveOperationLimiter,
  createAdaptiveRateLimiter
} = require('./middleware/advancedRateLimiter');

console.log('[app.js] ✅ Advanced rate limiting enabled');
```

### Step 4: Apply Rate Limiters to Routes

**For Login/Authentication Routes:**

In `my-backend/routes/auth.js`, add rate limiters:

```javascript
const express = require('express');
const { strictLoginLimiter, moderateAuthLimiter } = require('../middleware/advancedRateLimiter');
const router = express.Router();

// Strict rate limiting for login (5 attempts per 15 mins)
router.post('/login', strictLoginLimiter, async (req, res) => {
  // ... existing login logic
});

// Strict rate limiting for registration
router.post('/register', strictLoginLimiter, async (req, res) => {
  // ... existing registration logic
});

// Moderate rate limiting for token refresh
router.post('/refresh-token', moderateAuthLimiter, async (req, res) => {
  // ... existing refresh logic
});
```

**For General API Routes:**

In `my-backend/app.js`, apply standard limiter globally:

```javascript
// Apply standard rate limiting to all /api routes
app.use('/api', standardApiLimiter);

// Apply stricter limits to expensive operations
app.use('/api/reports', expensiveOperationLimiter);
app.use('/api/ai', expensiveOperationLimiter);
app.use('/api/analytics', expensiveOperationLimiter);
```

---

## ☁️ Cloudflare Configuration

### Free Tier Rate Limiting Rules

Cloudflare Free tier includes:
- **5 Rate Limiting Rules** (sufficient for most use cases)
- **WAF Managed Rules** (always free)
- **DDoS Protection** (always free)

#### Rule 1: Aggressive Login Protection

```yaml
Rule Name: "Strict Login Rate Limit"
Expression: 
  (http.request.uri.path contains "/api/auth/login" or 
   http.request.uri.path contains "/api/auth/register") and
  http.request.method eq "POST"

Action: Block
Threshold: 5 requests
Period: 15 minutes
Characteristics: IP Address

Response:
  Status Code: 429
  Body: "Too many login attempts. Please try again later."
```

**How to Set Up:**
1. Log in to Cloudflare Dashboard
2. Select your domain
3. Go to **Security** → **WAF**
4. Click **Rate limiting rules** → **Create rule**
5. Enter the configuration above
6. Click **Deploy**

#### Rule 2: General API Protection

```yaml
Rule Name: "General API Rate Limit"
Expression:
  (http.request.uri.path contains "/api") and
  not (http.request.uri.path contains "/api/health")

Action: Challenge
Threshold: 100 requests
Period: 5 minutes
Characteristics: IP Address

Response:
  Show CAPTCHA challenge for suspicious traffic
```

#### Rule 3: Expensive Operations Limit

```yaml
Rule Name: "Expensive Operations Limit"
Expression:
  (http.request.uri.path contains "/api/reports" or
   http.request.uri.path contains "/api/ai" or
   http.request.uri.path contains "/api/analytics")

Action: Block
Threshold: 10 requests
Period: 60 minutes
Characteristics: IP Address + User Agent

Response:
  Status Code: 429
  Body: "Rate limit for resource-intensive operations exceeded."
```

#### Rule 4: DDoS Prevention

```yaml
Rule Name: "Aggressive DDoS Protection"
Expression:
  (http.request.uri.path eq "/")

Action: JS Challenge
Threshold: 100 requests
Period: 10 seconds
Characteristics: IP Address

Response:
  Show JavaScript challenge
```

#### Rule 5: Bot Protection

```yaml
Rule Name: "Bot Protection"
Expression:
  (cf.client.bot)

Action: Challenge
Always trigger for detected bots (except verified bots)
```

### Cloudflare Firewall Rules (Free)

Add these firewall rules for additional protection:

**Block Known Bad IPs:**
```yaml
Expression: (ip.geoip.country in {"CN" "RU" "KP"})
Action: Challenge or Block
```

**Allow Known Good IPs:**
```yaml
Expression: (ip.src in {YOUR_OFFICE_IP YOUR_HOME_IP})
Action: Allow
```

---

## 📈 Enterprise Thresholds Recommendations

### By User Type

| User Type | Login Attempts | API Calls/5min | Expensive Ops/hour |
|-----------|----------------|----------------|-------------------|
| **Anonymous** | 5 / 15min | 50 | 5 |
| **Authenticated** | 10 / 15min | 100 | 10 |
| **Premium User** | 15 / 15min | 200 | 20 |
| **Admin** | 20 / 15min | 500 | 50 |
| **Super Admin** | No limit | 1000 | 100 |

### By Endpoint Category

| Category | Free Tier | Business | Enterprise |
|----------|-----------|----------|------------|
| **Login/Auth** | 5/15min | 10/15min | 20/15min |
| **Read Operations** | 100/5min | 500/5min | 2000/5min |
| **Write Operations** | 50/5min | 200/5min | 1000/5min |
| **Reports/AI** | 10/hour | 50/hour | 200/hour |
| **File Uploads** | 20/hour | 100/hour | 500/hour |

### Geographic Considerations

**High-Risk Regions (Apply 50% Stricter Limits):**
- Countries with known attack sources
- Regions outside your primary market

**Trusted Regions (Apply Normal Limits):**
- Your primary business locations
- Partner organization IPs

---

## 🔍 Monitoring & Logging

### View Rate Limit Violations

Add this endpoint to track violations:

```javascript
// In my-backend/app.js or a dedicated route
app.get('/api/admin/rate-limit-violations', authenticate, requireRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    // Create this table in your database (migration below)
    const violations = await prisma.rateLimitViolation.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      select: {
        id: true,
        ip_address: true,
        endpoint: true,
        user_agent: true,
        timestamp: true,
      }
    });
    
    res.json({ violations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});
```

### Database Migration for Violations Table

Create `my-backend/prisma/migrations/add_rate_limit_violations.sql`:

```sql
-- Migration: Add rate_limit_violations table
-- Purpose: Track and audit rate limit violations for security monitoring

CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for fast querying
  INDEX idx_ip_timestamp (ip_address, timestamp),
  INDEX idx_endpoint_timestamp (endpoint, timestamp),
  INDEX idx_timestamp (timestamp)
);

-- Optional: Auto-cleanup old violations (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_violations()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_violations 
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-violations', '0 2 * * *', 'SELECT cleanup_old_violations()');
```

Add to Prisma schema (`my-backend/prisma/schema.prisma`):

```prisma
model RateLimitViolation {
  id          Int      @id @default(autoincrement())
  ip_address  String   @db.VarChar(45)
  endpoint    String   @db.VarChar(255)
  user_agent  String?  @db.Text
  timestamp   DateTime @default(now())

  @@index([ip_address, timestamp])
  @@index([endpoint, timestamp])
  @@index([timestamp])
  @@map("rate_limit_violations")
}
```

---

## 🧪 Testing Your Rate Limits

### Test Script

Create `test-rate-limits.sh`:

```bash
#!/bin/bash

echo "Testing Rate Limits..."
BASE_URL="http://localhost:3001"

# Test 1: Login rate limit (should block after 5 attempts)
echo "Test 1: Login Rate Limit"
for i in {1..10}; do
  echo "Attempt $i:"
  curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n" \
    -s
  sleep 1
done

# Test 2: API rate limit
echo -e "\nTest 2: API Rate Limit"
for i in {1..110}; do
  curl -X GET "$BASE_URL/api/health" \
    -w "Attempt $i - Status: %{http_code}\n" \
    -s -o /dev/null
done

# Test 3: Different IPs (simulate)
echo -e "\nTest 3: Different IP Headers"
curl -X POST "$BASE_URL/api/auth/login" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  -w "\nStatus: %{http_code}\n" \
  -s
```

Run tests:
```bash
chmod +x test-rate-limits.sh
./test-rate-limits.sh
```

---

## 🚨 Incident Response

### When Rate Limits Are Hit

**Legitimate User:**
1. Check logs to verify user identity
2. Temporarily whitelist their IP
3. Increase their limit tier

**Attacker:**
1. Block IP at Cloudflare level
2. Add IP to permanent blacklist
3. Report to abuse contact if from hosting provider

### Emergency Override

Create an emergency bypass:

```javascript
// In app.js - only for emergencies
if (process.env.EMERGENCY_DISABLE_RATE_LIMITS === 'true') {
  console.warn('⚠️ RATE LIMITS DISABLED - EMERGENCY MODE');
  // Skip all rate limiters
} else {
  // Apply normal rate limits
  app.use('/api', standardApiLimiter);
}
```

---

## 📊 Cost Analysis

### Free Tier Components (Total: $0/month)

| Component | Provider | Limit | Cost |
|-----------|----------|-------|------|
| Rate Limiting | Cloudflare Free | 5 rules | $0 |
| DDoS Protection | Cloudflare Free | Unlimited | $0 |
| WAF Rules | Cloudflare Free | Managed rules | $0 |
| Redis Cache | Railway/Upstash | 500MB / 10K req | $0 |
| Express Rate Limit | NPM Package | Unlimited | $0 |

### Paid Upgrade Options (Optional)

| Tier | Provider | Features | Cost |
|------|----------|----------|------|
| **Cloudflare Pro** | Cloudflare | 20 rate rules, advanced WAF | $20/month |
| **Redis Cloud** | Upstash | 1M requests/day | $10/month |
| **Enterprise WAF** | Cloudflare | Custom rules, API shield | $200/month |

---

## ✅ Implementation Checklist

- [ ] Install `rate-limit-redis` package
- [ ] Set up Redis connection (Railway/Upstash)
- [ ] Add environment variables to `.env`
- [ ] Create `advancedRateLimiter.js` middleware
- [ ] Update `app.js` to use new rate limiters
- [ ] Apply rate limiters to auth routes
- [ ] Configure Cloudflare rate limiting rules
- [ ] Set up Cloudflare firewall rules
- [ ] Create database migration for violations table
- [ ] Add monitoring endpoint
- [ ] Test rate limits with test script
- [ ] Update documentation
- [ ] Train team on incident response
- [ ] Set up alerts for rate limit violations

---

## 🔗 Related Documentation

- [Express Rate Limit Docs](https://express-rate-limit.mintlify.app/)
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/rate-limiting/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

---

## 🆘 Support

If you encounter issues:
1. Check logs: `tail -f logs/rate-limiter.log`
2. Verify Redis connection: `redis-cli ping`
3. Test Cloudflare rules: Cloudflare Dashboard → Analytics
4. Contact team: security@your-company.com

---

**Last Updated:** November 24, 2025
**Version:** 2.0
**Maintained By:** DevOps & Security Team
