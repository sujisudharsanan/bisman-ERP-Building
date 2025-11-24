# Cloudflare Rate Limiting Rules - Quick Setup Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Access Cloudflare Dashboard
1. Go to https://dash.cloudflare.com
2. Select your domain
3. Navigate to **Security** → **WAF**
4. Click **Rate limiting rules** tab

---

## 📋 Rule Configurations (Copy-Paste Ready)

### Rule 1: Login Endpoint Protection ⭐ CRITICAL

**Purpose:** Prevent brute force attacks on login endpoints

```
Rule Name: Login-Protection-Strict
Priority: 1 (Highest)
```

**Expression Builder:**
```
(http.request.uri.path contains "/api/auth/login" or 
 http.request.uri.path contains "/api/auth/register" or 
 http.request.uri.path contains "/api/password-reset") and 
http.request.method eq "POST"
```

**Or use Simple Mode:**
- Field: URI Path
- Operator: contains
- Value: `/api/auth/login`
- Add OR condition for `/api/auth/register`

**Rate Limiting:**
- Requests: `5`
- Period: `15 minutes`
- Counting method: `IP Address`

**Action:**
- Type: `Block`
- Response code: `429`
- Response body:
```json
{
  "error": "Too many login attempts",
  "message": "Please try again after 15 minutes",
  "type": "RATE_LIMIT_LOGIN"
}
```

**Deploy to:** Production

---

### Rule 2: General API Protection

**Purpose:** Protect all API endpoints from abuse

```
Rule Name: API-General-Protection
Priority: 2
```

**Expression:**
```
(http.request.uri.path contains "/api") and
not (http.request.uri.path contains "/api/health") and
not (http.request.uri.path contains "/api/metrics")
```

**Rate Limiting:**
- Requests: `100`
- Period: `5 minutes`
- Counting method: `IP Address`

**Action:**
- Type: `Managed Challenge` (Shows CAPTCHA for suspicious traffic)
- Or use `Block` for stricter protection

---

### Rule 3: Expensive Operations Limit

**Purpose:** Limit resource-intensive operations

```
Rule Name: Expensive-Operations-Limit
Priority: 3
```

**Expression:**
```
(http.request.uri.path contains "/api/reports" or
 http.request.uri.path contains "/api/ai" or
 http.request.uri.path contains "/api/analytics" or
 http.request.uri.path contains "/api/export")
```

**Rate Limiting:**
- Requests: `10`
- Period: `1 hour`
- Counting method: `IP Address + User Agent`

**Action:**
- Type: `Block`
- Response code: `429`
- Response body:
```json
{
  "error": "Rate limit exceeded",
  "message": "These operations are resource-intensive. Please try again later.",
  "type": "EXPENSIVE_OPERATION_LIMIT"
}
```

---

### Rule 4: DDoS Prevention

**Purpose:** Prevent DDoS attacks on homepage and key pages

```
Rule Name: DDoS-Homepage-Protection
Priority: 4
```

**Expression:**
```
(http.request.uri.path eq "/" or 
 http.request.uri.path eq "/dashboard")
```

**Rate Limiting:**
- Requests: `50`
- Period: `10 seconds`
- Counting method: `IP Address`

**Action:**
- Type: `JS Challenge` (Requires JavaScript execution)

---

### Rule 5: Bot Protection

**Purpose:** Challenge or block known bots

```
Rule Name: Bot-Protection
Priority: 5
```

**Expression:**
```
(cf.client.bot) and
not (cf.verified_bot_category in {"Search Engine" "Monitoring"})
```

**Action:**
- Type: `Managed Challenge`

---

## 🛡️ Additional Firewall Rules (Highly Recommended)

### Block Known Attack Sources

Navigate to **Security** → **WAF** → **Custom rules**

**Rule: Block High-Risk Countries**
```
Rule Name: Block-High-Risk-Geos
Expression: (ip.geoip.country in {"CN" "RU" "KP" "IR"})
Action: Block
```

*Adjust countries based on your business needs*

---

### Allow Trusted IPs

**Rule: Allow Office IPs**
```
Rule Name: Allow-Trusted-IPs
Expression: (ip.src in {YOUR_OFFICE_IP YOUR_VPN_IP})
Action: Skip (All remaining rules)
```

Replace `YOUR_OFFICE_IP` with your actual IPs.

---

## 📊 Cloudflare Settings Optimization

### 1. Security Level
- Go to **Security** → **Settings**
- Set Security Level: **High** or **I'm Under Attack** (if under attack)

### 2. Challenge Passage
- Set to: **30 minutes**
- Users who pass challenge won't be challenged again for 30 min

### 3. Browser Integrity Check
- Enable: **ON**
- Blocks known bad user agents

### 4. Enable Bot Fight Mode (Free)
- Go to **Security** → **Bots**
- Enable **Bot Fight Mode**
- Free invisible challenges for bots

---

## 🧪 Testing Your Rules

### Test 1: Login Rate Limit

```bash
# Should block after 5 attempts
for i in {1..10}; do
  curl -X POST "https://yourdomain.com/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done
```

Expected: First 5 succeed (or return 401), then 429 errors.

### Test 2: API Rate Limit

```bash
# Should block after 100 requests in 5 minutes
for i in {1..110}; do
  curl "https://yourdomain.com/api/health" \
    -w "Request $i: %{http_code}\n" -s -o /dev/null
done
```

Expected: First 100 succeed, then 429 errors.

---

## 📈 Monitor Rate Limiting

### View Analytics

1. Go to **Security** → **Overview**
2. Check **Rate Limiting** section
3. View:
   - Total requests blocked
   - Top blocked IPs
   - Top blocked paths

### Set Up Alerts

1. Go to **Notifications**
2. Click **Add**
3. Select **Rate Limiting Rules**
4. Configure alert threshold
5. Add email/webhook

---

## 🚨 Emergency Actions

### Temporarily Disable a Rule

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Find the rule
3. Toggle switch to **OFF**

### Emergency: I'm Under Attack Mode

If experiencing a severe DDoS:
1. Go to **Security** → **Settings**
2. Set Security Level to **I'm Under Attack**
3. All visitors will see a challenge page
4. Legitimate traffic will pass through

---

## 📱 Mobile App Considerations

If you have a mobile app, create a bypass rule:

**Rule: Mobile App Bypass**
```
Rule Name: Mobile-App-Bypass
Expression: (http.user_agent contains "YourAppName/")
Action: Skip (Rate limiting rules)
```

Or use API tokens in headers:
```
Expression: (http.request.headers["X-API-Key"][0] eq "your-secret-key")
```

---

## 💡 Best Practices

### ✅ DO:
- Start with lenient limits and gradually tighten
- Monitor analytics for false positives
- Whitelist your own IPs during development
- Test rules in staging first
- Document all rules and their purpose

### ❌ DON'T:
- Set limits too strict (may block legitimate users)
- Block search engine bots (verified bots)
- Forget to whitelist monitoring services
- Apply rate limits to health check endpoints

---

## 🔄 Maintenance Schedule

### Weekly:
- Review rate limiting analytics
- Check for false positives
- Adjust limits based on traffic patterns

### Monthly:
- Audit all rules
- Review blocked IPs
- Update whitelist/blacklist
- Test disaster recovery procedures

### Quarterly:
- Review and update thresholds
- Analyze attack patterns
- Update documentation
- Train team on new threats

---

## 🆘 Troubleshooting

### Problem: Legitimate users are being blocked

**Solution:**
1. Check logs to identify user patterns
2. Create exception rule for specific user agent or path
3. Temporarily increase limit
4. Consider implementing API keys for power users

### Problem: Bots bypassing rate limits

**Solution:**
1. Enable **Bot Fight Mode**
2. Add **CAPTCHA Challenge** instead of simple block
3. Implement **IP Reputation** checks
4. Use **Advanced Bot Detection** (paid feature)

### Problem: Rate limit not triggering

**Solution:**
1. Verify rule expression syntax
2. Check rule priority (higher priority = executed first)
3. Ensure Cloudflare is properly proxying traffic (orange cloud)
4. Test with curl including actual IP headers

---

## 📞 Support Resources

- **Cloudflare Community:** https://community.cloudflare.com
- **Cloudflare Docs:** https://developers.cloudflare.com/waf/rate-limiting-rules/
- **Status Page:** https://www.cloudflarestatus.com
- **Support Ticket:** Dashboard → Help Center

---

## 🎓 Advanced: Rate Limiting by User Tier

For SaaS applications with different user tiers:

**Expression Example:**
```
(http.request.uri.path contains "/api") and
(http.request.headers["X-User-Tier"][0] eq "free")
```

**Then set lower limits for free tier users.**

Pass user tier from your backend in response headers:
```javascript
res.set('X-User-Tier', user.tier); // 'free', 'premium', 'enterprise'
```

---

**Quick Setup Checklist:**
- [ ] Create Rule 1: Login Protection (5 req/15min)
- [ ] Create Rule 2: General API Protection (100 req/5min)
- [ ] Create Rule 3: Expensive Operations (10 req/hour)
- [ ] Enable Bot Fight Mode
- [ ] Set Security Level to High
- [ ] Add trusted IP whitelist
- [ ] Test all rules
- [ ] Set up email alerts
- [ ] Document in team wiki

**Time to Complete:** ~15 minutes
**Cost:** $0 (Cloudflare Free Tier)
**Protection Level:** Enterprise-grade

---

Last Updated: November 24, 2025
