# Enhanced User Profile Fields Implementation

## Overview
This implementation adds comprehensive user profile fields to support enterprise-level user management with enhanced contact information, employee tracking, localization, and privacy controls.

## New Features Added

### 1. Employee Identification
- **Employee ID**: Internal employee identifier
- **External ID**: Integration with external HR/payroll systems
- **Manager/Reporting To**: Hierarchical reporting structure

### 2. Enhanced Contact Information
- **Work Email (Primary)**: Non-editable primary work email
- **Secondary Email**: Additional email address with verification
- **Work Phone**: Office/desk phone number with verification
- **Mobile Phone**: Mobile/cell phone number with verification
- **Verification Status**: Visual indicators for verified contact methods

### 3. Localization Settings
- **Language**: Preferred interface language (en, es, fr, de, hi, zh)
- **Locale**: Regional format settings (en-US, en-GB, es-ES, etc.)

### 4. Personal Details
- **Date of Birth**: Enhanced with proper date picker
- **Address Information**: Communication and permanent addresses
- **Location Details**: City, State, Country, Postal Code

### 5. Emergency Contact
- **Emergency Contact Name**: Full name of emergency contact
- **Emergency Contact Phone**: Phone number for emergencies
- **Relationship**: Relationship to the employee

### 6. Privacy Settings
- **Public Profile Toggle**: Control visibility to other users
- **Privacy Information**: Clear explanation of what's visible to whom

## Implementation Details

### Frontend Changes

#### Files Modified:
1. **`/my-frontend/src/types/user-management.ts`**
   - Added 20+ new fields to User interface
   - Added verification timestamp fields
   - Added manager relationship

2. **`/my-frontend/src/components/user-management/UserProfile.tsx`**
   - Enhanced EditProfileModal with tabbed sections:
     - Basic Info
     - Contact Details
     - Personal Details
     - Emergency Contact
     - Settings
   - Updated overview display with all new fields
   - Added verification status indicators

#### Files Created:
3. **`/my-frontend/src/components/user-management/VerificationButton.tsx`**
   - Reusable component for email/phone verification
   - SMS/Email code verification flow
   - Real-time verification status updates

### Backend Changes

#### Database Migration:
4. **`/database/migrations/add_enhanced_user_profile_fields.sql`**
   - Adds 16 new columns to users table
   - Creates indexes for performance
   - Includes rollback script
   - Safe to run multiple times (uses IF NOT EXISTS)

#### New Database Columns:
```sql
-- Employee Information
external_id VARCHAR(100)
manager_id UUID (foreign key to users.id)

-- Contact Information
work_email VARCHAR(255)
secondary_email VARCHAR(255)
work_phone VARCHAR(50)
mobile_phone VARCHAR(50)

-- Verification Timestamps
phone_verified_at TIMESTAMP
work_phone_verified_at TIMESTAMP
mobile_phone_verified_at TIMESTAMP
secondary_email_verified_at TIMESTAMP

-- Localization
language VARCHAR(10) DEFAULT 'en'
locale VARCHAR(10) DEFAULT 'en-US'

-- Emergency Contact
emergency_contact_name VARCHAR(255)
emergency_contact_phone VARCHAR(50)
emergency_contact_relationship VARCHAR(100)

-- Privacy
is_profile_public BOOLEAN DEFAULT true
```

## Installation Instructions

### Step 1: Run Database Migration

```bash
# Connect to your PostgreSQL database
psql -h <host> -U <user> -d <database>

# Run the migration
\i database/migrations/add_enhanced_user_profile_fields.sql

# Or using Railway
railway run psql < database/migrations/add_enhanced_user_profile_fields.sql
```

### Step 2: Update Backend Dependencies (if needed)
```bash
cd my-backend
npm install
```

### Step 3: Restart Services
```bash
# Restart backend
cd my-backend
npm run dev

# Restart frontend
cd my-frontend
npm run dev
```

## Usage Guide

### For Users

#### Editing Profile:
1. Navigate to your profile
2. Click "Edit Profile" button
3. Use tabs to navigate sections:
   - **Basic Info**: Name, IDs, designation, manager
   - **Contact Details**: Emails and phones
   - **Personal Details**: DOB, language, address
   - **Emergency Contact**: Emergency contact information
   - **Settings**: Privacy controls

#### Verifying Contact Information:
1. Add phone/email in Contact Details tab
2. Click "Verify Email" or "Verify Phone" button
3. Enter verification code received
4. Green "Verified" badge appears when confirmed

#### Privacy Settings:
- Toggle "Make my profile visible to other users"
- When enabled: Contact info visible to team members
- When disabled: Only admins can view full profile
- Note: Name, designation, department always visible

### For Administrators

#### Setting Manager Relationships:
1. Edit user profile
2. In Basic Info tab, enter Manager User ID
3. Manager's name will appear in "Reporting To" field

#### Verification Management:
- View verification status in user profiles
- Manually verify contacts if needed
- Track verification timestamps in database

## API Endpoints

### Update User Profile
```typescript
PUT /api/users/:id
Content-Type: application/json

{
  "employee_id": "EMP-001",
  "external_id": "HR-12345",
  "manager_id": "uuid-of-manager",
  "work_email": "user@company.com",
  "secondary_email": "user.personal@email.com",
  "work_phone": "+1-555-123-4567",
  "mobile_phone": "+1-555-987-6543",
  "language": "en",
  "locale": "en-US",
  "date_of_birth": "1990-01-15",
  "communication_address": "123 Main St, Apt 4B",
  "permanent_address": "456 Home Ave",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "postal_code": "10001",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+1-555-000-0000",
  "emergency_contact_relationship": "Spouse",
  "is_profile_public": true
}
```

### Verify Phone/Email
```typescript
POST /api/users/:id/verify/phone
{
  "phone": "+1-555-123-4567",
  "type": "work_phone" // or "mobile_phone"
}

POST /api/users/:id/verify/phone/confirm
{
  "phone": "+1-555-123-4567",
  "code": "1234"
}

POST /api/users/:id/verify/email
{
  "email": "user@example.com",
  "type": "secondary_email"
}

POST /api/users/:id/verify/email/confirm
{
  "email": "user@example.com",
  "code": "123456"
}
```

## Field Descriptions

### Employee ID vs External ID
- **Employee ID**: Your internal company identifier (e.g., EMP-001)
- **External ID**: ID from external systems (e.g., payroll, HR software)

### Work Email vs Secondary Email
- **Work Email**: Primary company email (non-editable by user)
- **Secondary Email**: Additional email for notifications/recovery

### Phone Number Types
- **Work Phone**: Office/desk phone
- **Mobile Phone**: Personal mobile/cell phone
- **Alternate Phone**: Additional contact number
- **Phone (Legacy)**: Backward compatibility field

### Language vs Locale
- **Language**: Interface language (en, es, fr, etc.)
- **Locale**: Regional format (date, time, currency) - en-US, en-GB, etc.

## Privacy & Security

### What's Always Visible:
- Name
- Designation
- Department
- Profile picture

### What's Controlled by Privacy Toggle:
- Contact information (emails, phones)
- Personal address
- Date of birth

### What's Restricted to HR/Admin:
- Emergency contact details
- Salary information
- Sensitive documents
- Verification status

## Verification Flow

### Email Verification:
1. User enters email address
2. System sends 6-digit code to email
3. User enters code within 10 minutes
4. Email marked as verified with timestamp

### Phone Verification (SMS):
1. User enters phone number
2. System sends 4-digit code via SMS
3. User enters code within 5 minutes
4. Phone marked as verified with timestamp

### Phone Verification (Call):
1. User enters phone number
2. System calls and provides code
3. User enters code
4. Phone marked as verified

## Troubleshooting

### Migration Issues
**Problem**: Migration fails with "column already exists"
**Solution**: Migration uses IF NOT EXISTS, safe to re-run

**Problem**: Work email not populating
**Solution**: Check the UPDATE statement in migration ran successfully

### Verification Issues
**Problem**: Not receiving verification codes
**Solution**: Check email/SMS service configuration in backend

**Problem**: Code expired
**Solution**: Request new verification code

### UI Issues
**Problem**: Fields not showing in edit modal
**Solution**: Clear browser cache and reload

**Problem**: Verification button not appearing
**Solution**: Ensure VerificationButton component is imported

## Future Enhancements

### Planned Features:
- [ ] Bulk user import with new fields
- [ ] Manager approval workflow for profile changes
- [ ] Multi-language interface based on user preference
- [ ] Automated verification reminders
- [ ] Profile completion percentage
- [ ] Custom field builder for organizations
- [ ] Integration with external ID providers
- [ ] Advanced privacy settings per field

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the database migration logs
3. Check browser console for frontend errors
4. Review backend logs for API errors

## Changelog

### Version 1.0.0 (2025-11-13)
- Initial implementation of enhanced user profile fields
- Added employee identification (employee_id, external_id, manager_id)
- Added enhanced contact information with verification
- Added localization settings (language, locale)
- Added personal details and addresses
- Added emergency contact information
- Added privacy controls (is_profile_public)
- Created verification flow UI components
- Database migration with rollback support
