# 🔐 BISMAN ERP - Login Credentials Reference

## Current Passwords (Local & Railway - SYNCED ✅)

Last Updated: November 14, 2025

---

## Super Admins (Password: `Super@123`)

### Business Super Admin
```
Email: business_superadmin@bisman.demo
Password: Super@123
Dashboard: /super-admin
```

### Pump Super Admin
```
Email: pump_superadmin@bisman.demo
Password: Super@123
Dashboard: /super-admin
```

### Logistics Super Admin
```
Email: logistics_superadmin@bisman.demo
Password: Super@123
Dashboard: /super-admin
```

---

## Enterprise Admin (Password: `enterprise123`)

```
Email: enterprise@bisman.erp
Password: enterprise123
Dashboard: /enterprise-admin/dashboard
```

---

## Regular Users

### Hub Incharge (Password: `demo123`)
```
Email: demo_hub_incharge@bisman.demo
Password: demo123
Dashboard: /hub-incharge
```

⚠️ **Note**: Previously used `Demo@123` in local DB, now changed to `demo123` to match Railway

### Finance Manager (Password: `Super@123`)
```
Email: finance@bisman.demo
Password: Super@123
Dashboard: /finance-controller or /cfo-dashboard
```

### HR Manager (Password: `Super@123`)
```
Email: hr@bisman.demo
Password: Super@123
Dashboard: /hr
```

### Admin (Password: `Super@123`)
```
Email: admin@bisman.demo
Password: Super@123
Dashboard: /admin
```

---

## Password History & Changes

### November 14, 2025
- **Hub Incharge**: Changed from `Demo@123` → `demo123`
  - Reason: Sync local DB with Railway production
  - Hash: `$2a$10$sSOb5fx4sIgiJNq6.OfIU.q0aFJlRgIbOfTu4k6lpV0yhJxFMHbWm`

- **Super Admins**: Updated to `Super@123`
  - Hash: `$2a$10$Sfh0TIazw3DqTfrpdJnW1ursCbdJkPUOR2IGFnfQTGJrS8VbJhcC2`

- **Enterprise Admin**: Set to `enterprise123`
  - Hash: `$2a$10$HHq1d7O3Lu0Mz2T.5VzWr.mefTshuVW1xpa8VJn6Vp1zb/14cs4T.`

---

## Database Sync Scripts

### Apply to Local Database
```bash
psql postgresql://postgres@localhost:5432/BISMAN < sync-local-db-passwords.sql
```

### Apply to Railway Database
```bash
cat fix-hub-incharge-password.sql | railway connect bisman-erp-db
```

---

## Testing Login

### Local Backend (http://localhost:8080)
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"demo123"}' \
  -v
```

### Railway Backend
```bash
curl -X POST https://bisman-erp-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"demo123"}' \
  -v
```

---

## Troubleshooting

### Issue: "Invalid credentials" error

**Check 1**: Verify you're using the correct password
```javascript
const bcrypt = require('bcryptjs');
const hash = '$2a$10$sSOb5fx4sIgiJNq6.OfIU.q0aFJlRgIbOfTu4k6lpV0yhJxFMHbWm';
console.log(bcrypt.compareSync('demo123', hash)); // Should be true
```

**Check 2**: Verify database has correct hash
```sql
SELECT email, LEFT(password, 40) as pwd_preview 
FROM users 
WHERE email = 'demo_hub_incharge@bisman.demo';
```

**Check 3**: Check backend logs
```bash
# Local
tail -f my-backend/logs/app.log

# Railway
railway logs --service bisman-erp-backend
```

### Issue: Different passwords in local vs Railway

**Solution**: Run sync script
```bash
psql postgresql://postgres@localhost:5432/BISMAN < sync-local-db-passwords.sql
```

---

## Password Policy

- **Super Admins**: `Super@123` (uppercase S, @ symbol, number)
- **Enterprise Admin**: `enterprise123` (lowercase, number only)
- **Hub Incharge**: `demo123` (lowercase, number only)
- **Other Users**: `Super@123` (matching super admins)

### Security Notes
- All passwords use bcrypt with 10 rounds
- Hashes are 60 characters long
- Format: `$2a$10$...` (bcrypt identifier)

---

## Quick Reference Table

| Email | Password | Role | Dashboard |
|-------|----------|------|-----------|
| business_superadmin@bisman.demo | Super@123 | SUPER_ADMIN | /super-admin |
| pump_superadmin@bisman.demo | Super@123 | SUPER_ADMIN | /super-admin |
| logistics_superadmin@bisman.demo | Super@123 | SUPER_ADMIN | /super-admin |
| enterprise@bisman.erp | enterprise123 | ENTERPRISE_ADMIN | /enterprise-admin/dashboard |
| demo_hub_incharge@bisman.demo | demo123 | HUB_INCHARGE | /hub-incharge |
| finance@bisman.demo | Super@123 | FINANCE_MANAGER | /finance-controller |
| hr@bisman.demo | Super@123 | HR_MANAGER | /hr |
| admin@bisman.demo | Super@123 | ADMIN | /admin |

---

## Files Reference

- `sync-local-db-passwords.sql` - Sync local DB with Railway
- `fix-hub-incharge-password.sql` - Fix Hub Incharge in Railway
- `fix-railway-passwords.sql` - Initial Railway password fixes
- `seed-demo-users-railway.sql` - Seed demo users to Railway

---

**Status**: ✅ All passwords synced between local and Railway  
**Last Verified**: November 14, 2025, 2:51 PM UTC
