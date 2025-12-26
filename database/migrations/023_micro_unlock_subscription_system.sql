-- ============================================================================
-- BISMAN ERP - Micro-Unlock Subscription & Usage Billing System
-- Migration: 023_micro_unlock_subscription_system.sql
-- Date: 2025-12-26
-- Description: Feature-level micro-unlock engine with usage-based billing
--              "Pay for freedom, not access" - Remove friction, not features
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUMS FOR MICRO-UNLOCK SYSTEM
-- ============================================================================

-- Usage reset periods
DO $$ BEGIN
  CREATE TYPE usage_period_type AS ENUM (
    'DAILY',
    'WEEKLY',
    'MONTHLY',
    'YEARLY',
    'LIFETIME'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Feature unlock status
DO $$ BEGIN
  CREATE TYPE unlock_status AS ENUM (
    'LOCKED',
    'UNLOCKED',
    'TRIAL',
    'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Invoice status for micro-unlock billing
DO $$ BEGIN
  CREATE TYPE micro_invoice_status AS ENUM (
    'PENDING',
    'GENERATED',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. FEATURE CATALOG TABLE
-- Master catalog of all unlockable features with their pricing and limits
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_catalog (
  id                    SERIAL PRIMARY KEY,
  feature_key           VARCHAR(100) UNIQUE NOT NULL,
  feature_name          VARCHAR(200) NOT NULL,
  description           TEXT,
  category              VARCHAR(50) NOT NULL DEFAULT 'general',  -- tasks, payments, reports, reconciliation, audit, etc.
  
  -- Default limits (when not unlocked)
  default_limit         INT NOT NULL DEFAULT 0,                  -- 0 = disabled, -1 = unlimited
  limit_period          usage_period_type NOT NULL DEFAULT 'DAILY',
  
  -- Pricing
  base_price            DECIMAL(10,2) NOT NULL DEFAULT 100.00,   -- ₹100 default
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Settings
  is_editable           BOOLEAN NOT NULL DEFAULT TRUE,          -- Can admin change price?
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  requires_approval     BOOLEAN NOT NULL DEFAULT FALSE,         -- Needs SuperAdmin approval to unlock?
  
  -- Display
  icon                  VARCHAR(50),                             -- Icon name for UI
  sort_order            INT NOT NULL DEFAULT 0,
  display_on_pricing    BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT,
  updated_by            INT
);

-- ============================================================================
-- 2. TENANT FEATURE UNLOCKS TABLE
-- Tracks which features are unlocked for each tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_feature_unlocks (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feature_key           VARCHAR(100) NOT NULL REFERENCES feature_catalog(feature_key) ON DELETE CASCADE,
  
  -- Unlock status
  status                unlock_status NOT NULL DEFAULT 'LOCKED',
  
  -- Pricing (can be overridden per tenant)
  price_per_month       DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Validity period
  start_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date              TIMESTAMPTZ,                             -- NULL = no expiry (until cancelled)
  
  -- Auto-renewal
  auto_renew            BOOLEAN NOT NULL DEFAULT TRUE,
  renewal_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Billing tracking
  billing_start_date    TIMESTAMPTZ,                             -- When to start billing (service starts immediately)
  next_billing_date     TIMESTAMPTZ,                             -- When to generate next invoice
  last_billed_date      TIMESTAMPTZ,
  
  -- Override info (if SuperAdmin granted)
  is_override           BOOLEAN NOT NULL DEFAULT FALSE,
  override_reason       TEXT,
  override_by           INT,
  override_expires_at   TIMESTAMPTZ,
  
  -- Audit
  unlocked_by           INT NOT NULL,
  unlocked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at           TIMESTAMPTZ,
  disabled_by           INT,
  disable_reason        TEXT,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_tenant_feature UNIQUE (tenant_id, feature_key)
);

-- ============================================================================
-- 3. USAGE COUNTERS TABLE
-- Tracks actual usage per tenant/user for rate limiting
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_counters (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id               INT,                                     -- NULL = tenant-wide counter
  feature_key           VARCHAR(100) NOT NULL REFERENCES feature_catalog(feature_key) ON DELETE CASCADE,
  
  -- Usage tracking
  usage_count           INT NOT NULL DEFAULT 0,
  period                usage_period_type NOT NULL DEFAULT 'DAILY',
  period_start          TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('day', NOW()),
  reset_at              TIMESTAMPTZ NOT NULL,                    -- When counter resets
  
  -- High water marks (for analytics)
  peak_usage_count      INT NOT NULL DEFAULT 0,
  peak_usage_date       TIMESTAMPTZ,
  total_lifetime_usage  BIGINT NOT NULL DEFAULT 0,               -- Never resets
  
  -- Metadata
  last_incremented_at   TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_usage_counter UNIQUE (tenant_id, user_id, feature_key, period, period_start)
);

-- ============================================================================
-- 4. MICRO-UNLOCK INVOICES TABLE
-- Monthly invoices for unlocked features
-- ============================================================================

CREATE TABLE IF NOT EXISTS micro_unlock_invoices (
  id                    SERIAL PRIMARY KEY,
  invoice_number        VARCHAR(50) UNIQUE NOT NULL,             -- e.g., MU-2025-12-00001
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Period
  billing_period_start  TIMESTAMPTZ NOT NULL,
  billing_period_end    TIMESTAMPTZ NOT NULL,
  
  -- Amounts
  subtotal              DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Line items (stored as JSONB for flexibility)
  line_items            JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"feature_key": "task_creation", "feature_name": "Task Creation", "price": 100, "days_active": 30}]
  
  -- Status
  status                micro_invoice_status NOT NULL DEFAULT 'PENDING',
  
  -- Dates
  invoice_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date              TIMESTAMPTZ NOT NULL,
  paid_at               TIMESTAMPTZ,
  
  -- Payment info
  payment_method        VARCHAR(50),
  payment_reference     VARCHAR(255),
  payment_notes         TEXT,
  
  -- PDF/Document
  pdf_url               TEXT,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT,
  
  -- Indexes for lookups
  CONSTRAINT valid_billing_period CHECK (billing_period_end > billing_period_start)
);

-- ============================================================================
-- 5. SUBSCRIPTION PLANS (ENHANCED for Micro-Unlock)
-- SuperAdmin can create plans with base features and pricing templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS micro_subscription_plans (
  id                    SERIAL PRIMARY KEY,
  plan_code             VARCHAR(50) UNIQUE NOT NULL,
  plan_name             VARCHAR(200) NOT NULL,
  description           TEXT,
  
  -- Base pricing (can be ₹0 for pure micro-unlock model)
  base_price_monthly    DECIMAL(10,2) NOT NULL DEFAULT 0,
  base_price_yearly     DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Default unlocked features (included in base price)
  included_features     JSONB NOT NULL DEFAULT '[]',
  -- Example: ["basic_tasks", "basic_reports"]
  
  -- Feature price overrides for this plan
  feature_price_overrides JSONB NOT NULL DEFAULT '{}',
  -- Example: {"task_creation": 80, "payment_requests": 120}
  
  -- Limits adjustments
  limit_multipliers     JSONB NOT NULL DEFAULT '{}',
  -- Example: {"task_creation": 2} = 2x the default free limit
  
  -- Display
  is_public             BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order            INT NOT NULL DEFAULT 0,
  badge_text            VARCHAR(50),
  is_popular            BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT,
  updated_by            INT
);

-- ============================================================================
-- 6. TENANT SUBSCRIPTION ASSIGNMENT
-- Links tenants to their subscription plan
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_subscription (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id               INT REFERENCES micro_subscription_plans(id),
  
  -- Billing cycle
  billing_cycle         VARCHAR(20) NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
  billing_day           INT NOT NULL DEFAULT 1,                  -- Day of month to bill (1-28)
  
  -- Current period
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  
  -- Payment tracking
  payment_status        VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
  last_payment_date     TIMESTAMPTZ,
  next_payment_date     TIMESTAMPTZ,
  
  -- Status
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INT
);

-- ============================================================================
-- 7. RESOURCE CONSUMPTION TRACKING
-- For transparency panel - shows what resources tenant is using
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_consumption (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Snapshot date
  snapshot_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- User metrics
  total_users           INT NOT NULL DEFAULT 0,
  active_users_30d      INT NOT NULL DEFAULT 0,
  
  -- Organization metrics
  total_branches        INT NOT NULL DEFAULT 0,
  
  -- Activity metrics
  tasks_created         INT NOT NULL DEFAULT 0,
  payments_processed    DECIMAL(15,2) NOT NULL DEFAULT 0,
  reports_generated     INT NOT NULL DEFAULT 0,
  reconciliations_run   INT NOT NULL DEFAULT 0,
  
  -- Storage metrics
  db_storage_bytes      BIGINT NOT NULL DEFAULT 0,
  file_storage_bytes    BIGINT NOT NULL DEFAULT 0,
  
  -- API metrics
  api_calls_made        INT NOT NULL DEFAULT 0,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_tenant_snapshot UNIQUE (tenant_id, snapshot_date)
);

-- ============================================================================
-- 8. TENANT SPEND LIMITS TABLE
-- Controls maximum monthly spending per tenant (Finance protection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_spend_limits (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Spend caps
  monthly_cap_amount    DECIMAL(12,2) NOT NULL DEFAULT 5000.00,  -- Maximum allowed spend per month
  current_month_spend   DECIMAL(12,2) NOT NULL DEFAULT 0.00,     -- Running total this month
  
  -- Period tracking
  billing_month         VARCHAR(7) NOT NULL,                      -- YYYY-MM format
  
  -- Alerts
  alert_threshold_pct   INT NOT NULL DEFAULT 80,                  -- Alert when reaching this % of cap
  alert_sent_at         TIMESTAMPTZ,
  cap_reached_at        TIMESTAMPTZ,
  
  -- Who set the limit
  set_by                INT,
  set_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Previous cap (for audit)
  previous_cap          DECIMAL(12,2),
  cap_change_reason     TEXT,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. BILLING INVOICE LINE ITEMS TABLE
-- Detailed line items for each invoice (normalized table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_invoice_items (
  id                    SERIAL PRIMARY KEY,
  invoice_id            INT NOT NULL REFERENCES micro_unlock_invoices(id) ON DELETE CASCADE,
  
  -- Feature details
  feature_key           VARCHAR(100) NOT NULL REFERENCES feature_catalog(feature_key),
  feature_name          VARCHAR(200) NOT NULL,
  
  -- Pricing
  unit_price            DECIMAL(10,2) NOT NULL,
  quantity              INT NOT NULL DEFAULT 1,
  days_active           INT NOT NULL DEFAULT 30,                  -- Days the feature was active in billing period
  proration_factor      DECIMAL(5,4) NOT NULL DEFAULT 1.0000,     -- For partial months
  
  -- Calculated
  amount                DECIMAL(12,2) NOT NULL,                   -- unit_price * quantity * proration_factor
  discount_amount       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_amount            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  net_amount            DECIMAL(12,2) NOT NULL,                   -- amount - discount + tax
  
  -- Period
  service_start         TIMESTAMPTZ NOT NULL,
  service_end           TIMESTAMPTZ NOT NULL,
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. USAGE BLOCK LOG TABLE
-- Tracks when users hit limits (for admin dashboard "Users Blocked" metrics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_block_log (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id               INT NOT NULL,
  feature_key           VARCHAR(100) NOT NULL REFERENCES feature_catalog(feature_key),
  
  -- Block details
  usage_count_at_block  INT NOT NULL,
  usage_limit           INT NOT NULL,
  
  -- Timestamps
  blocked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,                              -- When admin unlocked or limit reset
  resolution_type       VARCHAR(30),                              -- 'unlock', 'limit_reset', 'override'
  
  -- De-duplication: Only one block per user per feature per day
  block_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Constraints
  CONSTRAINT unique_user_feature_block UNIQUE (tenant_id, user_id, feature_key, block_date)
);

-- ============================================================================
-- 11. GRACE PERIOD TRACKING TABLE
-- Tracks features in grace period due to non-payment
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_grace_periods (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  feature_key           VARCHAR(100) NOT NULL REFERENCES feature_catalog(feature_key),
  unlock_id             INT NOT NULL REFERENCES tenant_feature_unlocks(id),
  
  -- Invoice that triggered grace period
  invoice_id            INT REFERENCES micro_unlock_invoices(id),
  
  -- Grace period timing
  grace_start           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grace_end             TIMESTAMPTZ NOT NULL,                     -- When feature will be disabled
  grace_days            INT NOT NULL DEFAULT 7,                   -- Default 7-day grace period
  
  -- Notifications
  reminder_sent_at      TIMESTAMPTZ,
  final_warning_sent_at TIMESTAMPTZ,
  
  -- Status
  status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',    -- ACTIVE, PAID, EXPIRED
  resolved_at           TIMESTAMPTZ,
  resolution_type       VARCHAR(30),                              -- 'payment_received', 'expired', 'waived'
  
  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_grace_period UNIQUE (tenant_id, feature_key, invoice_id)
);

-- ============================================================================
-- 12. MICRO-UNLOCK AUDIT LOG
-- Complete audit trail for all subscription/unlock changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS micro_unlock_audit_log (
  id                    SERIAL PRIMARY KEY,
  tenant_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Action details
  action                VARCHAR(100) NOT NULL,
  -- Actions: feature_unlock, feature_disable, price_change, limit_change, 
  --          override_grant, override_revoke, invoice_generated, payment_received,
  --          spend_limit_change, block_logged, grace_period_start
  action_category       VARCHAR(50) NOT NULL, -- unlock, billing, admin, system, enforcement
  
  -- Target
  target_type           VARCHAR(50),          -- feature, invoice, plan, tenant
  target_id             VARCHAR(100),
  target_name           VARCHAR(200),
  
  -- Changes
  old_values            JSONB,
  new_values            JSONB,
  
  -- Context
  reason                TEXT,
  ip_address            INET,
  user_agent            TEXT,
  
  -- Actor
  actor_type            VARCHAR(20) NOT NULL, -- user, admin, super_admin, system
  actor_id              INT,
  actor_email           VARCHAR(255),
  actor_name            VARCHAR(200),
  
  -- Timestamp
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Feature catalog
CREATE INDEX IF NOT EXISTS idx_feature_catalog_active ON feature_catalog(is_active, category);
CREATE INDEX IF NOT EXISTS idx_feature_catalog_key ON feature_catalog(feature_key);

-- Tenant feature unlocks
CREATE INDEX IF NOT EXISTS idx_tenant_unlocks_tenant ON tenant_feature_unlocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_unlocks_feature ON tenant_feature_unlocks(feature_key);
CREATE INDEX IF NOT EXISTS idx_tenant_unlocks_status ON tenant_feature_unlocks(status);
CREATE INDEX IF NOT EXISTS idx_tenant_unlocks_billing ON tenant_feature_unlocks(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_tenant_unlocks_active ON tenant_feature_unlocks(tenant_id, status) 
  WHERE status = 'UNLOCKED';

-- Usage counters
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON usage_counters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_feature ON usage_counters(feature_key);
CREATE INDEX IF NOT EXISTS idx_usage_reset ON usage_counters(reset_at);
CREATE INDEX IF NOT EXISTS idx_usage_lookup ON usage_counters(tenant_id, feature_key, period);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoice_tenant ON micro_unlock_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON micro_unlock_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_due ON micro_unlock_invoices(due_date) WHERE status IN ('PENDING', 'GENERATED', 'SENT');

-- Resource consumption
CREATE INDEX IF NOT EXISTS idx_resource_tenant ON resource_consumption(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_date ON resource_consumption(snapshot_date DESC);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON micro_unlock_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON micro_unlock_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON micro_unlock_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category ON micro_unlock_audit_log(action_category);

-- Spend limits
CREATE INDEX IF NOT EXISTS idx_spend_limits_tenant ON tenant_spend_limits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_spend_limits_month ON tenant_spend_limits(billing_month);

-- Invoice items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON billing_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_feature ON billing_invoice_items(feature_key);

-- Usage block log
CREATE INDEX IF NOT EXISTS idx_block_log_tenant ON usage_block_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_block_log_feature ON usage_block_log(feature_key);
CREATE INDEX IF NOT EXISTS idx_block_log_date ON usage_block_log(block_date DESC);
CREATE INDEX IF NOT EXISTS idx_block_log_unresolved ON usage_block_log(tenant_id, resolved_at) WHERE resolved_at IS NULL;

-- Grace periods
CREATE INDEX IF NOT EXISTS idx_grace_tenant ON feature_grace_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grace_status ON feature_grace_periods(status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_grace_end ON feature_grace_periods(grace_end) WHERE status = 'ACTIVE';

-- ============================================================================
-- SEED DATA: Default Feature Catalog
-- ============================================================================

INSERT INTO feature_catalog (feature_key, feature_name, description, category, default_limit, limit_period, base_price, icon, sort_order) VALUES
-- Task Management
('task_creation', 'Task Creation', 'Create new tasks and assignments', 'tasks', 5, 'DAILY', 100.00, 'plus-circle', 1),
('task_acceptance', 'Task Acceptance', 'Accept and claim tasks', 'tasks', 2, 'DAILY', 100.00, 'check-circle', 2),
('task_delegation', 'Task Delegation', 'Delegate tasks to team members', 'tasks', 3, 'DAILY', 100.00, 'users', 3),
('bulk_task_operations', 'Bulk Task Operations', 'Perform actions on multiple tasks at once', 'tasks', 0, 'DAILY', 150.00, 'layers', 4),

-- Payment & Finance
('payment_requests', 'Payment Requests', 'Create payment request entries', 'payments', 1, 'DAILY', 100.00, 'credit-card', 10),
('payment_approvals', 'Payment Approvals', 'Approve payment requests', 'payments', 2, 'DAILY', 100.00, 'check-square', 11),
('bulk_payments', 'Bulk Payment Processing', 'Process multiple payments at once', 'payments', 0, 'DAILY', 200.00, 'dollar-sign', 12),

-- Reports & Analytics
('report_downloads', 'Report Downloads', 'Download reports as PDF/Excel', 'reports', 2, 'WEEKLY', 100.00, 'download', 20),
('custom_reports', 'Custom Reports', 'Create custom report templates', 'reports', 0, 'MONTHLY', 150.00, 'file-text', 21),
('analytics_dashboard', 'Analytics Dashboard', 'Access advanced analytics', 'reports', 0, 'DAILY', 200.00, 'bar-chart-2', 22),

-- Reconciliation
('bank_reconciliation', 'Bank Reconciliation', 'Run bank statement reconciliation', 'reconciliation', 1, 'WEEKLY', 100.00, 'refresh-cw', 30),
('auto_matching', 'Auto Transaction Matching', 'Automatic transaction matching', 'reconciliation', 0, 'DAILY', 150.00, 'git-merge', 31),

-- Audit & Compliance
('audit_export', 'Audit Export', 'Export audit logs', 'audit', 0, 'MONTHLY', 100.00, 'file-minus', 40),
('compliance_reports', 'Compliance Reports', 'Generate compliance reports', 'audit', 0, 'MONTHLY', 150.00, 'shield', 41),

-- Communication
('bulk_notifications', 'Bulk Notifications', 'Send bulk notifications', 'communication', 0, 'DAILY', 100.00, 'bell', 50),
('email_templates', 'Custom Email Templates', 'Create custom email templates', 'communication', 0, 'MONTHLY', 100.00, 'mail', 51),

-- API & Integrations
('api_access', 'API Access', 'Access to external APIs', 'integrations', 0, 'DAILY', 300.00, 'code', 60),
('webhooks', 'Webhooks', 'Configure webhook endpoints', 'integrations', 0, 'MONTHLY', 200.00, 'link', 61),

-- Advanced Features
('multi_branch', 'Multi-Branch Operations', 'Manage multiple branches', 'advanced', 0, 'LIFETIME', 500.00, 'building', 70),
('white_label', 'White Label Branding', 'Custom branding options', 'advanced', 0, 'LIFETIME', 1000.00, 'palette', 71)

ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================================
-- SEED DATA: Default Subscription Plans
-- ============================================================================

INSERT INTO micro_subscription_plans (plan_code, plan_name, description, base_price_monthly, included_features, feature_price_overrides, sort_order, is_popular) VALUES
(
  'EXPERIENCE',
  'Experience',
  'Try everything with generous free limits. Perfect for getting started.',
  0.00,
  '[]'::jsonb,
  '{}'::jsonb,
  1,
  FALSE
),
(
  'FLOW',
  'Flow',
  'Unlock essential features for smooth daily operations.',
  0.00,
  '["task_creation", "task_acceptance", "payment_requests"]'::jsonb,
  '{"task_creation": 80, "task_acceptance": 80, "payment_requests": 80}'::jsonb,
  2,
  TRUE
),
(
  'CONTROL',
  'Control',
  'Full control with all productivity unlocks included.',
  999.00,
  '["task_creation", "task_acceptance", "task_delegation", "payment_requests", "payment_approvals", "report_downloads", "bank_reconciliation"]'::jsonb,
  '{"bulk_task_operations": 100, "analytics_dashboard": 150}'::jsonb,
  3,
  FALSE
),
(
  'ENTERPRISE',
  'Enterprise',
  'Everything unlimited. Custom pricing and dedicated support.',
  0.00,
  '["ALL"]'::jsonb,
  '{}'::jsonb,
  4,
  FALSE
)
ON CONFLICT (plan_code) DO NOTHING;

-- ============================================================================
-- FUNCTIONS: Usage Counter Management
-- ============================================================================

-- Function to get or create usage counter
CREATE OR REPLACE FUNCTION get_or_create_usage_counter(
  p_tenant_id UUID,
  p_user_id INT,
  p_feature_key VARCHAR(100),
  p_period usage_period_type
)
RETURNS usage_counters AS $$
DECLARE
  v_counter usage_counters;
  v_period_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Calculate period start and reset time based on period type
  CASE p_period
    WHEN 'DAILY' THEN
      v_period_start := DATE_TRUNC('day', NOW());
      v_reset_at := v_period_start + INTERVAL '1 day';
    WHEN 'WEEKLY' THEN
      v_period_start := DATE_TRUNC('week', NOW());
      v_reset_at := v_period_start + INTERVAL '1 week';
    WHEN 'MONTHLY' THEN
      v_period_start := DATE_TRUNC('month', NOW());
      v_reset_at := v_period_start + INTERVAL '1 month';
    WHEN 'YEARLY' THEN
      v_period_start := DATE_TRUNC('year', NOW());
      v_reset_at := v_period_start + INTERVAL '1 year';
    ELSE
      v_period_start := NOW();
      v_reset_at := NULL;
  END CASE;

  -- Try to get existing counter for current period
  SELECT * INTO v_counter
  FROM usage_counters
  WHERE tenant_id = p_tenant_id
    AND (user_id = p_user_id OR (user_id IS NULL AND p_user_id IS NULL))
    AND feature_key = p_feature_key
    AND period = p_period
    AND period_start = v_period_start;

  -- If not found, create new counter
  IF NOT FOUND THEN
    INSERT INTO usage_counters (
      tenant_id, user_id, feature_key, period, period_start, reset_at, usage_count
    ) VALUES (
      p_tenant_id, p_user_id, p_feature_key, p_period, v_period_start, v_reset_at, 0
    )
    RETURNING * INTO v_counter;
  END IF;

  RETURN v_counter;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_tenant_id UUID,
  p_user_id INT,
  p_feature_key VARCHAR(100),
  p_increment INT DEFAULT 1
)
RETURNS usage_counters AS $$
DECLARE
  v_counter usage_counters;
  v_feature feature_catalog;
BEGIN
  -- Get feature details
  SELECT * INTO v_feature FROM feature_catalog WHERE feature_key = p_feature_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature not found: %', p_feature_key;
  END IF;

  -- Get or create counter
  SELECT * INTO v_counter FROM get_or_create_usage_counter(p_tenant_id, p_user_id, p_feature_key, v_feature.limit_period);

  -- Increment counter
  UPDATE usage_counters
  SET 
    usage_count = usage_count + p_increment,
    total_lifetime_usage = total_lifetime_usage + p_increment,
    last_incremented_at = NOW(),
    peak_usage_count = GREATEST(peak_usage_count, usage_count + p_increment),
    peak_usage_date = CASE WHEN usage_count + p_increment > peak_usage_count THEN NOW() ELSE peak_usage_date END,
    updated_at = NOW()
  WHERE id = v_counter.id
  RETURNING * INTO v_counter;

  RETURN v_counter;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTIONS: Feature Access Check
-- ============================================================================

CREATE OR REPLACE FUNCTION check_feature_access(
  p_tenant_id UUID,
  p_user_id INT,
  p_feature_key VARCHAR(100)
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason VARCHAR(50),
  current_usage INT,
  usage_limit INT,
  is_unlocked BOOLEAN,
  unlock_price DECIMAL(10,2),
  reset_in_seconds INT
) AS $$
DECLARE
  v_feature feature_catalog;
  v_unlock tenant_feature_unlocks;
  v_counter usage_counters;
  v_plan_included BOOLEAN := FALSE;
BEGIN
  -- Get feature details
  SELECT * INTO v_feature FROM feature_catalog 
  WHERE feature_key = p_feature_key AND is_active = TRUE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN, 'feature_not_found'::VARCHAR(50), 
      0::INT, 0::INT, FALSE::BOOLEAN, 0::DECIMAL(10,2), 0::INT;
    RETURN;
  END IF;

  -- Check if unlocked for this tenant
  SELECT * INTO v_unlock FROM tenant_feature_unlocks
  WHERE tenant_id = p_tenant_id 
    AND feature_key = p_feature_key
    AND status = 'UNLOCKED'
    AND (end_date IS NULL OR end_date > NOW());

  IF FOUND THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 'unlocked'::VARCHAR(50),
      0::INT, -1::INT, TRUE::BOOLEAN, 
      v_unlock.price_per_month, 0::INT;
    RETURN;
  END IF;

  -- Check if included in tenant's plan
  SELECT EXISTS (
    SELECT 1 FROM tenant_subscription ts
    JOIN micro_subscription_plans msp ON ts.plan_id = msp.id
    WHERE ts.tenant_id = p_tenant_id
      AND ts.is_active = TRUE
      AND (
        msp.included_features ? 'ALL' 
        OR msp.included_features ? p_feature_key
      )
  ) INTO v_plan_included;

  IF v_plan_included THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 'plan_included'::VARCHAR(50),
      0::INT, -1::INT, TRUE::BOOLEAN, 
      0::DECIMAL(10,2), 0::INT;
    RETURN;
  END IF;

  -- Check usage counter
  SELECT * INTO v_counter FROM get_or_create_usage_counter(
    p_tenant_id, NULL, p_feature_key, v_feature.limit_period
  );

  -- Check if within free limit
  IF v_feature.default_limit = -1 OR v_counter.usage_count < v_feature.default_limit THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN, 'within_limit'::VARCHAR(50),
      v_counter.usage_count, v_feature.default_limit, FALSE::BOOLEAN,
      v_feature.base_price,
      EXTRACT(EPOCH FROM (v_counter.reset_at - NOW()))::INT;
    RETURN;
  END IF;

  -- Over limit
  RETURN QUERY SELECT 
    FALSE::BOOLEAN, 'limit_exceeded'::VARCHAR(50),
    v_counter.usage_count, v_feature.default_limit, FALSE::BOOLEAN,
    v_feature.base_price,
    EXTRACT(EPOCH FROM (v_counter.reset_at - NOW()))::INT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_micro_unlock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feature_catalog_updated ON feature_catalog;
CREATE TRIGGER trigger_feature_catalog_updated
  BEFORE UPDATE ON feature_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_micro_unlock_timestamp();

DROP TRIGGER IF EXISTS trigger_tenant_unlocks_updated ON tenant_feature_unlocks;
CREATE TRIGGER trigger_tenant_unlocks_updated
  BEFORE UPDATE ON tenant_feature_unlocks
  FOR EACH ROW
  EXECUTE FUNCTION update_micro_unlock_timestamp();

DROP TRIGGER IF EXISTS trigger_usage_counters_updated ON usage_counters;
CREATE TRIGGER trigger_usage_counters_updated
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION update_micro_unlock_timestamp();

-- ============================================================================
-- TRIGGER: Audit logging for feature unlocks
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_feature_unlock_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO micro_unlock_audit_log (
      tenant_id, action, action_category, 
      target_type, target_id, target_name,
      new_values, actor_type, actor_id
    ) VALUES (
      NEW.tenant_id, 'feature_unlock', 'unlock',
      'feature', NEW.feature_key, 
      (SELECT feature_name FROM feature_catalog WHERE feature_key = NEW.feature_key),
      jsonb_build_object(
        'status', NEW.status,
        'price_per_month', NEW.price_per_month,
        'auto_renew', NEW.auto_renew
      ),
      'user', NEW.unlocked_by
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO micro_unlock_audit_log (
      tenant_id, action, action_category,
      target_type, target_id, target_name,
      old_values, new_values, reason, actor_type, actor_id
    ) VALUES (
      NEW.tenant_id, 
      CASE WHEN NEW.status = 'LOCKED' THEN 'feature_disable' ELSE 'feature_status_change' END,
      'unlock',
      'feature', NEW.feature_key,
      (SELECT feature_name FROM feature_catalog WHERE feature_key = NEW.feature_key),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      NEW.disable_reason,
      'user', COALESCE(NEW.disabled_by, NEW.unlocked_by)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_feature_unlock ON tenant_feature_unlocks;
CREATE TRIGGER trigger_audit_feature_unlock
  AFTER INSERT OR UPDATE ON tenant_feature_unlocks
  FOR EACH ROW
  EXECUTE FUNCTION audit_feature_unlock_change();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_feature_count INT;
  v_plan_count INT;
BEGIN
  SELECT COUNT(*) INTO v_feature_count FROM feature_catalog;
  SELECT COUNT(*) INTO v_plan_count FROM micro_subscription_plans;
  
  RAISE NOTICE '✅ Micro-Unlock Subscription System migration completed';
  RAISE NOTICE '   - Features in catalog: %', v_feature_count;
  RAISE NOTICE '   - Subscription plans: %', v_plan_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Core principle: "Pay for freedom, not access"';
  RAISE NOTICE '   - Users have access to everything';
  RAISE NOTICE '   - They pay only to remove friction (limits)';
  RAISE NOTICE '   - ₹100/month per feature unlock';
END $$;
