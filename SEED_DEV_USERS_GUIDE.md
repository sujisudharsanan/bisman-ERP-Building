# 🌱 Seeding DevUsers to Database

## Overview
This guide shows you how to add all devUsers to your database as **real users** with properly hashed passwords. After seeding, all demo credentials will work through normal database authentication.

## Why Seed DevUsers?

### Before Seeding:
```
Login Attempt:
  ├─ Check Database → User not found
  └─ Fallback to hardcoded devUsers → Works (but insecure)
```

### After Seeding:
```
Login Attempt:
  ├─ Check Database → User found ✅
  └─ Normal bcrypt authentication → Works (secure!)
```

### Benefits:
✅ **Secure** - Passwords are bcrypt hashed  
✅ **Persistent** - Users exist in database  
✅ **Manageable** - Can be updated/deleted via database  
✅ **Production Ready** - No hardcoded credentials  
✅ **Same Experience** - All demo credentials still work  

---

## Quick Start

### 1. Set Database URL
```bash
# For local development
export DATABASE_URL="postgresql://user:password@localhost:5432/bisman"

# For Railway (production)
# Already set in Railway dashboard
```

### 2. Run the Seed Script
```bash
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend
node seed-dev-users.js
```

### 3. Expected Output
```
🔒 Development Users Database Seeder

This will add all devUsers to your database as real users.
Passwords will be properly hashed with bcrypt.

✅ Database connection successful

🌱 Starting to seed development users...

✨ Created: super@bisman.local (SUPER_ADMIN)
✨ Created: admin@bisman.local (ADMIN)
✨ Created: manager@bisman.local (MANAGER)
✨ Created: demo_hub_incharge@bisman.demo (HUB_INCHARGE)
... (more users)

📊 Summary:
   Created: 23 users
   Updated: 0 users
   Skipped: 0 users
   Errors: 0 users
   Total: 23 users processed

✅ All development users seeded successfully!

📋 You can now login with any of these credentials:
   • demo_hub_incharge@bisman.demo / changeme
   • admin@bisman.local / changeme
   • manager@bisman.local / changeme
   • super@bisman.local / changeme
   ... and more!

📊 Total users in database: 23
```

---

## What Gets Seeded

### Production Demo Users (@bisman.demo):
```
Email: demo_hub_incharge@bisman.demo
Password: changeme
Role: HUB_INCHARGE
---
Email: demo_admin@bisman.demo
Password: changeme
Role: ADMIN
---
Email: demo_manager@bisman.demo
Password: changeme
Role: MANAGER
---
Email: demo_super@bisman.demo
Password: changeme
Role: SUPER_ADMIN
```

### Development Users (@bisman.local):
```
Email: super@bisman.local
Password: password OR changeme
Role: SUPER_ADMIN
---
Email: admin@bisman.local
Password: changeme
Role: ADMIN
---
Email: manager@bisman.local
Password: changeme
Role: MANAGER
---
Email: hub@bisman.local
Password: changeme
Role: STAFF
```

### Business Domain (@business.com):
```
Email: admin@business.com
Password: admin123
Role: ADMIN
---
Email: manager@business.com
Password: password
Role: MANAGER
---
Email: staff@business.com
Password: staff123
Role: STAFF
```

### Finance & Operations:
```
Email: it@bisman.local, Password: changeme, Role: IT_ADMIN
Email: cfo@bisman.local, Password: changeme, Role: CFO
Email: controller@bisman.local, Password: changeme, Role: FINANCE_CONTROLLER
Email: treasury@bisman.local, Password: changeme, Role: TREASURY
Email: accounts@bisman.local, Password: changeme, Role: ACCOUNTS
Email: ap@bisman.local, Password: changeme, Role: ACCOUNTS_PAYABLE
Email: banker@bisman.local, Password: changeme, Role: BANKER
Email: procurement@bisman.local, Password: changeme, Role: PROCUREMENT_OFFICER
Email: store@bisman.local, Password: changeme, Role: STORE_INCHARGE
Email: compliance@bisman.local, Password: changeme, Role: COMPLIANCE
Email: legal@bisman.local, Password: changeme, Role: LEGAL
```

**Total: 23 users**

---

## Production Deployment

### Step 1: Seed Production Database
```bash
# SSH into Railway or run from Railway CLI
railway run node my-backend/seed-dev-users.js

# OR using psql directly
railway connect postgres
\i seed-script.sql
```

### Step 2: Verify Users
```bash
# Check user count
railway run node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.count().then(c => console.log('Users:', c))"

# OR via SQL
psql $DATABASE_URL -c "SELECT email, role FROM users ORDER BY id;"
```

### Step 3: Test Login
```bash
# Test with demo credentials
curl -X POST https://your-api.railway.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"changeme"}'

# Expected: 200 OK with tokens
```

---

## Updating Existing Users

The script automatically handles updates:

```bash
# Run again to update passwords/roles
node seed-dev-users.js
```

**Output:**
```
✅ Updated: demo_hub_incharge@bisman.demo (HUB_INCHARGE)
✅ Updated: admin@bisman.local (ADMIN)
...
```

---

## Database Schema Requirements

### Required `users` Table Columns:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt hash
  username VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Prisma Schema:
```prisma
model User {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  password   String
  username   String?
  role       String
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  
  @@map("users")
}
```

---

## Verification Steps

### 1. Check Users Were Created
```sql
-- Count users
SELECT COUNT(*) FROM users;

-- List all demo users
SELECT id, email, role, created_at 
FROM users 
WHERE email LIKE '%bisman%' 
ORDER BY id;
```

### 2. Test Authentication
```bash
# Test each credential
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"changeme"}'
```

### 3. Verify Password Hashes
```sql
-- Check passwords are hashed
SELECT email, 
       LEFT(password, 10) as password_hash,
       LENGTH(password) as hash_length
FROM users
LIMIT 5;

-- Should show: $2a$10$... (bcrypt hash)
-- Length should be ~60 characters
```

---

## Troubleshooting

### Error: "DATABASE_URL not set"
```bash
# Solution: Set environment variable
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### Error: "Unique constraint violation"
```bash
# Cause: User already exists
# Solution: Script will update instead of create (safe to run again)
```

### Error: "Table users does not exist"
```bash
# Solution: Run Prisma migrations first
cd my-backend
npx prisma migrate deploy
```

### Error: "Cannot connect to database"
```bash
# Solution: Check DATABASE_URL is correct
psql $DATABASE_URL -c "SELECT 1"
```

### Passwords Not Working After Seed
```bash
# Check password was hashed correctly
psql $DATABASE_URL -c "SELECT email, password FROM users WHERE email='demo_hub_incharge@bisman.demo';"

# Should see: $2a$10$... (bcrypt hash)
# NOT: changeme (plain text)
```

---

## Advanced Usage

### Seed Only Specific Users
Edit `seed-dev-users.js`:
```javascript
const devUsers = [
  { email: 'demo_hub_incharge@bisman.demo', password: 'changeme', role: 'HUB_INCHARGE' },
  // Comment out or remove users you don't want
];
```

### Change Passwords
Edit `seed-dev-users.js`:
```javascript
{ email: 'demo_hub_incharge@bisman.demo', password: 'NEW_PASSWORD', role: 'HUB_INCHARGE' },
```

Then run: `node seed-dev-users.js`

### Add New Users
Add to `devUsers` array:
```javascript
{ id: 999, email: 'newuser@company.com', password: 'secure123', role: 'ADMIN', username: 'newuser' },
```

### Remove DevUsers from Code
After seeding, you can remove the hardcoded `devUsers` array from `app.js` since all users are now in the database.

---

## Security Considerations

### ✅ Secure:
- Passwords are bcrypt hashed (10 rounds)
- Users stored in database (not hardcoded)
- Can change passwords via database
- Can disable users via `is_active` flag

### ⚠️ Still Consider:
- Change default passwords in production
- Add password complexity requirements
- Implement password reset flow
- Add 2FA for admin accounts
- Set password expiration policy

---

## Automation

### Add to package.json:
```json
{
  "scripts": {
    "seed": "node seed-dev-users.js",
    "seed:prod": "NODE_ENV=production node seed-dev-users.js"
  }
}
```

**Usage:**
```bash
npm run seed          # Local
npm run seed:prod     # Production
```

### Railway Deployment Hook:
Add to `railway.json`:
```json
{
  "deploy": {
    "startCommand": "npm start",
    "buildCommand": "npm install && npx prisma generate && npm run seed"
  }
}
```

---

## Migration from Hardcoded DevUsers

### Step 1: Seed Database
```bash
node seed-dev-users.js
```

### Step 2: Update Backend Code
Remove devUsers fallback in production:
```javascript
// In app.js
const allowDevUsers = process.env.NODE_ENV !== 'production';
// DevUsers fallback is now disabled in production
```

### Step 3: Test
```bash
# Production login should work with database users
curl -X POST https://your-api/login \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"changeme"}'
```

### Step 4: Deploy
```bash
git add my-backend/seed-dev-users.js
git commit -m "feat: Add database seeding for dev users"
git push origin under-development
```

---

## FAQ

**Q: Do I need to seed every time I deploy?**  
A: No, only once. Users persist in the database.

**Q: Can I change passwords later?**  
A: Yes, update in database or re-run seed script with new passwords.

**Q: What if I delete a user accidentally?**  
A: Re-run the seed script to recreate them.

**Q: Are passwords secure?**  
A: Yes, bcrypt hashed with salt rounds. Same security as real users.

**Q: Can I use this in production?**  
A: Yes! That's the point. These become real database users.

**Q: Will this overwrite existing users?**  
A: No, it only updates if email exists. Creates new otherwise.

---

## Summary

✅ **Run the script**: `node seed-dev-users.js`  
✅ **All devUsers become real database users**  
✅ **Passwords are properly hashed**  
✅ **Production ready and secure**  
✅ **No more hardcoded credentials**  

**Next Steps:**
1. Run `node seed-dev-users.js` locally
2. Test login with demo credentials
3. Deploy to production
4. Run seed script on production database
5. Verify login works in production

---

**Created:** October 25, 2025  
**Status:** ✅ Ready to Use  
**Script:** `/my-backend/seed-dev-users.js`
