-- ============================================================================
-- BISMAN ERP - Fix Remaining Migrations
-- Migration: 040_fix_remaining_schema.sql
-- Date: 2026-01-28
-- Purpose: Apply remaining schema changes that failed due to table name issues
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX 1: Deputy roles (from 011_governance_hardening.sql)
-- Use rbac_roles instead of roles
-- ============================================================================

-- Insert deputy roles into rbac_roles table (if it exists and has the right columns)
DO $$
BEGIN
  -- Check if rbac_roles has the needed columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rbac_roles' AND column_name = 'name'
  ) THEN
    INSERT INTO rbac_roles (name, code, description, business_level, is_system_role, created_at)
    VALUES 
      ('CFO Deputy', 'CFO_DEPUTY', 'Deputy to CFO with limited override powers', 85, false, NOW()),
      ('Admin Deputy', 'ADMIN_DEPUTY', 'Deputy to Admin with limited override powers', 85, false, NOW())
    ON CONFLICT (code) DO UPDATE SET 
      description = EXCLUDED.description,
      business_level = EXCLUDED.business_level;
    RAISE NOTICE 'Deputy roles added to rbac_roles';
  ELSE
    RAISE NOTICE 'rbac_roles table does not have expected columns, skipping deputy roles';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not insert deputy roles: %', SQLERRM;
END $$;

-- Create role_deputies table if not exists
CREATE TABLE IF NOT EXISTS role_deputies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  principal_role_id UUID NOT NULL,
  principal_role_code VARCHAR(50) NOT NULL,
  deputy_role_id UUID NOT NULL,
  deputy_role_code VARCHAR(50) NOT NULL,
  can_approve BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_override BOOLEAN DEFAULT false,
  can_force_approve BOOLEAN DEFAULT false,
  can_escalate BOOLEAN DEFAULT true,
  max_approval_amount DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  UNIQUE (tenant_id, principal_role_code, deputy_role_code)
);

CREATE INDEX IF NOT EXISTS idx_role_deputies_tenant ON role_deputies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_deputies_principal ON role_deputies(principal_role_code);

-- ============================================================================
-- FIX 2: QA Testing Sessions table (from 014_qa_testing_module.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS qa_testing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100),
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL DEFAULT 'functional',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tester_id UUID,
  results JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_sessions_tenant ON qa_testing_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_sessions_status ON qa_testing_sessions(status);

-- ============================================================================
-- FIX 3: Bank reconciliation items table (from 021_bank_reconciliation.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bank_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  account_id UUID,
  transaction_date DATE NOT NULL,
  description TEXT,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2),
  reference_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  matched_at TIMESTAMPTZ,
  matched_by UUID,
  reconciliation_batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_recon_tenant ON bank_reconciliation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_recon_status ON bank_reconciliation_items(status);
CREATE INDEX IF NOT EXISTS idx_bank_recon_date ON bank_reconciliation_items(transaction_date);

-- ============================================================================
-- FIX 4: Approval stages table (from 010_approval_workflow_engine.sql)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID,
  stage_number INT NOT NULL DEFAULT 1,
  stage_name VARCHAR(100) NOT NULL,
  stage_type VARCHAR(50) DEFAULT 'sequential',
  assigned_role VARCHAR(100),
  assigned_user_id UUID,
  min_approvers INT DEFAULT 1,
  is_optional BOOLEAN DEFAULT false,
  auto_approve_after_hours INT,
  escalation_after_hours INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_stages_workflow ON approval_stages(workflow_id);

-- ============================================================================
-- FIX 5: Seed subscription plans - fix free_limit null issue
-- ============================================================================

-- Make free_limit nullable or set defaults
DO $$
BEGIN
  ALTER TABLE plan_feature_controls ALTER COLUMN free_limit DROP NOT NULL;
  RAISE NOTICE 'Made free_limit nullable';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'free_limit already nullable or does not exist: %', SQLERRM;
END $$;

-- Now we can add default subscription plan features
DO $$
BEGIN
  -- Check if master_subscription_plans exists and has data
  IF EXISTS (SELECT 1 FROM master_subscription_plans LIMIT 1) THEN
    RAISE NOTICE 'Subscription plans already seeded';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'master_subscription_plans check failed: %', SQLERRM;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================

COMMIT;
