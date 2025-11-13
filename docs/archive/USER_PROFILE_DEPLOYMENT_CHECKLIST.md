# User Profile Enhancement - Deployment Checklist

## ✅ Pre-Deployment Checklist

### Database Preparation
- [ ] Backup current database
- [ ] Review migration script: `database/migrations/add_enhanced_user_profile_fields.sql`
- [ ] Test migration on staging/dev database first
- [ ] Verify migration adds 16 new columns
- [ ] Verify indexes are created
- [ ] Check work_email auto-population from email field

### Code Review
- [ ] Review TypeScript type changes in `types/user-management.ts`
- [ ] Review UserProfile component changes
- [ ] Review VerificationButton component
- [ ] Run TypeScript type checking: `npm run type-check`
- [ ] Check for console errors
- [ ] Verify no breaking changes to existing functionality

### Testing Preparation
- [ ] Create test user accounts
- [ ] Prepare test data for new fields
- [ ] Document test scenarios
- [ ] Set up monitoring/logging

## 🚀 Deployment Steps

### Step 1: Database Migration
```bash
# Option A: Using Railway CLI
railway run psql < database/migrations/add_enhanced_user_profile_fields.sql

# Option B: Using direct PostgreSQL connection
psql -h <host> -U <user> -d <database> -f database/migrations/add_enhanced_user_profile_fields.sql

# Option C: Using database management tool
# Copy and paste contents of migration file
```

**Verification:**
```sql
-- Verify new columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN (
  'external_id', 'manager_id', 'work_email', 'secondary_email',
  'work_phone', 'mobile_phone', 'language', 'locale',
  'emergency_contact_name', 'is_profile_public'
);

-- Verify work_email was populated
SELECT COUNT(*) FROM users WHERE work_email IS NOT NULL;
SELECT COUNT(*) FROM users WHERE email IS NOT NULL;
-- These counts should match
```

### Step 2: Deploy Frontend Changes
```bash
cd my-frontend

# Build the application
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

### Step 3: Restart Backend Services
```bash
cd my-backend

# Restart the server
npm run dev  # or your production start command
```

### Step 4: Clear Application Cache
- [ ] Clear browser cache (Cmd+Shift+R / Ctrl+Shift+F5)
- [ ] Clear any Redis/application cache if applicable
- [ ] Restart any background workers

## 🧪 Post-Deployment Testing

### Basic Functionality Tests
- [ ] Login to application
- [ ] Navigate to user profile
- [ ] Click "Edit Profile" button
- [ ] Verify 5 tabs appear (Basic Info, Contact Details, Personal Details, Emergency Contact, Settings)
- [ ] Navigate between all tabs
- [ ] Verify no console errors

### Basic Info Tab Tests
- [ ] Enter Employee ID
- [ ] Enter External ID
- [ ] Enter Manager User ID
- [ ] Select Designation
- [ ] Select Department
- [ ] Save changes
- [ ] Verify saved data displays in overview

### Contact Details Tab Tests
- [ ] Verify Work Email is non-editable
- [ ] Enter Secondary Email
- [ ] Enter Work Phone
- [ ] Enter Mobile Phone
- [ ] Enter Alternate Phone
- [ ] Save changes
- [ ] Verify all contacts display in overview
- [ ] Check verification status indicators

### Personal Details Tab Tests
- [ ] Select Date of Birth
- [ ] Select Language
- [ ] Select Locale
- [ ] Enter Communication Address
- [ ] Enter Permanent Address
- [ ] Enter City, State, Country, Postal Code
- [ ] Save changes
- [ ] Verify all personal details display

### Emergency Contact Tab Tests
- [ ] Enter Emergency Contact Name
- [ ] Enter Emergency Contact Phone
- [ ] Enter Relationship
- [ ] Save changes
- [ ] Verify emergency contact displays (check admin permissions)

### Settings Tab Tests
- [ ] Read privacy information
- [ ] Toggle "Make my profile visible" checkbox
- [ ] Save changes
- [ ] Verify privacy setting is saved
- [ ] Test visibility changes (login as different user)

### Verification Flow Tests (Pending Backend)
- [ ] Click "Verify Email" button
- [ ] Verify code input appears (frontend only until backend ready)
- [ ] Click "Verify Phone" button
- [ ] Verify code input appears (frontend only until backend ready)

### Manager Relationship Tests
- [ ] Add manager_id to a user
- [ ] View user profile
- [ ] Verify manager name displays in "Reporting To"
- [ ] Test with invalid manager_id (should handle gracefully)

### Privacy Tests
- [ ] Set profile to private
- [ ] Login as regular user
- [ ] Try to view private profile
- [ ] Verify contact info is hidden (when backend implements)
- [ ] Login as admin
- [ ] Verify admin can view everything

### Data Integrity Tests
- [ ] View existing users
- [ ] Verify work_email populated from email
- [ ] Verify existing data not corrupted
- [ ] Verify backward compatibility with old phone/email fields
- [ ] Test user creation with new fields
- [ ] Test user update with new fields

## 🔍 Validation Checks

### Frontend Validation
- [ ] Required fields marked with asterisk
- [ ] Email format validation
- [ ] Phone format validation (if implemented)
- [ ] Date format validation
- [ ] Character limits enforced
- [ ] Helpful error messages

### Backend Validation (To Implement)
- [ ] Field length validation
- [ ] Email format validation
- [ ] Phone format validation
- [ ] Manager ID exists in database
- [ ] External ID unique if required
- [ ] Language code valid
- [ ] Locale code valid

### UI/UX Validation
- [ ] Forms are responsive on mobile
- [ ] Tabs work on mobile devices
- [ ] All fields accessible via keyboard
- [ ] Tab order is logical
- [ ] Error messages are clear
- [ ] Success messages appear
- [ ] Loading states work

## 📊 Monitoring

### Metrics to Track
- [ ] User profile update success rate
- [ ] Average time to complete profile
- [ ] Number of verified contacts
- [ ] Privacy setting distribution
- [ ] Manager relationship completeness
- [ ] Error rates by field

### Logs to Monitor
- [ ] Database migration logs
- [ ] Application server logs
- [ ] Frontend console errors
- [ ] API request/response logs
- [ ] User activity logs

## 🚨 Rollback Plan

### If Issues Arise:

#### Database Rollback
```sql
-- Run the rollback script from migration file
BEGIN;
DROP INDEX IF EXISTS idx_users_is_profile_public;
DROP INDEX IF EXISTS idx_users_secondary_email;
DROP INDEX IF EXISTS idx_users_work_email;
DROP INDEX IF EXISTS idx_users_manager_id;
DROP INDEX IF EXISTS idx_users_external_id;
ALTER TABLE users DROP COLUMN IF EXISTS is_profile_public;
ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_relationship;
ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_phone;
ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_name;
ALTER TABLE users DROP COLUMN IF EXISTS locale;
ALTER TABLE users DROP COLUMN IF EXISTS language;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_email_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS mobile_phone_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS work_phone_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS phone_verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS mobile_phone;
ALTER TABLE users DROP COLUMN IF EXISTS work_phone;
ALTER TABLE users DROP COLUMN IF EXISTS secondary_email;
ALTER TABLE users DROP COLUMN IF EXISTS work_email;
ALTER TABLE users DROP COLUMN IF EXISTS manager_id;
ALTER TABLE users DROP COLUMN IF EXISTS external_id;
COMMIT;
```

#### Code Rollback
- [ ] Revert to previous git commit
- [ ] Redeploy previous version
- [ ] Clear cache
- [ ] Restart services

## 📝 Documentation Updates

### User Documentation
- [ ] Update user manual with new profile fields
- [ ] Create video tutorial for profile editing
- [ ] Update FAQ with common questions
- [ ] Update privacy policy if needed

### Admin Documentation
- [ ] Document new fields in admin guide
- [ ] Document verification process
- [ ] Document privacy settings
- [ ] Update API documentation

### Developer Documentation
- [ ] Update API endpoint documentation
- [ ] Update database schema documentation
- [ ] Update TypeScript type documentation
- [ ] Document verification flow

## 🎯 Success Criteria

### Must Have (Critical)
- [ ] All new fields save correctly
- [ ] All new fields display correctly
- [ ] No data loss for existing users
- [ ] No breaking changes to existing functionality
- [ ] Database migration successful
- [ ] No critical errors in production

### Should Have (Important)
- [ ] UI is intuitive and easy to use
- [ ] Verification UI works (frontend)
- [ ] Privacy controls work
- [ ] Manager relationships work
- [ ] Mobile responsive
- [ ] Performance acceptable

### Nice to Have (Optional)
- [ ] Verification backend implemented
- [ ] Advanced validation
- [ ] Profile completion percentage
- [ ] Automated tests
- [ ] Analytics tracking
- [ ] User feedback collected

## 📞 Support Plan

### Known Limitations
1. Verification backend not yet implemented (UI ready)
2. Manager selection uses user ID (needs dropdown in future)
3. No bulk update for new fields yet
4. No import/export with new fields yet

### Support Contacts
- Technical Issues: [Your tech team]
- Database Issues: [Your DBA]
- User Questions: [Your support team]

### Communication Plan
- [ ] Notify users about new profile fields
- [ ] Send email about privacy settings
- [ ] Create in-app notification
- [ ] Update help center
- [ ] Train support staff

## ✅ Final Checklist

Before marking as complete:
- [ ] Database migrated successfully
- [ ] No errors in logs
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Support team trained
- [ ] Monitoring in place
- [ ] Rollback plan tested
- [ ] Stakeholders notified
- [ ] User communication sent

---

**Deployment Date**: ______________
**Deployed By**: ______________
**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Completed | ⬜ Rolled Back
**Notes**: 
_________________________________________
_________________________________________
_________________________________________
