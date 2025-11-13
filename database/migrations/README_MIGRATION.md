-- IMPORTANT: Run this migration to add the new user profile fields to your database
-- This adds support for:
-- - Employee IDs and external system integration
-- - Enhanced contact information (work email, secondary email, multiple phones)
-- - Phone and email verification tracking
-- - Localization settings (language and locale)
-- - Emergency contact information
-- - Privacy settings (public profile toggle)

-- To run this migration, use one of the following methods:

-- METHOD 1: Using psql command line
-- psql -h <your-db-host> -U <your-db-user> -d <your-db-name> -f add_enhanced_user_profile_fields.sql

-- METHOD 2: Using PostgreSQL client
-- Copy and paste the contents of add_enhanced_user_profile_fields.sql into your PostgreSQL client

-- METHOD 3: Using the Railway CLI (if deploying on Railway)
-- railway run psql < add_enhanced_user_profile_fields.sql

-- After running the migration:
-- 1. Restart your backend server
-- 2. The new fields will be available in the user profile forms
-- 3. Existing users will have default values for new fields
-- 4. Work email will be automatically populated from existing email field

-- Note: This migration is designed to be safe and non-breaking
-- - Uses "IF NOT EXISTS" to avoid conflicts
-- - Adds default values where appropriate
-- - Creates indexes for better query performance
-- - Includes rollback script if needed
