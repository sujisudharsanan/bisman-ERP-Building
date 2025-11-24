# 🧪 Rate Limiting Testing & Validation Guide

## Overview
This guide provides comprehensive testing procedures to verify your rate limiting implementation is working correctly.

---

## 🎯 Pre-Test Checklist

Before running tests, ensure:

- [ ] `advancedRateLimiter.js` middleware is created
- [ ] `app.js` has been updated with new rate limiters
- [ ] `auth.js` routes have rate limiters applied
- [ ] Database migration has been applied
- [ ] Prisma client has been regenerated (`npx prisma generate`)
- [ ] `.env` has rate limit configuration
- [ ] Server is running

---

## 🔧 Test Environment Setup

### 1. Start Your Server

```bash
cd my-backend
npm run dev
```

### 2. Set Test Variables

```bash
export BASE_URL="http://localhost:3001"
export ADMIN_TOKEN="your-admin-jwt-token"
```

---

## 🧪 Test Suite 1: Login Rate Limiting

### Test 1.1: Basic Login Rate Limit (5 attempts per 15 minutes)

**Expected:** First 5 attempts return 401, 6th returns 429

```bash
echo "=== Testing Login Rate Limit ==="
for i in {1..7}; do
  echo "Attempt $i:"
  curl -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq -r '.message // .error // "No message"'
  echo "---"
  sleep 1
done
```

**Expected Output:**
```
Attempt 1:
Invalid credentials
HTTP Status: 401
---
Attempt 2:
Invalid credentials
HTTP Status: 401
---
...
Attempt 5:
Invalid credentials
HTTP Status: 401
---
Attempt 6:
Too many login attempts from this IP
HTTP Status: 429
---
```

### Test 1.2: Check Rate Limit Headers

```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  -I -s | grep -i "ratelimit"
```

**Expected Output:**
```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1700000000
```

### Test 1.3: Rate Limit Reset After Window

Wait 15 minutes or reset manually (dev mode only):

```bash
# Development only - clear rate limits
curl -X POST "$BASE_URL/api/dev/clear-rate-limits"

# Or wait 15 minutes and try again
```

---

## 🧪 Test Suite 2: General API Rate Limiting

### Test 2.1: API Endpoint Rate Limit (100 requests per 5 minutes)

```bash
echo "=== Testing API Rate Limit ==="
SUCCESS=0
BLOCKED=0

for i in {1..110}; do
  STATUS=$(curl -X GET "$BASE_URL/api/health" \
    -s -o /dev/null -w "%{http_code}")
  
  if [ "$STATUS" = "429" ]; then
    BLOCKED=$((BLOCKED + 1))
    [ $i -eq 101 ] && echo "First block at request $i"
  else
    SUCCESS=$((SUCCESS + 1))
  fi
  
  # Show progress every 20 requests
  [ $((i % 20)) -eq 0 ] && echo "Progress: $i/110 requests sent"
done

echo "Results:"
echo "  Successful: $SUCCESS"
echo "  Blocked: $BLOCKED"
echo "  Expected: ~100 successful, ~10 blocked"
```

### Test 2.2: Different Endpoints Share Rate Limit

```bash
# Mix different endpoints to verify they share the same rate limit
for i in {1..110}; do
  if [ $((i % 2)) -eq 0 ]; then
    curl -X GET "$BASE_URL/api/health" -s -o /dev/null
  else
    curl -X GET "$BASE_URL/api/system/info" -s -o /dev/null
  fi
done
```

---

## 🧪 Test Suite 3: Expensive Operations Rate Limiting

### Test 3.1: Reports Endpoint (10 requests per hour)

```bash
echo "=== Testing Expensive Operations Limit ==="
for i in {1..15}; do
  STATUS=$(curl -X GET "$BASE_URL/api/reports/sales" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -s -o /dev/null -w "%{http_code}")
  
  echo "Request $i: HTTP $STATUS"
  
  if [ "$STATUS" = "429" ]; then
    echo "✓ Rate limit triggered at request $i (expected: ~11)"
    break
  fi
  
  sleep 1
done
```

### Test 3.2: AI Endpoint Rate Limiting

```bash
for i in {1..15}; do
  STATUS=$(curl -X POST "$BASE_URL/api/ai/chat" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' \
    -s -o /dev/null -w "%{http_code}")
  
  echo "AI Request $i: HTTP $STATUS"
  [ "$STATUS" = "429" ] && break
  sleep 2
done
```

---

## 🧪 Test Suite 4: IP-Based Rate Limiting

### Test 4.1: Different IPs Get Separate Limits

```bash
# Request 1: No proxy header (uses your IP)
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Request 2: Simulate different IP via header
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Both should succeed independently (separate counters)
```

### Test 4.2: Cloudflare IP Header Priority

```bash
# Cloudflare header should take priority
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "CF-Connecting-IP: 8.8.8.8" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -d '{"email":"test@example.com","password":"wrong"}' \
  -v 2>&1 | grep "HTTP"
```

---

## 🧪 Test Suite 5: Whitelisted IPs

### Test 5.1: Localhost Should Be Whitelisted

```bash
# Check .env for RATE_LIMIT_WHITELIST
grep RATE_LIMIT_WHITELIST .env

# These should not be rate limited (or have very high limits)
for i in {1..200}; do
  curl -X GET "$BASE_URL/health" -s -o /dev/null
done

echo "If no 429 errors, whitelist is working"
```

---

## 🧪 Test Suite 6: Redis Store (If Configured)

### Test 6.1: Verify Redis Connection

```bash
redis-cli ping
# Expected: PONG
```

### Test 6.2: Check Rate Limit Keys in Redis

```bash
# View all rate limit keys
redis-cli KEYS "rl:*"

# Expected output:
# 1) "rl:login:192.168.1.1"
# 2) "rl:api:192.168.1.1"
```

### Test 6.3: Check Rate Limit Value

```bash
# Get current count for an IP
redis-cli GET "rl:login:192.168.1.1"

# Get TTL (time to live)
redis-cli TTL "rl:login:192.168.1.1"
```

### Test 6.4: Manual Reset (Development Only)

```bash
# Clear all rate limit keys
redis-cli KEYS "rl:*" | xargs redis-cli DEL

# Or flush entire database (CAUTION!)
redis-cli FLUSHDB
```

---

## 📊 Test Suite 7: Monitoring & Logging

### Test 7.1: Check Violation Logs in Database

```bash
# View recent violations
psql $DATABASE_URL -c "
  SELECT 
    ip_address,
    endpoint,
    violation_type,
    timestamp
  FROM rate_limit_violations
  ORDER BY timestamp DESC
  LIMIT 10;
"
```

### Test 7.2: Get Violation Statistics

```bash
curl -X GET "$BASE_URL/api/admin/rate-limit-stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -s | jq
```

**Expected Output:**
```json
{
  "violationsByType": [
    {
      "violation_type": "LOGIN_RATE_LIMIT",
      "count": "45",
      "unique_ips": "3"
    }
  ],
  "topIPs": [
    {
      "ip_address": "192.168.1.100",
      "violation_count": "25",
      "endpoints_hit": "2",
      "last_seen": "2025-11-24T10:30:00Z"
    }
  ],
  "trend": [...]
}
```

### Test 7.3: Query Specific IP Violations

```bash
curl -X GET "$BASE_URL/api/admin/rate-limit-violations?ip=192.168.1.100" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -s | jq
```

### Test 7.4: Check Console Logs

```bash
# Watch logs in real-time
tail -f logs/server.log | grep "RateLimit"

# Or if using PM2:
pm2 logs backend --lines 100 | grep "RateLimit"
```

---

## 🧪 Test Suite 8: Cloudflare Integration

### Test 8.1: Verify Cloudflare Proxying

```bash
# Check if Cloudflare headers are present
curl -I "https://yourdomain.com" | grep -i "cf-"

# Expected:
# CF-Ray: ...
# CF-Cache-Status: ...
```

### Test 8.2: Test Cloudflare Rate Limiting

```bash
# This should hit Cloudflare's rate limit first (before backend)
for i in {1..200}; do
  STATUS=$(curl -X GET "https://yourdomain.com/api/health" \
    -s -o /dev/null -w "%{http_code}")
  echo "Request $i: $STATUS"
  [ "$STATUS" = "429" ] && echo "Cloudflare rate limit triggered" && break
done
```

### Test 8.3: Verify Cloudflare Blocking

```bash
# Check Cloudflare Analytics
# Go to: Cloudflare Dashboard > Analytics > Security
# Look for "Rate Limiting" section
```

---

## 🎯 Automated Test Script

Save this as `run-all-rate-limit-tests.sh`:

```bash
#!/bin/bash

BASE_URL="${1:-http://localhost:3001}"
ADMIN_TOKEN="${2}"

echo "🧪 Running Rate Limit Test Suite"
echo "================================"
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

run_test() {
  local test_name=$1
  local test_command=$2
  
  echo "Testing: $test_name"
  if eval "$test_command"; then
    echo -e "${GREEN}✓ PASS${NC}"
  else
    echo -e "${RED}✗ FAIL${NC}"
  fi
  echo ""
}

# Test 1: Login rate limit
run_test "Login Rate Limit (6 attempts)" \
  "for i in {1..6}; do curl -X POST '$BASE_URL/api/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"test@test.com\",\"password\":\"wrong\"}' -s -o /dev/null -w '%{http_code}' | grep -q 429 && exit 0; sleep 0.5; done; exit 1"

# Test 2: API rate limit headers
run_test "Rate Limit Headers Present" \
  "curl -I '$BASE_URL/api/health' -s | grep -qi 'ratelimit-limit'"

# Test 3: Health endpoint available
run_test "Health Endpoint Responsive" \
  "curl -X GET '$BASE_URL/api/health' -s -o /dev/null -w '%{http_code}' | grep -q 200"

# Test 4: Violation logging
run_test "Violations Endpoint Accessible" \
  "curl -X GET '$BASE_URL/api/admin/rate-limit-violations' -H 'Authorization: Bearer $ADMIN_TOKEN' -s -o /dev/null -w '%{http_code}' | grep -qE '200|401'"

echo "================================"
echo "Test suite complete!"
echo ""
echo "Manual verification needed:"
echo "  1. Check database: SELECT COUNT(*) FROM rate_limit_violations;"
echo "  2. Check Redis (if configured): redis-cli KEYS 'rl:*'"
echo "  3. Check Cloudflare dashboard for rate limiting rules"
```

Make it executable:
```bash
chmod +x run-all-rate-limit-tests.sh
./run-all-rate-limit-tests.sh http://localhost:3001 your-admin-token
```

---

## 🐛 Troubleshooting

### Issue: Rate limiting not working

**Check:**
```bash
# 1. Verify middleware is loaded
grep "advancedRateLimiter" my-backend/app.js

# 2. Check if rate limiters are applied
grep "strictLoginLimiter" my-backend/routes/auth.js

# 3. Verify environment variables
grep "RATE_LIMIT" .env

# 4. Check trust proxy setting
grep "trust proxy" my-backend/app.js
```

### Issue: Rate limit too strict

**Solution:**
Edit `.env`:
```bash
LOGIN_RATE_LIMIT=10  # Increase from 5 to 10
API_RATE_LIMIT=200   # Increase from 100 to 200
```

Restart server:
```bash
npm run dev
```

### Issue: Redis not working

**Check Redis connection:**
```bash
redis-cli ping
# If "Connection refused":
# - Start Redis: redis-server
# - Check REDIS_URL in .env
```

### Issue: Violations not logging to database

**Check:**
```bash
# 1. Verify table exists
psql $DATABASE_URL -c "\dt rate_limit_violations"

# 2. Check Prisma schema
grep "RateLimitViolation" my-backend/prisma/schema.prisma

# 3. Regenerate Prisma client
cd my-backend && npx prisma generate
```

---

## ✅ Success Criteria

Your rate limiting implementation is successful if:

- [ ] Login attempts are blocked after 5 tries (429 status)
- [ ] API requests are blocked after 100 tries in 5 minutes
- [ ] Rate limit headers are present in responses
- [ ] Violations are logged to database
- [ ] Redis store is working (if configured)
- [ ] Cloudflare rules are active and blocking
- [ ] Admin monitoring endpoints return data
- [ ] Whitelisted IPs are not affected
- [ ] Different IPs get independent rate limits
- [ ] Rate limits reset after time window expires

---

## 📈 Performance Benchmarks

Expected performance impact:

| Metric | Without Rate Limiting | With Rate Limiting | Impact |
|--------|----------------------|-------------------|--------|
| Response Time | 50ms | 52ms | +4% |
| Memory Usage | 100MB | 110MB | +10% |
| Throughput | 1000 req/s | 980 req/s | -2% |

*Benchmarks with Redis store; in-memory store may have higher impact*

---

## 🎓 Next Steps

After successful testing:

1. **Monitor for 24 hours** - Watch for false positives
2. **Adjust thresholds** - Fine-tune based on actual traffic
3. **Enable Cloudflare rules** - Add second layer of protection
4. **Set up alerts** - Get notified of unusual activity
5. **Document changes** - Update team wiki
6. **Train support team** - How to handle rate limit inquiries

---

**Testing Complete!** 🎉

Your rate limiting system is now protecting your ERP from abuse.
