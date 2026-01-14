-- ============================================================================
-- SYNC LOCAL ROLES AND USER LEVELS TO RAILWAY
-- Run this script on Railway PostgreSQL database
-- Date: 2026-01-14
-- ============================================================================

-- STEP 1: Update rbac_roles table to match local levels
-- ============================================================================

-- Level 10 roles (highest)
UPDATE rbac_roles SET level = 10, status = 'active' WHERE name = 'SUPER_ADMIN';
UPDATE rbac_roles SET level = 10, status = 'active' WHERE name = 'ADMIN';
UPDATE rbac_roles SET level = 10, status = 'active' WHERE name = 'CEO';
UPDATE rbac_roles SET level = 10, status = 'active' WHERE name = 'CFO';
UPDATE rbac_roles SET level = 10, status = 'active' WHERE name = 'COO';
UPDATE rbac_roles SET level = 10, status = 'active' WHERE name = 'CTO';

-- Level 9 roles
UPDATE rbac_roles SET level = 9, status = 'active' WHERE name = 'HR_MANAGER';
UPDATE rbac_roles SET level = 9, status = 'active' WHERE name = 'FINANCE_CONTROLLER';
UPDATE rbac_roles SET level = 9, status = 'active' WHERE name = 'ADMIN_OPS';

-- Level 8 roles
UPDATE rbac_roles SET level = 8, status = 'active' WHERE name = 'STORE_INCHARGE_SR';
UPDATE rbac_roles SET level = 8, status = 'active' WHERE name = 'HUB_INCHARGE_SR';

-- Level 7 roles
UPDATE rbac_roles SET level = 7, status = 'active' WHERE name = 'OPERATIONS_MANAGER';
UPDATE rbac_roles SET level = 7, status = 'active' WHERE name = 'MANAGER';
UPDATE rbac_roles SET level = 7, status = 'active' WHERE name = 'ACCOUNTS_PAYABLE';
UPDATE rbac_roles SET level = 7, status = 'active' WHERE name = 'PROCUREMENT_OFFICER';

-- Level 6 roles
UPDATE rbac_roles SET level = 6, status = 'active' WHERE name = 'SUPERVISOR';
UPDATE rbac_roles SET level = 6, status = 'active' WHERE name = 'COMPLIANCE';
UPDATE rbac_roles SET level = 6, status = 'active' WHERE name = 'LEGAL';

-- Level 5 roles
UPDATE rbac_roles SET level = 5, status = 'active' WHERE name = 'HUB_INCHARGE';
UPDATE rbac_roles SET level = 5, status = 'active' WHERE name = 'STORE_INCHARGE';
UPDATE rbac_roles SET level = 5, status = 'active' WHERE name = 'BRANCH_INCHARGE';

-- Level 4 roles
UPDATE rbac_roles SET level = 4, status = 'active' WHERE name = 'ACCOUNTANT';
UPDATE rbac_roles SET level = 4, status = 'active' WHERE name = 'HR';
UPDATE rbac_roles SET level = 4, status = 'active' WHERE name = 'TREASURY';
UPDATE rbac_roles SET level = 4, status = 'active' WHERE name = 'ACCOUNTS';
UPDATE rbac_roles SET level = 4, status = 'active' WHERE name = 'BANKER';

-- Level 3 roles
UPDATE rbac_roles SET level = 3, status = 'active' WHERE name = 'STAFF';
UPDATE rbac_roles SET level = 3, status = 'active' WHERE name = 'IT_ADMIN';

-- Level 2 roles
UPDATE rbac_roles SET level = 2, status = 'active' WHERE name = 'AUDITOR';
UPDATE rbac_roles SET level = 2, status = 'active' WHERE name = 'INTERN';

-- Level 1 roles
UPDATE rbac_roles SET level = 1, status = 'active' WHERE name = 'DATA_ENTRY';


-- ============================================================================
-- STEP 2: Update users_enhanced.business_level based on their role
-- This ensures all users have the correct business_level matching their role
-- ============================================================================

UPDATE users_enhanced ue
SET business_level = r.level
FROM rbac_roles r
WHERE ue.role = r.name;

-- ============================================================================
-- STEP 3: Specifically fix ADMIN users to have level 10
-- ============================================================================

UPDATE users_enhanced 
SET business_level = 10 
WHERE role = 'ADMIN';

UPDATE users_enhanced 
SET business_level = 10 
WHERE role = 'SUPER_ADMIN';

-- ============================================================================
-- STEP 4: Verify the changes
-- ============================================================================

SELECT 'rbac_roles after update:' as info;
SELECT name, level, status FROM rbac_roles ORDER BY level DESC, name;

SELECT 'users_enhanced after update:' as info;
SELECT email, role, business_level, system_scope 
FROM users_enhanced 
ORDER BY business_level DESC, role;
