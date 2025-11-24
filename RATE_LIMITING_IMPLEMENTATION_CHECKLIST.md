# ✅ RATE LIMITING IMPLEMENTATION CHECKLIST

## 📋 Use this checklist to track your implementation progress

**Project:** BISMAN ERP Rate Limiting  
**Started:** _______________  
**Completed:** _______________  
**Implemented By:** _______________

---

## Phase 1: Preparation & Setup (30 minutes)

### Documentation Review
- [ ] Read `RATE_LIMITING_EXECUTIVE_SUMMARY.md`
- [ ] Review `RATE_LIMITING_IMPLEMENTATION_GUIDE.md`
- [ ] Understand rate limit thresholds
- [ ] Review Cloudflare setup guide

### Environment Setup
- [ ] Verify Node.js version (`node -v`)
- [ ] Check npm packages are up to date
- [ ] Backup current `.env` file
- [ ] Backup database (optional but recommended)
- [ ] Create git branch: `git checkout -b feature/rate-limiting`

### Dependencies
- [ ] Verify `express-rate-limit` in package.json
- [ ] Verify `ioredis` in package.json
- [ ] Install `rate-limit-redis`: `npm install rate-limit-redis`
- [ ] All dependencies installed successfully

---

## Phase 2: Backend Implementation (45 minutes)

### Middleware Creation
- [ ] Create `middleware/advancedRateLimiter.js`
- [ ] Copy code from provided template
- [ ] Verify no syntax errors
- [ ] Test file can be imported: `node -e "require('./middleware/advancedRateLimiter')"`

### Database Setup
- [ ] Create migration file: `prisma/migrations/add_rate_limit_violations.sql`
- [ ] Copy SQL from provided template
- [ ] Update `prisma/schema.prisma` with `RateLimitViolation` model
- [ ] Run migration: `psql $DATABASE_URL < prisma/migrations/add_rate_limit_violations.sql`
- [ ] Regenerate Prisma client: `npx prisma generate`
- [ ] Verify table exists: `psql -c "\dt rate_limit_violations"`

### Environment Configuration
- [ ] Add rate limit variables to `.env`:
  - [ ] `LOGIN_RATE_LIMIT=5`
  - [ ] `AUTH_RATE_LIMIT=20`
  - [ ] `API_RATE_LIMIT=100`
  - [ ] `PUBLIC_RATE_LIMIT=60`
  - [ ] `EXPENSIVE_RATE_LIMIT=10`
  - [ ] `RATE_LIMIT_WHITELIST=127.0.0.1,::1`
- [ ] (Optional) Add `REDIS_URL` if using Redis
- [ ] Verify `.env` syntax: `grep RATE_LIMIT .env`

### App.js Updates
- [ ] Backup current `app.js`: `cp app.js app.js.backup`
- [ ] Import rate limiters at top of file
- [ ] Remove or comment out old rate limiter definitions
- [ ] Add new rate limiter configuration (line ~157)
- [ ] Apply global rate limiting after CORS setup
- [ ] Add rate limiters to specific routes:
  - [ ] `/api/reports`
  - [ ] `/api/ai`
  - [ ] `/api/analytics`
  - [ ] `/api/export`
- [ ] Add monitoring endpoints:
  - [ ] `/api/admin/rate-limit-violations`
  - [ ] `/api/admin/rate-limit-stats`
- [ ] (Optional) Add dev helper endpoint
- [ ] Verify no syntax errors: `node -c app.js`

### Auth Routes Updates
- [ ] Backup current `routes/auth.js`: `cp routes/auth.js routes/auth.js.backup`
- [ ] Import rate limiters at top of file
- [ ] Apply `strictLoginLimiter` to:
  - [ ] POST `/login`
  - [ ] POST `/register`
  - [ ] POST `/password-reset/request`
  - [ ] POST `/password-reset/confirm`
- [ ] Apply `moderateAuthLimiter` to:
  - [ ] POST `/refresh-token`
  - [ ] POST `/logout`
  - [ ] POST `/verify-email`
  - [ ] POST `/change-password`
- [ ] Verify no syntax errors: `node -c routes/auth.js`

---

## Phase 3: Testing (30 minutes)

### Local Testing Setup
- [ ] Make test script executable: `chmod +x test-rate-limits.sh`
- [ ] Start server: `npm run dev`
- [ ] Verify server started successfully
- [ ] Check logs for rate limiting initialization

### Basic Functionality Tests
- [ ] Test health endpoint: `curl http://localhost:3001/api/health`
- [ ] Verify response includes rate limit headers
- [ ] Check headers: `curl -I http://localhost:3001/api/health | grep RateLimit`

### Login Rate Limit Test
- [ ] Run: `./test-rate-limits.sh`
- [ ] Verify first 5 attempts return 401
- [ ] Verify 6th attempt returns 429
- [ ] Check console for rate limit warnings
- [ ] Verify violation logged in database

### API Rate Limit Test
- [ ] Send 101 rapid requests to `/api/health`
- [ ] Verify first 100 succeed
- [ ] Verify 101st returns 429
- [ ] Check rate limit headers on response #50

### Database Verification
- [ ] Query violations: `psql -c "SELECT * FROM rate_limit_violations LIMIT 5;"`
- [ ] Verify violations are being logged
- [ ] Test violation stats endpoint (as admin)
- [ ] Verify views work: `psql -c "SELECT * FROM daily_violation_summary;"`

### Redis Testing (If Configured)
- [ ] Test Redis connection: `redis-cli ping`
- [ ] Verify rate limit keys: `redis-cli KEYS "rl:*"`
- [ ] Check key TTL: `redis-cli TTL "rl:login:127.0.0.1"`
- [ ] Test rate limit persistence across server restarts

### Monitoring Tests
- [ ] Access `/api/admin/rate-limit-violations` (as admin)
- [ ] Access `/api/admin/rate-limit-stats` (as admin)
- [ ] Verify JSON response format
- [ ] Check console logs for violations

---

## Phase 4: Cloudflare Configuration (20 minutes)

### Initial Setup
- [ ] Log in to Cloudflare Dashboard
- [ ] Select your domain
- [ ] Navigate to Security → WAF
- [ ] Click "Rate limiting rules"

### Create Rate Limiting Rules
- [ ] **Rule 1: Login Protection**
  - [ ] Name: "Login-Protection-Strict"
  - [ ] Expression: `/api/auth/login` and `POST`
  - [ ] Threshold: 5 requests per 15 minutes
  - [ ] Action: Block (429)
  - [ ] Deploy to Production

- [ ] **Rule 2: General API Protection**
  - [ ] Name: "API-General-Protection"
  - [ ] Expression: `/api` (exclude `/health`)
  - [ ] Threshold: 100 requests per 5 minutes
  - [ ] Action: Managed Challenge
  - [ ] Deploy to Production

- [ ] **Rule 3: Expensive Operations**
  - [ ] Name: "Expensive-Operations-Limit"
  - [ ] Expression: `/api/reports` or `/api/ai`
  - [ ] Threshold: 10 requests per hour
  - [ ] Action: Block (429)
  - [ ] Deploy to Production

- [ ] **Rule 4: DDoS Prevention**
  - [ ] Name: "DDoS-Homepage-Protection"
  - [ ] Expression: `/` or `/dashboard`
  - [ ] Threshold: 50 requests per 10 seconds
  - [ ] Action: JS Challenge
  - [ ] Deploy to Production

- [ ] **Rule 5: Bot Protection**
  - [ ] Name: "Bot-Protection"
  - [ ] Expression: `(cf.client.bot)`
  - [ ] Action: Managed Challenge
  - [ ] Deploy to Production

### Additional Security Settings
- [ ] Enable Bot Fight Mode
- [ ] Set Security Level to "High"
- [ ] Configure Challenge Passage (30 minutes)
- [ ] Enable Browser Integrity Check

### Firewall Rules (Optional)
- [ ] Create rule to block high-risk countries
- [ ] Create rule to allow trusted IPs
- [ ] Test firewall rules don't block legitimate traffic

### Cloudflare Testing
- [ ] Test rate limiting on production URL
- [ ] Verify Cloudflare headers present: `CF-Ray`, `CF-Cache-Status`
- [ ] Test that Cloudflare blocks before backend (faster response)
- [ ] Review Cloudflare Analytics → Security

---

## Phase 5: Production Deployment (15 minutes)

### Pre-Deployment Checks
- [ ] All tests passing
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Cloudflare rules active
- [ ] Team notified of deployment

### Deployment
- [ ] Commit changes: `git add . && git commit -m "feat: implement rate limiting"`
- [ ] Push to repository: `git push origin feature/rate-limiting`
- [ ] Create pull request
- [ ] Code review completed
- [ ] Merge to main branch
- [ ] Deploy to production

### Production Verification
- [ ] Verify server started successfully
- [ ] Check production logs for rate limiting initialization
- [ ] Test login rate limiting on production
- [ ] Test API rate limiting on production
- [ ] Verify monitoring endpoints accessible
- [ ] Check Cloudflare is proxying traffic (orange cloud)

### Post-Deployment Monitoring
- [ ] Monitor logs for 1 hour: `tail -f logs/server.log | grep RateLimit`
- [ ] Check for false positives
- [ ] Review violation logs
- [ ] Monitor error rates
- [ ] Check system performance metrics

---

## Phase 6: Documentation & Training (20 minutes)

### Documentation
- [ ] Update project README with rate limiting info
- [ ] Document rate limit thresholds in team wiki
- [ ] Create incident response runbook
- [ ] Document emergency procedures
- [ ] Add to system architecture diagram

### Team Training
- [ ] Share documentation with development team
- [ ] Train support team on handling rate limit inquiries
- [ ] Brief security team on monitoring procedures
- [ ] Create FAQ for common scenarios
- [ ] Schedule team Q&A session

### Monitoring Setup
- [ ] Set up alerts for excessive violations
- [ ] Configure daily violation summary reports
- [ ] Add rate limiting dashboard to monitoring tools
- [ ] Document escalation procedures

---

## Phase 7: Ongoing Maintenance (Continuous)

### Daily Tasks
- [ ] Review violation logs
- [ ] Check for anomalies
- [ ] Verify no legitimate user blocks

### Weekly Tasks
- [ ] Analyze violation trends
- [ ] Review top offending IPs
- [ ] Check Cloudflare analytics
- [ ] Adjust thresholds if needed

### Monthly Tasks
- [ ] Full security audit
- [ ] Performance impact analysis
- [ ] User feedback review
- [ ] Update documentation

### Quarterly Tasks
- [ ] Threat landscape review
- [ ] Rate limit strategy reassessment
- [ ] Tool and service evaluation
- [ ] Team training refresh

---

## ✅ Final Verification

### Security Checklist
- [ ] Brute force attacks are blocked
- [ ] API abuse is prevented
- [ ] Attack patterns are visible
- [ ] Violations are logged
- [ ] IP reputation is tracked

### Performance Checklist
- [ ] Response time impact < 5%
- [ ] No memory leaks
- [ ] Server remains stable
- [ ] False positive rate < 0.1%

### User Experience Checklist
- [ ] Legitimate users not affected
- [ ] Clear error messages
- [ ] Support team prepared
- [ ] Documentation accessible

---

## 🎉 Implementation Complete!

**Completion Date:** _______________  
**Final Notes:**

```
_____________________________________________
_____________________________________________
_____________________________________________
```

**Sign-off:**
- Developer: _______________
- Reviewer: _______________
- Security: _______________

---

## 📊 Success Metrics (Track After 1 Week)

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| Brute force attempts blocked | 100% | ___ | ___ |
| False positives | < 10/week | ___ | ___ |
| Response time impact | < 5% | ___ | ___ |
| User complaints | < 5/week | ___ | ___ |
| Security incidents prevented | > 0 | ___ | ___ |

---

## 🔄 Rollback Plan (If Needed)

### Emergency Rollback Steps
1. [ ] Disable in .env: `EMERGENCY_DISABLE_RATE_LIMITS=true`
2. [ ] Restart server
3. [ ] Disable Cloudflare rules
4. [ ] Restore backup files if needed
5. [ ] Investigate issue
6. [ ] Document root cause
7. [ ] Create fix plan
8. [ ] Re-implement with fixes

---

**Document Version:** 1.0  
**Last Updated:** November 24, 2025  
**Next Review:** _______________
