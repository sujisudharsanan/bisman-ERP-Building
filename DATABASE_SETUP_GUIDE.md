# 🔐 Database Credentials Setup Guide

This guide will help you ensure all demo credentials are properly set up in your database.

---

## Quick Start

### Option 1: Automated Setup (Recommended)
```bash
# Run the automated setup script
./setup-demo-credentials.sh
```

### Option 2: Manual Setup
```bash
cd my-backend

# Step 1: Run database migrations (if not already done)
psql $DATABASE_URL < migrations/multi-business-setup.sql

# Step 2: Seed demo data
node seed-demo-data.js

# Step 3: Verify credentials
node verify-demo-credentials.js
```

---

## Prerequisites

Before running the setup, ensure:

1. **PostgreSQL is running**
   ```bash
   # Check if PostgreSQL is running
   pg_isready
   ```

2. **Environment variables are set**
   ```bash
   # Check DATABASE_URL in .env file
   cat my-backend/.env | grep DATABASE_URL
   ```

3. **Node modules are installed**
   ```bash
   cd my-backend
   npm install
   ```

4. **Prisma client is generated**
   ```bash
   cd my-backend
   npx prisma generate
   ```

---

## Step-by-Step Instructions

### Step 1: Check Database Connection

```bash
cd my-backend

# Test database connection
npx prisma db execute --stdin <<< "SELECT 1;"
```

If this fails, check:
- Is PostgreSQL running?
- Is DATABASE_URL correct in `.env`?
- Can you connect manually: `psql $DATABASE_URL`

### Step 2: Run Database Migrations

This creates all necessary tables (business_types, modules, super_admins, etc.)

```bash
# If using Prisma migrations
npx prisma migrate deploy

# OR if using raw SQL
psql $DATABASE_URL < migrations/multi-business-setup.sql
```

Expected output:
```
CREATE TABLE business_types
CREATE TABLE modules
CREATE TABLE business_type_modules
CREATE TABLE super_admins
CREATE TABLE super_admin_modules
CREATE TABLE module_activity_log
...
```

### Step 3: Seed Demo Data

This creates all demo users with hashed passwords.

```bash
node seed-demo-data.js
```

Expected output:
```
🌱 Starting demo data seeding...

👤 Creating Enterprise Admin...
✅ Enterprise Admin created: enterprise@bisman.erp / enterprise123

🏪 Creating Petrol Pump Super Admin...
✅ Petrol Pump Super Admin created: rajesh@petrolpump.com / petrol123
👥 Created Manager: manager@petrolpump.com
👥 Created Staff: staff@petrolpump.com

🚚 Creating Logistics Super Admin...
✅ Logistics Super Admin created: amit@abclogistics.com / logistics123
👥 Created Manager: manager@abclogistics.com
👥 Created Staff: staff@abclogistics.com

✅ Demo data seeding complete!
```

### Step 4: Verify Credentials

```bash
node verify-demo-credentials.js
```

Expected output:
```
🔍 Verifying demo credentials in database...

✅ Enterprise Admin
   Email: enterprise@bisman.erp
   Role: ENTERPRISE_ADMIN
   Active: Yes

✅ Petrol Pump Super Admin
   Email: rajesh@petrolpump.com
   Role: SUPER_ADMIN
   Active: Yes

✅ Logistics Super Admin
   Email: amit@abclogistics.com
   Role: SUPER_ADMIN
   Active: Yes

========================================
Found: 7 / 7
Missing: 0 / 7
========================================

✅ All demo credentials are present in the database!
```

---

## Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Solution:**
```bash
cd my-backend
npm install
npx prisma generate
```

### Error: "Table 'users' does not exist"

**Solution:**
```bash
# Run Prisma migrations first
cd my-backend
npx prisma migrate deploy

# OR apply the SQL migration
psql $DATABASE_URL < migrations/multi-business-setup.sql
```

### Error: "Connect ECONNREFUSED 127.0.0.1:5432"

**Solution:**
```bash
# Start PostgreSQL
# macOS with Homebrew:
brew services start postgresql

# Linux:
sudo systemctl start postgresql

# Check if running:
pg_isready
```

### Error: "Database does not exist"

**Solution:**
```bash
# Create the database first
createdb bisman_erp

# OR specify the database name in your DATABASE_URL
# DATABASE_URL="postgresql://user:password@localhost:5432/bisman_erp"
```

### Error: "Unique constraint violation on email"

**Solution:**
The users already exist! This is actually good. Run the verification:
```bash
node verify-demo-credentials.js
```

---

## Manual Database Check

If you want to manually verify the credentials in the database:

```sql
-- Connect to database
psql $DATABASE_URL

-- Check if users table exists
\dt users

-- View all demo users
SELECT id, email, role, name, is_active 
FROM users 
WHERE email IN (
  'enterprise@bisman.erp',
  'rajesh@petrolpump.com',
  'amit@abclogistics.com'
);

-- Check super_admins table
SELECT sa.id, sa.business_name, u.email, u.role
FROM super_admins sa
JOIN users u ON sa.user_id = u.id;

-- Check module assignments
SELECT sa.business_name, COUNT(sam.module_id) as module_count
FROM super_admins sa
LEFT JOIN super_admin_modules sam ON sa.id = sam.super_admin_id
GROUP BY sa.business_name;
```

Expected results:
```
                 email              |      role       |           name            | is_active 
------------------------------------+-----------------+---------------------------+-----------
 enterprise@bisman.erp              | ENTERPRISE_ADMIN| Enterprise Administrator  | t
 rajesh@petrolpump.com              | SUPER_ADMIN     | Rajesh Kumar              | t
 amit@abclogistics.com              | SUPER_ADMIN     | Amit Shah                 | t
```

---

## Resetting Demo Data

If you need to start fresh:

```bash
cd my-backend

# Option 1: Delete and recreate users
psql $DATABASE_URL <<EOF
DELETE FROM users WHERE email IN (
  'enterprise@bisman.erp',
  'rajesh@petrolpump.com',
  'amit@abclogistics.com',
  'manager@petrolpump.com',
  'staff@petrolpump.com',
  'manager@abclogistics.com',
  'staff@abclogistics.com'
);
EOF

# Then re-seed
node seed-demo-data.js

# Option 2: Reset entire database (CAUTION: Deletes all data!)
npx prisma migrate reset --force
node seed-demo-data.js
```

---

## Testing Login

After setup is complete:

1. **Start the frontend:**
   ```bash
   cd my-frontend
   npm run dev
   ```

2. **Navigate to login page:**
   ```
   http://localhost:3000/auth/login
   ```

3. **Click "Show" next to "Demo accounts"**

4. **You should see:**
   - Enterprise Admin
   - Petrol Pump Super Admin
   - Logistics Super Admin
   - Super Admin (System)
   - IT Admin
   - CFO
   - ... and more

5. **Click "Login" on Enterprise Admin**

6. **Should redirect to:**
   ```
   /enterprise-admin/dashboard
   ```

---

## Credentials Reference

### Enterprise Management
- **Enterprise Admin**: `enterprise@bisman.erp` / `enterprise123`

### Business Super Admins
- **Petrol Pump**: `rajesh@petrolpump.com` / `petrol123`
- **Logistics**: `amit@abclogistics.com` / `logistics123`

### Staff (Petrol Pump)
- **Manager**: `manager@petrolpump.com` / `manager123`
- **Staff**: `staff@petrolpump.com` / `staff123`

### Staff (Logistics)
- **Manager**: `manager@abclogistics.com` / `manager123`
- **Staff**: `staff@abclogistics.com` / `staff123`

See `DEMO_CREDENTIALS.md` for the complete list.

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-demo-credentials.sh` | Automated setup | `./setup-demo-credentials.sh` |
| `seed-demo-data.js` | Create demo users | `node my-backend/seed-demo-data.js` |
| `verify-demo-credentials.js` | Verify users exist | `node my-backend/verify-demo-credentials.js` |

---

## Next Steps

After credentials are set up:

1. ✅ Test login with Enterprise Admin
2. ✅ Test login with Petrol Pump Super Admin
3. ✅ Test login with Logistics Super Admin
4. ✅ Verify module assignments
5. ✅ Test module assignment UI
6. ✅ Create a new business via Enterprise Admin UI
7. ✅ Assign modules to new business
8. ✅ Test with new business credentials

---

## Support

If you encounter issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Verify all prerequisites are met
4. Check database logs: `tail -f /usr/local/var/postgres/server.log` (macOS)
5. Verify `.env` file has correct DATABASE_URL

---

**Last Updated**: January 15, 2025  
**Version**: 1.0.0  
**Status**: ✅ Ready for Use
