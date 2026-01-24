-- ============================================================================
-- BISMAN ERP - Plan Module Access Migration
-- Implements Free vs Paid module entitlement gating
-- Date: January 17, 2026
-- ============================================================================

-- 1. Create access_level enum type
DO $$ BEGIN
    CREATE TYPE module_access_level AS ENUM ('full', 'read', 'none');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create plan_module_access table
CREATE TABLE IF NOT EXISTS plan_module_access (
    id SERIAL PRIMARY KEY,
    plan_id INT NOT NULL,
    module_id VARCHAR(100) NOT NULL,
    access_level module_access_level NOT NULL DEFAULT 'none',
    page_limit INT DEFAULT -1,  -- -1 = all pages, or specific count
    features_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to subscription_plans
    CONSTRAINT fk_plan_module_access_plan 
        FOREIGN KEY (plan_id) 
        REFERENCES subscription_plans(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint per plan-module combination
    CONSTRAINT unique_plan_module UNIQUE (plan_id, module_id)
);

-- 3. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_plan_module_access_plan ON plan_module_access(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_module_access_module ON plan_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_plan_module_access_level ON plan_module_access(access_level);

-- 4. Add comment for documentation
COMMENT ON TABLE plan_module_access IS 'Controls which modules are available in each subscription plan. Used for Free vs Paid enforcement.';
COMMENT ON COLUMN plan_module_access.module_id IS 'Module ID matching master-modules.js (e.g., finance, operations, hr)';
COMMENT ON COLUMN plan_module_access.access_level IS 'full = complete access, read_only = GET only, none = blocked';
COMMENT ON COLUMN plan_module_access.page_limit IS '-1 means all pages, otherwise limits the number of pages accessible';

-- 5. Create audit trigger for plan_module_access changes
CREATE OR REPLACE FUNCTION audit_plan_module_access_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        COALESCE(current_setting('app.current_user_id', true)::INT, 0),
        TG_OP,
        'plan_module_access',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_plan_module_access ON plan_module_access;
CREATE TRIGGER trg_audit_plan_module_access
    AFTER INSERT OR UPDATE OR DELETE ON plan_module_access
    FOR EACH ROW EXECUTE FUNCTION audit_plan_module_access_changes();

-- ============================================================================
-- 6. SEED DATA - Module access mappings for each plan
-- ============================================================================

-- Define all modules from master-modules.js
-- Always accessible: dashboard, common, chat
-- Business modules: finance, operations, inventory, procurement, compliance, hr, sales, production, shipping, assets, governance, task-management, qa, analytics
-- Admin modules: admin, super-admin, system, client-management, security-management, enterprise-admin, subscriptions
-- Special: internal, pump-management

-- Get plan IDs dynamically and seed data
DO $$
DECLARE
    v_free_plan_id INT;
    v_basic_plan_id INT;
    v_standard_plan_id INT;
    v_premium_plan_id INT;
    v_enterprise_plan_id INT;
BEGIN
    -- Get plan IDs (handle case where plans might not exist)
    SELECT id INTO v_free_plan_id FROM subscription_plans WHERE plan_code IN ('FREE', 'free') LIMIT 1;
    SELECT id INTO v_basic_plan_id FROM subscription_plans WHERE plan_code IN ('BASIC', 'basic') LIMIT 1;
    SELECT id INTO v_standard_plan_id FROM subscription_plans WHERE plan_code IN ('STANDARD', 'standard', 'PRO', 'pro') LIMIT 1;
    SELECT id INTO v_premium_plan_id FROM subscription_plans WHERE plan_code IN ('PREMIUM', 'premium') LIMIT 1;
    SELECT id INTO v_enterprise_plan_id FROM subscription_plans WHERE plan_code IN ('ENTERPRISE', 'enterprise') LIMIT 1;

    -- ========================================================================
    -- FREE PLAN - Minimal access
    -- ========================================================================
    IF v_free_plan_id IS NOT NULL THEN
        -- Always accessible modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_free_plan_id, 'dashboard', 'full'),
            (v_free_plan_id, 'common', 'full'),
            (v_free_plan_id, 'chat', 'full')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Limited access modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_free_plan_id, 'finance', 'read'),
            (v_free_plan_id, 'admin', 'read')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Blocked modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_free_plan_id, 'operations', 'none'),
            (v_free_plan_id, 'inventory', 'none'),
            (v_free_plan_id, 'procurement', 'none'),
            (v_free_plan_id, 'compliance', 'none'),
            (v_free_plan_id, 'hr', 'none'),
            (v_free_plan_id, 'sales', 'none'),
            (v_free_plan_id, 'production', 'none'),
            (v_free_plan_id, 'shipping', 'none'),
            (v_free_plan_id, 'assets', 'none'),
            (v_free_plan_id, 'governance', 'none'),
            (v_free_plan_id, 'task-management', 'none'),
            (v_free_plan_id, 'analytics', 'none'),
            (v_free_plan_id, 'qa', 'none'),
            (v_free_plan_id, 'internal', 'none'),
            (v_free_plan_id, 'pump-management', 'none'),
            (v_free_plan_id, 'super-admin', 'none'),
            (v_free_plan_id, 'system', 'none'),
            (v_free_plan_id, 'client-management', 'none'),
            (v_free_plan_id, 'security-management', 'none'),
            (v_free_plan_id, 'enterprise-admin', 'none'),
            (v_free_plan_id, 'subscriptions', 'none'),
            (v_free_plan_id, 'billing', 'none')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        RAISE NOTICE 'FREE plan module access seeded (plan_id: %)', v_free_plan_id;
    END IF;

    -- ========================================================================
    -- BASIC PLAN - Core business modules
    -- ========================================================================
    IF v_basic_plan_id IS NOT NULL THEN
        -- Full access modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_basic_plan_id, 'dashboard', 'full'),
            (v_basic_plan_id, 'common', 'full'),
            (v_basic_plan_id, 'chat', 'full'),
            (v_basic_plan_id, 'finance', 'full'),
            (v_basic_plan_id, 'admin', 'full'),
            (v_basic_plan_id, 'task-management', 'full')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Read-only access modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_basic_plan_id, 'operations', 'read'),
            (v_basic_plan_id, 'inventory', 'read'),
            (v_basic_plan_id, 'analytics', 'read')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Blocked modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_basic_plan_id, 'procurement', 'none'),
            (v_basic_plan_id, 'compliance', 'none'),
            (v_basic_plan_id, 'hr', 'none'),
            (v_basic_plan_id, 'sales', 'none'),
            (v_basic_plan_id, 'production', 'none'),
            (v_basic_plan_id, 'shipping', 'none'),
            (v_basic_plan_id, 'assets', 'none'),
            (v_basic_plan_id, 'governance', 'none'),
            (v_basic_plan_id, 'qa', 'none'),
            (v_basic_plan_id, 'internal', 'none'),
            (v_basic_plan_id, 'pump-management', 'none'),
            (v_basic_plan_id, 'super-admin', 'none'),
            (v_basic_plan_id, 'system', 'none'),
            (v_basic_plan_id, 'client-management', 'none'),
            (v_basic_plan_id, 'security-management', 'none'),
            (v_basic_plan_id, 'enterprise-admin', 'none'),
            (v_basic_plan_id, 'subscriptions', 'none'),
            (v_basic_plan_id, 'billing', 'none')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        RAISE NOTICE 'BASIC plan module access seeded (plan_id: %)', v_basic_plan_id;
    END IF;

    -- ========================================================================
    -- STANDARD/PRO PLAN - Most business modules
    -- ========================================================================
    IF v_standard_plan_id IS NOT NULL THEN
        -- Full access modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_standard_plan_id, 'dashboard', 'full'),
            (v_standard_plan_id, 'common', 'full'),
            (v_standard_plan_id, 'chat', 'full'),
            (v_standard_plan_id, 'finance', 'full'),
            (v_standard_plan_id, 'operations', 'full'),
            (v_standard_plan_id, 'inventory', 'full'),
            (v_standard_plan_id, 'procurement', 'full'),
            (v_standard_plan_id, 'hr', 'full'),
            (v_standard_plan_id, 'sales', 'full'),
            (v_standard_plan_id, 'admin', 'full'),
            (v_standard_plan_id, 'task-management', 'full'),
            (v_standard_plan_id, 'analytics', 'full')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Read-only access modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_standard_plan_id, 'compliance', 'read'),
            (v_standard_plan_id, 'production', 'read'),
            (v_standard_plan_id, 'governance', 'read')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Blocked modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_standard_plan_id, 'shipping', 'none'),
            (v_standard_plan_id, 'assets', 'none'),
            (v_standard_plan_id, 'qa', 'none'),
            (v_standard_plan_id, 'internal', 'none'),
            (v_standard_plan_id, 'pump-management', 'none'),
            (v_standard_plan_id, 'super-admin', 'none'),
            (v_standard_plan_id, 'system', 'none'),
            (v_standard_plan_id, 'client-management', 'none'),
            (v_standard_plan_id, 'security-management', 'none'),
            (v_standard_plan_id, 'enterprise-admin', 'none'),
            (v_standard_plan_id, 'subscriptions', 'none'),
            (v_standard_plan_id, 'billing', 'none')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        RAISE NOTICE 'STANDARD/PRO plan module access seeded (plan_id: %)', v_standard_plan_id;
    END IF;

    -- ========================================================================
    -- PREMIUM PLAN - Almost all modules
    -- ========================================================================
    IF v_premium_plan_id IS NOT NULL THEN
        -- Full access modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_premium_plan_id, 'dashboard', 'full'),
            (v_premium_plan_id, 'common', 'full'),
            (v_premium_plan_id, 'chat', 'full'),
            (v_premium_plan_id, 'finance', 'full'),
            (v_premium_plan_id, 'operations', 'full'),
            (v_premium_plan_id, 'inventory', 'full'),
            (v_premium_plan_id, 'procurement', 'full'),
            (v_premium_plan_id, 'compliance', 'full'),
            (v_premium_plan_id, 'hr', 'full'),
            (v_premium_plan_id, 'sales', 'full'),
            (v_premium_plan_id, 'production', 'full'),
            (v_premium_plan_id, 'shipping', 'full'),
            (v_premium_plan_id, 'assets', 'full'),
            (v_premium_plan_id, 'governance', 'full'),
            (v_premium_plan_id, 'task-management', 'full'),
            (v_premium_plan_id, 'analytics', 'full'),
            (v_premium_plan_id, 'admin', 'full'),
            (v_premium_plan_id, 'super-admin', 'full'),
            (v_premium_plan_id, 'system', 'full'),
            (v_premium_plan_id, 'client-management', 'full'),
            (v_premium_plan_id, 'billing', 'full')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Read-only access modules
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_premium_plan_id, 'security-management', 'read')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        -- Blocked modules (internal/enterprise only)
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_premium_plan_id, 'qa', 'none'),
            (v_premium_plan_id, 'internal', 'none'),
            (v_premium_plan_id, 'pump-management', 'none'),
            (v_premium_plan_id, 'enterprise-admin', 'none'),
            (v_premium_plan_id, 'subscriptions', 'none')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        RAISE NOTICE 'PREMIUM plan module access seeded (plan_id: %)', v_premium_plan_id;
    END IF;

    -- ========================================================================
    -- ENTERPRISE PLAN - All modules full access
    -- ========================================================================
    IF v_enterprise_plan_id IS NOT NULL THEN
        INSERT INTO plan_module_access (plan_id, module_id, access_level) VALUES
            (v_enterprise_plan_id, 'dashboard', 'full'),
            (v_enterprise_plan_id, 'common', 'full'),
            (v_enterprise_plan_id, 'chat', 'full'),
            (v_enterprise_plan_id, 'finance', 'full'),
            (v_enterprise_plan_id, 'operations', 'full'),
            (v_enterprise_plan_id, 'inventory', 'full'),
            (v_enterprise_plan_id, 'procurement', 'full'),
            (v_enterprise_plan_id, 'compliance', 'full'),
            (v_enterprise_plan_id, 'hr', 'full'),
            (v_enterprise_plan_id, 'sales', 'full'),
            (v_enterprise_plan_id, 'production', 'full'),
            (v_enterprise_plan_id, 'shipping', 'full'),
            (v_enterprise_plan_id, 'assets', 'full'),
            (v_enterprise_plan_id, 'governance', 'full'),
            (v_enterprise_plan_id, 'task-management', 'full'),
            (v_enterprise_plan_id, 'analytics', 'full'),
            (v_enterprise_plan_id, 'admin', 'full'),
            (v_enterprise_plan_id, 'super-admin', 'full'),
            (v_enterprise_plan_id, 'system', 'full'),
            (v_enterprise_plan_id, 'client-management', 'full'),
            (v_enterprise_plan_id, 'security-management', 'full'),
            (v_enterprise_plan_id, 'enterprise-admin', 'full'),
            (v_enterprise_plan_id, 'subscriptions', 'full'),
            (v_enterprise_plan_id, 'billing', 'full'),
            (v_enterprise_plan_id, 'qa', 'full'),
            (v_enterprise_plan_id, 'internal', 'full'),
            (v_enterprise_plan_id, 'pump-management', 'full')
        ON CONFLICT (plan_id, module_id) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = NOW();

        RAISE NOTICE 'ENTERPRISE plan module access seeded (plan_id: %)', v_enterprise_plan_id;
    END IF;

    -- Log completion
    RAISE NOTICE 'Plan module access migration completed successfully';
END $$;

-- ============================================================================
-- 7. Create helper function to check module access
-- ============================================================================
CREATE OR REPLACE FUNCTION check_module_access(
    p_tenant_id UUID,
    p_module_id VARCHAR(100)
) RETURNS module_access_level AS $$
DECLARE
    v_access_level module_access_level;
BEGIN
    -- Get access level for tenant's plan and module
    SELECT pma.access_level INTO v_access_level
    FROM plan_module_access pma
    JOIN client_subscriptions cs ON cs.plan_id = pma.plan_id
    WHERE cs.client_id = p_tenant_id
      AND pma.module_id = p_module_id
      AND cs.is_active = TRUE;

    -- Default to 'none' if no mapping found
    RETURN COALESCE(v_access_level, 'none'::module_access_level);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_module_access IS 'Returns the access level (full/read_only/none) for a tenant and module combination';

-- ============================================================================
-- 8. Create view for easy module access lookup
-- ============================================================================
CREATE OR REPLACE VIEW v_tenant_module_access AS
SELECT 
    cs.client_id AS tenant_id,
    c.name AS tenant_name,
    sp.plan_code,
    sp.name AS plan_name,
    pma.module_id,
    pma.access_level,
    pma.page_limit,
    cs.state AS subscription_state,
    cs.is_active
FROM client_subscriptions cs
JOIN subscription_plans sp ON sp.id = cs.plan_id
JOIN clients c ON c.id = cs.client_id
LEFT JOIN plan_module_access pma ON pma.plan_id = cs.plan_id
WHERE cs.is_active = TRUE;

COMMENT ON VIEW v_tenant_module_access IS 'View showing all module access levels for active tenants';

-- Done
SELECT 'Migration 20260117_add_plan_module_access completed successfully' AS status;
