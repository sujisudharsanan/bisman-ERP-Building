-- Migration: Update Role Display Names for UI Clarity
-- Date: 2025-12-24
-- Description: Updates display_name column in roles table to use new canonical names
--              while keeping internal role names (name column) unchanged
-- 
-- IMPORTANT: This is a DISPLAY-ONLY change. No RBAC or authority level changes.

-- ============================================
-- UPDATE DISPLAY NAMES (UI Only)
-- ============================================

-- Level 60: BRANCH_INCHARGE -> "Branch Manager" (manages single branch)
UPDATE roles 
SET display_name = 'Branch Manager',
    updated_at = CURRENT_TIMESTAMP
WHERE UPPER(REPLACE(name, ' ', '_')) = 'BRANCH_INCHARGE' 
   OR LOWER(name) = 'branch incharge';

-- Level 75: BRANCH_MANAGER -> "Regional Manager" (multi-branch authority)
UPDATE roles 
SET display_name = 'Regional Manager',
    updated_at = CURRENT_TIMESTAMP
WHERE UPPER(REPLACE(name, ' ', '_')) = 'BRANCH_MANAGER' 
   OR LOWER(name) = 'branch manager';

-- Level 70: MANAGER -> "Department Manager"
UPDATE roles 
SET display_name = 'Department Manager',
    updated_at = CURRENT_TIMESTAMP
WHERE LOWER(name) = 'manager';

-- Level 55: HUB_INCHARGE -> "Hub In-Charge" (consistent hyphenation)
UPDATE roles 
SET display_name = 'Hub In-Charge',
    updated_at = CURRENT_TIMESTAMP
WHERE UPPER(REPLACE(name, ' ', '_')) = 'HUB_INCHARGE'
   OR LOWER(name) = 'hub incharge';

-- Level 40: STORE_INCHARGE -> "Store In-Charge" (consistent hyphenation)
UPDATE roles 
SET display_name = 'Store In-Charge',
    updated_at = CURRENT_TIMESTAMP
WHERE UPPER(REPLACE(name, ' ', '_')) = 'STORE_INCHARGE'
   OR LOWER(name) = 'store incharge';

-- Level 30: ACCOUNTANT -> "Executive" (functional role)
-- Note: Keeping as "Accountant" since it's a specific job title, not just "Executive"
-- UPDATE roles SET display_name = 'Executive' WHERE LOWER(name) = 'accountant';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the changes:
-- SELECT name, display_name, level FROM roles ORDER BY level DESC;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- UPDATE roles SET display_name = 'Branch Incharge' WHERE LOWER(name) = 'branch incharge';
-- UPDATE roles SET display_name = 'Branch Manager' WHERE LOWER(name) = 'branch manager';
-- UPDATE roles SET display_name = 'Manager' WHERE LOWER(name) = 'manager';
-- UPDATE roles SET display_name = 'Hub Incharge' WHERE LOWER(name) = 'hub incharge';
-- UPDATE roles SET display_name = 'Store Incharge' WHERE LOWER(name) = 'store incharge';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
COMMENT ON TABLE roles IS 'Role definitions with display names updated 2025-12-24 for UI clarity';
