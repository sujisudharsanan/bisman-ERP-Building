-- Add missing system_scope column to users_enhanced table
-- This column is required by the Prisma schema but was missing from production

-- Add the column with default value
ALTER TABLE users_enhanced 
ADD COLUMN IF NOT EXISTS system_scope VARCHAR(20) DEFAULT 'BUSINESS';

-- Create index for query performance
CREATE INDEX IF NOT EXISTS idx_users_enhanced_system_scope ON users_enhanced(system_scope);

-- Set appropriate system_scope based on existing roles
UPDATE users_enhanced 
SET system_scope = CASE 
    WHEN role = 'ENTERPRISE_ADMIN' THEN 'CROSS_TENANT'
    WHEN role = 'SUPER_ADMIN' THEN 'TENANT'
    ELSE 'BUSINESS'
END
WHERE system_scope IS NULL;
