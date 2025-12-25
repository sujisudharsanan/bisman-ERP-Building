-- ═══════════════════════════════════════════════════════════════════════════════
-- BISMAN ERP - Payment Request Workflow System
-- Migration: 20251224_payment_request_workflow.sql
-- 
-- Purpose: Implement task-style payment request workflow with amount-based routing
-- 
-- Business Rules:
-- 1. Amount ≤ 5000: Manager Approval → Accounts Verification
-- 2. Amount > 5000: Manager Approval → Manager's Manager Approval → Accounts Verification
-- 3. After Accounts: Finance Controller → CFO → Banker
-- 4. Send-back only to immediate previous level (no skip-back)
-- 5. Finance-originated requests: Only Finance Controller/CFO can reject
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS: Payment Request specific statuses
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop and recreate to ensure clean enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_request_status') THEN
    CREATE TYPE payment_request_status AS ENUM (
      'DRAFT',                      -- Not yet submitted
      'PAYMENT_REQUESTED',          -- Submitted, awaiting manager approval
      'MANAGER_APPROVED',           -- First manager approved (for >5000 amounts)
      'MANAGER_2_APPROVED',         -- Second manager approved (for >5000 amounts)
      'ACCOUNTS_VERIFICATION',      -- Awaiting accounts verification
      'ACCOUNTS_VERIFIED',          -- Accounts verified the request
      'ACCOUNTING_ENTRY_PENDING',   -- Awaiting accounting entry (Tally/manual)
      'ACCOUNTING_ENTRY_COMPLETED', -- Accounting entry done
      'FINANCE_PENDING',            -- Awaiting Finance Controller
      'FINANCE_CONFIRMED',          -- Finance Controller approved
      'CFO_PENDING',                -- Awaiting CFO approval
      'CFO_APPROVED',               -- CFO approved
      'BANKER_PENDING',             -- Awaiting banker execution
      'PAYMENT_COMPLETED',          -- Payment executed
      'REJECTED',                   -- Request rejected
      'SENT_BACK',                  -- Sent back for clarification
      'CANCELLED'                   -- Cancelled by creator
    );
  END IF;
END $$;

-- Payment request origin type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_origin_type') THEN
    CREATE TYPE payment_origin_type AS ENUM (
      'STAFF',           -- Created by Staff/Store/Ops
      'MANAGER',         -- Created by Manager level
      'FINANCE',         -- Created by Finance team
      'ACCOUNTS',        -- Created by Accounts team
      'ADMIN'            -- Created by Admin
    );
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: Enhance payment_requests table
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add workflow-related columns to payment_requests
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS hub_id UUID REFERENCES hubs(id),
ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS origin_type VARCHAR(20) DEFAULT 'STAFF',
ADD COLUMN IF NOT EXISTS creator_level INTEGER,
ADD COLUMN IF NOT EXISTS creator_manager_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS creator_manager_2_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS amount_threshold_applied VARCHAR(20),
ADD COLUMN IF NOT EXISTS requires_second_manager BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS current_approver_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS beneficiary_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS beneficiary_account VARCHAR(100),
ADD COLUMN IF NOT EXISTS beneficiary_ifsc VARCHAR(20),
ADD COLUMN IF NOT EXISTS beneficiary_bank VARCHAR(100),
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS invoice_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS purpose TEXT,
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(20) DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_to UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS accounts_verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS accounts_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accounts_verification_note TEXT,
ADD COLUMN IF NOT EXISTS accounting_entry_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS accounting_entry_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accounting_voucher_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS finance_confirmed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS finance_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finance_note TEXT,
ADD COLUMN IF NOT EXISTS cfo_approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS cfo_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cfo_note TEXT,
ADD COLUMN IF NOT EXISTS banker_executed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS banker_executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bank_transaction_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS sent_back_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS sent_back_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_back_to_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS sent_back_reason TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Indexes for payment workflow queries
CREATE INDEX IF NOT EXISTS idx_payment_requests_tenant ON payment_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_workflow_status ON payment_requests(workflow_status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_current_approver ON payment_requests(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_current_stage ON payment_requests(current_stage);
CREATE INDEX IF NOT EXISTS idx_payment_requests_department ON payment_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_sla ON payment_requests(sla_deadline) WHERE workflow_status NOT IN ('PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED');

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: Payment Request Approval History
-- Complete audit trail for all approval actions
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_request_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id TEXT NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Stage info
  from_stage VARCHAR(50) NOT NULL,
  to_stage VARCHAR(50) NOT NULL,
  stage_order INTEGER NOT NULL,
  
  -- Action details
  action VARCHAR(30) NOT NULL,  -- 'approve', 'reject', 'send_back', 'verify', 'confirm', 'execute'
  action_by UUID NOT NULL REFERENCES users(id),
  action_by_name VARCHAR(200),
  action_by_role VARCHAR(50),
  action_by_level INTEGER,
  action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Comments and data
  comment TEXT,
  attachments JSONB,
  
  -- Additional context
  amount DECIMAL(18,2),
  is_sla_breached BOOLEAN DEFAULT false,
  is_escalated BOOLEAN DEFAULT false,
  escalated_from UUID REFERENCES users(id),
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_approvals_request ON payment_request_approvals(payment_request_id);
CREATE INDEX idx_payment_approvals_action_by ON payment_request_approvals(action_by);
CREATE INDEX idx_payment_approvals_stage ON payment_request_approvals(from_stage, to_stage);
CREATE INDEX idx_payment_approvals_action_at ON payment_request_approvals(action_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: Payment Request SLA Configuration
-- Configurable SLA per stage
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_workflow_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  stage VARCHAR(50) NOT NULL,
  sla_hours INTEGER NOT NULL DEFAULT 24,
  escalation_hours INTEGER NOT NULL DEFAULT 48,
  escalation_target_role VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, stage)
);

-- Insert default SLA configuration
INSERT INTO payment_workflow_sla_config (id, tenant_id, stage, sla_hours, escalation_hours, escalation_target_role)
SELECT 
  gen_random_uuid(),
  t.id,
  s.stage,
  s.sla_hours,
  s.escalation_hours,
  s.escalation_target_role
FROM tenants t
CROSS JOIN (VALUES
  ('MANAGER_APPROVAL', 24, 48, 'OPERATIONS_MANAGER'),
  ('MANAGER_2_APPROVAL', 24, 48, 'CFO'),
  ('ACCOUNTS_VERIFICATION', 8, 24, 'FINANCE_CONTROLLER'),
  ('ACCOUNTING_ENTRY', 4, 12, 'ACCOUNTS_MANAGER'),
  ('FINANCE_CONFIRMATION', 24, 48, 'CFO'),
  ('CFO_APPROVAL', 48, 72, 'ADMIN'),
  ('BANKER_EXECUTION', 24, 48, 'CFO')
) AS s(stage, sla_hours, escalation_hours, escalation_target_role)
ON CONFLICT (tenant_id, stage) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: Payment Request Stage Assignments
-- Tracks who is assigned to each stage for a request
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_request_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id TEXT NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  
  stage VARCHAR(50) NOT NULL,
  stage_order INTEGER NOT NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_role VARCHAR(50),
  assigned_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, completed, skipped, rejected
  
  -- SLA
  due_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES users(id),
  
  -- Completion
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  completion_action VARCHAR(30), -- approved, verified, confirmed, executed, rejected, sent_back
  completion_comment TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  UNIQUE(payment_request_id, stage)
);

CREATE INDEX idx_payment_stages_request ON payment_request_stages(payment_request_id);
CREATE INDEX idx_payment_stages_assigned ON payment_request_stages(assigned_to);
CREATE INDEX idx_payment_stages_status ON payment_request_stages(status);
CREATE INDEX idx_payment_stages_due ON payment_request_stages(due_at) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCTIONS: Payment Request Workflow Helpers
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function to get user's reporting manager
CREATE OR REPLACE FUNCTION get_user_manager(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_manager_id UUID;
BEGIN
  -- First check users.manager_id (primary source)
  SELECT manager_id INTO v_manager_id
  FROM users
  WHERE id = p_user_id AND deleted_at IS NULL;
  
  IF v_manager_id IS NOT NULL THEN
    RETURN v_manager_id;
  END IF;
  
  -- Fallback: Check users.reports_to
  SELECT reports_to INTO v_manager_id
  FROM users
  WHERE id = p_user_id AND deleted_at IS NULL;
  
  RETURN v_manager_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's manager's manager (for >5000 amounts)
CREATE OR REPLACE FUNCTION get_user_manager_level_2(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_manager_id UUID;
  v_manager_2_id UUID;
BEGIN
  -- Get first level manager
  v_manager_id := get_user_manager(p_user_id);
  
  IF v_manager_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get second level manager
  v_manager_2_id := get_user_manager(v_manager_id);
  
  RETURN v_manager_2_id;
END;
$$ LANGUAGE plpgsql;

-- Function to determine payment request workflow based on amount
CREATE OR REPLACE FUNCTION determine_payment_workflow(
  p_amount DECIMAL(18,2),
  p_creator_id UUID,
  p_origin_type VARCHAR(20) DEFAULT 'STAFF'
)
RETURNS TABLE (
  requires_manager_1 BOOLEAN,
  requires_manager_2 BOOLEAN,
  manager_1_id UUID,
  manager_2_id UUID,
  first_stage VARCHAR(50),
  amount_threshold VARCHAR(20)
) AS $$
DECLARE
  v_manager_1 UUID;
  v_manager_2 UUID;
  v_creator_level INTEGER;
BEGIN
  -- Get creator's authority level
  SELECT COALESCE(u.business_level, 10) INTO v_creator_level
  FROM users u
  WHERE u.id = p_creator_id;
  
  -- Get managers
  v_manager_1 := get_user_manager(p_creator_id);
  v_manager_2 := get_user_manager_level_2(p_creator_id);
  
  -- Determine workflow based on amount and origin
  IF p_origin_type = 'FINANCE' THEN
    -- Finance-originated: Skip manager approvals, go directly to accounts
    RETURN QUERY SELECT 
      false::BOOLEAN,
      false::BOOLEAN,
      NULL::UUID,
      NULL::UUID,
      'ACCOUNTS_VERIFICATION'::VARCHAR(50),
      'FINANCE_ORIGIN'::VARCHAR(20);
  ELSIF p_amount <= 5000 THEN
    -- Small amount: Only one manager approval needed
    RETURN QUERY SELECT 
      (v_manager_1 IS NOT NULL)::BOOLEAN,
      false::BOOLEAN,
      v_manager_1,
      NULL::UUID,
      CASE WHEN v_manager_1 IS NOT NULL THEN 'MANAGER_APPROVAL' ELSE 'ACCOUNTS_VERIFICATION' END::VARCHAR(50),
      'UNDER_5000'::VARCHAR(20);
  ELSE
    -- Large amount: Two manager approvals needed
    RETURN QUERY SELECT 
      (v_manager_1 IS NOT NULL)::BOOLEAN,
      (v_manager_2 IS NOT NULL)::BOOLEAN,
      v_manager_1,
      v_manager_2,
      CASE WHEN v_manager_1 IS NOT NULL THEN 'MANAGER_APPROVAL' ELSE 'ACCOUNTS_VERIFICATION' END::VARCHAR(50),
      'OVER_5000'::VARCHAR(20);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get next stage based on current stage and amount
CREATE OR REPLACE FUNCTION get_next_payment_stage(
  p_current_stage VARCHAR(50),
  p_amount DECIMAL(18,2),
  p_requires_second_manager BOOLEAN DEFAULT false
)
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN CASE p_current_stage
    WHEN 'DRAFT' THEN 'PAYMENT_REQUESTED'
    WHEN 'PAYMENT_REQUESTED' THEN 'MANAGER_APPROVAL'
    WHEN 'MANAGER_APPROVAL' THEN 
      CASE WHEN p_requires_second_manager AND p_amount > 5000 THEN 'MANAGER_2_APPROVAL'
      ELSE 'ACCOUNTS_VERIFICATION' END
    WHEN 'MANAGER_2_APPROVAL' THEN 'ACCOUNTS_VERIFICATION'
    WHEN 'ACCOUNTS_VERIFICATION' THEN 'ACCOUNTING_ENTRY_PENDING'
    WHEN 'ACCOUNTING_ENTRY_PENDING' THEN 'FINANCE_PENDING'
    WHEN 'FINANCE_PENDING' THEN 'CFO_PENDING'
    WHEN 'CFO_PENDING' THEN 'BANKER_PENDING'
    WHEN 'BANKER_PENDING' THEN 'PAYMENT_COMPLETED'
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to get previous stage (for send-back - only immediate previous)
CREATE OR REPLACE FUNCTION get_previous_payment_stage(
  p_current_stage VARCHAR(50),
  p_amount DECIMAL(18,2),
  p_requires_second_manager BOOLEAN DEFAULT false
)
RETURNS VARCHAR(50) AS $$
BEGIN
  RETURN CASE p_current_stage
    WHEN 'MANAGER_2_APPROVAL' THEN 'MANAGER_APPROVAL'
    WHEN 'ACCOUNTS_VERIFICATION' THEN 
      CASE WHEN p_requires_second_manager AND p_amount > 5000 THEN 'MANAGER_2_APPROVAL'
      ELSE 'MANAGER_APPROVAL' END
    WHEN 'ACCOUNTING_ENTRY_PENDING' THEN 'ACCOUNTS_VERIFICATION'
    WHEN 'FINANCE_PENDING' THEN 'ACCOUNTING_ENTRY_PENDING'
    WHEN 'CFO_PENDING' THEN 'FINANCE_PENDING'
    WHEN 'BANKER_PENDING' THEN 'CFO_PENDING'
    ELSE NULL -- Cannot send back from earlier stages
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can approve at current stage
CREATE OR REPLACE FUNCTION can_user_approve_payment_stage(
  p_payment_request_id TEXT,
  p_user_id UUID,
  p_stage VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_approver UUID;
  v_user_role VARCHAR(50);
  v_user_level INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Get user info
  SELECT 
    COALESCE(r.name, 'Staff'),
    COALESCE(u.business_level, 10),
    (COALESCE(u.business_level, 10) >= 90)
  INTO v_user_role, v_user_level, v_is_admin
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_primary = true
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE u.id = p_user_id;
  
  -- Admin can always approve
  IF v_is_admin THEN
    RETURN true;
  END IF;
  
  -- Check if user is the assigned approver for this stage
  SELECT current_approver_id INTO v_current_approver
  FROM payment_requests
  WHERE id = p_payment_request_id AND current_stage = p_stage;
  
  IF v_current_approver = p_user_id THEN
    RETURN true;
  END IF;
  
  -- Check role-based authorization for specific stages
  RETURN CASE p_stage
    WHEN 'ACCOUNTS_VERIFICATION' THEN v_user_role IN ('Accountant', 'Accounts Manager', 'Finance Controller', 'CFO', 'Admin')
    WHEN 'ACCOUNTING_ENTRY_PENDING' THEN v_user_role IN ('Accountant', 'Accounts Manager', 'Finance Controller', 'CFO', 'Admin')
    WHEN 'FINANCE_PENDING' THEN v_user_role IN ('Finance Controller', 'CFO', 'Admin')
    WHEN 'CFO_PENDING' THEN v_user_role IN ('CFO', 'Admin')
    WHEN 'BANKER_PENDING' THEN v_user_role IN ('Banker', 'Treasury', 'CFO', 'Admin')
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can reject (only Finance Controller/CFO for finance-origin)
CREATE OR REPLACE FUNCTION can_user_reject_payment(
  p_payment_request_id TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  can_reject BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_origin_type VARCHAR(20);
  v_current_stage VARCHAR(50);
  v_current_approver UUID;
  v_user_role VARCHAR(50);
  v_user_level INTEGER;
BEGIN
  -- Get payment request info
  SELECT origin_type, current_stage, current_approver_id
  INTO v_origin_type, v_current_stage, v_current_approver
  FROM payment_requests
  WHERE id = p_payment_request_id;
  
  -- Get user info
  SELECT 
    COALESCE(r.name, 'Staff'),
    COALESCE(u.business_level, 10)
  INTO v_user_role, v_user_level
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_primary = true
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE u.id = p_user_id;
  
  -- Admin can always reject
  IF v_user_level >= 90 THEN
    RETURN QUERY SELECT true, 'Admin override'::TEXT;
    RETURN;
  END IF;
  
  -- For finance-originated requests, only Finance Controller/CFO can reject
  IF v_origin_type = 'FINANCE' THEN
    IF v_user_role IN ('Finance Controller', 'CFO') THEN
      RETURN QUERY SELECT true, 'Finance authority'::TEXT;
    ELSE
      RETURN QUERY SELECT false, 'Only Finance Controller or CFO can reject finance-originated requests'::TEXT;
    END IF;
    RETURN;
  END IF;
  
  -- For other origins, current approver or higher can reject
  IF v_current_approver = p_user_id THEN
    RETURN QUERY SELECT true, 'Current approver'::TEXT;
  ELSIF v_user_level >= 60 THEN
    RETURN QUERY SELECT true, 'Manager authority'::TEXT;
  ELSE
    RETURN QUERY SELECT false, 'Insufficient authority to reject'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending payments for user
CREATE OR REPLACE FUNCTION get_pending_payments_for_user(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  payment_request_id TEXT,
  request_id VARCHAR(100),
  amount DECIMAL(18,2),
  purpose TEXT,
  current_stage VARCHAR(50),
  creator_name VARCHAR(200),
  created_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ,
  is_sla_breached BOOLEAN,
  can_approve BOOLEAN,
  can_reject BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr."requestId",
    pr."totalAmount",
    pr.purpose,
    pr.current_stage,
    COALESCE(u.full_name, u.email)::VARCHAR(200),
    pr."createdAt",
    pr.sla_deadline,
    (pr.sla_deadline IS NOT NULL AND pr.sla_deadline < NOW()),
    can_user_approve_payment_stage(pr.id, p_user_id, pr.current_stage),
    (SELECT cr.can_reject FROM can_user_reject_payment(pr.id, p_user_id) cr)
  FROM payment_requests pr
  LEFT JOIN users u ON pr."createdById"::uuid = u.id
  WHERE pr.tenant_id = p_tenant_id
    AND pr.workflow_status NOT IN ('DRAFT', 'PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED')
    AND (
      pr.current_approver_id = p_user_id
      OR can_user_approve_payment_stage(pr.id, p_user_id, pr.current_stage)
    )
  ORDER BY 
    CASE WHEN pr.sla_deadline < NOW() THEN 0 ELSE 1 END,
    pr.sla_deadline ASC NULLS LAST,
    pr."createdAt" DESC;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW: Payment Request Dashboard View
-- Aggregated view for approval dashboard
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_payment_request_summary AS
SELECT 
  pr.id,
  pr."requestId" as request_id,
  pr.tenant_id,
  pr.department_id,
  pr."clientName" as client_name,
  pr."totalAmount" as amount,
  pr.currency,
  pr.purpose,
  pr.beneficiary_name,
  pr.workflow_status,
  pr.current_stage,
  pr.origin_type,
  pr.urgency_level,
  pr.sla_deadline,
  pr.requires_second_manager,
  pr.amount_threshold_applied,
  
  -- Creator info
  pr."createdById" as created_by_id,
  creator.full_name as created_by_name,
  creator.email as created_by_email,
  
  -- Current approver
  pr.current_approver_id,
  approver.full_name as current_approver_name,
  
  -- Manager chain
  pr.creator_manager_id,
  manager1.full_name as manager_1_name,
  pr.creator_manager_2_id,
  manager2.full_name as manager_2_name,
  
  -- Stage progress
  (SELECT COUNT(*) FROM payment_request_stages prs WHERE prs.payment_request_id = pr.id AND prs.status = 'completed') as completed_stages,
  (SELECT COUNT(*) FROM payment_request_stages prs WHERE prs.payment_request_id = pr.id) as total_stages,
  
  -- SLA status
  CASE 
    WHEN pr.sla_deadline IS NOT NULL AND pr.sla_deadline < NOW() 
         AND pr.workflow_status NOT IN ('PAYMENT_COMPLETED', 'REJECTED', 'CANCELLED')
    THEN true ELSE false 
  END as is_sla_breached,
  
  -- Timestamps
  pr."createdAt" as created_at,
  pr."updatedAt" as updated_at,
  pr.accounts_verified_at,
  pr.finance_confirmed_at,
  pr.cfo_approved_at,
  pr.banker_executed_at

FROM payment_requests pr
LEFT JOIN users creator ON pr."createdById"::uuid = creator.id
LEFT JOIN users approver ON pr.current_approver_id = approver.id
LEFT JOIN users manager1 ON pr.creator_manager_id = manager1.id
LEFT JOIN users manager2 ON pr.creator_manager_2_id = manager2.id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE payment_request_approvals IS 'Complete audit trail for all payment request approval actions';
COMMENT ON TABLE payment_workflow_sla_config IS 'Configurable SLA per workflow stage per tenant';
COMMENT ON TABLE payment_request_stages IS 'Tracks the status and assignment of each stage for a payment request';

COMMENT ON FUNCTION get_user_manager IS 'Get the reporting manager for a user';
COMMENT ON FUNCTION get_user_manager_level_2 IS 'Get the managers manager (for >5000 approval flow)';
COMMENT ON FUNCTION determine_payment_workflow IS 'Determine which workflow path based on amount and origin';
COMMENT ON FUNCTION get_next_payment_stage IS 'Get the next stage in the payment workflow';
COMMENT ON FUNCTION get_previous_payment_stage IS 'Get previous stage for send-back (only immediate previous)';
COMMENT ON FUNCTION can_user_approve_payment_stage IS 'Check if user can approve at the current stage';
COMMENT ON FUNCTION can_user_reject_payment IS 'Check if user can reject (finance-origin restrictions)';
COMMENT ON FUNCTION get_pending_payments_for_user IS 'Get all pending payments assigned to or approvable by user';

-- ═══════════════════════════════════════════════════════════════════════════════
-- Done
-- ═══════════════════════════════════════════════════════════════════════════════
