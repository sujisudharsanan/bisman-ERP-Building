-- ============================================================================
-- BISMAN ERP - Comprehensive Subscription Control System ("God Mode")
-- Migration: 024_comprehensive_subscription_system.sql
-- Date: 2025-12-26
-- Description: Master subscription control - defines ALL feature availability,
--              limits, pricing, approval thresholds, and billing for entire platform
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE plan_status AS ENUM ('active', 'inactive', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE limit_period_type AS ENUM ('lifetime', 'daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE lock_mode_type AS ENUM ('none', 'soft', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_source_type AS ENUM ('feature', 'infra', 'unlock', 'base_plan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. MASTER SUBSCRIPTION PLANS TABLE
-- Core plan definitions - the master control
-- ============================================================================

CREATE TABLE IF NOT EXISTS master_subscription_plans (
  id                    SERIAL PRIMARY KEY,
  code                  VARCHAR(50) UNIQUE NOT NULL,       -- Immutable identifier
  name                  VARCHAR(200) NOT NULL,
  description           TEXT,
  
  -- Status
  status                plan_status NOT NULL DEFAULT 'active',
  is_global             BOOLEAN NOT NULL DEFAULT TRUE,     -- Applies to all tenants if true
  is_custom             BOOLEAN NOT NULL DEFAULT FALSE,    -- Tenant-specific plan
  
  -- Display
  badge_text            VARCHAR(50),
  sort_order            INT NOT NULL DEFAULT 0,
  is_popular            BOOLEAN NOT NULL DEFAULT FALSE,
  color_code            VARCHAR(20) DEFAULT '#3B82F6',
  
  -- Governance Rules
  monthly_spend_cap     DECIMAL(15,2) DEFAULT 50000.00,    -- Max monthly spend allowed
  auto_block_on_cap     BOOLEAN NOT NULL DEFAULT TRUE,     -- Block when cap reached
  cfo_approval_threshold DECIMAL(15,2) DEFAULT 10000.00,   -- Amount requiring CFO approval
  invoice_cycle_days    INT NOT NULL DEFAULT 30,           -- Days between invoices
  grace_period_days     INT NOT NULL DEFAULT 7,            -- Grace days after payment due
  read_only_after_grace BOOLEAN NOT NULL DEFAULT FALSE,    -- Make tenant read-only after grace
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT,
  updated_by            INT,
  archived_at           TIMESTAMPTZ,
  archived_by           INT
);

-- ============================================================================
-- 2. FEATURE DEFINITIONS TABLE
-- Master list of ALL ERP functions (the complete feature catalog)
-- ============================================================================

CREATE TABLE IF NOT EXISTS master_feature_definitions (
  id                    SERIAL PRIMARY KEY,
  feature_code          VARCHAR(100) UNIQUE NOT NULL,      -- Internal unique identifier
  feature_name          VARCHAR(200) NOT NULL,             -- Human readable
  description           TEXT,
  category              VARCHAR(50) NOT NULL,              -- Grouping category
  
  -- Display
  icon                  VARCHAR(50),
  sort_order            INT NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. PLAN FEATURES JUNCTION TABLE
-- Links plans to features with full control parameters
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_feature_controls (
  id                    SERIAL PRIMARY KEY,
  plan_id               INT NOT NULL REFERENCES master_subscription_plans(id) ON DELETE CASCADE,
  feature_code          VARCHAR(100) NOT NULL,
  
  -- Limits
  free_limit            INT NOT NULL DEFAULT 0,            -- 0 = none, -1 = unlimited
  limit_period          limit_period_type NOT NULL DEFAULT 'monthly',
  
  -- Pricing
  unlock_price          DECIMAL(12,2) NOT NULL DEFAULT 0,  -- Price to unlock beyond free
  unlock_unit           VARCHAR(50) DEFAULT 'per month',   -- per user / per task / per 100 / etc
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Approval Rules
  approval_threshold    DECIMAL(15,2),                     -- Amount-based control (nullable)
  requires_approval     BOOLEAN NOT NULL DEFAULT FALSE,    -- Requires higher approval
  
  -- Lock Modes
  lock_mode             lock_mode_type NOT NULL DEFAULT 'none',  -- none/soft/hard
  -- soft = usage throttled (show limit reached message)
  -- hard = completely hidden from UI
  
  -- Visibility
  is_visible            BOOLEAN NOT NULL DEFAULT TRUE,     -- Show in UI
  show_in_pricing       BOOLEAN NOT NULL DEFAULT TRUE,     -- Show on pricing page
  
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_plan_feature UNIQUE (plan_id, feature_code)
);

-- ============================================================================
-- 4. TENANT PLAN MAPPING
-- Links tenants to their subscription plan with custom overrides
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_plan_assignments (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id               INT NOT NULL REFERENCES master_subscription_plans(id),
  
  -- Custom overrides (JSONB for flexibility)
  custom_overrides      JSONB DEFAULT '{}',
  -- Example: {"task_creation": {"free_limit": 100}, "payment_approval": {"approval_threshold": 50000}}
  
  -- Billing
  billing_cycle         VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, yearly
  billing_day           INT NOT NULL DEFAULT 1,            -- Day of month to bill
  
  -- Validity
  effective_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until       TIMESTAMPTZ,                       -- NULL = no expiry
  
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Previous plan (for audit)
  previous_plan_id      INT REFERENCES master_subscription_plans(id),
  changed_reason        TEXT,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT,
  
  -- Constraints
  CONSTRAINT unique_active_tenant_plan UNIQUE (tenant_id) -- Only one active plan per tenant
);

-- ============================================================================
-- 5. FEATURE USAGE COUNTERS
-- Tracks actual usage per tenant/feature for enforcement
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_usage_counters (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feature_code          VARCHAR(100) NOT NULL,
  
  -- Period tracking
  period_type           limit_period_type NOT NULL DEFAULT 'monthly',
  period_start          TIMESTAMPTZ NOT NULL,
  period_end            TIMESTAMPTZ NOT NULL,
  
  -- Usage
  used_count            INT NOT NULL DEFAULT 0,
  
  -- High water marks (analytics)
  peak_count            INT NOT NULL DEFAULT 0,
  peak_date             TIMESTAMPTZ,
  lifetime_count        BIGINT NOT NULL DEFAULT 0,         -- Never resets
  
  -- Metadata
  last_used_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_tenant_feature_period UNIQUE (tenant_id, feature_code, period_type, period_start)
);

-- ============================================================================
-- 6. MICRO UNLOCKS TABLE
-- Per-feature unlocks beyond plan limits
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_micro_unlocks (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feature_code          VARCHAR(100) NOT NULL,
  
  -- Unlock details
  quantity              INT NOT NULL DEFAULT 1,            -- How many additional units
  unit_cost             DECIMAL(12,2) NOT NULL,            -- Cost per unit at time of unlock
  total_cost            DECIMAL(12,2) NOT NULL,            -- quantity * unit_cost
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Validity
  valid_from            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until           TIMESTAMPTZ,                       -- NULL = no expiry
  
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Approval
  approved_by           INT,
  approved_at           TIMESTAMPTZ,
  approval_notes        TEXT,
  
  -- Audit
  requested_by          INT NOT NULL,
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. BILLING LEDGER
-- Complete billing history for all charges
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_billing_ledger (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Source
  source_type           billing_source_type NOT NULL,
  reference_id          VARCHAR(100),                      -- Feature code, unlock ID, etc.
  reference_name        VARCHAR(200),                      -- Human readable reference
  
  -- Amount
  amount                DECIMAL(15,2) NOT NULL,
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Billing period
  billing_period_start  TIMESTAMPTZ NOT NULL,
  billing_period_end    TIMESTAMPTZ NOT NULL,
  
  -- Status
  status                VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, invoiced, paid, cancelled
  invoice_id            INT,                               -- Link to invoice when generated
  
  -- Metadata
  description           TEXT,
  metadata              JSONB DEFAULT '{}',
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT
);

-- ============================================================================
-- 8. INFRASTRUCTURE BILLING RATES
-- Global infrastructure billing configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS infrastructure_billing_rates (
  id                    SERIAL PRIMARY KEY,
  resource_type         VARCHAR(50) UNIQUE NOT NULL,       -- db_storage, file_storage, api_calls, background_jobs
  resource_name         VARCHAR(200) NOT NULL,
  
  -- Pricing
  price_per_unit        DECIMAL(12,4) NOT NULL,            -- e.g., ₹5.00 per GB
  unit_type             VARCHAR(50) NOT NULL,              -- GB, 1000 calls, job, etc.
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Billing
  billing_method        VARCHAR(20) NOT NULL DEFAULT 'metered', -- metered, fixed, tiered
  minimum_charge        DECIMAL(12,2) DEFAULT 0,
  
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            INT
);

-- ============================================================================
-- 9. ENFORCEMENT DECISIONS LOG
-- Complete audit trail of all enforcement decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS enforcement_decision_log (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id               INT,
  
  -- Request context
  feature_code          VARCHAR(100) NOT NULL,
  action_type           VARCHAR(50) NOT NULL,              -- create, update, delete, approve, etc.
  request_path          VARCHAR(500),
  request_method        VARCHAR(10),
  
  -- Decision
  decision              VARCHAR(20) NOT NULL,              -- allowed, blocked, throttled, approval_required
  decision_reason       VARCHAR(200),                      -- limit_exceeded, hard_locked, no_approval, etc.
  
  -- Counters at time of decision
  current_usage         INT,
  usage_limit           INT,
  
  -- Timestamps
  decided_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Request metadata
  ip_address            INET,
  user_agent            TEXT
);

-- ============================================================================
-- 10. PLAN CHANGE AUDIT LOG
-- Complete audit trail of all plan configuration changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS plan_change_audit_log (
  id                    SERIAL PRIMARY KEY,
  
  -- Target
  target_type           VARCHAR(50) NOT NULL,              -- plan, feature, tenant_assignment, infra_rate
  target_id             VARCHAR(100) NOT NULL,
  target_name           VARCHAR(200),
  
  -- Change details
  action                VARCHAR(50) NOT NULL,              -- created, updated, deleted, activated, archived
  old_values            JSONB,
  new_values            JSONB,
  change_summary        TEXT,
  
  -- Actor
  changed_by            INT NOT NULL,
  changed_by_email      VARCHAR(255),
  changed_by_name       VARCHAR(200),
  
  -- Context
  ip_address            INET,
  user_agent            TEXT,
  reason                TEXT,
  
  -- Timestamp
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Master plans
CREATE INDEX IF NOT EXISTS idx_master_plans_status ON master_subscription_plans(status);
CREATE INDEX IF NOT EXISTS idx_master_plans_code ON master_subscription_plans(code);

-- Feature definitions
CREATE INDEX IF NOT EXISTS idx_feature_defs_category ON master_feature_definitions(category);
CREATE INDEX IF NOT EXISTS idx_feature_defs_code ON master_feature_definitions(feature_code);

-- Plan feature controls
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_feature_controls(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_feature ON plan_feature_controls(feature_code);
CREATE INDEX IF NOT EXISTS idx_plan_features_lock ON plan_feature_controls(lock_mode) WHERE lock_mode != 'none';

-- Tenant plan assignments
CREATE INDEX IF NOT EXISTS idx_tenant_plans_tenant ON tenant_plan_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_plan ON tenant_plan_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_tenant_plans_active ON tenant_plan_assignments(is_active) WHERE is_active = TRUE;

-- Usage counters
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON feature_usage_counters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_feature ON feature_usage_counters(feature_code);
CREATE INDEX IF NOT EXISTS idx_usage_period ON feature_usage_counters(period_end);
CREATE INDEX IF NOT EXISTS idx_usage_lookup ON feature_usage_counters(tenant_id, feature_code, period_type);

-- Micro unlocks
CREATE INDEX IF NOT EXISTS idx_unlocks_tenant ON feature_micro_unlocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_unlocks_active ON feature_micro_unlocks(is_active) WHERE is_active = TRUE;

-- Billing ledger
CREATE INDEX IF NOT EXISTS idx_billing_tenant ON subscription_billing_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_period ON subscription_billing_ledger(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_billing_status ON subscription_billing_ledger(status);

-- Enforcement log
CREATE INDEX IF NOT EXISTS idx_enforcement_tenant ON enforcement_decision_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_feature ON enforcement_decision_log(feature_code);
CREATE INDEX IF NOT EXISTS idx_enforcement_decision ON enforcement_decision_log(decision);
CREATE INDEX IF NOT EXISTS idx_enforcement_time ON enforcement_decision_log(decided_at DESC);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_plan_audit_target ON plan_change_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_plan_audit_actor ON plan_change_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_plan_audit_time ON plan_change_audit_log(changed_at DESC);

-- ============================================================================
-- SEED DATA: Master Feature Definitions
-- ============================================================================

INSERT INTO master_feature_definitions (feature_code, feature_name, description, category, icon, sort_order) VALUES
-- USER & ACCESS
('user_creation', 'User Creation', 'Create new user accounts', 'user_access', 'user-plus', 1),
('role_assignment', 'Role Assignment', 'Assign roles to users', 'user_access', 'shield', 2),
('branch_creation', 'Branch Creation', 'Create new branches/locations', 'user_access', 'building', 3),
('location_creation', 'Location Creation', 'Create new locations', 'user_access', 'map-pin', 4),

-- TASK & WORKFLOW
('task_creation', 'Task Creation', 'Create new tasks and assignments', 'task_workflow', 'plus-circle', 10),
('task_assignment', 'Task Assignment', 'Assign tasks to team members', 'task_workflow', 'users', 11),
('task_approval', 'Task Approval', 'Approve submitted tasks', 'task_workflow', 'check-circle', 12),
('task_reopen', 'Task Reopen', 'Reopen closed tasks', 'task_workflow', 'rotate-ccw', 13),
('task_attachments', 'Task Attachments', 'Upload attachments to tasks', 'task_workflow', 'paperclip', 14),

-- FINANCE & PAYMENTS
('payment_request_creation', 'Payment Request Creation', 'Create payment requests', 'finance', 'credit-card', 20),
('payment_approval', 'Payment Approval', 'Approve payment requests', 'finance', 'check-square', 21),
('amount_approval_threshold', 'Amount Approval Threshold', 'Amount-based approval control', 'finance', 'dollar-sign', 22),
('bank_transfer_execution', 'Bank Transfer Execution', 'Execute bank transfers', 'finance', 'send', 23),
('refund_processing', 'Refund Processing', 'Process refunds', 'finance', 'rotate-ccw', 24),

-- REPORTING
('report_generation', 'Report Generation', 'Generate reports', 'reporting', 'file-text', 30),
('report_download', 'Report Download', 'Download generated reports', 'reporting', 'download', 31),
('export_to_excel', 'Export to Excel', 'Export data to Excel format', 'reporting', 'file-spreadsheet', 32),
('export_to_pdf', 'Export to PDF', 'Export data to PDF format', 'reporting', 'file', 33),

-- BANKING & RECONCILIATION
('bank_statement_upload', 'Bank Statement Upload', 'Upload bank statements', 'banking', 'upload', 40),
('auto_reconciliation', 'Auto Reconciliation', 'Automatic bank reconciliation', 'banking', 'refresh-cw', 41),
('manual_reconciliation', 'Manual Reconciliation', 'Manual reconciliation entries', 'banking', 'edit', 42),
('utr_trace', 'UTR Trace', 'Trace transactions by UTR', 'banking', 'search', 43),

-- DOCUMENTS & STORAGE
('file_upload', 'File Upload', 'Upload files and documents', 'documents', 'upload-cloud', 50),
('file_download', 'File Download', 'Download files and documents', 'documents', 'download-cloud', 51),
('storage_usage', 'Storage Usage', 'Storage space allocation', 'documents', 'hard-drive', 52),

-- SYSTEM & API
('api_calls', 'API Calls', 'External API call limits', 'system', 'code', 60),
('webhook_triggers', 'Webhook Triggers', 'Trigger outbound webhooks', 'system', 'link', 61),
('audit_log_access', 'Audit Log Access', 'Access audit logs', 'system', 'eye', 62)

ON CONFLICT (feature_code) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- SEED DATA: Default Subscription Plans
-- ============================================================================

INSERT INTO master_subscription_plans (code, name, description, status, badge_text, sort_order, is_popular, color_code, monthly_spend_cap, cfo_approval_threshold) VALUES
('FREE', 'Free', 'Get started with basic features. Perfect for trying out the platform.', 'active', NULL, 1, FALSE, '#6B7280', 1000.00, 500.00),
('BASIC', 'Basic', 'Essential features for small teams getting started.', 'active', 'Starter', 2, FALSE, '#3B82F6', 5000.00, 2000.00),
('STANDARD', 'Standard', 'Comprehensive features for growing businesses.', 'active', 'Popular', 3, TRUE, '#8B5CF6', 25000.00, 10000.00),
('PREMIUM', 'Premium', 'Advanced features with priority support.', 'active', 'Best Value', 4, FALSE, '#F59E0B', 100000.00, 50000.00),
('ENTERPRISE', 'Enterprise', 'Unlimited features with dedicated support.', 'active', 'Enterprise', 5, FALSE, '#10B981', NULL, NULL)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge_text = EXCLUDED.badge_text,
  sort_order = EXCLUDED.sort_order;

-- ============================================================================
-- SEED DATA: Default Plan Features (linking plans to features with limits)
-- ============================================================================

-- FREE PLAN features
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible)
SELECT p.id, f.feature_code,
  CASE 
    WHEN f.category = 'user_access' THEN 2
    WHEN f.category = 'task_workflow' THEN 5
    WHEN f.category = 'finance' THEN 2
    WHEN f.category = 'reporting' THEN 3
    WHEN f.category = 'banking' THEN 0
    WHEN f.category = 'documents' THEN 10
    WHEN f.category = 'system' THEN 0
    ELSE 5
  END,
  'monthly'::limit_period_type,
  100.00,
  CASE WHEN f.category IN ('banking', 'system') THEN 'hard'::lock_mode_type ELSE 'none'::lock_mode_type END,
  CASE WHEN f.category IN ('banking', 'system') THEN FALSE ELSE TRUE END
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'FREE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- BASIC PLAN features
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible)
SELECT p.id, f.feature_code,
  CASE 
    WHEN f.category = 'user_access' THEN 10
    WHEN f.category = 'task_workflow' THEN 50
    WHEN f.category = 'finance' THEN 20
    WHEN f.category = 'reporting' THEN 20
    WHEN f.category = 'banking' THEN 5
    WHEN f.category = 'documents' THEN 100
    WHEN f.category = 'system' THEN 100
    ELSE 50
  END,
  'monthly'::limit_period_type,
  75.00,
  'none'::lock_mode_type,
  TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'BASIC'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- STANDARD PLAN features
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible)
SELECT p.id, f.feature_code,
  CASE 
    WHEN f.category = 'user_access' THEN 50
    WHEN f.category = 'task_workflow' THEN 500
    WHEN f.category = 'finance' THEN 200
    WHEN f.category = 'reporting' THEN 100
    WHEN f.category = 'banking' THEN 50
    WHEN f.category = 'documents' THEN 1000
    WHEN f.category = 'system' THEN 1000
    ELSE 500
  END,
  'monthly'::limit_period_type,
  50.00,
  'none'::lock_mode_type,
  TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'STANDARD'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- PREMIUM PLAN features
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible)
SELECT p.id, f.feature_code,
  CASE 
    WHEN f.category = 'user_access' THEN 200
    WHEN f.category = 'task_workflow' THEN 2000
    WHEN f.category = 'finance' THEN 1000
    WHEN f.category = 'reporting' THEN 500
    WHEN f.category = 'banking' THEN 200
    WHEN f.category = 'documents' THEN 5000
    WHEN f.category = 'system' THEN 5000
    ELSE 2000
  END,
  'monthly'::limit_period_type,
  25.00,
  'none'::lock_mode_type,
  TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'PREMIUM'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- ENTERPRISE PLAN features (unlimited)
INSERT INTO plan_feature_controls (plan_id, feature_code, free_limit, limit_period, unlock_price, lock_mode, is_visible)
SELECT p.id, f.feature_code,
  -1,  -- -1 means unlimited
  'monthly'::limit_period_type,
  0.00,
  'none'::lock_mode_type,
  TRUE
FROM master_subscription_plans p, master_feature_definitions f
WHERE p.code = 'ENTERPRISE'
ON CONFLICT (plan_id, feature_code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Infrastructure Billing Rates
-- ============================================================================

INSERT INTO infrastructure_billing_rates (resource_type, resource_name, price_per_unit, unit_type, billing_method) VALUES
('db_storage', 'Database Storage', 5.00, 'GB / month', 'metered'),
('file_storage', 'File Storage', 3.00, 'GB / month', 'metered'),
('api_calls', 'API Calls', 0.50, '1000 calls', 'metered'),
('background_jobs', 'Background Jobs', 0.10, 'job', 'metered')
ON CONFLICT (resource_type) DO UPDATE SET
  resource_name = EXCLUDED.resource_name,
  price_per_unit = EXCLUDED.price_per_unit,
  unit_type = EXCLUDED.unit_type;

-- ============================================================================
-- FUNCTIONS: Get effective plan features for a tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_plan_features(p_tenant_id UUID)
RETURNS TABLE (
  feature_code VARCHAR(100),
  feature_name VARCHAR(200),
  category VARCHAR(50),
  free_limit INT,
  limit_period limit_period_type,
  unlock_price DECIMAL(12,2),
  approval_threshold DECIMAL(15,2),
  lock_mode lock_mode_type,
  is_visible BOOLEAN,
  current_usage INT,
  is_unlocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pfc.feature_code,
    mfd.feature_name,
    mfd.category,
    COALESCE(
      (tpa.custom_overrides->>pfc.feature_code)::jsonb->>'free_limit',
      pfc.free_limit::TEXT
    )::INT as free_limit,
    pfc.limit_period,
    pfc.unlock_price,
    COALESCE(
      (tpa.custom_overrides->>pfc.feature_code)::jsonb->>'approval_threshold',
      pfc.approval_threshold::TEXT
    )::DECIMAL(15,2) as approval_threshold,
    pfc.lock_mode,
    pfc.is_visible,
    COALESCE(fuc.used_count, 0) as current_usage,
    EXISTS (
      SELECT 1 FROM feature_micro_unlocks fmu
      WHERE fmu.tenant_id = p_tenant_id
        AND fmu.feature_code = pfc.feature_code
        AND fmu.is_active = TRUE
        AND (fmu.valid_until IS NULL OR fmu.valid_until > NOW())
    ) as is_unlocked
  FROM tenant_plan_assignments tpa
  JOIN plan_feature_controls pfc ON pfc.plan_id = tpa.plan_id
  JOIN master_feature_definitions mfd ON mfd.feature_code = pfc.feature_code
  LEFT JOIN feature_usage_counters fuc ON fuc.tenant_id = p_tenant_id 
    AND fuc.feature_code = pfc.feature_code
    AND fuc.period_type = pfc.limit_period
    AND fuc.period_end > NOW()
  WHERE tpa.tenant_id = p_tenant_id
    AND tpa.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTIONS: Check feature access for enforcement
-- ============================================================================

CREATE OR REPLACE FUNCTION check_feature_enforcement(
  p_tenant_id UUID,
  p_feature_code VARCHAR(100)
)
RETURNS TABLE (
  allowed BOOLEAN,
  decision VARCHAR(20),
  reason VARCHAR(200),
  current_usage INT,
  usage_limit INT,
  unlock_price DECIMAL(12,2),
  reset_at TIMESTAMPTZ
) AS $$
DECLARE
  v_plan_feature plan_feature_controls;
  v_tenant_plan tenant_plan_assignments;
  v_usage feature_usage_counters;
  v_unlock feature_micro_unlocks;
  v_custom_limit INT;
BEGIN
  -- Get tenant's plan
  SELECT * INTO v_tenant_plan
  FROM tenant_plan_assignments
  WHERE tenant_id = p_tenant_id AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'no_active_plan'::VARCHAR(200), 0::INT, 0::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Get feature controls for this plan
  SELECT * INTO v_plan_feature
  FROM plan_feature_controls
  WHERE plan_id = v_tenant_plan.plan_id
    AND feature_code = p_feature_code;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'feature_not_in_plan'::VARCHAR(200), 0::INT, 0::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check hard lock
  IF v_plan_feature.lock_mode = 'hard' THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'hard_locked'::VARCHAR(200), 0::INT, 0::INT, v_plan_feature.unlock_price, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check for active unlock
  SELECT * INTO v_unlock
  FROM feature_micro_unlocks
  WHERE tenant_id = p_tenant_id
    AND feature_code = p_feature_code
    AND is_active = TRUE
    AND (valid_until IS NULL OR valid_until > NOW());
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, 'allowed'::VARCHAR(20), 'unlocked'::VARCHAR(200), 0::INT, -1::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if unlimited
  v_custom_limit := COALESCE(
    (v_tenant_plan.custom_overrides->p_feature_code->>'free_limit')::INT,
    v_plan_feature.free_limit
  );
  
  IF v_custom_limit = -1 THEN
    RETURN QUERY SELECT TRUE::BOOLEAN, 'allowed'::VARCHAR(20), 'unlimited'::VARCHAR(200), 0::INT, -1::INT, 0::DECIMAL(12,2), NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Get current usage
  SELECT * INTO v_usage
  FROM feature_usage_counters
  WHERE tenant_id = p_tenant_id
    AND feature_code = p_feature_code
    AND period_type = v_plan_feature.limit_period
    AND period_end > NOW()
  ORDER BY period_start DESC
  LIMIT 1;
  
  -- Check limits
  IF COALESCE(v_usage.used_count, 0) >= v_custom_limit THEN
    IF v_plan_feature.lock_mode = 'soft' THEN
      RETURN QUERY SELECT FALSE::BOOLEAN, 'throttled'::VARCHAR(20), 'limit_exceeded'::VARCHAR(200), 
        COALESCE(v_usage.used_count, 0)::INT, v_custom_limit::INT, v_plan_feature.unlock_price, v_usage.period_end;
    ELSE
      RETURN QUERY SELECT FALSE::BOOLEAN, 'blocked'::VARCHAR(20), 'limit_exceeded'::VARCHAR(200), 
        COALESCE(v_usage.used_count, 0)::INT, v_custom_limit::INT, v_plan_feature.unlock_price, v_usage.period_end;
    END IF;
    RETURN;
  END IF;
  
  -- Allow
  RETURN QUERY SELECT TRUE::BOOLEAN, 'allowed'::VARCHAR(20), 'within_limit'::VARCHAR(200), 
    COALESCE(v_usage.used_count, 0)::INT, v_custom_limit::INT, v_plan_feature.unlock_price, v_usage.period_end;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_master_plans_updated ON master_subscription_plans;
CREATE TRIGGER trigger_master_plans_updated
  BEFORE UPDATE ON master_subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

DROP TRIGGER IF EXISTS trigger_plan_features_updated ON plan_feature_controls;
CREATE TRIGGER trigger_plan_features_updated
  BEFORE UPDATE ON plan_feature_controls
  FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

DROP TRIGGER IF EXISTS trigger_tenant_plans_updated ON tenant_plan_assignments;
CREATE TRIGGER trigger_tenant_plans_updated
  BEFORE UPDATE ON tenant_plan_assignments
  FOR EACH ROW EXECUTE FUNCTION update_subscription_timestamp();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_plan_count INT;
  v_feature_count INT;
  v_control_count INT;
BEGIN
  SELECT COUNT(*) INTO v_plan_count FROM master_subscription_plans;
  SELECT COUNT(*) INTO v_feature_count FROM master_feature_definitions;
  SELECT COUNT(*) INTO v_control_count FROM plan_feature_controls;
  
  RAISE NOTICE '✅ Comprehensive Subscription System migration completed';
  RAISE NOTICE '   - Master Plans: %', v_plan_count;
  RAISE NOTICE '   - Feature Definitions: %', v_feature_count;
  RAISE NOTICE '   - Plan Feature Controls: %', v_control_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔐 This is the "God Mode" page data layer';
  RAISE NOTICE '   - All limits must come from here';
  RAISE NOTICE '   - All pricing must come from here';
  RAISE NOTICE '   - All enforcement must reference here';
END $$;
