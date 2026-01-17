-- ============================================================================
-- SUBSCRIPTION ACCESS CONTROL - STAGING/DRAFT TABLES
-- Created: 2026-01-17
-- Purpose: Enable staging state for subscription changes before publish
-- ============================================================================

-- 1. Draft table for plan module access (staging changes)
CREATE TABLE IF NOT EXISTS plan_module_access_draft (
  id                 SERIAL PRIMARY KEY,
  plan_id            INT NOT NULL,
  module_id          VARCHAR(100) NOT NULL,
  access_level       module_access_level NOT NULL DEFAULT 'none',
  page_limit         INT NOT NULL DEFAULT -1,
  features_json      JSONB DEFAULT '{}',
  is_dirty           BOOLEAN NOT NULL DEFAULT false,
  draft_action       VARCHAR(20) DEFAULT 'update', -- 'insert', 'update', 'delete'
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by        INT,
  
  CONSTRAINT fk_draft_module_plan FOREIGN KEY (plan_id) 
    REFERENCES subscription_plans(id) ON DELETE CASCADE,
  CONSTRAINT unique_draft_plan_module UNIQUE (plan_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_draft_module_plan ON plan_module_access_draft(plan_id);
CREATE INDEX IF NOT EXISTS idx_draft_module_dirty ON plan_module_access_draft(is_dirty) WHERE is_dirty = true;

-- 2. Draft table for plan feature controls (staging changes)
CREATE TABLE IF NOT EXISTS plan_feature_controls_draft (
  id                 SERIAL PRIMARY KEY,
  plan_id            INT NOT NULL,
  feature_code       VARCHAR(100) NOT NULL,
  free_limit         INT NOT NULL DEFAULT 0,
  limit_period       limit_period_type NOT NULL DEFAULT 'monthly',
  unlock_price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  unlock_unit        VARCHAR(50) DEFAULT 'per month',
  currency           VARCHAR(3) NOT NULL DEFAULT 'INR',
  approval_threshold DECIMAL(15,2),
  requires_approval  BOOLEAN NOT NULL DEFAULT false,
  lock_mode          lock_mode_type NOT NULL DEFAULT 'none',
  is_visible         BOOLEAN NOT NULL DEFAULT true,
  show_in_pricing    BOOLEAN NOT NULL DEFAULT true,
  is_dirty           BOOLEAN NOT NULL DEFAULT false,
  draft_action       VARCHAR(20) DEFAULT 'update',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by        INT,
  
  CONSTRAINT fk_draft_feature_plan FOREIGN KEY (plan_id) 
    REFERENCES master_subscription_plans(id) ON DELETE CASCADE,
  CONSTRAINT unique_draft_plan_feature UNIQUE (plan_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_draft_feature_plan ON plan_feature_controls_draft(plan_id);
CREATE INDEX IF NOT EXISTS idx_draft_feature_dirty ON plan_feature_controls_draft(is_dirty) WHERE is_dirty = true;

-- 3. Tenant module overrides (per-tenant access beyond plan)
CREATE TABLE IF NOT EXISTS tenant_module_overrides (
  id                  SERIAL PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  module_id           VARCHAR(100) NOT NULL,
  access_level        module_access_level NOT NULL DEFAULT 'full',
  override_reason     TEXT,
  override_type       VARCHAR(30) NOT NULL DEFAULT 'grant', -- 'grant', 'revoke', 'upgrade', 'downgrade'
  start_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date            TIMESTAMPTZ,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  granted_by          INT NOT NULL,
  granted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by          INT,
  revoked_at          TIMESTAMPTZ,
  revoke_reason       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_module_override UNIQUE (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_override_tenant ON tenant_module_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_override_active ON tenant_module_overrides(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenant_override_module ON tenant_module_overrides(module_id);

-- 4. Publish audit log (tracks all publish events)
CREATE TABLE IF NOT EXISTS subscription_publish_log (
  id                  SERIAL PRIMARY KEY,
  publish_type        VARCHAR(50) NOT NULL, -- 'modules', 'features', 'both'
  published_by        INT NOT NULL,
  published_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes_summary     JSONB NOT NULL DEFAULT '{}',
  affected_plans      INT[] NOT NULL DEFAULT '{}',
  affected_modules    VARCHAR(100)[] DEFAULT '{}',
  affected_features   VARCHAR(100)[] DEFAULT '{}',
  total_changes       INT NOT NULL DEFAULT 0,
  rollback_data       JSONB, -- Snapshot for potential rollback
  notes               TEXT,
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publish_log_by ON subscription_publish_log(published_by);
CREATE INDEX IF NOT EXISTS idx_publish_log_at ON subscription_publish_log(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_publish_log_type ON subscription_publish_log(publish_type);

-- 5. Auto-update timestamps trigger
CREATE OR REPLACE FUNCTION update_draft_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_dirty = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trigger_draft_module_updated ON plan_module_access_draft;
CREATE TRIGGER trigger_draft_module_updated
  BEFORE UPDATE ON plan_module_access_draft
  FOR EACH ROW EXECUTE FUNCTION update_draft_timestamp();

DROP TRIGGER IF EXISTS trigger_draft_feature_updated ON plan_feature_controls_draft;
CREATE TRIGGER trigger_draft_feature_updated
  BEFORE UPDATE ON plan_feature_controls_draft
  FOR EACH ROW EXECUTE FUNCTION update_draft_timestamp();

DROP TRIGGER IF EXISTS trigger_tenant_override_updated ON tenant_module_overrides;
CREATE TRIGGER trigger_tenant_override_updated
  BEFORE UPDATE ON tenant_module_overrides
  FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

-- 6. Initialize draft tables from production data
INSERT INTO plan_module_access_draft (plan_id, module_id, access_level, page_limit, features_json, is_dirty, draft_action)
SELECT plan_id, module_id, access_level, page_limit, features_json, false, 'update'
FROM plan_module_access
ON CONFLICT (plan_id, module_id) DO NOTHING;

INSERT INTO plan_feature_controls_draft (
  plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit,
  currency, approval_threshold, requires_approval, lock_mode, is_visible, 
  show_in_pricing, is_dirty, draft_action
)
SELECT 
  plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit,
  currency, approval_threshold, requires_approval, lock_mode, is_visible, 
  show_in_pricing, false, 'update'
FROM plan_feature_controls
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- Add comments
COMMENT ON TABLE plan_module_access_draft IS 'Staging table for plan module access changes before publish to production';
COMMENT ON TABLE plan_feature_controls_draft IS 'Staging table for plan feature control changes before publish to production';
COMMENT ON TABLE tenant_module_overrides IS 'Per-tenant module access overrides beyond their subscription plan';
COMMENT ON TABLE subscription_publish_log IS 'Audit log tracking all publish events from staging to production';
