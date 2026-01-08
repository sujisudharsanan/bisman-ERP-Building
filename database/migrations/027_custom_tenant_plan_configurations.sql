-- ============================================================================
-- BISMAN ERP - Custom Tenant Plan Configurations
-- Migration: 027_custom_tenant_plan_configurations.sql
-- Date: 2025-01-08
-- Description: Adds support for tenant-specific Custom subscription plan
--              with per-tenant pricing, limits, features, and governance rules
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CUSTOM PLAN CONFIGURATION STATUS ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE custom_plan_status AS ENUM ('draft', 'configured', 'active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. CUSTOM TENANT PLAN CONFIGURATIONS TABLE
-- Stores per-tenant configuration for Custom plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_tenant_plan_configurations (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Configuration Status
  status                custom_plan_status NOT NULL DEFAULT 'draft',
  
  -- Pricing (Tenant Level)
  price_monthly         DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_yearly          DECIMAL(12,2) NOT NULL DEFAULT 0,
  override_pricing      BOOLEAN NOT NULL DEFAULT FALSE,
  pricing_notes         TEXT,                               -- "Custom negotiated pricing"
  
  -- Plan Limits (Tenant Level)
  max_users             INT NOT NULL DEFAULT 10,
  max_branches          INT NOT NULL DEFAULT 3,
  max_storage_gb        INT NOT NULL DEFAULT 50,            -- Use 9999 for unlimited
  
  -- Feature Controls (JSONB for flexibility)
  -- Structure: { "feature_code": { "enabled": true, "usage_limit": 100, "lock_mode": "none" } }
  enabled_features      JSONB NOT NULL DEFAULT '{}',
  
  -- Governance Rules (JSONB for flexibility)
  -- Structure: { "monthly_spend_cap": 50000, "cfo_approval_threshold": 10000, ... }
  governance_rules      JSONB NOT NULL DEFAULT '{}',
  
  -- Trial Settings
  trial_enabled         BOOLEAN NOT NULL DEFAULT FALSE,
  trial_days            INT DEFAULT 0,
  
  -- Billing Information
  billing_cycle         VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- monthly, yearly
  billing_day           INT NOT NULL DEFAULT 1,
  
  -- Validity
  effective_from        TIMESTAMPTZ,
  effective_until       TIMESTAMPTZ,
  
  -- Audit Trail
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT,
  created_by_email      VARCHAR(255),
  updated_by            INT,
  updated_by_email      VARCHAR(255),
  
  -- Internal Notes
  internal_notes        TEXT,
  
  -- Constraints
  CONSTRAINT unique_tenant_custom_config UNIQUE (tenant_id)
);

-- ============================================================================
-- 3. CUSTOM PLAN FEATURE OVERRIDES TABLE
-- Stores per-tenant feature configuration for Custom plans
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_tenant_feature_controls (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feature_code          VARCHAR(100) NOT NULL,
  
  -- Enable/Disable
  is_enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Limits (overrides base plan)
  free_limit            INT DEFAULT -1,                     -- -1 = unlimited, 0 = none
  limit_period          limit_period_type DEFAULT 'monthly',
  usage_limit           INT,                                -- Optional additional limit
  
  -- Pricing Override
  unlock_price          DECIMAL(12,2) DEFAULT 0,
  unlock_unit           VARCHAR(50) DEFAULT 'per month',
  
  -- Lock Mode Override
  lock_mode             lock_mode_type DEFAULT 'none',
  
  -- Approval Rules Override
  approval_threshold    DECIMAL(15,2),
  requires_approval     BOOLEAN DEFAULT FALSE,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_custom_tenant_feature UNIQUE (tenant_id, feature_code)
);

-- ============================================================================
-- 4. CUSTOM PLAN AUDIT LOG TABLE
-- Tracks all changes to custom tenant configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_plan_audit_log (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  action                VARCHAR(50) NOT NULL,               -- created, updated, activated, deactivated
  old_values            JSONB,
  new_values            JSONB,
  change_summary        TEXT,
  changed_by            INT,
  changed_by_email      VARCHAR(255),
  ip_address            INET,
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. ADD CUSTOM PLAN TO MASTER SUBSCRIPTION PLANS
-- ============================================================================

-- Insert the CUSTOM plan if it doesn't exist
INSERT INTO master_subscription_plans (
  code, name, description, status, is_global, is_custom, 
  badge_text, sort_order, is_popular, color_code,
  price_monthly, price_yearly, max_users, max_branches, max_storage_gb,
  monthly_spend_cap, auto_block_on_cap, cfo_approval_threshold,
  invoice_cycle_days, grace_period_days, read_only_after_grace,
  trial_enabled, trial_days, trial_features_limited, require_payment_method
)
VALUES (
  'CUSTOM', 'Custom', 'Tenant-specific custom plan with configurable limits, pricing, and features',
  'active', FALSE, TRUE,
  'Custom', 999, FALSE, '#8B5CF6',
  0, 0, 10, 3, 50,
  100000.00, TRUE, 25000.00,
  30, 7, FALSE,
  FALSE, 0, FALSE, FALSE
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_custom = TRUE,
  is_global = FALSE,
  badge_text = 'Custom',
  color_code = '#8B5CF6',
  updated_at = NOW();

-- ============================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_custom_tenant_config_tenant_id 
  ON custom_tenant_plan_configurations(tenant_id);
  
CREATE INDEX IF NOT EXISTS idx_custom_tenant_config_status 
  ON custom_tenant_plan_configurations(status);
  
CREATE INDEX IF NOT EXISTS idx_custom_tenant_feature_tenant_id 
  ON custom_tenant_feature_controls(tenant_id);
  
CREATE INDEX IF NOT EXISTS idx_custom_tenant_feature_code 
  ON custom_tenant_feature_controls(feature_code);
  
CREATE INDEX IF NOT EXISTS idx_custom_plan_audit_tenant_id 
  ON custom_plan_audit_log(tenant_id);
  
CREATE INDEX IF NOT EXISTS idx_custom_plan_audit_changed_at 
  ON custom_plan_audit_log(changed_at);

-- ============================================================================
-- 7. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Update timestamp trigger for custom_tenant_plan_configurations
CREATE OR REPLACE FUNCTION update_custom_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_custom_config_timestamp 
  ON custom_tenant_plan_configurations;
  
CREATE TRIGGER trigger_update_custom_config_timestamp
  BEFORE UPDATE ON custom_tenant_plan_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_config_timestamp();

-- Update timestamp trigger for custom_tenant_feature_controls
DROP TRIGGER IF EXISTS trigger_update_custom_feature_timestamp 
  ON custom_tenant_feature_controls;
  
CREATE TRIGGER trigger_update_custom_feature_timestamp
  BEFORE UPDATE ON custom_tenant_feature_controls
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_config_timestamp();

-- ============================================================================
-- 8. GRANT PERMISSIONS (Skip if bisman_app role doesn't exist)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bisman_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON custom_tenant_plan_configurations TO bisman_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON custom_tenant_feature_controls TO bisman_app';
    EXECUTE 'GRANT SELECT, INSERT ON custom_plan_audit_log TO bisman_app';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE custom_tenant_plan_configurations_id_seq TO bisman_app';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE custom_tenant_feature_controls_id_seq TO bisman_app';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE custom_plan_audit_log_id_seq TO bisman_app';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS custom_plan_audit_log CASCADE;
-- DROP TABLE IF EXISTS custom_tenant_feature_controls CASCADE;
-- DROP TABLE IF EXISTS custom_tenant_plan_configurations CASCADE;
-- DROP TYPE IF EXISTS custom_plan_status CASCADE;
-- DELETE FROM master_subscription_plans WHERE code = 'CUSTOM';
