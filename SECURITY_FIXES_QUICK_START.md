# 🚀 SECURITY FIXES - QUICK START GUIDE

## CRITICAL: Complete These Steps in Order

This guide walks you through implementing all critical security fixes identified in the comprehensive audit.

---

## 📋 Pre-Flight Checklist

Before starting, ensure you have:

- [ ] Git repository backed up
- [ ] Railway CLI installed (`npm install -g @railway/cli`)
- [ ] Railway account access (admin level)
- [ ] Database backup (Railway auto-backups enabled)
- [ ] Team notified of upcoming deployment
- [ ] 30-60 minutes to complete implementation

---

## 🔥 IMMEDIATE FIXES (< 24 hours)

### Step 1: Apply Security Fixes Locally

```bash
# Run the automated fix script
./scripts/apply-security-fixes.sh
```

This script will:
1. ✅ Generate cryptographically secure JWT secrets (64+ chars)
2. ✅ Backup your current middleware
3. ✅ Deploy secure authentication middleware
4. ✅ Update local .env file
5. ✅ Provide Railway configuration commands

**IMPORTANT:** Save the generated secrets file securely - you'll need it for Railway.

---

### Step 2: Update Railway Environment Variables

```bash
# Login to Railway
railway login

# Link to your project
railway link

# ⚠️  CRITICAL: Set these variables (use secrets from generated file)
railway variables set ACCESS_TOKEN_SECRET="[your-generated-secret-1]"
railway variables set REFRESH_TOKEN_SECRET="[your-generated-secret-2]"

# Ensure production mode
railway variables set NODE_ENV="production"
railway variables set PRODUCTION_MODE="true"
railway variables set RAILWAY="1"

# Verify (secrets will be masked)
railway variables
```

---

### Step 3: Test Locally

```bash
# Start backend
cd my-backend
npm run dev

# Look for these success messages:
# ✅ "JWT secrets validated successfully"
# ✅ "Production mode: Dev users DISABLED" (if NODE_ENV=production)
# ✅ "Authentication Environment: { isProduction: false }" (local dev)

# Test authentication
curl http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"yourpassword"}'
```

---

### Step 4: Deploy to Railway

```bash
# Add and commit changes
git add my-backend/middleware/auth.secure.js
git add my-backend/middleware/tenantIsolation.js
git add my-backend/lib/secureJWT.js
git add scripts/

git commit -m "security: implement critical security fixes

- No default JWT secrets (fail-fast validation)
- Production safeguards for dev users
- Constant-time password comparison
- Admin role DB verification
- Tenant isolation middleware
- Comprehensive audit logging

Fixes: #SECURITY-001, #SECURITY-002, #SECURITY-003"

# Push to deployment branch
git push origin deployment
```

**Railway will auto-deploy after push**

---

### Step 5: Verify Production Deployment

```bash
# Check Railway logs
railway logs

# Look for these messages:
# ✅ "JWT secrets validated successfully"
# ✅ "Production mode: Dev users DISABLED"
# ✅ "isProduction: true"

# Test production API
curl https://bisman-erp-backend-production.up.railway.app/api/health

# Test authentication (should work with database users only)
curl https://bisman-erp-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"real-user@company.com","password":"realpassword"}'
```

---

### Step 6: Clean Up

```bash
# DELETE the secrets file (contains plaintext secrets!)
rm .railway-secrets-*.env

# Verify deletion
ls -la .railway-secrets-*.env  # Should show "No such file"
```

---

## 🎯 30-DAY SECURITY SPRINT

### Week 1: Authentication & Authorization

#### Day 1-2: RBAC Enforcement
```bash
# Review all API endpoints
grep -r "app\.\(get\|post\|put\|delete\)" my-backend/app.js | grep -v "requireRole"

# Add requireRole to unprotected endpoints
# Example:
# Before:
#   app.get('/api/users', authenticate, handler)
# After:
#   app.get('/api/users', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), handler)
```

**Files to update:**
- `my-backend/app.js` (all route definitions)
- `my-backend/routes/*.js` (all route files)

#### Day 3-4: Enable Content Security Policy

**Update `my-backend/app.js`:**

```javascript
// Replace this:
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// With this:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://bisman-erp-backend-production.up.railway.app"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}))
```

#### Day 5: Fix SQL Injection Vulnerabilities

**Search for raw queries:**
```bash
grep -r "pool.query" my-backend/ --include="*.js"
```

**Convert to parameterized queries:**
```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE email = '${email}'`
const result = await pool.query(query)

// ✅ SECURE
const query = 'SELECT * FROM users WHERE email = $1'
const result = await pool.query(query, [email])
```

---

### Week 2: API Security

#### Day 8: Implement Tenant Isolation

**Add to `my-backend/app.js`:**
```javascript
const { enforceTenantIsolation } = require('./middleware/tenantIsolation')

// After authentication middleware
app.use(authenticate)
app.use(enforceTenantIsolation)  // ✅ Add this
```

**Update all resource routes:**
```javascript
// ❌ VULNERABLE
router.get('/clients/:id', authenticate, async (req, res) => {
  const client = await prisma.client.findUnique({ where: { id: req.params.id } })
  res.json(client)
})

// ✅ SECURE
router.get('/clients/:id', authenticate, async (req, res) => {
  const client = await prisma.client.findFirst({
    where: { 
      id: req.params.id,
      tenant_id: req.user.tenant_id  // ✅ Tenant filter
    }
  })
  
  if (!client) {
    return res.status(404).json({ error: 'Client not found' })
  }
  
  res.json(client)
})
```

#### Day 9-10: Mass Assignment Protection

**Create validation middleware:**
```javascript
// my-backend/middleware/validateRequest.js
function validateUserCreate(req, res, next) {
  const ALLOWED_FIELDS = ['email', 'username', 'password', 'profile_pic_url']
  
  const userData = {}
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) {
      userData[field] = req.body[field]
    }
  }
  
  req.validatedData = userData
  next()
}

module.exports = { validateUserCreate }
```

**Use in routes:**
```javascript
const { validateUserCreate } = require('./middleware/validateRequest')

router.post('/users', 
  authenticate, 
  requireRole(['ADMIN']),
  validateUserCreate,  // ✅ Add validation
  async (req, res) => {
    const user = await prisma.user.create({ data: req.validatedData })
    res.json(user)
  }
)
```

---

### Week 3: Logging & Monitoring

#### Day 15: Enhance Audit Logging

**Create audit logger:**
```javascript
// my-backend/lib/auditLogger.js
async function logAuditEvent({ userId, action, resource, resourceId, oldValue, newValue, ipAddress, outcome }) {
  await prisma.auditLog.create({
    data: {
      user_id: userId,
      action,
      table_name: resource,
      record_id: resourceId,
      old_values: oldValue ? JSON.stringify(oldValue) : null,
      new_values: newValue ? JSON.stringify(newValue) : null,
      ip_address: ipAddress,
      outcome,
      created_at: new Date()
    }
  })
}

module.exports = { logAuditEvent }
```

**Use throughout application:**
```javascript
const { logAuditEvent } = require('./lib/auditLogger')

router.patch('/users/:id/role', authenticate, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  const oldRole = user.role
  
  await prisma.user.update({
    where: { id: req.params.id },
    data: { role: req.body.role }
  })
  
  // ✅ Log the change
  await logAuditEvent({
    userId: req.user.id,
    action: 'UPDATE_ROLE',
    resource: 'users',
    resourceId: req.params.id,
    oldValue: { role: oldRole },
    newValue: { role: req.body.role },
    ipAddress: req.ip,
    outcome: 'SUCCESS'
  })
  
  res.json({ success: true })
})
```

#### Day 16-17: Secret Sanitization

**Enhance log sanitizer:**
```javascript
// my-backend/middleware/logSanitizer.js
const sensitiveFields = [
  'password', 'passwd', 'pwd',
  'token', 'access_token', 'refresh_token',
  'secret', 'api_key', 'apikey',
  'credit_card', 'creditcard', 'cc_number',
  'ssn', 'social_security',
  'cvv', 'cvc',
  'private_key', 'privatekey'
]

const sensitivePatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,  // Credit card
  /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi,  // JWT
]

function sanitize(obj) {
  // Implementation...
}
```

---

### Week 4: CI/CD Security Pipeline

#### Day 22: Setup GitHub Actions

The security pipeline is already created at `.github/workflows/security-pipeline.yml`

**Setup required secrets in GitHub:**

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `SNYK_TOKEN`: Get from https://snyk.io (free tier available)
   - `STAGING_URL`: Your staging environment URL

#### Day 23-24: Install Security Tools Locally

```bash
# Install security scanning tools
npm install -g snyk
npm install -g semgrep

# Authenticate
snyk auth
```

#### Day 25: Run Full Security Test

```bash
# Run comprehensive security scan
./scripts/security-test.sh --report

# Review reports in security-reports/ directory
```

---

## 📅 90-DAY ROADMAP

### Month 2: Data Protection

#### Week 5-6: Field-Level Encryption

```bash
# Generate encryption key
openssl rand -hex 32

# Set in Railway
railway variables set FIELD_ENCRYPTION_KEY="[generated-key]"
```

**Implement encryption for PII:**
```javascript
// my-backend/lib/encryption.js (already created in lib/secureJWT.js)
const crypto = require('crypto')

const ENCRYPTION_KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex')
const IV_LENGTH = 16

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text) {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift(), 'hex')
  const encryptedText = Buffer.from(parts.join(':'), 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

module.exports = { encrypt, decrypt }
```

#### Week 7-8: Dependency Updates

```bash
# Update all dependencies
cd my-backend && npm update
cd ../my-frontend && npm update

# Run audit and fix
cd my-backend && npm audit fix --force
cd ../my-frontend && npm audit fix --force

# Test everything still works
npm test
```

---

### Month 3: Compliance Preparation

#### Week 9-10: Policy Implementation

1. Review ISO 27001 policy templates (`ISO27001_POLICY_TEMPLATES.md`)
2. Customize for your organization
3. Obtain executive approval
4. Distribute to all employees
5. Collect acknowledgment signatures

#### Week 11: External Security Audit

1. Hire security firm or use bug bounty platform
2. Provide test environment access
3. Review findings
4. Remediate critical/high issues

#### Week 12: Penetration Testing

```bash
# Run OWASP ZAP against staging
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://staging.bisman.com \
  -r zap-report.html
```

---

## 🎯 Success Criteria

After completing all fixes, you should achieve:

- [ ] **Zero CRITICAL vulnerabilities**
- [ ] **JWT secrets** 64+ characters, cryptographically random
- [ ] **No dev users** accessible in production
- [ ] **All admin endpoints** protected with requireRole
- [ ] **Tenant isolation** enforced on all multi-tenant resources
- [ ] **CSP enabled** with proper directives
- [ ] **SQL injection** vulnerabilities fixed
- [ ] **Audit logging** on all sensitive operations
- [ ] **CI/CD security pipeline** running on every commit
- [ ] **MFA enabled** for all admin accounts
- [ ] **Field-level encryption** for PII
- [ ] **Security policies** approved and distributed

---

## 📊 Progress Tracking

Use this checklist to track your implementation:

### IMMEDIATE (Week 1)
- [ ] JWT secrets generated and deployed
- [ ] Dev users disabled in production
- [ ] Local testing passed
- [ ] Production deployment verified
- [ ] Secrets file deleted

### 30-DAY SPRINT (Weeks 2-4)
- [ ] RBAC enforcement added to all endpoints
- [ ] CSP enabled
- [ ] SQL injection fixes applied
- [ ] Tenant isolation middleware deployed
- [ ] Mass assignment protection implemented
- [ ] Audit logging enhanced
- [ ] Log sanitization improved
- [ ] CI/CD pipeline setup
- [ ] Security tools installed
- [ ] Full security scan run

### 90-DAY ROADMAP (Months 2-3)
- [ ] Field-level encryption implemented
- [ ] All dependencies updated
- [ ] ISO 27001 policies approved
- [ ] External audit completed
- [ ] Penetration test passed
- [ ] MFA rolled out to all admins

---

## 🆘 Troubleshooting

### Issue: Application won't start after JWT update

**Solution:**
```bash
# Check Railway logs
railway logs

# Verify secrets are set
railway variables | grep TOKEN_SECRET

# If missing, set them:
railway variables set ACCESS_TOKEN_SECRET="[secret]"
railway variables set REFRESH_TOKEN_SECRET="[secret]"
```

### Issue: Dev users still accessible in production

**Solution:**
```bash
# Verify production mode
railway variables | grep NODE_ENV
railway variables | grep PRODUCTION_MODE

# Should show:
# NODE_ENV=production
# PRODUCTION_MODE=true
```

### Issue: Tenant isolation breaking queries

**Solution:**
Check if admin users are being filtered:
```javascript
// Admin users should bypass tenant filter
if (req.user.userType === 'ENTERPRISE_ADMIN' || req.user.userType === 'SUPER_ADMIN') {
  // Skip tenant filter
}
```

---

## 📞 Support

- **Security Issues**: security@bisman.com
- **Technical Support**: support@bisman.com
- **Emergency**: [Emergency Hotline]

---

## 📚 Additional Resources

- [Full Security Audit Report](./SECURITY_AUDIT_ISO_OWASP_SOC2_2025.md)
- [ISO 27001 Policy Templates](./ISO27001_POLICY_TEMPLATES.md)
- [Security Testing Scripts](./scripts/security-test.sh)
- [CI/CD Pipeline Configuration](./.github/workflows/security-pipeline.yml)

---

**Last Updated:** November 24, 2025  
**Version:** 1.0  
**Next Review:** December 24, 2025
