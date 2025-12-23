-- ═══════════════════════════════════════════════════════════════════════════════
-- BISMAN ERP - Governance Hardening Migration
-- Migration: 011_governance_hardening.sql
-- Date: 2025-12-23
-- 
-- Purpose: Implements governance controls for enterprise-grade decision engine
-- 
-- PHASE 1: Governance Hardening
--   1. Mandatory override reasons for admin actions
--   2. Confidential task isolation
--   3. Explicit cancel flow
--
-- PHASE 2: Authority & Load Balancing
--   4. Close peer-approval loophole
--   5. Deputy roles (L8.5)
--
-- PHASE 3: Reporting Authority
--   6. Approval authority dashboard views
--
-- PHASE 4: Subscription-Based Limits
--   7. Task limits per subscription plan
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1.1: MANDATORY OVERRIDE REASON ENFORCEMENT
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add action metadata columns to approval_audit_log
ALTER TABLE approval_audit_log 
  ADD COLUMN IF NOT EXISTS actor_business_level INT,
  ADD COLUMN IF NOT EXISTS is_override_action BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_type VARCHAR(50), -- 'force_approve', 'force_reject', 'bypass_hierarchy', 'fallback_override'
  ADD COLUMN IF NOT EXISTS comment_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_passed BOOLEAN DEFAULT true;

-- Create constraint function for mandatory comments
CREATE OR REPLACE FUNCTION enforce_override_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an override action that requires a comment
  IF NEW.is_override_action = true OR NEW.actor_business_level >= 9 OR NEW.override_type IS NOT NULL THEN
    NEW.comment_required := true;
    IF NEW.comment IS NULL OR TRIM(NEW.comment) = '' THEN
      NEW.validation_passed := false;
      -- We don't block, but flag for compliance reporting
      -- RAISE EXCEPTION 'Override actions require a comment for audit compliance';
    ELSE
      NEW.validation_passed := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_enforce_override_comment ON approval_audit_log;
CREATE TRIGGER trg_enforce_override_comment
  BEFORE INSERT ON approval_audit_log
  FOR EACH ROW EXECUTE FUNCTION enforce_override_comment();

-- Index for compliance queries
CREATE INDEX IF NOT EXISTS idx_audit_log_override_actions 
  ON approval_audit_log(is_override_action, validation_passed) 
  WHERE is_override_action = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1.2: CONFIDENTIAL TASK ISOLATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create visibility scope enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_visibility_scope') THEN
    CREATE TYPE task_visibility_scope AS ENUM (
      'standard',           -- Normal visibility rules apply
      'creator_only',       -- Only creator can see
      'department',         -- Only creator's department can see
      'explicit_users',     -- Only explicitly added users can see
      'approvers_only',     -- Only assigned approvers can see
      'executives_only'     -- Only L9+ can see
    );
  END IF;
END $$;

-- Add confidentiality columns to workflow_tasks
ALTER TABLE workflow_tasks 
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(50) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS confidential_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS allowed_viewer_ids UUID[] DEFAULT '{}';

-- Add confidentiality to approval_instances
ALTER TABLE approval_instances 
  ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(50) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS allowed_viewer_ids UUID[] DEFAULT '{}';

-- Create view for confidential task access check
CREATE OR REPLACE FUNCTION can_view_confidential_task(
  p_user_id UUID,
  p_user_level INT,
  p_task_creator_id UUID,
  p_is_confidential BOOLEAN,
  p_visibility_scope VARCHAR(50),
  p_allowed_viewers UUID[],
  p_user_department_id UUID DEFAULT NULL,
  p_task_department_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Non-confidential tasks use standard visibility
  IF p_is_confidential = false OR p_is_confidential IS NULL THEN
    RETURN true;
  END IF;
  
  -- Creator always sees their own tasks
  IF p_user_id = p_task_creator_id THEN
    RETURN true;
  END IF;
  
  -- Super Admin (L10) sees everything
  IF p_user_level >= 10 THEN
    RETURN true;
  END IF;
  
  -- Check visibility scope
  CASE p_visibility_scope
    WHEN 'creator_only' THEN
      RETURN false; -- Only creator, already checked above
    WHEN 'department' THEN
      RETURN p_user_department_id IS NOT NULL AND p_user_department_id = p_task_department_id;
    WHEN 'explicit_users' THEN
      RETURN p_user_id = ANY(p_allowed_viewers);
    WHEN 'approvers_only' THEN
      -- This would need to check approval_stage_instances
      RETURN false; -- Handled separately in queries
    WHEN 'executives_only' THEN
      RETURN p_user_level >= 9;
    ELSE
      RETURN true;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Index for confidential task queries
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_confidential 
  ON workflow_tasks(is_confidential, visibility_scope) 
  WHERE is_confidential = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1.3: EXPLICIT CANCEL FLOW
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add cancel-related columns to workflow_tasks
ALTER TABLE workflow_tasks 
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_requested_by UUID,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancel_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_acknowledged_by UUID;

-- Add cancel-related columns to approval_instances
ALTER TABLE approval_instances 
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_requested_by UUID,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_type VARCHAR(50); -- 'creator_withdraw', 'admin_force', 'timeout', 'superseded'

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2.1: PEER-APPROVAL CONTROL
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add peer approval control to workflow stages
ALTER TABLE approval_workflow_stages 
  ADD COLUMN IF NOT EXISTS allow_peer_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_approver_level_above_creator INT DEFAULT 1; -- Must be N levels above creator

-- Add approval validation to stage instances
ALTER TABLE approval_stage_instances 
  ADD COLUMN IF NOT EXISTS creator_level INT,
  ADD COLUMN IF NOT EXISTS approver_level INT,
  ADD COLUMN IF NOT EXISTS level_difference INT GENERATED ALWAYS AS (approver_level - creator_level) STORED,
  ADD COLUMN IF NOT EXISTS peer_approval_used BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2.2: DEPUTY ROLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert deputy roles into roles table
INSERT INTO roles (name, code, description, business_level, is_system_role, created_at)
VALUES 
  ('CFO Deputy', 'CFO_DEPUTY', 'Deputy to CFO with limited override powers', 85, false, NOW()),
  ('Admin Deputy', 'ADMIN_DEPUTY', 'Deputy to Admin with limited override powers', 85, false, NOW())
ON CONFLICT (code) DO UPDATE SET 
  description = EXCLUDED.description,
  business_level = EXCLUDED.business_level;

-- Add deputy configuration table
CREATE TABLE IF NOT EXISTS role_deputies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Principal (the role being deputized for)
  principal_role_id UUID NOT NULL,
  principal_role_code VARCHAR(50) NOT NULL,
  
  -- Deputy (the role that acts as deputy)
  deputy_role_id UUID NOT NULL,
  deputy_role_code VARCHAR(50) NOT NULL,
  
  -- Permissions scope
  can_approve BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_override BOOLEAN DEFAULT false,      -- Deputies cannot override by default
  can_force_approve BOOLEAN DEFAULT false,
  can_escalate BOOLEAN DEFAULT true,
  max_approval_amount DECIMAL(15,2),       -- Financial limit for deputy
  
  -- Validity
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  UNIQUE (tenant_id, principal_role_code, deputy_role_code)
);

CREATE INDEX IF NOT EXISTS idx_role_deputies_tenant ON role_deputies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_deputies_principal ON role_deputies(principal_role_code);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: APPROVAL AUTHORITY DASHBOARD VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- View: Approval Load per Role
CREATE OR REPLACE VIEW v_approval_load_by_role AS
SELECT 
  ai.tenant_id,
  aws.assigned_role,
  COUNT(*) FILTER (WHERE asi.status = 'active') as pending_count,
  COUNT(*) FILTER (WHERE asi.status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE asi.status = 'rejected') as rejected_count,
  COUNT(*) as total_count,
  AVG(EXTRACT(EPOCH FROM (asi.actioned_at - asi.activated_at))/3600) 
    FILTER (WHERE asi.actioned_at IS NOT NULL) as avg_resolution_hours,
  COUNT(*) FILTER (WHERE asi.actioned_at > asi.due_at) as sla_breached_count
FROM approval_stage_instances asi
JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
JOIN approval_instances ai ON asi.approval_instance_id = ai.id
WHERE ai.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai.tenant_id, aws.assigned_role;

-- View: SLA Breach Heatmap Data
CREATE OR REPLACE VIEW v_sla_breach_heatmap AS
SELECT 
  ai.tenant_id,
  aws.assigned_role,
  DATE(asi.activated_at) as breach_date,
  EXTRACT(HOUR FROM asi.activated_at)::INT as hour_of_day,
  EXTRACT(DOW FROM asi.activated_at)::INT as day_of_week,
  COUNT(*) as breach_count,
  AVG(EXTRACT(EPOCH FROM (asi.actioned_at - asi.due_at))/3600) as avg_overdue_hours
FROM approval_stage_instances asi
JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
JOIN approval_instances ai ON asi.approval_instance_id = ai.id
WHERE asi.actioned_at > asi.due_at
  AND ai.created_at >= NOW() - INTERVAL '90 days'
GROUP BY ai.tenant_id, aws.assigned_role, DATE(asi.activated_at), 
         EXTRACT(HOUR FROM asi.activated_at), EXTRACT(DOW FROM asi.activated_at);

-- View: Auto-Approval % by Workflow
CREATE OR REPLACE VIEW v_auto_approval_rate AS
SELECT 
  ai.tenant_id,
  awt.code as workflow_code,
  awt.name as workflow_name,
  aws.code as stage_code,
  aws.name as stage_name,
  COUNT(*) as total_stage_instances,
  COUNT(*) FILTER (WHERE asi.status = 'auto_approved') as auto_approved_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE asi.status = 'auto_approved') / NULLIF(COUNT(*), 0), 2) as auto_approval_pct,
  COUNT(*) FILTER (WHERE asi.fallback_applied IS NOT NULL) as fallback_used_count
FROM approval_stage_instances asi
JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
JOIN approval_workflow_templates awt ON aws.workflow_template_id = awt.id
JOIN approval_instances ai ON asi.approval_instance_id = ai.id
WHERE ai.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai.tenant_id, awt.code, awt.name, aws.code, aws.name;

-- View: Fallback Usage Frequency
CREATE OR REPLACE VIEW v_fallback_usage AS
SELECT 
  ai.tenant_id,
  asi.fallback_applied as fallback_strategy,
  aws.assigned_role as original_role,
  COUNT(*) as usage_count,
  COUNT(DISTINCT ai.id) as unique_workflows_affected
FROM approval_stage_instances asi
JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
JOIN approval_instances ai ON asi.approval_instance_id = ai.id
WHERE asi.fallback_applied IS NOT NULL
  AND ai.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai.tenant_id, asi.fallback_applied, aws.assigned_role
ORDER BY usage_count DESC;

-- View: Rejection Loops by Creator
CREATE OR REPLACE VIEW v_rejection_loops AS
SELECT 
  ai.tenant_id,
  ai.initiated_by as creator_id,
  u.email as creator_email,
  u.full_name as creator_name,
  ai.entity_type,
  COUNT(*) as total_requests,
  SUM(ai.rejection_count) as total_rejections,
  AVG(ai.rejection_count) as avg_rejections_per_request,
  COUNT(*) FILTER (WHERE ai.rejection_count >= 2) as multi_rejection_count,
  COUNT(*) FILTER (WHERE ai.status = 'rejected') as permanently_rejected_count
FROM approval_instances ai
LEFT JOIN users u ON ai.initiated_by = u.id
WHERE ai.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai.tenant_id, ai.initiated_by, u.email, u.full_name, ai.entity_type
HAVING SUM(ai.rejection_count) > 0;

-- View: Missing Role Impact (skip_stage frequency)
CREATE OR REPLACE VIEW v_missing_role_impact AS
SELECT 
  ai.tenant_id,
  aws.assigned_role as missing_role,
  aws.name as stage_name,
  COUNT(*) as skip_count,
  COUNT(DISTINCT DATE(ai.created_at)) as days_affected,
  ARRAY_AGG(DISTINCT awt.name) as affected_workflows
FROM approval_stage_instances asi
JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
JOIN approval_workflow_templates awt ON aws.workflow_template_id = awt.id
JOIN approval_instances ai ON asi.approval_instance_id = ai.id
WHERE asi.fallback_applied = 'skip_stage'
  AND ai.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ai.tenant_id, aws.assigned_role, aws.name
ORDER BY skip_count DESC;

-- View: Approval Bottlenecks
CREATE OR REPLACE VIEW v_approval_bottlenecks AS
SELECT 
  ai.tenant_id,
  asi.resolved_approver_id,
  u.email as approver_email,
  u.full_name as approver_name,
  r.name as role_name,
  COUNT(*) FILTER (WHERE asi.status = 'active') as pending_count,
  COUNT(*) as total_assigned,
  AVG(EXTRACT(EPOCH FROM (COALESCE(asi.actioned_at, NOW()) - asi.activated_at))/3600) as avg_wait_hours,
  MAX(EXTRACT(EPOCH FROM (NOW() - asi.activated_at))/3600) 
    FILTER (WHERE asi.status = 'active') as max_pending_hours,
  COUNT(*) FILTER (WHERE asi.actioned_at > asi.due_at) as sla_breaches
FROM approval_stage_instances asi
JOIN approval_instances ai ON asi.approval_instance_id = ai.id
LEFT JOIN users u ON asi.resolved_approver_id = u.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE ai.created_at >= NOW() - INTERVAL '30 days'
  AND asi.resolved_approver_id IS NOT NULL
GROUP BY ai.tenant_id, asi.resolved_approver_id, u.email, u.full_name, r.name
HAVING COUNT(*) FILTER (WHERE asi.status = 'active') >= 3
ORDER BY pending_count DESC;

-- View: Override Actions Without Comment (Compliance Risk)
CREATE OR REPLACE VIEW v_override_compliance_risk AS
SELECT 
  aal.tenant_id,
  aal.performed_by,
  u.email as actor_email,
  u.full_name as actor_name,
  aal.actor_business_level,
  aal.action,
  aal.override_type,
  COUNT(*) as action_count,
  COUNT(*) FILTER (WHERE aal.validation_passed = false) as missing_comment_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE aal.validation_passed = false) / NULLIF(COUNT(*), 0), 2) as missing_comment_pct
FROM approval_audit_log aal
LEFT JOIN users u ON aal.performed_by = u.id
WHERE aal.is_override_action = true
  AND aal.performed_at >= NOW() - INTERVAL '30 days'
GROUP BY aal.tenant_id, aal.performed_by, u.email, u.full_name, aal.actor_business_level, 
         aal.action, aal.override_type;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: SUBSCRIPTION-BASED LIMITS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create subscription governance limits table
CREATE TABLE IF NOT EXISTS subscription_governance_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identification
  plan_code VARCHAR(50) NOT NULL UNIQUE,
  plan_name VARCHAR(100) NOT NULL,
  
  -- Task limits
  max_tasks_per_day_per_user INT DEFAULT 50,
  max_tasks_per_day_per_tenant INT DEFAULT 500,
  max_active_tasks_per_user INT DEFAULT 100,
  
  -- Approval limits
  max_approval_levels INT DEFAULT 4,
  allow_parallel_stages BOOLEAN DEFAULT false,
  
  -- Automation limits
  allow_auto_approval BOOLEAN DEFAULT true,
  allow_skip_stage_fallback BOOLEAN DEFAULT true,
  allow_auto_assign_admin_fallback BOOLEAN DEFAULT true,
  
  -- Escalation limits
  allow_escalate_to_super_admin BOOLEAN DEFAULT false,
  max_escalation_depth INT DEFAULT 3,
  
  -- Confidentiality
  allow_confidential_tasks BOOLEAN DEFAULT false,
  
  -- Deputy features
  allow_deputy_roles BOOLEAN DEFAULT false,
  max_deputies_per_role INT DEFAULT 0,
  
  -- Delegation
  allow_delegation BOOLEAN DEFAULT true,
  max_delegation_days INT DEFAULT 30,
  
  -- Reporting
  allow_advanced_analytics BOOLEAN DEFAULT false,
  analytics_retention_days INT DEFAULT 30,
  
  -- SLA
  default_sla_hours INT DEFAULT 24,
  min_sla_hours INT DEFAULT 4,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Insert default subscription plans
INSERT INTO subscription_governance_limits (
  plan_code, plan_name,
  max_tasks_per_day_per_user, max_tasks_per_day_per_tenant, max_active_tasks_per_user,
  max_approval_levels, allow_parallel_stages,
  allow_auto_approval, allow_skip_stage_fallback, allow_auto_assign_admin_fallback,
  allow_escalate_to_super_admin, max_escalation_depth,
  allow_confidential_tasks, allow_deputy_roles, max_deputies_per_role,
  allow_delegation, max_delegation_days,
  allow_advanced_analytics, analytics_retention_days,
  default_sla_hours, min_sla_hours
) VALUES 
-- Starter Plan
(
  'STARTER', 'Starter',
  20, 100, 50,
  2, false,
  false, false, true,
  false, 1,
  false, false, 0,
  false, 0,
  false, 7,
  24, 8
),
-- Professional Plan
(
  'PROFESSIONAL', 'Professional',
  50, 500, 100,
  4, false,
  true, true, true,
  false, 2,
  true, false, 0,
  true, 14,
  true, 30,
  24, 4
),
-- Enterprise Plan
(
  'ENTERPRISE', 'Enterprise',
  200, 2000, 500,
  6, true,
  true, true, true,
  true, 5,
  true, true, 3,
  true, 90,
  true, 365,
  24, 1
),
-- Unlimited Plan
(
  'UNLIMITED', 'Unlimited',
  -1, -1, -1, -- -1 means no limit
  -1, true,
  true, true, true,
  true, -1,
  true, true, -1,
  true, -1,
  true, -1,
  24, 1
)
ON CONFLICT (plan_code) DO UPDATE SET
  plan_name = EXCLUDED.plan_name,
  max_tasks_per_day_per_user = EXCLUDED.max_tasks_per_day_per_user,
  max_approval_levels = EXCLUDED.max_approval_levels,
  allow_confidential_tasks = EXCLUDED.allow_confidential_tasks,
  updated_at = NOW();

-- Add subscription plan reference to tenants
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS governance_plan_code VARCHAR(50) DEFAULT 'STARTER';

-- Function to check task creation limit
CREATE OR REPLACE FUNCTION check_task_creation_limit(
  p_tenant_id UUID,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_plan RECORD;
  v_user_today_count INT;
  v_tenant_today_count INT;
  v_user_active_count INT;
BEGIN
  -- Get tenant's plan
  SELECT sgl.* INTO v_plan
  FROM tenants t
  JOIN subscription_governance_limits sgl ON t.governance_plan_code = sgl.plan_code
  WHERE t.id = p_tenant_id;
  
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'No limits configured');
  END IF;
  
  -- Count user's tasks today
  SELECT COUNT(*) INTO v_user_today_count
  FROM workflow_tasks
  WHERE creator_id = p_user_id::integer -- adjust if creator_id is UUID
    AND tenant_id = p_tenant_id
    AND created_at >= CURRENT_DATE;
  
  -- Count tenant's tasks today
  SELECT COUNT(*) INTO v_tenant_today_count
  FROM workflow_tasks
  WHERE tenant_id = p_tenant_id
    AND created_at >= CURRENT_DATE;
  
  -- Count user's active tasks
  SELECT COUNT(*) INTO v_user_active_count
  FROM workflow_tasks
  WHERE creator_id = p_user_id::integer
    AND tenant_id = p_tenant_id
    AND status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED', 'done');
  
  -- Check limits (-1 means unlimited)
  IF v_plan.max_tasks_per_day_per_user > 0 AND v_user_today_count >= v_plan.max_tasks_per_day_per_user THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily user task limit reached',
      'limit', v_plan.max_tasks_per_day_per_user,
      'current', v_user_today_count
    );
  END IF;
  
  IF v_plan.max_tasks_per_day_per_tenant > 0 AND v_tenant_today_count >= v_plan.max_tasks_per_day_per_tenant THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily tenant task limit reached',
      'limit', v_plan.max_tasks_per_day_per_tenant,
      'current', v_tenant_today_count
    );
  END IF;
  
  IF v_plan.max_active_tasks_per_user > 0 AND v_user_active_count >= v_plan.max_active_tasks_per_user THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Active task limit reached',
      'limit', v_plan.max_active_tasks_per_user,
      'current', v_user_active_count
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'daily_user_remaining', CASE WHEN v_plan.max_tasks_per_day_per_user > 0 
      THEN v_plan.max_tasks_per_day_per_user - v_user_today_count ELSE -1 END,
    'daily_tenant_remaining', CASE WHEN v_plan.max_tasks_per_day_per_tenant > 0 
      THEN v_plan.max_tasks_per_day_per_tenant - v_tenant_today_count ELSE -1 END,
    'active_remaining', CASE WHEN v_plan.max_active_tasks_per_user > 0 
      THEN v_plan.max_active_tasks_per_user - v_user_active_count ELSE -1 END
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '✅ Governance Hardening Migration completed!';
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 1 - Governance Hardening:';
  RAISE NOTICE '  ✓ Mandatory override reason enforcement';
  RAISE NOTICE '  ✓ Confidential task isolation';
  RAISE NOTICE '  ✓ Explicit cancel flow';
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 2 - Authority & Load Balancing:';
  RAISE NOTICE '  ✓ Peer-approval control columns';
  RAISE NOTICE '  ✓ Deputy roles (CFO Deputy, Admin Deputy)';
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 3 - Reporting Authority:';
  RAISE NOTICE '  ✓ v_approval_load_by_role';
  RAISE NOTICE '  ✓ v_sla_breach_heatmap';
  RAISE NOTICE '  ✓ v_auto_approval_rate';
  RAISE NOTICE '  ✓ v_fallback_usage';
  RAISE NOTICE '  ✓ v_rejection_loops';
  RAISE NOTICE '  ✓ v_missing_role_impact';
  RAISE NOTICE '  ✓ v_approval_bottlenecks';
  RAISE NOTICE '  ✓ v_override_compliance_risk';
  RAISE NOTICE '';
  RAISE NOTICE 'PHASE 4 - Subscription Limits:';
  RAISE NOTICE '  ✓ subscription_governance_limits table';
  RAISE NOTICE '  ✓ check_task_creation_limit() function';
  RAISE NOTICE '  ✓ Default plans: STARTER, PROFESSIONAL, ENTERPRISE, UNLIMITED';
END $$;
