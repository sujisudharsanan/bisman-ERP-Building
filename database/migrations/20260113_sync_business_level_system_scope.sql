-- Migration: Sync business_level and system_scope columns
-- Date: 2026-01-13
-- Description: Ensures users_enhanced has correct business_level and system_scope values

-- 1. Add system_scope column if missing
ALTER TABLE users_enhanced 
ADD COLUMN IF NOT EXISTS system_scope VARCHAR(20) DEFAULT 'BUSINESS';

-- 2. Add constraint for valid system_scope values
ALTER TABLE users_enhanced 
DROP CONSTRAINT IF EXISTS chk_users_enhanced_system_scope;

ALTER TABLE users_enhanced 
ADD CONSTRAINT chk_users_enhanced_system_scope 
CHECK (system_scope IN ('CROSS_TENANT', 'TENANT', 'BUSINESS'));

-- 3. Update system_scope based on role
UPDATE users_enhanced 
SET system_scope = CASE 
  WHEN role = 'SUPER_ADMIN' THEN 'CROSS_TENANT'
  WHEN role IN ('ADMIN', 'IT_ADMIN') THEN 'TENANT'
  ELSE 'BUSINESS'
END
WHERE system_scope IS NULL OR system_scope = '';

-- 4. Fix invalid/numeric roles
UPDATE users_enhanced 
SET role = 'STAFF', business_level = 3, system_scope = 'BUSINESS' 
WHERE role IN ('5', 'USER', 'user') AND email NOT LIKE '%admin%';

UPDATE users_enhanced 
SET role = 'HR_MANAGER', business_level = 9, system_scope = 'BUSINESS' 
WHERE role = '57';

-- 5. Set business_level based on role for any NULL values
UPDATE users_enhanced u
SET business_level = COALESCE(
  (SELECT level FROM rbac_roles r WHERE r.name = u.role),
  1
)
WHERE business_level IS NULL;

-- 6. Drop problematic trigger if exists
DROP TRIGGER IF EXISTS trigger_log_business_level_change ON users_enhanced;
DROP FUNCTION IF EXISTS log_business_level_change();

-- 7. Verify the view exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'users' AND table_type = 'VIEW'
  ) THEN
    RAISE NOTICE 'WARNING: users table is not a VIEW - migration may be incomplete';
  END IF;
END $$;

-- Migration complete
SELECT 'Migration 20260113_sync_business_level_system_scope completed successfully' as status;
