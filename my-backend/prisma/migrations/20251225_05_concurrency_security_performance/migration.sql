-- ============================================================================
-- CONCURRENCY, SECURITY & PERFORMANCE HARDENING
-- Migration: 20251225_concurrency_security_performance
-- ============================================================================
-- 
-- This migration adds:
-- 1.2 Concurrency & Locking (row-level locks, optimistic locking)
-- 1.3 Timeouts & Retries (caps, timeout tracking)
-- 1.4 Transaction Safety (constraints for data integrity)
-- 3.1 Role Abuse Prevention (maker-checker, self-approval blocks)
-- 3.2 Replay & Tampering Protection (tokens, signatures)
-- 3.3 Fraud Signals Tracking (anomaly detection)
-- 4.2 Performance Indexes
-- 4.3 Background Job Queue
-- ============================================================================

-- Removed BEGIN for Prisma

-- ============================================================================
-- 1.2 CONCURRENCY & LOCKING
-- ============================================================================

-- Add version column for optimistic locking on payment_requests
ALTER TABLE payment_requests 
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked_by UUID,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ;

-- Add version column for optimistic locking on settlements
ALTER TABLE settlements 
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS locked_by UUID,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consolidation_lock_id UUID;

-- Add version column for optimistic locking on settlement_line_items
ALTER TABLE settlement_line_items 
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Function: Acquire advisory lock on payment request (prevents concurrent consolidation)
CREATE OR REPLACE FUNCTION acquire_payment_request_lock(
  p_request_id UUID,
  p_user_id UUID,
  p_lock_duration_seconds INTEGER DEFAULT 300  -- 5 minutes default
)
RETURNS TABLE (
  acquired BOOLEAN,
  current_lock_holder UUID,
  lock_expires TIMESTAMPTZ
) AS $$
DECLARE
  v_current_lock RECORD;
BEGIN
  -- Check current lock status
  SELECT pr.locked_by, pr.lock_expires_at
  INTO v_current_lock
  FROM payment_requests pr
  WHERE pr.id = p_request_id
  FOR UPDATE NOWAIT;  -- Fail fast if row is being modified
  
  -- If locked by someone else and not expired
  IF v_current_lock.locked_by IS NOT NULL 
     AND v_current_lock.locked_by != p_user_id
     AND v_current_lock.lock_expires_at > NOW() THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      v_current_lock.locked_by,
      v_current_lock.lock_expires_at;
    RETURN;
  END IF;
  
  -- Acquire lock
  UPDATE payment_requests
  SET 
    locked_by = p_user_id,
    locked_at = NOW(),
    lock_expires_at = NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    p_user_id,
    (NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL)::TIMESTAMPTZ;
    
EXCEPTION
  WHEN lock_not_available THEN
    -- Row is being modified by another transaction
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;

-- Function: Release payment request lock
CREATE OR REPLACE FUNCTION release_payment_request_lock(
  p_request_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE payment_requests
  SET 
    locked_by = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_request_id
    AND (locked_by = p_user_id OR lock_expires_at < NOW());
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Acquire consolidation lock (prevents same request in multiple settlements)
CREATE OR REPLACE FUNCTION acquire_consolidation_lock(
  p_request_ids UUID[],
  p_settlement_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  failed_request_id UUID,
  conflict_settlement_id UUID
) AS $$
DECLARE
  v_request_id UUID;
  v_conflict RECORD;
BEGIN
  -- Check each request for existing consolidation
  FOREACH v_request_id IN ARRAY p_request_ids LOOP
    -- Check if already in an active settlement
    SELECT sli.settlement_id, s.status
    INTO v_conflict
    FROM settlement_line_items sli
    JOIN settlements s ON sli.settlement_id = s.id
    WHERE sli.payment_request_id = v_request_id
      AND s.status NOT IN ('PAID', 'REJECTED', 'CANCELLED', 'FAILED')
      AND sli.settlement_id != p_settlement_id;
    
    IF FOUND THEN
      RETURN QUERY SELECT FALSE::BOOLEAN, v_request_id, v_conflict.settlement_id;
      RETURN;
    END IF;
    
    -- Check if request is locked by another user
    SELECT pr.locked_by
    INTO v_conflict
    FROM payment_requests pr
    WHERE pr.id = v_request_id
      AND pr.locked_by IS NOT NULL
      AND pr.locked_by != p_user_id
      AND pr.lock_expires_at > NOW();
    
    IF FOUND THEN
      RETURN QUERY SELECT FALSE::BOOLEAN, v_request_id, NULL::UUID;
      RETURN;
    END IF;
  END LOOP;
  
  -- Lock all requests
  UPDATE payment_requests
  SET 
    locked_by = p_user_id,
    locked_at = NOW(),
    lock_expires_at = NOW() + INTERVAL '30 minutes'
  WHERE id = ANY(p_request_ids);
  
  RETURN QUERY SELECT TRUE::BOOLEAN, NULL::UUID, NULL::UUID;
END;
$$ LANGUAGE plpgsql;

-- Function: Optimistic lock check for updates
CREATE OR REPLACE FUNCTION check_optimistic_lock(
  p_table_name TEXT,
  p_id UUID,
  p_expected_version INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_version INTEGER;
BEGIN
  EXECUTE format('SELECT version FROM %I WHERE id = $1', p_table_name)
  INTO v_current_version
  USING p_id;
  
  IF v_current_version IS NULL THEN
    RAISE EXCEPTION 'Record not found: % id=%', p_table_name, p_id;
  END IF;
  
  IF v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'OPTIMISTIC_LOCK_CONFLICT: Record was modified by another user. Expected version %, found %', 
      p_expected_version, v_current_version;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment version on payment_requests update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_requests_version ON payment_requests;
CREATE TRIGGER trg_payment_requests_version
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_settlements_version ON settlements;
CREATE TRIGGER trg_settlements_version
  BEFORE UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

DROP TRIGGER IF EXISTS trg_settlement_line_items_version ON settlement_line_items;
CREATE TRIGGER trg_settlement_line_items_version
  BEFORE UPDATE ON settlement_line_items
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- ============================================================================
-- 1.3 TIMEOUTS & RETRIES
-- ============================================================================

-- Add retry controls to settlements
ALTER TABLE settlements 
  ADD COLUMN IF NOT EXISTS max_retry_count INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS execution_timeout_seconds INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS execution_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_deadline TIMESTAMPTZ;

-- Constraint: Retry count cannot exceed max
ALTER TABLE settlements 
  DROP CONSTRAINT IF EXISTS chk_retry_count_max;
ALTER TABLE settlements 
  ADD CONSTRAINT chk_retry_count_max 
  CHECK (COALESCE(retry_count, 0) <= max_retry_count);

-- Function: Check if execution timed out
CREATE OR REPLACE FUNCTION check_execution_timeout(p_settlement_id UUID)
RETURNS TABLE (
  is_timed_out BOOLEAN,
  started_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  elapsed_seconds INTEGER
) AS $$
DECLARE
  v_settlement RECORD;
BEGIN
  SELECT s.execution_started_at, s.execution_deadline, s.status
  INTO v_settlement
  FROM settlements s
  WHERE s.id = p_settlement_id;
  
  IF v_settlement.status = 'SENT_TO_BANK' 
     AND v_settlement.execution_deadline IS NOT NULL
     AND v_settlement.execution_deadline < NOW() THEN
    RETURN QUERY SELECT 
      TRUE::BOOLEAN,
      v_settlement.execution_started_at,
      v_settlement.execution_deadline,
      EXTRACT(EPOCH FROM (NOW() - v_settlement.execution_started_at))::INTEGER;
  ELSE
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      v_settlement.execution_started_at,
      v_settlement.execution_deadline,
      CASE WHEN v_settlement.execution_started_at IS NOT NULL 
           THEN EXTRACT(EPOCH FROM (NOW() - v_settlement.execution_started_at))::INTEGER
           ELSE NULL END;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3.1 ROLE ABUSE PREVENTION (Maker-Checker)
-- ============================================================================

-- Table: Track all actors in a settlement lifecycle
CREATE TABLE IF NOT EXISTS settlement_actor_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL ,
  
  -- Actor info
  actor_id UUID NOT NULL,
  actor_role VARCHAR(50) NOT NULL,  -- ACCOUNTANT, FINANCE_CONTROLLER, CFO, BANKER
  action VARCHAR(50) NOT NULL,      -- CREATED, APPROVED, EXECUTED, etc.
  
  -- Timing
  acted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  tenant_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_settlement_actors ON settlement_actor_history(settlement_id);

-- Function: Check maker-checker rule (creator cannot approve)
CREATE OR REPLACE FUNCTION check_maker_checker(
  p_settlement_id UUID,
  p_actor_id UUID,
  p_action VARCHAR(50)
)
RETURNS TABLE (
  allowed BOOLEAN,
  violation_reason TEXT,
  conflicting_action VARCHAR(50),
  conflicting_actor_id UUID
) AS $$
DECLARE
  v_conflict RECORD;
  v_creator_id UUID;
BEGIN
  -- Rule 1: Creator cannot approve their own settlement
  SELECT s.created_by INTO v_creator_id
  FROM settlements s WHERE s.id = p_settlement_id;
  
  IF p_action IN ('FC_APPROVED', 'CFO_APPROVED', 'EXECUTED') AND v_creator_id = p_actor_id THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      'MAKER_CHECKER_VIOLATION: Settlement creator cannot approve or execute'::TEXT,
      'CREATED'::VARCHAR(50),
      v_creator_id;
    RETURN;
  END IF;
  
  -- Rule 2: Same person cannot approve at multiple stages
  SELECT sah.action, sah.actor_id
  INTO v_conflict
  FROM settlement_actor_history sah
  WHERE sah.settlement_id = p_settlement_id
    AND sah.actor_id = p_actor_id
    AND sah.action IN ('FC_APPROVED', 'CFO_APPROVED', 'EXECUTED')
    AND sah.action != p_action;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      'MULTI_STAGE_VIOLATION: Same user cannot approve at multiple stages'::TEXT,
      v_conflict.action,
      v_conflict.actor_id;
    RETURN;
  END IF;
  
  -- Rule 3: Finance Controller and CFO must be different people
  IF p_action = 'CFO_APPROVED' THEN
    SELECT sah.actor_id
    INTO v_conflict
    FROM settlement_actor_history sah
    WHERE sah.settlement_id = p_settlement_id
      AND sah.action = 'FC_APPROVED'
      AND sah.actor_id = p_actor_id;
    
    IF FOUND THEN
      RETURN QUERY SELECT 
        FALSE::BOOLEAN,
        'DUAL_APPROVAL_VIOLATION: CFO cannot be the same person who approved as FC'::TEXT,
        'FC_APPROVED'::VARCHAR(50),
        v_conflict.actor_id;
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT TRUE::BOOLEAN, NULL::TEXT, NULL::VARCHAR(50), NULL::UUID;
END;
$$ LANGUAGE plpgsql;

-- Function: Record actor action (with maker-checker validation)
CREATE OR REPLACE FUNCTION record_settlement_actor(
  p_settlement_id UUID,
  p_actor_id UUID,
  p_actor_role VARCHAR(50),
  p_action VARCHAR(50),
  p_tenant_id UUID,
  p_bypass_check BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_check RECORD;
BEGIN
  -- Check maker-checker rules unless bypassed
  IF NOT p_bypass_check THEN
    SELECT * INTO v_check FROM check_maker_checker(p_settlement_id, p_actor_id, p_action);
    
    IF NOT v_check.allowed THEN
      RETURN QUERY SELECT FALSE::BOOLEAN, v_check.violation_reason;
      RETURN;
    END IF;
  END IF;
  
  -- Record the action
  INSERT INTO settlement_actor_history (
    settlement_id, actor_id, actor_role, action, tenant_id
  ) VALUES (
    p_settlement_id, p_actor_id, p_actor_role, p_action, p_tenant_id
  );
  
  RETURN QUERY SELECT TRUE::BOOLEAN, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3.2 REPLAY & TAMPERING PROTECTION
-- ============================================================================

-- Table: One-time approval tokens
CREATE TABLE IF NOT EXISTS settlement_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  settlement_id UUID NOT NULL ,
  
  -- Token details
  token_hash VARCHAR(128) NOT NULL UNIQUE,  -- SHA-512 of actual token
  token_type VARCHAR(30) NOT NULL,          -- FC_APPROVAL, CFO_APPROVAL, EXECUTE
  
  -- Actor binding
  intended_for_user_id UUID NOT NULL,
  intended_for_role VARCHAR(50) NOT NULL,
  
  -- Validity
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Usage
  used_at TIMESTAMPTZ,
  used_by UUID,
  used_from_ip INET,
  
  -- Request binding (prevent tampering)
  request_hash VARCHAR(128),  -- Hash of expected request body
  
  tenant_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_hash ON settlement_approval_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_settlement ON settlement_approval_tokens(settlement_id);

-- Function: Generate approval token
CREATE OR REPLACE FUNCTION generate_approval_token(
  p_settlement_id UUID,
  p_token_type VARCHAR(30),
  p_user_id UUID,
  p_user_role VARCHAR(50),
  p_tenant_id UUID,
  p_validity_minutes INTEGER DEFAULT 60,
  p_request_hash VARCHAR(128) DEFAULT NULL
)
RETURNS TABLE (
  token_id UUID,
  token_hash VARCHAR(128),
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_token_id UUID;
  v_hash VARCHAR(128);
  v_expires TIMESTAMPTZ;
BEGIN
  v_token_id := gen_random_uuid();
  -- Hash is SHA-512 of token_id + settlement_id + timestamp (simulated here)
  v_hash := encode(sha512((v_token_id::TEXT || p_settlement_id::TEXT || NOW()::TEXT)::BYTEA), 'hex');
  v_expires := NOW() + (p_validity_minutes || ' minutes')::INTERVAL;
  
  -- Invalidate any existing unused tokens for this settlement/type
  UPDATE settlement_approval_tokens
  SET expires_at = NOW()
  WHERE settlement_id = p_settlement_id
    AND token_type = p_token_type
    AND used_at IS NULL
    AND expires_at > NOW();
  
  -- Create new token
  INSERT INTO settlement_approval_tokens (
    id, settlement_id, token_hash, token_type,
    intended_for_user_id, intended_for_role,
    expires_at, request_hash, tenant_id
  ) VALUES (
    v_token_id, p_settlement_id, v_hash, p_token_type,
    p_user_id, p_user_role,
    v_expires, p_request_hash, p_tenant_id
  );
  
  RETURN QUERY SELECT v_token_id, v_hash, v_expires;
END;
$$ LANGUAGE plpgsql;

-- Function: Validate and consume approval token
CREATE OR REPLACE FUNCTION validate_approval_token(
  p_token_hash VARCHAR(128),
  p_user_id UUID,
  p_user_role VARCHAR(50),
  p_request_hash VARCHAR(128) DEFAULT NULL,
  p_client_ip INET DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  settlement_id UUID,
  token_type VARCHAR(30),
  error_reason TEXT
) AS $$
DECLARE
  v_token RECORD;
BEGIN
  -- Find the token
  SELECT sat.*
  INTO v_token
  FROM settlement_approval_tokens sat
  WHERE sat.token_hash = p_token_hash
  FOR UPDATE;  -- Lock to prevent race condition
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, NULL::VARCHAR(30), 'TOKEN_NOT_FOUND'::TEXT;
    RETURN;
  END IF;
  
  -- Check if already used
  IF v_token.used_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_token.settlement_id, v_token.token_type, 'TOKEN_ALREADY_USED'::TEXT;
    RETURN;
  END IF;
  
  -- Check expiry
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_token.settlement_id, v_token.token_type, 'TOKEN_EXPIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check user binding
  IF v_token.intended_for_user_id != p_user_id THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_token.settlement_id, v_token.token_type, 'TOKEN_USER_MISMATCH'::TEXT;
    RETURN;
  END IF;
  
  -- Check request hash (anti-tampering)
  IF v_token.request_hash IS NOT NULL AND v_token.request_hash != COALESCE(p_request_hash, '') THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, v_token.settlement_id, v_token.token_type, 'REQUEST_TAMPERED'::TEXT;
    RETURN;
  END IF;
  
  -- Mark as used
  UPDATE settlement_approval_tokens
  SET 
    used_at = NOW(),
    used_by = p_user_id,
    used_from_ip = p_client_ip
  WHERE id = v_token.id;
  
  RETURN QUERY SELECT TRUE::BOOLEAN, v_token.settlement_id, v_token.token_type, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3.3 FRAUD SIGNALS TRACKING
-- ============================================================================

-- Table: Fraud signals for monitoring
CREATE TABLE IF NOT EXISTS settlement_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  settlement_id UUID ,
  payment_request_id UUID,
  user_id UUID,
  
  -- Signal details
  signal_type VARCHAR(50) NOT NULL,
  -- Types: FREQUENT_DISALLOW, EXCESSIVE_RETRY, ODD_TIMING, 
  --        RAPID_APPROVAL, AMOUNT_ANOMALY, VELOCITY_SPIKE
  
  severity VARCHAR(20) NOT NULL DEFAULT 'LOW',  -- LOW, MEDIUM, HIGH, CRITICAL
  
  -- Context data
  signal_data JSONB,  -- Additional context (times, amounts, patterns)
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',  -- NEW, REVIEWED, DISMISSED, ESCALATED
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Timing
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  tenant_id UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_status ON settlement_fraud_signals(status, severity);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON settlement_fraud_signals(user_id, detected_at);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_tenant ON settlement_fraud_signals(tenant_id, detected_at);

-- Function: Log fraud signal
CREATE OR REPLACE FUNCTION log_fraud_signal(
  p_signal_type VARCHAR(50),
  p_severity VARCHAR(20),
  p_tenant_id UUID,
  p_settlement_id UUID DEFAULT NULL,
  p_payment_request_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_signal_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_signal_id UUID;
BEGIN
  INSERT INTO settlement_fraud_signals (
    signal_type, severity, tenant_id,
    settlement_id, payment_request_id, user_id,
    signal_data
  ) VALUES (
    p_signal_type, p_severity, p_tenant_id,
    p_settlement_id, p_payment_request_id, p_user_id,
    p_signal_data
  )
  RETURNING id INTO v_signal_id;
  
  RETURN v_signal_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Detect frequent disallows (run periodically)
CREATE OR REPLACE FUNCTION detect_frequent_disallows(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_user RECORD;
BEGIN
  -- Find users who disallowed more than 10 items in last 24 hours
  FOR v_user IN
    SELECT 
      sdh.disallowed_by AS user_id,
      COUNT(*) AS disallow_count
    FROM settlement_disallow_history sdh
    WHERE sdh.tenant_id = p_tenant_id
      AND sdh.disallowed_at > NOW() - INTERVAL '24 hours'
    GROUP BY sdh.disallowed_by
    HAVING COUNT(*) > 10
  LOOP
    PERFORM log_fraud_signal(
      'FREQUENT_DISALLOW',
      CASE WHEN v_user.disallow_count > 50 THEN 'HIGH' 
           WHEN v_user.disallow_count > 25 THEN 'MEDIUM' 
           ELSE 'LOW' END,
      p_tenant_id,
      NULL,
      NULL,
      v_user.user_id,
      jsonb_build_object('disallow_count', v_user.disallow_count, 'period', '24 hours')
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Detect excessive retries
CREATE OR REPLACE FUNCTION detect_excessive_retries(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_settlement RECORD;
BEGIN
  -- Find settlements with 2+ retries
  FOR v_settlement IN
    SELECT s.id, s.retry_count, s.created_by
    FROM settlements s
    WHERE s.tenant_id = p_tenant_id
      AND s.retry_count >= 2
      AND s.id NOT IN (
        SELECT settlement_id FROM settlement_fraud_signals 
        WHERE signal_type = 'EXCESSIVE_RETRY' AND settlement_id = s.id
      )
  LOOP
    PERFORM log_fraud_signal(
      'EXCESSIVE_RETRY',
      CASE WHEN v_settlement.retry_count >= 3 THEN 'HIGH' ELSE 'MEDIUM' END,
      p_tenant_id,
      v_settlement.id,
      NULL,
      v_settlement.created_by,
      jsonb_build_object('retry_count', v_settlement.retry_count)
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Detect odd timing (approvals outside business hours)
CREATE OR REPLACE FUNCTION detect_odd_timing(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_approval RECORD;
BEGIN
  -- Find approvals between 10 PM and 6 AM
  FOR v_approval IN
    SELECT 
      sa.settlement_id,
      sa.actor_id,
      sa.action,
      sa.created_at,
      EXTRACT(HOUR FROM sa.created_at) AS hour_of_day
    FROM settlement_approvals sa
    WHERE sa.tenant_id = p_tenant_id
      AND sa.created_at > NOW() - INTERVAL '24 hours'
      AND sa.action IN ('FC_APPROVED', 'CFO_APPROVED', 'EXECUTED')
      AND (EXTRACT(HOUR FROM sa.created_at) >= 22 
           OR EXTRACT(HOUR FROM sa.created_at) < 6)
      AND sa.id NOT IN (
        SELECT (signal_data->>'approval_id')::UUID 
        FROM settlement_fraud_signals 
        WHERE signal_type = 'ODD_TIMING'
      )
  LOOP
    PERFORM log_fraud_signal(
      'ODD_TIMING',
      'MEDIUM',
      p_tenant_id,
      v_approval.settlement_id,
      NULL,
      v_approval.actor_id,
      jsonb_build_object(
        'action', v_approval.action,
        'time', v_approval.created_at,
        'hour', v_approval.hour_of_day
      )
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4.2 DB INDEX STRATEGY
-- ============================================================================

-- Settlement indexes (wrapped in conditional blocks for schema compatibility)
DO $$
BEGIN
  -- Basic settlement indexes
  CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
  CREATE INDEX IF NOT EXISTS idx_settlements_utr ON settlements(utr_number) WHERE utr_number IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_settlements_date_range ON settlements(created_at, status);
  
  -- Only create tenant_id indexes if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settlements' AND column_name = 'tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_settlements_tenant_status ON settlements(tenant_id, status);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settlements' AND column_name = 'created_by') THEN
    CREATE INDEX IF NOT EXISTS idx_settlements_created_by ON settlements(created_by);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settlements' AND column_name = 'current_approver_id') THEN
    CREATE INDEX IF NOT EXISTS idx_settlements_current_approver ON settlements(current_approver_id) WHERE current_approver_id IS NOT NULL;
  END IF;
END $$;

-- Settlement line items indexes
CREATE INDEX IF NOT EXISTS idx_sli_settlement ON settlement_line_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_sli_payment_request ON settlement_line_items(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_sli_composite ON settlement_line_items(settlement_id, payment_request_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settlement_line_items' AND column_name = 'is_disallowed') THEN
    CREATE INDEX IF NOT EXISTS idx_sli_disallowed ON settlement_line_items(is_disallowed) WHERE is_disallowed = true;
  END IF;
END $$;

-- Payment request indexes for settlement queries (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'tenant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_settlement_ready ON payment_requests(status, tenant_id) WHERE status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_SETTLED');
    CREATE INDEX IF NOT EXISTS idx_pr_tenant_status_date ON payment_requests(tenant_id, status, "createdAt");
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'clientId') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_settlement_ready ON payment_requests(status, "clientId") WHERE status IN ('APPROVED', 'PARTIALLY_APPROVED', 'PARTIALLY_SETTLED');
    CREATE INDEX IF NOT EXISTS idx_pr_client_status_date ON payment_requests("clientId", status, "createdAt");
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'locked_by') THEN
    CREATE INDEX IF NOT EXISTS idx_pr_locked ON payment_requests(locked_by) WHERE locked_by IS NOT NULL;
  END IF;
END $$;

-- Partial payments indexes (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_request_partial_payments') THEN
    CREATE INDEX IF NOT EXISTS idx_partial_payments_request ON payment_request_partial_payments(payment_request_id);
    CREATE INDEX IF NOT EXISTS idx_partial_payments_settlement ON payment_request_partial_payments(settlement_id);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_request_partial_payments' AND column_name = 'utr_number') THEN
      CREATE INDEX IF NOT EXISTS idx_partial_payments_utr ON payment_request_partial_payments(utr_number) WHERE utr_number IS NOT NULL;
    END IF;
  END IF;
END $$;

-- Idempotency key cleanup index
CREATE INDEX IF NOT EXISTS idx_idempotency_cleanup ON idempotency_keys(expires_at, status);

-- Approval history indexes
CREATE INDEX IF NOT EXISTS idx_settlement_approvals_settlement ON settlement_approvals(settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_approvals_actor ON settlement_approvals(actor_id);

-- ============================================================================
-- 4.3 BACKGROUND JOB QUEUE
-- ============================================================================

-- Table: Background jobs queue
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Job definition
  job_type VARCHAR(50) NOT NULL,
  -- Types: AUDIT_LOG, NOTIFICATION, RECONCILIATION, FRAUD_DETECTION, LOCK_CLEANUP
  
  payload JSONB NOT NULL,
  
  -- Scheduling
  priority INTEGER NOT NULL DEFAULT 5,  -- 1=highest, 10=lowest
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Execution
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED, RETRY
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  
  -- Processing
  locked_by VARCHAR(100),  -- Worker ID
  locked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Context
  tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_jobs_pending ON background_jobs(status, scheduled_for, priority) 
  WHERE status IN ('PENDING', 'RETRY');
CREATE INDEX IF NOT EXISTS idx_jobs_processing ON background_jobs(status, locked_at) 
  WHERE status = 'PROCESSING';
CREATE INDEX IF NOT EXISTS idx_jobs_type ON background_jobs(job_type, status);

-- Function: Enqueue background job
CREATE OR REPLACE FUNCTION enqueue_job(
  p_job_type VARCHAR(50),
  p_payload JSONB,
  p_tenant_id UUID DEFAULT NULL,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  p_idempotency_key VARCHAR(255) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO background_jobs (
    job_type, payload, tenant_id, priority, scheduled_for, idempotency_key
  ) VALUES (
    p_job_type, p_payload, p_tenant_id, p_priority, p_scheduled_for, p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Fetch and lock next job (for workers)
CREATE OR REPLACE FUNCTION fetch_next_job(
  p_worker_id VARCHAR(100),
  p_job_types VARCHAR(50)[] DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  job_type VARCHAR(50),
  payload JSONB,
  tenant_id UUID,
  attempts INTEGER
) AS $$
DECLARE
  v_job RECORD;
BEGIN
  -- Find and lock the next available job
  SELECT bj.*
  INTO v_job
  FROM background_jobs bj
  WHERE bj.status IN ('PENDING', 'RETRY')
    AND bj.scheduled_for <= NOW()
    AND bj.attempts < bj.max_attempts
    AND (p_job_types IS NULL OR bj.job_type = ANY(p_job_types))
  ORDER BY bj.priority ASC, bj.scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Lock the job
  UPDATE background_jobs
  SET 
    status = 'PROCESSING',
    locked_by = p_worker_id,
    locked_at = NOW(),
    started_at = NOW(),
    attempts = attempts + 1
  WHERE id = v_job.id;
  
  RETURN QUERY SELECT v_job.id, v_job.job_type, v_job.payload, v_job.tenant_id, v_job.attempts + 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Complete job
CREATE OR REPLACE FUNCTION complete_job(p_job_id UUID, p_success BOOLEAN, p_error TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  IF p_success THEN
    UPDATE background_jobs
    SET 
      status = 'COMPLETED',
      completed_at = NOW(),
      locked_by = NULL
    WHERE id = p_job_id;
  ELSE
    UPDATE background_jobs
    SET 
      status = CASE WHEN attempts >= max_attempts THEN 'FAILED' ELSE 'RETRY' END,
      last_error = p_error,
      locked_by = NULL,
      locked_at = NULL,
      scheduled_for = NOW() + (attempts * INTERVAL '1 minute')  -- Exponential backoff
    WHERE id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup stale locks (run periodically)
CREATE OR REPLACE FUNCTION cleanup_stale_job_locks(p_timeout_minutes INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE background_jobs
  SET 
    status = 'RETRY',
    locked_by = NULL,
    locked_at = NULL,
    last_error = 'Worker timeout - job released'
  WHERE status = 'PROCESSING'
    AND locked_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-enqueue audit log jobs
-- ============================================================================

CREATE OR REPLACE FUNCTION enqueue_audit_job()
RETURNS TRIGGER AS $$
BEGIN
  -- Enqueue async audit logging for settlement status changes
  IF TG_TABLE_NAME = 'settlements' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM enqueue_job(
      'AUDIT_LOG',
      jsonb_build_object(
        'table', 'settlements',
        'id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      ),
      NEW.tenant_id,
      3  -- High priority
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_settlement_audit_job ON settlements;
CREATE TRIGGER trg_settlement_audit_job
  AFTER UPDATE ON settlements
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_audit_job();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE settlement_actor_history IS 'Tracks all actors in settlement lifecycle for maker-checker enforcement';
COMMENT ON TABLE settlement_approval_tokens IS 'One-time tokens for secure approval links';
COMMENT ON TABLE settlement_fraud_signals IS 'Detected fraud/anomaly signals for CFO dashboard';
COMMENT ON TABLE background_jobs IS 'Async job queue for non-blocking operations';

COMMENT ON FUNCTION check_maker_checker IS 'Validates maker-checker rules: creator cannot approve, dual approval required';
COMMENT ON FUNCTION validate_approval_token IS 'Validates and consumes one-time approval token';
COMMENT ON FUNCTION log_fraud_signal IS 'Records detected fraud/anomaly signal';

-- Removed COMMIT for Prisma

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
-- Removed BEGIN for Prisma

-- Drop triggers
DROP TRIGGER IF EXISTS trg_settlement_audit_job ON settlements;
DROP TRIGGER IF EXISTS trg_settlement_line_items_version ON settlement_line_items;
DROP TRIGGER IF EXISTS trg_settlements_version ON settlements;
DROP TRIGGER IF EXISTS trg_payment_requests_version ON payment_requests;

-- Drop functions
DROP FUNCTION IF EXISTS enqueue_audit_job();
DROP FUNCTION IF EXISTS cleanup_stale_job_locks(INTEGER);
DROP FUNCTION IF EXISTS complete_job(UUID, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS fetch_next_job(VARCHAR, VARCHAR[]);
DROP FUNCTION IF EXISTS enqueue_job(VARCHAR, JSONB, UUID, INTEGER, TIMESTAMPTZ, VARCHAR);
DROP FUNCTION IF EXISTS detect_odd_timing(UUID);
DROP FUNCTION IF EXISTS detect_excessive_retries(UUID);
DROP FUNCTION IF EXISTS detect_frequent_disallows(UUID);
DROP FUNCTION IF EXISTS log_fraud_signal(VARCHAR, VARCHAR, UUID, UUID, UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS validate_approval_token(VARCHAR, UUID, VARCHAR, VARCHAR, INET);
DROP FUNCTION IF EXISTS generate_approval_token(UUID, VARCHAR, UUID, VARCHAR, UUID, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS record_settlement_actor(UUID, UUID, VARCHAR, VARCHAR, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS check_maker_checker(UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS check_execution_timeout(UUID);
DROP FUNCTION IF EXISTS increment_version();
DROP FUNCTION IF EXISTS check_optimistic_lock(TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS acquire_consolidation_lock(UUID[], UUID, UUID);
DROP FUNCTION IF EXISTS release_payment_request_lock(UUID, UUID);
DROP FUNCTION IF EXISTS acquire_payment_request_lock(UUID, UUID, INTEGER);

-- Drop tables
DROP TABLE IF EXISTS background_jobs;
DROP TABLE IF EXISTS settlement_fraud_signals;
DROP TABLE IF EXISTS settlement_approval_tokens;
DROP TABLE IF EXISTS settlement_actor_history;

-- Drop constraints
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS chk_retry_count_max;

-- Drop columns
ALTER TABLE settlements DROP COLUMN IF EXISTS execution_deadline;
ALTER TABLE settlements DROP COLUMN IF EXISTS execution_started_at;
ALTER TABLE settlements DROP COLUMN IF EXISTS execution_timeout_seconds;
ALTER TABLE settlements DROP COLUMN IF EXISTS max_retry_count;
ALTER TABLE settlements DROP COLUMN IF EXISTS consolidation_lock_id;
ALTER TABLE settlements DROP COLUMN IF EXISTS lock_expires_at;
ALTER TABLE settlements DROP COLUMN IF EXISTS locked_at;
ALTER TABLE settlements DROP COLUMN IF EXISTS locked_by;
ALTER TABLE settlements DROP COLUMN IF EXISTS version;

ALTER TABLE settlement_line_items DROP COLUMN IF EXISTS version;

ALTER TABLE payment_requests DROP COLUMN IF EXISTS lock_expires_at;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS locked_at;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS locked_by;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS version;

-- Removed COMMIT for Prisma
*/
