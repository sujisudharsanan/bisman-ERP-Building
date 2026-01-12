-- ============================================================================
-- P0 RBAC CRITICAL MIGRATION: Add system_scope column
-- Priority: CRITICAL
-- Date: 2026-01-13
-- 
-- This migration adds the system_scope column to:
-- 1. users_enhanced table
-- 2. roles table
-- 
-- system_scope values:
--   CROSS_TENANT - Super Admin, Enterprise Admin (can access all tenants)
--   TENANT       - Admin, IT_Admin (can access entire tenant)
--   BUSINESS     - All other roles (scoped to specific business operations)
-- ============================================================================

-- ============================================================================
-- PART 1: Add system_scope to users_enhanced
-- ============================================================================

-- 1.1 Add the column with default
ALTER TABLE users_enhanced
ADD COLUMN IF NOT EXISTS system_scope VARCHAR(20) DEFAULT 'BUSINESS';

-- 1.2 Add CHECK constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_users_enhanced_system_scope'
    ) THEN
        ALTER TABLE users_enhanced
        ADD CONSTRAINT chk_users_enhanced_system_scope 
        CHECK (system_scope IN ('CROSS_TENANT', 'TENANT', 'BUSINESS'));
    END IF;
END $$;

-- 1.3 Populate system_scope based on role
UPDATE users_enhanced
SET system_scope = CASE
    WHEN UPPER(role) IN ('SUPER_ADMIN', 'ENTERPRISE_ADMIN') THEN 'CROSS_TENANT'
    WHEN UPPER(role) IN ('ADMIN', 'IT_ADMIN') THEN 'TENANT'
    ELSE 'BUSINESS'
END
WHERE system_scope IS NULL OR system_scope = 'BUSINESS';

-- 1.4 Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_enhanced_system_scope 
ON users_enhanced(system_scope);

COMMENT ON COLUMN users_enhanced.system_scope IS 
'Authorization scope: CROSS_TENANT (super admin), TENANT (admin), BUSINESS (standard users)';

-- ============================================================================
-- PART 2: Add system_scope to roles table
-- ============================================================================

-- 2.1 Add column to roles
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS system_scope VARCHAR(20) DEFAULT 'BUSINESS';

-- 2.2 Add business_level to roles if missing
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS business_level INT DEFAULT 1;

-- 2.3 Add is_system_role if missing
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false;

-- 2.4 Add CHECK constraint to roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_roles_system_scope'
    ) THEN
        ALTER TABLE roles
        ADD CONSTRAINT chk_roles_system_scope 
        CHECK (system_scope IN ('CROSS_TENANT', 'TENANT', 'BUSINESS'));
    END IF;
END $$;

-- 2.5 Update/Insert standard roles with proper scope and level
INSERT INTO roles (name, display_name, description, business_level, system_scope, is_system_role, is_active, created_at)
VALUES 
    ('SUPER_ADMIN', 'Super Administrator', 'Cross-tenant system administrator', 10, 'CROSS_TENANT', true, true, NOW()),
    ('ENTERPRISE_ADMIN', 'Enterprise Administrator', 'Cross-tenant enterprise administrator', 10, 'CROSS_TENANT', true, true, NOW()),
    ('ADMIN', 'Administrator', 'Tenant-level administrator', 10, 'TENANT', true, true, NOW()),
    ('IT_ADMIN', 'IT Administrator', 'Tenant-level IT administrator', 3, 'TENANT', true, true, NOW()),
    ('CEO', 'Chief Executive Officer', 'C-level executive', 10, 'BUSINESS', false, true, NOW()),
    ('CFO', 'Chief Financial Officer', 'C-level executive', 10, 'BUSINESS', false, true, NOW()),
    ('COO', 'Chief Operating Officer', 'C-level executive', 10, 'BUSINESS', false, true, NOW()),
    ('CTO', 'Chief Technology Officer', 'C-level executive', 10, 'BUSINESS', false, true, NOW()),
    ('ADMIN_OPS', 'Admin Operations', 'Administrative operations manager', 9, 'BUSINESS', false, true, NOW()),
    ('FINANCE_CONTROLLER', 'Finance Controller', 'Finance department controller', 9, 'BUSINESS', false, true, NOW()),
    ('HR_MANAGER', 'HR Manager', 'Human resources manager', 9, 'BUSINESS', false, true, NOW()),
    ('HUB_INCHARGE_SR', 'Senior Hub Incharge', 'Senior hub manager', 8, 'BUSINESS', false, true, NOW()),
    ('STORE_INCHARGE_SR', 'Senior Store Incharge', 'Senior store manager', 8, 'BUSINESS', false, true, NOW()),
    ('ACCOUNTS_PAYABLE', 'Accounts Payable', 'Accounts payable specialist', 7, 'BUSINESS', false, true, NOW()),
    ('MANAGER', 'Manager', 'General manager', 7, 'BUSINESS', false, true, NOW()),
    ('OPERATIONS_MANAGER', 'Operations Manager', 'Operations manager', 7, 'BUSINESS', false, true, NOW()),
    ('PROCUREMENT_OFFICER', 'Procurement Officer', 'Procurement specialist', 7, 'BUSINESS', false, true, NOW()),
    ('COMPLIANCE', 'Compliance Officer', 'Compliance specialist', 6, 'BUSINESS', false, true, NOW()),
    ('LEGAL', 'Legal Officer', 'Legal specialist', 6, 'BUSINESS', false, true, NOW()),
    ('SUPERVISOR', 'Supervisor', 'Team supervisor', 6, 'BUSINESS', false, true, NOW()),
    ('BRANCH_INCHARGE', 'Branch Incharge', 'Branch manager', 5, 'BUSINESS', false, true, NOW()),
    ('HUB_INCHARGE', 'Hub Incharge', 'Hub manager', 5, 'BUSINESS', false, true, NOW()),
    ('STORE_INCHARGE', 'Store Incharge', 'Store manager', 5, 'BUSINESS', false, true, NOW()),
    ('ACCOUNTANT', 'Accountant', 'Accounting specialist', 4, 'BUSINESS', false, true, NOW()),
    ('ACCOUNTS', 'Accounts', 'Accounts team member', 4, 'BUSINESS', false, true, NOW()),
    ('BANKER', 'Banker', 'Banking specialist', 4, 'BUSINESS', false, true, NOW()),
    ('HR', 'Human Resources', 'HR team member', 4, 'BUSINESS', false, true, NOW()),
    ('TREASURY', 'Treasury', 'Treasury specialist', 4, 'BUSINESS', false, true, NOW()),
    ('STAFF', 'Staff', 'General staff member', 3, 'BUSINESS', false, true, NOW()),
    ('AUDITOR', 'Auditor', 'Internal auditor', 2, 'BUSINESS', false, true, NOW()),
    ('INTERN', 'Intern', 'Intern position', 2, 'BUSINESS', false, true, NOW()),
    ('DATA_ENTRY', 'Data Entry', 'Data entry operator', 1, 'BUSINESS', false, true, NOW())
ON CONFLICT (name) DO UPDATE SET
    system_scope = EXCLUDED.system_scope,
    business_level = EXCLUDED.business_level,
    is_system_role = EXCLUDED.is_system_role;

COMMENT ON COLUMN roles.system_scope IS 
'Authorization scope for this role: CROSS_TENANT, TENANT, or BUSINESS';
COMMENT ON COLUMN roles.business_level IS 
'Hierarchy level (1-10) for permission inheritance';

-- ============================================================================
-- PART 3: Fix business_level for existing users
-- ============================================================================

-- 3.1 Update business_level based on role for users who have NULL or 1
UPDATE users_enhanced u
SET business_level = COALESCE(
    (SELECT r.business_level FROM roles r WHERE UPPER(r.name) = UPPER(u.role)),
    CASE 
        WHEN UPPER(u.role) IN ('SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'CEO', 'CFO', 'COO', 'CTO', 'ADMIN') THEN 10
        WHEN UPPER(u.role) IN ('ADMIN_OPS', 'FINANCE_CONTROLLER', 'HR_MANAGER') THEN 9
        WHEN UPPER(u.role) IN ('HUB_INCHARGE_SR', 'STORE_INCHARGE_SR') THEN 8
        WHEN UPPER(u.role) IN ('ACCOUNTS_PAYABLE', 'MANAGER', 'OPERATIONS_MANAGER', 'PROCUREMENT_OFFICER') THEN 7
        WHEN UPPER(u.role) IN ('COMPLIANCE', 'LEGAL', 'SUPERVISOR') THEN 6
        WHEN UPPER(u.role) IN ('BRANCH_INCHARGE', 'HUB_INCHARGE', 'STORE_INCHARGE') THEN 5
        WHEN UPPER(u.role) IN ('ACCOUNTANT', 'ACCOUNTS', 'BANKER', 'HR', 'TREASURY') THEN 4
        WHEN UPPER(u.role) IN ('IT_ADMIN', 'STAFF') THEN 3
        WHEN UPPER(u.role) IN ('AUDITOR', 'INTERN') THEN 2
        ELSE 1
    END
)
WHERE business_level IS NULL OR business_level = 1;

-- ============================================================================
-- PART 4: Verification Queries (for manual review)
-- ============================================================================

-- Check users with their scope
-- SELECT email, role, business_level, system_scope FROM users_enhanced ORDER BY business_level DESC;

-- Check roles table
-- SELECT name, business_level, system_scope, is_system_role FROM roles ORDER BY business_level DESC;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- ALTER TABLE users_enhanced DROP CONSTRAINT IF EXISTS chk_users_enhanced_system_scope;
-- ALTER TABLE users_enhanced DROP COLUMN IF EXISTS system_scope;
-- ALTER TABLE roles DROP CONSTRAINT IF EXISTS chk_roles_system_scope;
-- ALTER TABLE roles DROP COLUMN IF EXISTS system_scope;
