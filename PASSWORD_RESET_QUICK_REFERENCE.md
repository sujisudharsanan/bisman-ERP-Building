# 🔐 Password Reset - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Run Database Migration
```bash
cd database/migrations
psql -U your_user -d bisman_erp -f create_password_reset_tokens.sql
```

### 2. Install Dependencies
```bash
cd my-backend
npm install express-rate-limit express-validator nodemailer bcrypt
```

### 3. Configure Environment
Create/update `.env`:
```bash
# SMTP (use Gmail for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SUPPORT_EMAIL=support@bisman.com

# Frontend
FRONTEND_BASE_URL=http://localhost:3000
```

### 4. Register Routes
In `my-backend/server.js`:
```javascript
const passwordResetRoutes = require('./routes/password-reset');
app.use('/api/auth', passwordResetRoutes);
```

### 5. Test
```bash
# Terminal 1 - Backend
cd my-backend && npm run dev

# Terminal 2 - Frontend  
cd my-frontend && npm run dev

# Browser
http://localhost:3000/auth/forgot-password
```

---

## 📡 API Quick Reference

### Request Reset
```bash
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}

# Response (always 200)
{
  "success": true,
  "message": "If an account exists, a reset link has been sent."
}
```

### Validate Token
```bash
POST /api/auth/password-reset/validate-token
Content-Type: application/json

{
  "uid": "user-uuid",
  "token": "64-char-hex-token"
}

# Response
{ "valid": true }
# or
{ "valid": false, "error": "Token expired" }
```

### Confirm Reset
```bash
POST /api/auth/password-reset/confirm
Content-Type: application/json

{
  "uid": "user-uuid",
  "token": "64-char-hex-token",
  "newPassword": "SecurePass123!"
}

# Response (success)
{
  "success": true,
  "message": "Password has been reset successfully."
}

# Response (error)
{
  "success": false,
  "error": "Invalid or expired reset token"
}
```

---

## 🗄️ Database Quick Queries

### Check Active Requests
```sql
SELECT * FROM active_password_reset_requests;
```

### Recent Reset Activity
```sql
SELECT * FROM password_reset_audit_log 
WHERE requested_at > NOW() - INTERVAL '24 hours'
ORDER BY requested_at DESC;
```

### Find Token for User
```sql
SELECT 
  u.email,
  prt.created_at,
  prt.expires_at,
  prt.used,
  EXTRACT(EPOCH FROM (prt.expires_at - NOW())) / 60 AS minutes_remaining
FROM password_reset_tokens prt
JOIN users u ON prt.user_id = u.id
WHERE u.email = 'user@example.com'
ORDER BY prt.created_at DESC
LIMIT 1;
```

### Cleanup Expired Tokens
```sql
SELECT cleanup_expired_password_reset_tokens();
```

### Check for Abuse
```sql
SELECT user_id, COUNT(*) as request_count
FROM password_reset_tokens
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY request_count DESC;
```

---

## 🧪 Testing Checklist

```bash
# 1. Request reset for valid user
✓ Enter email → "Check your email" message
✓ Email received with reset link
✓ Link format: /reset-password?uid=X&token=Y

# 2. Open reset link
✓ Token validated automatically
✓ Shows password form if valid
✓ Shows error if invalid/expired/used

# 3. Set new password
✓ Password strength meter works
✓ Weak password rejected
✓ Passwords must match
✓ Success → redirects to login

# 4. Login
✓ Can login with new password
✓ Old password doesn't work

# 5. Security
✓ Token single-use (can't reuse link)
✓ Token expires after 1 hour
✓ Rate limiting works (try 6 requests)
✓ No user enumeration (fake email = success)
```

---

## 🔧 Common Issues & Fixes

### Email Not Sending
```bash
# Test SMTP connection
node -e "require('./services/emailService').transporter.verify().then(console.log)"

# Check logs
tail -f logs/app.log | grep "password reset"

# Gmail: Use App Password
https://myaccount.google.com/apppasswords
```

### Token Invalid
```sql
-- Check token exists and is valid
SELECT 
  expires_at > NOW() as not_expired,
  used = FALSE as not_used,
  * 
FROM password_reset_tokens 
WHERE user_id = '<uid>' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Rate Limit Reached
```javascript
// Temporarily increase limit in password-reset.js
const resetRequestLimiter = rateLimit({
  max: 10, // Increase from 5
  // ...
});
```

---

## 📋 Environment Variables

```bash
# Token Settings
PASSWORD_RESET_TOKEN_TTL_HOURS=1
PASSWORD_RESET_TOKEN_BYTES=32

# Password Policy
PASSWORD_MIN_LENGTH=8
PASSWORD_BCRYPT_ROUNDS=12

# Rate Limiting
PASSWORD_RESET_RATE_LIMIT_PER_IP=5
PASSWORD_RESET_RATE_LIMIT_WINDOW_MINUTES=60

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@bisman.com
SUPPORT_EMAIL=support@bisman.com

# Frontend
FRONTEND_BASE_URL=http://localhost:3000
```

---

## 🎨 Frontend Routes

```
/auth/forgot-password    → Request reset link
/auth/reset-password     → Set new password (with uid & token)
/auth/login              → Login page (redirect after success)
```

---

## 📧 Email Templates Preview

**Subject**: Reset Your BISMAN ERP Password

**Body**:
```
Hi [Username],

We received a request to reset your BISMAN ERP password.

[Reset My Password Button]

⏰ This link expires in 60 minutes.

🛡️ Didn't request this? Ignore this email.
```

---

## 🔒 Security Features

✅ SHA-256 hashed tokens  
✅ Single-use tokens  
✅ 1-hour expiry  
✅ Rate limiting (5/hour)  
✅ No user enumeration  
✅ Session invalidation  
✅ Audit logging  
✅ Password strength validation  
✅ bcrypt password hashing  

---

## 📊 Monitoring Commands

```bash
# Count active requests
echo "SELECT COUNT(*) FROM active_password_reset_requests;" | psql -d bisman_erp

# Today's successful resets
echo "SELECT COUNT(*) FROM password_reset_audit_log WHERE completed_at::date = CURRENT_DATE;" | psql -d bisman_erp

# Suspicious activity (>5 requests/hour)
echo "SELECT email, COUNT(*) FROM password_reset_audit_log WHERE requested_at > NOW() - INTERVAL '1 hour' GROUP BY email HAVING COUNT(*) > 5;" | psql -d bisman_erp
```

---

## 🎯 Production Checklist

Before deploying:

- [ ] Database migration run in production
- [ ] SMTP credentials configured (SendGrid/SES recommended)
- [ ] FRONTEND_BASE_URL set to production domain
- [ ] Rate limits appropriate for production
- [ ] DKIM/SPF/DMARC configured for email domain
- [ ] Monitoring/alerts set up
- [ ] Cron job for cleanup (optional)
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Backup/rollback plan ready

---

## 🆘 Support

**Documentation**: `PASSWORD_RESET_COMPLETE_GUIDE.md`  
**Security**: Follow OWASP best practices  
**Email Issues**: Check SMTP logs and provider status  
**Database**: Review audit logs for debugging  

---

**Quick Reference v1.0** | Updated: November 13, 2025
