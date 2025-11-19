-- Migration: Add Enhanced User Profile Fields
-- Description: Adds employee information, contact details, localization, personal details, emergency contacts, and privacy settings
-- Date: 2025-11-13
-- Author: System

BEGIN;

-- Add employee information fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add contact information fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS work_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS secondary_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS work_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS mobile_phone VARCHAR(50);

-- Add verification timestamp fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS work_phone_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS mobile_phone_verified_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS secondary_email_verified_at TIMESTAMP;

-- Add localization fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en-US';

-- Add emergency contact fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);

-- Add privacy settings
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_work_email ON users(work_email) WHERE work_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_secondary_email ON users(secondary_email) WHERE secondary_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_profile_public ON users(is_profile_public);

-- Add comments for documentation
COMMENT ON COLUMN users.external_id IS 'External system identifier for integration purposes';
COMMENT ON COLUMN users.manager_id IS 'Reference to the reporting manager user';
COMMENT ON COLUMN users.work_email IS 'Primary work email (non-editable by user)';
COMMENT ON COLUMN users.secondary_email IS 'Secondary email address';
COMMENT ON COLUMN users.work_phone IS 'Work phone number';
COMMENT ON COLUMN users.mobile_phone IS 'Mobile phone number';
COMMENT ON COLUMN users.phone_verified_at IS 'Timestamp when phone was verified';
COMMENT ON COLUMN users.work_phone_verified_at IS 'Timestamp when work phone was verified';
COMMENT ON COLUMN users.mobile_phone_verified_at IS 'Timestamp when mobile phone was verified';
COMMENT ON COLUMN users.secondary_email_verified_at IS 'Timestamp when secondary email was verified';
COMMENT ON COLUMN users.language IS 'Preferred language code (ISO 639-1)';
COMMENT ON COLUMN users.locale IS 'Locale setting (language-region)';
COMMENT ON COLUMN users.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN users.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN users.emergency_contact_relationship IS 'Relationship to emergency contact';
COMMENT ON COLUMN users.is_profile_public IS 'Whether profile is visible to other users';

-- Update existing users to have work_email from email field if not set
UPDATE users 
SET work_email = email 
WHERE work_email IS NULL AND email IS NOT NULL;

COMMIT;

-- Rollback script (run this to undo the migration)
-- BEGIN;
-- DROP INDEX IF EXISTS idx_users_is_profile_public;
-- DROP INDEX IF EXISTS idx_users_secondary_email;
-- DROP INDEX IF EXISTS idx_users_work_email;
-- DROP INDEX IF EXISTS idx_users_manager_id;
-- DROP INDEX IF EXISTS idx_users_external_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS is_profile_public;
-- ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_relationship;
-- ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_phone;
-- ALTER TABLE users DROP COLUMN IF EXISTS emergency_contact_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS locale;
-- ALTER TABLE users DROP COLUMN IF EXISTS language;
-- ALTER TABLE users DROP COLUMN IF EXISTS secondary_email_verified_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS mobile_phone_verified_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS work_phone_verified_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS phone_verified_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS mobile_phone;
-- ALTER TABLE users DROP COLUMN IF EXISTS work_phone;
-- ALTER TABLE users DROP COLUMN IF EXISTS secondary_email;
-- ALTER TABLE users DROP COLUMN IF EXISTS work_email;
-- ALTER TABLE users DROP COLUMN IF EXISTS manager_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS external_id;
-- COMMIT;
