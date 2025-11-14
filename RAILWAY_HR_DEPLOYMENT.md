# HR User Railway Deployment Guide

## 🎯 Overview
This guide explains how to deploy the new HR user and permissions to your Railway database.

## 📦 What's Being Deployed

### 1. New HR User
- **Username**: `demo_hr`
- **Email**: `demo_hr@bisman.demo`
- **Password**: `hr123`
- **Role**: `HR`

### 2. HR Permissions
The HR user will have access to:
- `user-creation` - Create New User page
- `user-settings` - User Settings
- `about-me` - Profile page

### 3. Login Page Integration
The HR user is already added to the frontend login page under the **Operations** category.

## 🚀 Deployment Steps

### Option 1: Using Railway CLI (Recommended)

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   railway link
   ```

4. **Get your DATABASE_URL**:
   ```bash
   railway variables
   ```
   Copy the `DATABASE_URL` value.

5. **Run the deployment script**:
   ```bash
   RAILWAY_DATABASE_URL="your-railway-database-url" node railway-hr-deployment.js
   ```

### Option 2: Using Railway Dashboard

1. **Get DATABASE_URL from Railway Dashboard**:
   - Go to your Railway project
   - Click on your PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL`

2. **Run the deployment script locally**:
   ```bash
   RAILWAY_DATABASE_URL="postgresql://postgres:password@hostname:port/database" node railway-hr-deployment.js
   ```

### Option 3: Direct SQL Execution in Railway

1. **Connect to Railway PostgreSQL**:
   - Go to Railway Dashboard
   - Select your PostgreSQL service
   - Click "Query" tab or use a PostgreSQL client

2. **Run the following SQL**:

```sql
-- Step 1: Create HR user
INSERT INTO users (username, email, password, role)
VALUES (
  'demo_hr', 
  'demo_hr@bisman.demo', 
  '$2a$10$YOUR_BCRYPT_HASH_HERE', -- Replace with bcrypt hash of 'hr123'
  'HR'
)
ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  role = EXCLUDED.role;

-- Step 2: Create user_permissions table if not exists
CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  allowed_pages TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Step 3: Add HR permissions
INSERT INTO user_permissions (user_id, allowed_pages)
SELECT u.id, ARRAY['user-creation', 'user-settings', 'about-me']
FROM users u
WHERE u.email = 'demo_hr@bisman.demo'
ON CONFLICT (user_id) 
DO UPDATE SET 
  allowed_pages = EXCLUDED.allowed_pages,
  updated_at = CURRENT_TIMESTAMP;

-- Step 4: Add HR role to roles table (if exists)
INSERT INTO roles (role_name, description)
VALUES ('HR', 'Human Resources Manager')
ON CONFLICT (role_name) DO NOTHING;
```

## 🔐 Generate Bcrypt Hash

If you need to generate the bcrypt hash manually:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('hr123', 10).then(hash => console.log(hash));"
```

## ✅ Verification

After deployment, verify the changes:

### 1. Check User Created
```sql
SELECT id, username, email, role 
FROM users 
WHERE email = 'demo_hr@bisman.demo';
```

### 2. Check Permissions
```sql
SELECT u.username, u.email, u.role, up.allowed_pages
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE u.email = 'demo_hr@bisman.demo';
```

### 3. Test Login
1. Go to your Railway deployment URL
2. Login with:
   - Email: `demo_hr@bisman.demo`
   - Password: `hr123`
3. Check sidebar shows "Create New User" option
4. Navigate to `/hr/user-creation`

## 📝 Files Modified

### Frontend
- ✅ `/my-frontend/src/app/auth/login/page.tsx` - Added HR to demo users list

### Backend
- ✅ Database: New HR user created
- ✅ Database: user_permissions table created/updated
- ✅ Database: HR permissions added

## 🔍 Troubleshooting

### Issue: "relation 'user_permissions' does not exist"
**Solution**: The table will be created automatically by the script. If not, run the CREATE TABLE statement manually.

### Issue: "duplicate key value violates unique constraint"
**Solution**: The user already exists. The script uses ON CONFLICT to update instead.

### Issue: bcryptjs not found
**Solution**: Install dependencies:
```bash
cd my-backend
npm install
```

### Issue: Connection timeout
**Solution**: Check your Railway DATABASE_URL and ensure SSL settings are correct.

## 📊 Environment Variables

Make sure these are set in Railway:

```env
DATABASE_URL=postgresql://user:pass@host:port/db
# Other existing variables...
```

## 🎉 Post-Deployment

After successful deployment:

1. ✅ HR user can login at the login page
2. ✅ HR appears in demo users dropdown (Operations category)
3. ✅ Sidebar shows "Create New User" for HR role
4. ✅ HR can access `/hr/user-creation` page
5. ✅ HR can access User Settings and Profile pages

## 📞 Support

If you encounter issues:
1. Check Railway logs for errors
2. Verify DATABASE_URL is correct
3. Ensure PostgreSQL service is running
4. Check if bcryptjs is installed in backend

---

**Created**: November 14, 2025  
**Author**: GitHub Copilot  
**Version**: 1.0  
