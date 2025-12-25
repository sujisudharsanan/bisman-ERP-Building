-- ============================================================================
-- UNIFIED HIERARCHY SYSTEM MIGRATION
-- ============================================================================
-- Date: 2025-12-24
-- Purpose: Implement single, scalable 10-100 authority hierarchy
-- 
-- KEY CHANGES:
-- 1. Add level column to roles table with 10-100 scale
-- 2. Add new finance/HR split roles
-- 3. Add authority override support to users
-- 4. Create audit trail for authority changes
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD LEVEL COLUMN TO ROLES TABLE
-- ============================================================================

-- Add level column if it doesn't exist
ALTER TABLE roles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 20;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Set levels for existing roles (10-100 scale)
UPDATE roles SET level = 100, display_name = 'Super Admin' WHERE name = 'Super Admin';
UPDATE roles SET level = 90, display_name = 'Admin' WHERE name = 'Admin';
UPDATE roles SET level = 70, display_name = 'Manager' WHERE name = 'Manager';
UPDATE roles SET level = 20, display_name = 'User' WHERE name = 'User';

-- Add new roles for complete hierarchy
INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Viewer', 'Read-only access', 10, 'Viewer', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Viewer');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Staff', 'Staff level access', 20, 'Staff', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Staff');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Accountant', 'Accounting access', 30, 'Accountant', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Accountant');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'HR Executive', 'HR execution tasks', 30, 'HR Executive', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'HR Executive');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Store Incharge', 'Store management', 40, 'Store Incharge', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Store Incharge');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Hub Incharge', 'Hub management', 55, 'Hub Incharge', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Hub Incharge');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Branch Incharge', 'Branch operations', 60, 'Branch Incharge', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Branch Incharge');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Finance Manager', 'Finance approval authority', 70, 'Finance Manager', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Finance Manager');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'HR Manager', 'HR approval authority', 70, 'HR Manager', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'HR Manager');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Branch Manager', 'Branch management authority', 75, 'Branch Manager', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Branch Manager');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Operations Manager', 'Operations oversight', 80, 'Operations Manager', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Operations Manager');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'Finance Controller', 'Finance control authority', 85, 'Finance Controller', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Finance Controller');

INSERT INTO roles (name, description, level, display_name, is_active, created_at, updated_at)
SELECT 'CFO', 'Chief Financial Officer', 85, 'CFO', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CFO');

-- ============================================================================
-- 2. ADD AUTHORITY OVERRIDE COLUMNS TO USERS TABLE
-- ============================================================================

-- Add authority override columns (for temporary delegation)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS authority_override_level INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS override_start_date TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS override_end_date TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS override_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS override_granted_by INTEGER DEFAULT NULL;

-- Add constraint: override level must be between 10 and 100
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_authority_override_level') THEN
        ALTER TABLE users ADD CONSTRAINT chk_authority_override_level 
            CHECK (authority_override_level IS NULL OR (authority_override_level >= 10 AND authority_override_level <= 100));
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE AUTHORITY OVERRIDE AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS authority_override_audit (
    id SERIAL PRIMARY KEY,
    
    -- Who was affected
    user_id INTEGER NOT NULL,
    
    -- What changed
    action VARCHAR(50) NOT NULL, -- 'GRANTED', 'REVOKED', 'EXPIRED', 'MODIFIED'
    previous_override_level INTEGER,
    new_override_level INTEGER,
    
    -- Override details
    override_start_date TIMESTAMP,
    override_end_date TIMESTAMP,
    override_reason TEXT,
    
    -- Who made the change
    granted_by INTEGER NOT NULL,
    granted_by_role VARCHAR(100),
    granted_by_level INTEGER,
    
    -- Audit metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_override_action CHECK (action IN ('GRANTED', 'REVOKED', 'EXPIRED', 'MODIFIED'))
);

CREATE INDEX IF NOT EXISTS idx_authority_audit_user ON authority_override_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_authority_audit_granted_by ON authority_override_audit(granted_by);
CREATE INDEX IF NOT EXISTS idx_authority_audit_created ON authority_override_audit(created_at DESC);

-- ============================================================================
-- 4. CREATE FUNCTION TO GET EFFECTIVE AUTHORITY LEVEL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_effective_authority_level(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_role_level INTEGER;
    v_override_level INTEGER;
    v_override_end TIMESTAMP;
BEGIN
    -- Get user's role level and override info
    SELECT 
        COALESCE(r.level, 20) AS role_level,
        u.authority_override_level,
        u.override_end_date
    INTO v_role_level, v_override_level, v_override_end
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;
    
    -- If no user found, return minimum level
    IF v_role_level IS NULL THEN
        RETURN 10;
    END IF;
    
    -- Check if override is active and not expired
    IF v_override_level IS NOT NULL THEN
        IF v_override_end IS NULL OR v_override_end > NOW() THEN
            RETURN v_override_level;
        END IF;
    END IF;
    
    -- Return role level
    RETURN v_role_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE FUNCTION TO CHECK APPROVAL AUTHORITY
-- ============================================================================

CREATE OR REPLACE FUNCTION can_approve(
    p_approver_id INTEGER, 
    p_creator_id INTEGER,
    p_min_required_level INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_approver_level INTEGER;
    v_creator_level INTEGER;
BEGIN
    v_approver_level := get_effective_authority_level(p_approver_id);
    v_creator_level := get_effective_authority_level(p_creator_id);
    
    -- Approver must have higher level than creator
    -- AND meet minimum required level if specified
    RETURN v_approver_level > v_creator_level 
           AND v_approver_level >= p_min_required_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREATE FUNCTION TO GET NEXT ESCALATION TARGET
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_escalation_level(p_current_level INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_next_level INTEGER;
BEGIN
    -- Find the next higher level that exists
    SELECT MIN(level) INTO v_next_level
    FROM roles
    WHERE level > p_current_level
    AND is_active = true;
    
    -- If no higher level, return ADMIN level (90)
    RETURN COALESCE(v_next_level, 90);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. CREATE FUNCTION TO GRANT AUTHORITY OVERRIDE
-- ============================================================================

CREATE OR REPLACE FUNCTION grant_authority_override(
    p_user_id INTEGER,
    p_new_level INTEGER,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP,
    p_reason TEXT,
    p_granted_by INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_granter_level INTEGER;
    v_current_override INTEGER;
    v_granter_role VARCHAR(100);
BEGIN
    -- Get granter's level
    v_granter_level := get_effective_authority_level(p_granted_by);
    
    -- Granter must be ADMIN (90+) to grant overrides
    IF v_granter_level < 90 THEN
        RAISE EXCEPTION 'Only ADMIN+ can grant authority overrides';
    END IF;
    
    -- Cannot grant higher level than granter has
    IF p_new_level > v_granter_level THEN
        RAISE EXCEPTION 'Cannot grant higher authority than your own level';
    END IF;
    
    -- Get current override for audit
    SELECT authority_override_level INTO v_current_override
    FROM users WHERE id = p_user_id;
    
    -- Get granter's role name
    SELECT role INTO v_granter_role FROM users WHERE id = p_granted_by;
    
    -- Update user's override
    UPDATE users SET
        authority_override_level = p_new_level,
        override_start_date = p_start_date,
        override_end_date = p_end_date,
        override_reason = p_reason,
        override_granted_by = p_granted_by,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log to audit
    INSERT INTO authority_override_audit (
        user_id, action, previous_override_level, new_override_level,
        override_start_date, override_end_date, override_reason,
        granted_by, granted_by_role, granted_by_level
    ) VALUES (
        p_user_id, 
        CASE WHEN v_current_override IS NULL THEN 'GRANTED' ELSE 'MODIFIED' END,
        v_current_override, p_new_level,
        p_start_date, p_end_date, p_reason,
        p_granted_by, v_granter_role, v_granter_level
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. CREATE FUNCTION TO REVOKE AUTHORITY OVERRIDE
-- ============================================================================

CREATE OR REPLACE FUNCTION revoke_authority_override(
    p_user_id INTEGER,
    p_revoked_by INTEGER,
    p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_revoker_level INTEGER;
    v_current_override INTEGER;
    v_revoker_role VARCHAR(100);
BEGIN
    -- Get revoker's level
    v_revoker_level := get_effective_authority_level(p_revoked_by);
    
    -- Revoker must be ADMIN (90+)
    IF v_revoker_level < 90 THEN
        RAISE EXCEPTION 'Only ADMIN+ can revoke authority overrides';
    END IF;
    
    -- Get current override for audit
    SELECT authority_override_level INTO v_current_override
    FROM users WHERE id = p_user_id;
    
    -- Get revoker's role name
    SELECT role INTO v_revoker_role FROM users WHERE id = p_revoked_by;
    
    -- Clear override
    UPDATE users SET
        authority_override_level = NULL,
        override_start_date = NULL,
        override_end_date = NULL,
        override_reason = NULL,
        override_granted_by = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log to audit
    INSERT INTO authority_override_audit (
        user_id, action, previous_override_level, new_override_level,
        override_reason, granted_by, granted_by_role, granted_by_level
    ) VALUES (
        p_user_id, 'REVOKED', v_current_override, NULL,
        p_reason, p_revoked_by, v_revoker_role, v_revoker_level
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. CREATE VIEW FOR ROLE HIERARCHY
-- ============================================================================

CREATE OR REPLACE VIEW v_role_hierarchy AS
SELECT 
    id,
    name,
    display_name,
    level,
    description,
    is_active,
    CASE 
        WHEN level >= 90 THEN 'EXECUTIVE'
        WHEN level >= 70 THEN 'MANAGER'
        WHEN level >= 50 THEN 'SENIOR'
        WHEN level >= 30 THEN 'OFFICER'
        WHEN level >= 20 THEN 'STAFF'
        ELSE 'VIEWER'
    END AS tier,
    CASE 
        WHEN level >= 90 THEN true
        ELSE false
    END AS is_admin,
    CASE 
        WHEN level >= 70 THEN true
        ELSE false
    END AS can_approve_payments,
    CASE 
        WHEN level >= 60 THEN true
        ELSE false
    END AS can_approve_tasks
FROM roles
ORDER BY level DESC;

-- ============================================================================
-- 10. CREATE PAYMENT APPROVAL STEP MAPPING
-- ============================================================================

-- Payment steps map to authority levels, not role names
CREATE TABLE IF NOT EXISTS payment_approval_steps (
    id SERIAL PRIMARY KEY,
    step_code VARCHAR(10) NOT NULL UNIQUE, -- A1, A2, A3, A4
    step_order INTEGER NOT NULL,
    min_authority_level INTEGER NOT NULL,
    max_amount DECIMAL(15,2), -- NULL = unlimited
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default payment steps
INSERT INTO payment_approval_steps (step_code, step_order, min_authority_level, max_amount, description)
VALUES 
    ('A1', 1, 60, 10000, 'First approval - Branch level'),
    ('A2', 2, 70, 50000, 'Second approval - Manager level'),
    ('A3', 3, 80, 200000, 'Third approval - Operations level'),
    ('A4', 4, 90, NULL, 'Final approval - Admin level')
ON CONFLICT (step_code) DO NOTHING;

-- ============================================================================
-- 11. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_effective_authority_level IS 'Returns user authority level (override if active, else role level)';
COMMENT ON FUNCTION can_approve IS 'Check if approver can approve creator''s request';
COMMENT ON FUNCTION get_next_escalation_level IS 'Get next higher authority level for escalation';
COMMENT ON FUNCTION grant_authority_override IS 'Grant temporary authority override (ADMIN+ only)';
COMMENT ON FUNCTION revoke_authority_override IS 'Revoke authority override (ADMIN+ only)';
COMMENT ON TABLE authority_override_audit IS 'Audit trail for all authority override changes';
COMMENT ON TABLE payment_approval_steps IS 'Anonymous payment approval steps mapped to authority levels';

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
