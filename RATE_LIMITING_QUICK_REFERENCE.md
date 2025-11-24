# 🛡️ RATE LIMITING QUICK REFERENCE CARD

## 📋 At-a-Glance Configuration

### Rate Limit Thresholds (Default)
```
LOGIN:      5 requests per 15 minutes
AUTH:       20 requests per 10 minutes  
API:        100 requests per 5 minutes
PUBLIC:     60 requests per 1 minute
EXPENSIVE:  10 requests per 1 hour
```

### Environment Variables (.env)
```bash
LOGIN_RATE_LIMIT=5
AUTH_RATE_LIMIT=20
API_RATE_LIMIT=100
PUBLIC_RATE_LIMIT=60
EXPENSIVE_RATE_LIMIT=10
RATE_LIMIT_WHITELIST=127.0.0.1,::1
REDIS_URL=redis://host:6379
```

---

## 🚀 Quick Commands

### Setup
```bash
cd my-backend
./setup-rate-limiting.sh
npm run dev
```

### Testing
```bash
./test-rate-limits.sh http://localhost:3001
```

### Check Violations
```bash
# Database query
psql $DATABASE_URL -c "SELECT * FROM rate_limit_violations ORDER BY timestamp DESC LIMIT 10;"

# API endpoint (need admin token)
curl http://localhost:3001/api/admin/rate-limit-violations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Redis Management
```bash
redis-cli ping                    # Test connection
redis-cli KEYS "rl:*"            # View rate limit keys
redis-cli FLUSHDB                # Clear all (DANGER!)
```

### Emergency Actions
```bash
# Disable rate limiting (emergency only)
echo "EMERGENCY_DISABLE_RATE_LIMITS=true" >> .env
npm run dev

# Whitelist an IP
echo "RATE_LIMIT_WHITELIST=127.0.0.1,1.2.3.4" >> .env
npm run dev
```

---

## 🔍 Monitoring

### Console Logs
```bash
# Real-time monitoring
tail -f logs/server.log | grep RateLimit

# Count violations today
grep "RateLimit" logs/server.log | grep $(date +%Y-%m-%d) | wc -l
```

### Database Queries
```sql
-- Today's violations by type
SELECT violation_type, COUNT(*) 
FROM rate_limit_violations 
WHERE timestamp::date = CURRENT_DATE 
GROUP BY violation_type;

-- Top 10 offending IPs this week
SELECT ip_address, COUNT(*) as violations
FROM rate_limit_violations
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY ip_address
ORDER BY violations DESC
LIMIT 10;

-- Violations per endpoint
SELECT endpoint, COUNT(*) as hits
FROM rate_limit_violations
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY endpoint
ORDER BY hits DESC;
```

---

## 🧪 Quick Tests

### Test Login Rate Limit
```bash
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\n%{http_code}\n"
  sleep 1
done
# Expect: 401, 401, 401, 401, 401, 429
```

### Test API Rate Limit
```bash
# Should block after 100 requests
seq 1 110 | xargs -I{} -P 10 curl -s -o /dev/null -w "%{http_code} " http://localhost:3001/api/health; echo
```

### Check Headers
```bash
curl -I http://localhost:3001/api/health | grep -i ratelimit
# Expect: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

---

## ☁️ Cloudflare Rules (Quick Copy-Paste)

### Rule 1: Login Protection
```
Expression: (http.request.uri.path contains "/api/auth/login") and (http.request.method eq "POST")
Action: Block
Requests: 5
Period: 15 minutes
```

### Rule 2: API Protection
```
Expression: (http.request.uri.path contains "/api")
Action: Managed Challenge
Requests: 100
Period: 5 minutes
```

### Rule 3: Expensive Operations
```
Expression: (http.request.uri.path contains "/api/reports")
Action: Block
Requests: 10
Period: 1 hour
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| Rate limit not working | Check `trust proxy` in app.js |
| Too many false positives | Increase limits in .env |
| Redis errors | Check REDIS_URL, restart Redis |
| Violations not logging | Run migration, regenerate Prisma |
| Legitimate user blocked | Add to RATE_LIMIT_WHITELIST |

---

## 📊 Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Request succeeded |
| 401 | Unauthorized | Invalid credentials |
| 429 | Too Many Requests | Rate limit exceeded |
| 403 | Forbidden | IP blocked |

---

## 🔗 File Locations

```
my-backend/
├── middleware/advancedRateLimiter.js  # Main rate limiter
├── routes/auth.js                      # Auth with rate limits
├── app.js                             # Rate limiters applied
├── prisma/
│   ├── schema.prisma                  # RateLimitViolation model
│   └── migrations/
│       └── add_rate_limit_violations.sql
├── setup-rate-limiting.sh             # Setup script
└── test-rate-limits.sh                # Test script
```

---

## 📞 Quick Help

```bash
# View all rate limit endpoints
grep -r "strictLoginLimiter\|moderateAuthLimiter\|standardApiLimiter" routes/

# Count protected endpoints
grep -c "Limiter" routes/*.js

# Check if Redis is connected
node -e "const r=require('ioredis');const c=new r(process.env.REDIS_URL);c.ping().then(()=>console.log('✓')).catch(()=>console.log('✗'))"
```

---

## 🎯 Common Scenarios

### Increase Login Attempts for VIP User
```bash
# Option 1: Whitelist IP
RATE_LIMIT_WHITELIST=1.2.3.4

# Option 2: User-specific limit (in code)
# See: AUTH_ROUTES_RATE_LIMITING_UPDATE.js
```

### Allow API Integration with Higher Limits
```bash
# Use API key authentication instead of IP-based
# See adaptive rate limiter in advancedRateLimiter.js
```

### Block Malicious IP Permanently
```sql
-- Add to Cloudflare Firewall Rules
-- Dashboard > Security > WAF > Custom rules
-- Expression: (ip.src eq "1.2.3.4")
-- Action: Block
```

---

## 📚 Documentation Index

1. **RATE_LIMITING_EXECUTIVE_SUMMARY.md** - Start here
2. **RATE_LIMITING_IMPLEMENTATION_GUIDE.md** - Complete guide  
3. **CLOUDFLARE_RATE_LIMITING_QUICK_SETUP.md** - Cloudflare config
4. **RATE_LIMITING_TESTING_GUIDE.md** - Testing procedures
5. **This file** - Quick reference

---

## ✅ Daily Checklist

- [ ] Check violation logs: `tail -100 logs/server.log | grep RateLimit`
- [ ] Review top IPs: `psql -c "SELECT * FROM daily_violation_summary;"`
- [ ] Verify Redis: `redis-cli ping`
- [ ] Check Cloudflare dashboard
- [ ] Ensure no legitimate user blocks

---

**Print this page and keep it handy!** 📄

**Version:** 1.0 | **Date:** Nov 24, 2025
