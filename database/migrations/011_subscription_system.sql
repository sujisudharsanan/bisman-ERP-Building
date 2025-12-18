-- ============================================================================
-- BISMAN ERP - Subscription, Pricing & Governance System
-- Migration: 011_subscription_system.sql
-- Date: 2025-12-18
-- Description: Complete subscription management with feature flags, state machine,
--              billing overrides, and audit logging
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENUMS FOR SUBSCRIPTION SYSTEM
-- ============================================================================

-- Subscription plan tiers
DO $$ BEGIN
  CREATE TYPE subscription_plan_tier AS ENUM (
    'STARTER',
    'PROFESSIONAL', 
    'BUSINESS',
    'ENTERPRISE',
    'CUSTOM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Subscription state machine states
DO $$ BEGIN
  CREATE TYPE subscription_state AS ENUM (
    'TRIAL',
    'ACTIVE',
    'UPGRADING',
    'DOWNGRADING',
    'GRACE_PERIOD',
    'SUSPENDED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Billing cycle types
DO $$ BEGIN
  CREATE TYPE billing_cycle_type AS ENUM (
    'MONTHLY',
    'YEARLY',
    'CUSTOM'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Feature flag values (some features have limited/unlimited modes)
DO $$ BEGIN
  CREATE TYPE feature_flag_value AS ENUM (
    'DISABLED',
    'ENABLED',
    'LIMITED',
    'UNLIMITED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- Defines all available plans with pricing and limits
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                    SERIAL PRIMARY KEY,
  plan_code             VARCHAR(50) UNIQUE NOT NULL,  -- STARTER, PROFESSIONAL, etc.
  name                  VARCHAR(100) NOT NULL,
  description           TEXT,
  short_description     VARCHAR(255),
  badge_text            VARCHAR(50),                  -- "Most Popular", "Enterprise Grade"
  
  -- Pricing
  price_monthly         DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_yearly          DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency              VARCHAR(3) NOT NULL DEFAULT 'INR',
  
  -- Limits
  max_users             INT NOT NULL DEFAULT 5,       -- -1 for unlimited
  max_storage_gb        INT NOT NULL DEFAULT 5,
  max_branches          INT NOT NULL DEFAULT 1,      -- -1 for unlimited
  max_api_calls_day     INT NOT NULL DEFAULT 0,      -- 0 = no API access
  
  -- Feature flags (stored as JSONB for flexibility)
  feature_flags         JSONB NOT NULL DEFAULT '{}',
  
  -- Display
  sort_order            INT NOT NULL DEFAULT 0,
  is_popular            BOOLEAN DEFAULT FALSE,
  is_enterprise         BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  is_public             BOOLEAN DEFAULT TRUE,        -- Show on pricing page
  
  -- CTA
  cta_text              VARCHAR(100) DEFAULT 'Get Started',
  cta_action            VARCHAR(50) DEFAULT 'subscribe', -- subscribe, contact, demo
  
  -- Audit
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            INT,
  updated_by            INT
);

-- ============================================================================
-- 2. CLIENT SUBSCRIPTIONS TABLE
-- Tracks each client's subscription state and history
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_subscriptions (
  id                    SERIAL PRIMARY KEY,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id               INT NOT NULL REFERENCES subscription_plans(id),
  
  -- State Machine
  state                 subscription_state NOT NULL DEFAULT 'TRIAL',
  previous_state        subscription_state,
  state_changed_at      TIMESTAMPTZ DEFAULT NOW(),
  
  -- Billing
  billing_cycle         billing_cycle_type NOT NULL DEFAULT 'MONTHLY',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  next_billing_date     TIMESTAMPTZ,
  
  -- Trial
  trial_start_date      TIMESTAMPTZ,
  trial_end_date        TIMESTAMPTZ,
  trial_converted       BOOLEAN DEFAULT FALSE,
  
  -- Grace Period (payment failure)
  grace_period_start    TIMESTAMPTZ,
  grace_period_end      TIMESTAMPTZ,
  grace_reason          VARCHAR(255),
  
  -- Usage Tracking
  current_user_count    INT DEFAULT 0,
  current_storage_used  BIGINT DEFAULT 0,  -- in bytes
  current_api_calls     INT DEFAULT 0,
  
  -- Stripe Integration
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id    VARCHAR(100),
  
  -- Scheduled Changes
  scheduled_plan_id     INT REFERENCES subscription_plans(id),
  scheduled_change_date TIMESTAMPTZ,
  scheduled_change_type VARCHAR(20),  -- upgrade, downgrade
  
  -- Status
  is_active             BOOLEAN DEFAULT TRUE,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  
  -- Audit
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_active_subscription UNIQUE (client_id)
);

-- ============================================================================
-- 3. FEATURE FLAGS TABLE (Plan-level definitions)
-- Defines all possible feature flags and their default values
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flag_definitions (
  id                    SERIAL PRIMARY KEY,
  flag_code             VARCHAR(100) UNIQUE NOT NULL,
  name                  VARCHAR(150) NOT NULL,
  description           TEXT,
  category              VARCHAR(50),   -- 'access', 'limits', 'modules', 'integrations'
  default_value         feature_flag_value DEFAULT 'DISABLED',
  
  -- For numeric limits
  is_numeric            BOOLEAN DEFAULT FALSE,
  numeric_unit          VARCHAR(20),   -- 'count', 'gb', 'calls', etc.
  
  -- Enforcement
  enforce_at_api        BOOLEAN DEFAULT TRUE,
  enforce_at_ui         BOOLEAN DEFAULT TRUE,
  
  is_active             BOOLEAN DEFAULT TRUE,
  sort_order            INT DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. CLIENT FEATURE OVERRIDES
-- SuperAdmin can override specific features for individual clients
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_feature_overrides (
  id                    SERIAL PRIMARY KEY,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  flag_code             VARCHAR(100) NOT NULL,
  override_value        feature_flag_value NOT NULL,
  numeric_override      INT,           -- For numeric limits
  reason                TEXT,
  expires_at            TIMESTAMPTZ,
  
  -- Audit
  created_by            INT NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_client_flag_override UNIQUE (client_id, flag_code)
);

-- ============================================================================
-- 5. BILLING OVERRIDES
-- SuperAdmin billing controls for special cases
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_overrides (
  id                    SERIAL PRIMARY KEY,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  override_type         VARCHAR(50) NOT NULL,  -- pause, discount, custom_price, extend_trial
  
  -- Override details
  discount_percent      DECIMAL(5,2),
  custom_price          DECIMAL(12,2),
  pause_start           TIMESTAMPTZ,
  pause_end             TIMESTAMPTZ,
  trial_extension_days  INT,
  
  -- Validity
  valid_from            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until           TIMESTAMPTZ,
  
  -- Context
  reason                TEXT NOT NULL,
  internal_notes        TEXT,
  
  -- Status
  is_active             BOOLEAN DEFAULT TRUE,
  applied_at            TIMESTAMPTZ,
  
  -- Audit
  created_by            INT NOT NULL,
  approved_by           INT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. SUBSCRIPTION AUDIT LOG
-- Complete audit trail for all subscription changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id                    SERIAL PRIMARY KEY,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  subscription_id       INT REFERENCES client_subscriptions(id) ON DELETE SET NULL,
  
  -- Action
  action                VARCHAR(100) NOT NULL,  -- plan_change, state_change, feature_override, etc.
  action_category       VARCHAR(50),            -- billing, feature, state, admin
  
  -- Before/After
  old_values            JSONB,
  new_values            JSONB,
  
  -- Context
  reason                TEXT,
  ip_address            INET,
  user_agent            TEXT,
  
  -- Actor
  actor_type            VARCHAR(20) NOT NULL,   -- system, super_admin, enterprise_admin, webhook
  actor_id              INT,
  actor_email           VARCHAR(255),
  
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. SUBSCRIPTION INVOICES
-- Track billing history
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id                    SERIAL PRIMARY KEY,
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id       INT REFERENCES client_subscriptions(id) ON DELETE SET NULL,
  
  -- Invoice details
  invoice_number        VARCHAR(50) UNIQUE NOT NULL,
  invoice_date          TIMESTAMPTZ NOT NULL,
  due_date              TIMESTAMPTZ NOT NULL,
  
  -- Amounts
  subtotal              DECIMAL(12,2) NOT NULL,
  discount              DECIMAL(12,2) DEFAULT 0,
  tax                   DECIMAL(12,2) DEFAULT 0,
  total                 DECIMAL(12,2) NOT NULL,
  currency              VARCHAR(3) DEFAULT 'INR',
  
  -- Period
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  
  -- Status
  status                VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, pending, paid, overdue, cancelled
  paid_at               TIMESTAMPTZ,
  
  -- Payment
  stripe_invoice_id     VARCHAR(100),
  payment_method        VARCHAR(50),
  
  -- Document
  pdf_url               TEXT,
  line_items            JSONB,
  notes                 TEXT,
  
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, is_public);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort ON subscription_plans(sort_order);

CREATE INDEX IF NOT EXISTS idx_client_subscriptions_client ON client_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_plan ON client_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_state ON client_subscriptions(state);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_billing ON client_subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_client_subscriptions_grace ON client_subscriptions(grace_period_end) WHERE grace_period_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feature_overrides_client ON client_feature_overrides(client_id);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_flag ON client_feature_overrides(flag_code);

CREATE INDEX IF NOT EXISTS idx_billing_overrides_client ON billing_overrides(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_overrides_active ON billing_overrides(is_active, valid_until);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_client ON subscription_audit_log(client_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_action ON subscription_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_created ON subscription_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_client ON subscription_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON subscription_invoices(status);

-- ============================================================================
-- SEED DATA: Default Plans
-- ============================================================================

INSERT INTO subscription_plans (
  plan_code, name, description, short_description, badge_text,
  price_monthly, price_yearly, currency,
  max_users, max_storage_gb, max_branches, max_api_calls_day,
  feature_flags, sort_order, is_popular, is_enterprise, cta_text, cta_action
) VALUES 
(
  'STARTER',
  'Starter',
  'Everything you need to run daily operations—without complexity.',
  'Perfect for small teams getting started with ERP',
  'Ideal for Small Teams',
  2999.00, 29999.00, 'INR',
  5, 5, 1, 0,
  '{
    "CUSTOM_ROLES": false,
    "MAKER_CHECKER": false,
    "AUTOMATION_RULES": false,
    "API_ACCESS": false,
    "AUDIT_EXPORT": false,
    "REALTIME_SOCKET": false,
    "REPORT_BUILDER": false,
    "COMPLIANCE_MODULE": false,
    "WHITE_LABEL": false,
    "SSO": false,
    "MULTI_ENTITY": false,
    "WEEKLY_BACKUP": true,
    "DAILY_BACKUP": false,
    "EMAIL_NOTIFICATIONS": true,
    "BASIC_FINANCE": true,
    "TASK_MANAGEMENT": true,
    "OPERATIONS_DASHBOARD": true
  }'::jsonb,
  1, false, false,
  'Start Free Trial', 'subscribe'
),
(
  'PROFESSIONAL',
  'Professional',
  'Built for growing businesses that need accountability and control.',
  'Recommended for operational scale',
  'Most Popular',
  9999.00, 99999.00, 'INR',
  25, 50, 5, 10000,
  '{
    "CUSTOM_ROLES": true,
    "MAKER_CHECKER": true,
    "AUTOMATION_RULES": "LIMITED",
    "API_ACCESS": true,
    "AUDIT_EXPORT": true,
    "REALTIME_SOCKET": true,
    "REPORT_BUILDER": false,
    "COMPLIANCE_MODULE": false,
    "WHITE_LABEL": false,
    "SSO": false,
    "MULTI_ENTITY": false,
    "WEEKLY_BACKUP": true,
    "DAILY_BACKUP": true,
    "EMAIL_NOTIFICATIONS": true,
    "CHAT_NOTIFICATIONS": true,
    "ADVANCED_FINANCE": true,
    "COST_CENTERS": true,
    "TASK_MANAGEMENT": true,
    "OPERATIONS_DASHBOARD": true
  }'::jsonb,
  2, true, false,
  'Upgrade to Professional', 'subscribe'
),
(
  'BUSINESS',
  'Business',
  'For organizations managing multiple teams, processes, and compliance.',
  'Advanced control for mid-size companies',
  'Advanced Control',
  24999.00, 249999.00, 'INR',
  100, 200, 20, 50000,
  '{
    "CUSTOM_ROLES": true,
    "MAKER_CHECKER": true,
    "AUTOMATION_RULES": "UNLIMITED",
    "API_ACCESS": true,
    "AUDIT_EXPORT": true,
    "REALTIME_SOCKET": true,
    "REPORT_BUILDER": true,
    "COMPLIANCE_MODULE": true,
    "WHITE_LABEL": false,
    "SSO": false,
    "MULTI_ENTITY": true,
    "WEEKLY_BACKUP": true,
    "DAILY_BACKUP": true,
    "HOURLY_BACKUP": false,
    "EMAIL_NOTIFICATIONS": true,
    "CHAT_NOTIFICATIONS": true,
    "ADVANCED_FINANCE": true,
    "COST_CENTERS": true,
    "KPI_ANALYTICS": true,
    "CUSTOM_DASHBOARDS": true,
    "TASK_MANAGEMENT": true,
    "OPERATIONS_DASHBOARD": true,
    "LEGAL_MODULE": true
  }'::jsonb,
  3, false, false,
  'Talk to Sales', 'contact'
),
(
  'ENTERPRISE',
  'Enterprise',
  'Designed for large, regulated, or multi-entity organizations.',
  'Full enterprise capabilities with dedicated support',
  'Enterprise Grade',
  0.00, 0.00, 'INR',  -- Custom pricing
  -1, -1, -1, -1,     -- Unlimited
  '{
    "ALL_FEATURES": true,
    "CUSTOM_ROLES": true,
    "MAKER_CHECKER": true,
    "AUTOMATION_RULES": "UNLIMITED",
    "API_ACCESS": true,
    "AUDIT_EXPORT": true,
    "REALTIME_SOCKET": true,
    "REPORT_BUILDER": true,
    "COMPLIANCE_MODULE": true,
    "WHITE_LABEL": true,
    "SSO": true,
    "MULTI_ENTITY": true,
    "DEDICATED_INFRASTRUCTURE": true,
    "IP_RESTRICTIONS": true,
    "ADVANCED_SECURITY": true,
    "CUSTOM_INTEGRATIONS": true,
    "UPTIME_SLA": "99.9",
    "DEDICATED_SUPPORT": true
  }'::jsonb,
  4, false, true,
  'Request Enterprise Demo', 'demo'
)
ON CONFLICT (plan_code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Feature Flag Definitions
-- ============================================================================

INSERT INTO feature_flag_definitions (flag_code, name, description, category, default_value, is_numeric) VALUES
('CUSTOM_ROLES', 'Custom Roles', 'Create and manage custom roles and permissions', 'access', 'DISABLED', false),
('MAKER_CHECKER', 'Maker-Checker Approvals', 'Two-level approval workflows', 'workflow', 'DISABLED', false),
('AUTOMATION_RULES', 'Automation Rules', 'Create automated workflows and triggers', 'workflow', 'DISABLED', false),
('API_ACCESS', 'API Access', 'External API access for integrations', 'integrations', 'DISABLED', false),
('AUDIT_EXPORT', 'Audit Export', 'Export audit logs to CSV/PDF', 'compliance', 'DISABLED', false),
('REALTIME_SOCKET', 'Real-time Notifications', 'WebSocket-based real-time updates', 'notifications', 'DISABLED', false),
('REPORT_BUILDER', 'Report Builder', 'Custom report generation with CSV/PDF export', 'analytics', 'DISABLED', false),
('COMPLIANCE_MODULE', 'Compliance & Legal', 'Legal document management and compliance tracking', 'modules', 'DISABLED', false),
('WHITE_LABEL', 'White Label', 'Custom branding and domain', 'branding', 'DISABLED', false),
('SSO', 'Single Sign-On', 'SAML/OAuth SSO integration', 'security', 'DISABLED', false),
('MULTI_ENTITY', 'Multi-Entity Support', 'Manage multiple business entities', 'organization', 'DISABLED', false),
('DAILY_BACKUP', 'Daily Backups', 'Automated daily data backups', 'infrastructure', 'DISABLED', false),
('WEEKLY_BACKUP', 'Weekly Backups', 'Automated weekly data backups', 'infrastructure', 'ENABLED', false),
('EMAIL_NOTIFICATIONS', 'Email Notifications', 'Email-based notifications', 'notifications', 'ENABLED', false),
('CHAT_NOTIFICATIONS', 'In-App Chat', 'In-app chat support', 'notifications', 'DISABLED', false),
('BASIC_FINANCE', 'Basic Finance', 'Receivables and payables tracking', 'modules', 'ENABLED', false),
('ADVANCED_FINANCE', 'Advanced Finance', 'Full finance management with cost centers', 'modules', 'DISABLED', false),
('KPI_ANALYTICS', 'KPI Analytics', 'Advanced analytics and KPI dashboards', 'analytics', 'DISABLED', false),
('CUSTOM_DASHBOARDS', 'Custom Dashboards', 'Per-role customizable dashboards', 'analytics', 'DISABLED', false),
('DEDICATED_SUPPORT', 'Dedicated Support', 'Dedicated support team', 'support', 'DISABLED', false),
('IP_RESTRICTIONS', 'IP Restrictions', 'IP-based access restrictions', 'security', 'DISABLED', false)
ON CONFLICT (flag_code) DO NOTHING;

-- ============================================================================
-- TRIGGER: Update subscription updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_updated ON client_subscriptions;
CREATE TRIGGER trigger_subscription_updated
  BEFORE UPDATE ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- ============================================================================
-- TRIGGER: Audit subscription state changes
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_subscription_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO subscription_audit_log (
      client_id, subscription_id, action, action_category,
      old_values, new_values, actor_type, actor_id
    ) VALUES (
      NEW.client_id,
      NEW.id,
      'state_change',
      'state',
      jsonb_build_object('state', OLD.state, 'plan_id', OLD.plan_id),
      jsonb_build_object('state', NEW.state, 'plan_id', NEW.plan_id),
      'system',
      NULL
    );
  END IF;
  
  IF OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    INSERT INTO subscription_audit_log (
      client_id, subscription_id, action, action_category,
      old_values, new_values, actor_type, actor_id
    ) VALUES (
      NEW.client_id,
      NEW.id,
      'plan_change',
      'billing',
      jsonb_build_object('plan_id', OLD.plan_id),
      jsonb_build_object('plan_id', NEW.plan_id),
      'system',
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_subscription_audit ON client_subscriptions;
CREATE TRIGGER trigger_subscription_audit
  AFTER UPDATE ON client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION audit_subscription_state_change();

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  plan_count INT;
  flag_count INT;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM subscription_plans;
  SELECT COUNT(*) INTO flag_count FROM feature_flag_definitions;
  
  RAISE NOTICE '✅ Subscription system migration completed';
  RAISE NOTICE '   - Plans created: %', plan_count;
  RAISE NOTICE '   - Feature flags defined: %', flag_count;
END $$;
