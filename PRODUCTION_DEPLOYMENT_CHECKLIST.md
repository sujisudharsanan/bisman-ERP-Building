# 🚀 BISMAN ERP - Production Deployment Checklist

**Date**: November 14, 2025  
**Branch**: deployment  
**Repository**: sujisudharsanan/bisman-ERP-Building

---

## 📋 Pre-Deployment Checklist

### ✅ 1. Code Quality & Build
- [ ] Frontend type-check passes: `cd my-frontend && npm run type-check`
- [ ] Backend has no errors
- [ ] All tests pass (if applicable)
- [ ] No console.log statements in production code (or minimal)
- [ ] No hardcoded credentials

### ✅ 2. Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<CHANGE_TO_STRONG_SECRET>
DATABASE_URL=<PRODUCTION_DATABASE_URL>
FRONTEND_URL=<PRODUCTION_FRONTEND_URL>
PRODUCTION_URL=<PRODUCTION_URL>
```

#### Frontend (.env.local → .env.production)
```env
NEXT_PUBLIC_API_URL=<PRODUCTION_API_URL>
NEXT_PUBLIC_DIRECT_BACKEND=false
DATABASE_URL=<PRODUCTION_DATABASE_URL>
AI_BASE_URL=<AI_SERVICE_URL>
AI_DEFAULT_MODEL=llama3
```

### ✅ 3. Security
- [ ] Change JWT_SECRET to strong random value
- [ ] Update CORS settings for production domain
- [ ] Enable HTTPS/SSL
- [ ] Set secure cookie flags
- [ ] Remove demo credentials before deployment

### ✅ 4. Database
- [ ] Database backup created
- [ ] Migration scripts ready
- [ ] Seed data (roles, permissions) prepared
- [ ] Database connection string configured

### ✅ 5. Features Verified
- [ ] Chat minimize feature works
- [ ] Profile picture upload works
- [ ] All roles can login (especially HUB_INCHARGE)
- [ ] Password reset emails working
- [ ] Help & support system functional

---

## 🔧 Known Issues to Fix

### ⚠️ Issue 1: "charge not login after deployment"

**Problem**: Hub Incharge (or similar "charge" role) cannot login after deployment

**Root Causes**:
1. Database role mismatch (role name not matching)
2. Missing permissions in `rbac_user_permissions`
3. JWT token issues
4. CORS blocking authentication

**Solutions**:

#### A. Verify Database Roles
```sql
-- Check if Hub Incharge users exist
SELECT id, username, email, role, role_id 
FROM users 
WHERE role LIKE '%incharge%' OR role LIKE '%charge%';

-- Check rbac_roles table
SELECT * FROM rbac_roles 
WHERE role_name LIKE '%incharge%' OR role_name LIKE '%charge%';
```

#### B. Fix Role Permissions
```sql
-- Grant basic permissions to Hub Incharge role
INSERT INTO rbac_role_permissions (role_id, page_key, can_view, can_edit, can_delete)
SELECT 
  r.id,
  'hub-incharge-dashboard',
  true,
  true,
  false
FROM rbac_roles r
WHERE r.role_name LIKE '%Hub%Incharge%'
ON CONFLICT DO NOTHING;
```

#### C. Check Authentication Flow
```bash
# Test login endpoint
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}'
```

#### D. Verify Frontend Redirect Logic
File: `my-frontend/src/app/auth/login/page.tsx`
```typescript
case 'HUB_INCHARGE':
case 'HUB INCHARGE':
  targetPath = '/hub-incharge';
  break;
```

---

## 📦 Database Export & Migration

### Step 1: Export Current Database
```bash
# Full database dump
pg_dump -U postgres -d BISMAN -F c -b -v -f "bisman_production_$(date +%Y%m%d_%H%M%S).dump"

# SQL format (easier to review)
pg_dump -U postgres -d BISMAN -F p -f "bisman_production_$(date +%Y%m%d_%H%M%S).sql"

# Schema only (for production setup)
pg_dump -U postgres -d BISMAN -s -f "bisman_schema.sql"

# Data only (for migration)
pg_dump -U postgres -d BISMAN -a -f "bisman_data.sql"
```

### Step 2: Clean Database for Production
```sql
-- Remove demo/test data if needed
DELETE FROM users WHERE email LIKE '%@bisman.demo';

-- Keep only essential roles
-- Review and clean up test entries

-- Verify critical tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM rbac_roles;
SELECT COUNT(*) FROM rbac_permissions;
SELECT COUNT(*) FROM rbac_user_permissions;
```

### Step 3: Import to Production
```bash
# Restore from dump file
pg_restore -U <prod_user> -d <prod_database> -v bisman_production_YYYYMMDD_HHMMSS.dump

# Or from SQL file
psql -U <prod_user> -d <prod_database> -f bisman_production_YYYYMMDD_HHMMSS.sql
```

---

## 🚀 Git Push Process

### Step 1: Review Changes
```bash
cd "/Users/abhi/Desktop/BISMAN ERP"
git status
git diff
```

### Step 2: Add All Changes
```bash
# Add new files
git add CHAT_MINIMIZE_FEATURE.md
git add CLEANUP_SUMMARY.md
git add MATTERMOST_REMOVAL_SUMMARY.md
git add HELP_SUPPORT_*.md
git add PASSWORD_RESET_*.md
git add cleanup-comprehensive.sh
git add cleanup-duplicates.sh
git add remove-mattermost.sh
git add docs/
git add database/migrations/

# Add modified files
git add my-frontend/
git add my-backend/
git add cspell.json

# Review staged files
git status
```

### Step 3: Commit Changes
```bash
git commit -m "🚀 Production Ready: Chat Minimize, Cleanup, Mattermost Removal

Features Added:
✅ Chat minimize feature for multitasking
✅ Profile picture integration across all components
✅ Password reset with email system
✅ Enhanced help & support documentation

Improvements:
✅ Removed Mattermost integration (40+ files)
✅ Cleaned up 472 backup files
✅ Archived 248 documentation files
✅ Improved chat dimensions (550x600px)
✅ Added slide animations for chat

Database:
✅ Password reset tokens table
✅ Support tickets system
✅ Profile picture storage improvements

Ready for deployment to production
"
```

### Step 4: Push to GitHub
```bash
# Ensure on correct branch
git branch  # Should show: deployment

# Push to GitHub
git push origin deployment

# If first time pushing this branch
git push -u origin deployment
```

---

## 🗄️ Database Migration Script

Create this file: `database-migration.sh`

```bash
#!/bin/bash

echo "🗄️ BISMAN ERP - Database Migration Script"
echo "=========================================="

# Configuration
DB_USER="postgres"
DB_NAME="BISMAN"
BACKUP_DIR="./database-backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo ""
echo "📦 Step 1: Creating database backup..."
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f "$BACKUP_DIR/bisman_backup_$TIMESTAMP.dump"

if [ $? -eq 0 ]; then
  echo "✅ Backup created: $BACKUP_DIR/bisman_backup_$TIMESTAMP.dump"
else
  echo "❌ Backup failed!"
  exit 1
fi

echo ""
echo "📤 Step 2: Creating SQL export for production..."
pg_dump -U $DB_USER -d $DB_NAME -F p -f "$BACKUP_DIR/bisman_production_$TIMESTAMP.sql"

if [ $? -eq 0 ]; then
  echo "✅ SQL export created: $BACKUP_DIR/bisman_production_$TIMESTAMP.sql"
else
  echo "❌ SQL export failed!"
  exit 1
fi

echo ""
echo "📊 Step 3: Database statistics..."
psql -U $DB_USER -d $DB_NAME -c "SELECT 
  'users' as table_name, COUNT(*) as count FROM users 
  UNION ALL SELECT 'rbac_roles', COUNT(*) FROM rbac_roles 
  UNION ALL SELECT 'rbac_permissions', COUNT(*) FROM rbac_permissions 
  UNION ALL SELECT 'rbac_user_permissions', COUNT(*) FROM rbac_user_permissions;"

echo ""
echo "✅ Database migration preparation complete!"
echo ""
echo "📁 Backup files:"
ls -lh "$BACKUP_DIR"/bisman_*_$TIMESTAMP.*

echo ""
echo "🚀 Next steps:"
echo "1. Upload SQL file to production server"
echo "2. Run: psql -U <prod_user> -d <prod_db> -f bisman_production_$TIMESTAMP.sql"
echo "3. Verify all tables and data"
echo "4. Test authentication with all roles"
```

Make it executable:
```bash
chmod +x database-migration.sh
```

---

## 🧪 Post-Deployment Testing

### 1. Authentication Tests
```bash
# Test each role login
# Enterprise Admin
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bisman.erp","password":"CHANGE_ME"}'

# Hub Incharge (THE CRITICAL ONE)
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_hub_incharge@bisman.demo","password":"Demo@123"}'

# Store Incharge
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo_store_incharge@bisman.demo","password":"Demo@123"}'
```

### 2. Feature Tests
- [ ] Login as each role (Enterprise Admin, Hub Incharge, Store Incharge, etc.)
- [ ] Verify dashboard loads correctly
- [ ] Test chat minimize/maximize
- [ ] Upload profile picture
- [ ] Reset password flow
- [ ] Create support ticket
- [ ] Check help documentation

### 3. Performance Tests
- [ ] Page load times < 3s
- [ ] API responses < 500ms
- [ ] Chat opens smoothly
- [ ] No memory leaks
- [ ] Database queries optimized

---

## 🔐 Security Hardening

### 1. Environment Variables
```bash
# Generate strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env files
NODE_ENV=production
JWT_SECRET=<generated_secret_above>
```

### 2. CORS Configuration
File: `my-backend/app.js`
```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.PRODUCTION_URL, process.env.FRONTEND_URL]
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 3. Cookie Security
```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
});
```

---

## 📊 Deployment Metrics

### What We're Deploying
- **Frontend**: Next.js 14.2.33 application
- **Backend**: Express.js API server
- **Database**: PostgreSQL with full schema
- **Features**: 
  - 8 major modules
  - 150+ pages
  - Role-based access control
  - AI chat integration
  - File upload system
  - Password reset
  - Support system

### File Changes
- **Deleted**: 472 backup files (~6 MB)
- **Added**: 15+ new documentation files
- **Modified**: 30+ source files
- **Removed**: 40+ Mattermost files

---

## 🎯 Success Criteria

### Deployment Complete When:
- [ ] All roles can login successfully
- [ ] Hub Incharge specifically can access dashboard
- [ ] Chat system works (minimize/maximize)
- [ ] Profile pictures display correctly
- [ ] Password reset emails send
- [ ] Help system accessible
- [ ] No console errors
- [ ] Database migrations successful
- [ ] Git pushed to GitHub
- [ ] Production environment variables set

---

## 📞 Support

If deployment fails, check:
1. **Logs**: `pm2 logs` or `journalctl -u your-service`
2. **Database**: Connection string correct?
3. **Environment**: All vars set?
4. **CORS**: Frontend URL whitelisted?
5. **Authentication**: JWT secret matching?

---

**Created**: November 14, 2025  
**Last Updated**: November 14, 2025  
**Status**: Ready for Deployment ✅
