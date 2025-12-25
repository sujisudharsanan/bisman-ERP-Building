-- ============================================================================
-- PARTIAL DISALLOW & FAIL RECOVERY SCHEMA
-- ============================================================================
-- 
-- Implements per MASTER IMPLEMENTATION PROMPT:
-- 1. Partial disallow tracking (FC/CFO can untick items)
-- 2. Settlement failure handling
-- 3. Enhanced audit trail with amounts before/after
-- 4. UTR correction history
--
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD FAILED STATUS TO SETTLEMENTS
-- ============================================================================

-- Update settlement status constraint to include FAILED
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS valid_settlement_status;
ALTER TABLE settlements ADD CONSTRAINT valid_settlement_status CHECK (
  status IN ('DRAFT', 'SUBMITTED_TO_FINANCE', 'FINANCE_CONTROLLER_APPROVED', 
             'CFO_APPROVED', 'SENT_TO_BANK', 'PAID', 'REJECTED', 'CANCELLED', 'FAILED')
);

-- Add failure tracking columns
ALTER TABLE settlements 
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS failure_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS original_total_amount DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS disallowed_amount DECIMAL(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS line_item_count INTEGER DEFAULT 0;

-- ============================================================================
-- 2. SETTLEMENT LINE ITEMS - DISALLOW TRACKING
-- ============================================================================

ALTER TABLE settlement_line_items
ADD COLUMN IF NOT EXISTS is_disallowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS disallowed_by UUID REFERENCES users_enhanced(id),
ADD COLUMN IF NOT EXISTS disallowed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS disallowed_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS disallow_reason TEXT,
ADD COLUMN IF NOT EXISTS disallow_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS returned_to_queue_at TIMESTAMP;

-- Index for disallowed items
CREATE INDEX IF NOT EXISTS idx_sli_disallowed ON settlement_line_items(is_disallowed) 
  WHERE is_disallowed = true;

-- ============================================================================
-- 3. DISALLOW HISTORY TABLE (Full Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_disallow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL  ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES settlement_line_items(id) ON DELETE CASCADE,
  payment_request_id VARCHAR(255) NOT NULL,
  
  -- What was disallowed
  request_number VARCHAR(50),
  vendor_name VARCHAR(255),
  amount_disallowed DECIMAL(18,2) NOT NULL,
  
  -- Who disallowed
  disallowed_by UUID NOT NULL REFERENCES users_enhanced(id),
  disallowed_by_name VARCHAR(255),
  disallowed_role VARCHAR(50) NOT NULL,        -- FINANCE_CONTROLLER or CFO
  
  -- Why
  reason TEXT,
  
  -- Settlement state at time of disallow
  settlement_status_before VARCHAR(50),
  settlement_total_before DECIMAL(18,2),
  settlement_total_after DECIMAL(18,2),
  
  -- Request state
  request_status_before VARCHAR(50),
  request_status_after VARCHAR(50),            -- Reverted status
  
  -- Audit
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdh_settlement ON settlement_disallow_history(settlement_id);
CREATE INDEX IF NOT EXISTS idx_sdh_request ON settlement_disallow_history(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_sdh_disallowed_by ON settlement_disallow_history(disallowed_by);

-- ============================================================================
-- 4. UTR CORRECTION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS utr_correction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL  ON DELETE CASCADE,
  
  -- UTR values
  old_utr VARCHAR(100),
  new_utr VARCHAR(100) NOT NULL,
  
  -- Who corrected
  corrected_by UUID NOT NULL REFERENCES users_enhanced(id),
  corrected_by_name VARCHAR(255),
  corrected_role VARCHAR(50),
  
  -- Why
  correction_reason TEXT NOT NULL,
  
  -- Settlement state
  settlement_status VARCHAR(50),
  
  -- Audit
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uch_settlement ON utr_correction_history(settlement_id);
CREATE INDEX IF NOT EXISTS idx_uch_old_utr ON utr_correction_history(old_utr);
CREATE INDEX IF NOT EXISTS idx_uch_new_utr ON utr_correction_history(new_utr);

-- ============================================================================
-- 5. SETTLEMENT FAILURE HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS settlement_failure_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL  ON DELETE CASCADE,
  
  -- Failure details
  failure_code VARCHAR(50),
  failure_reason TEXT NOT NULL,
  failure_source VARCHAR(50),                  -- BANK, SYSTEM, MANUAL
  
  -- State at failure
  status_before VARCHAR(50),
  utr_number VARCHAR(100),
  bank_reference VARCHAR(100),
  
  -- Who reported (if manual)
  reported_by UUID REFERENCES users_enhanced(id),
  reported_by_name VARCHAR(255),
  
  -- Recovery
  recovery_action VARCHAR(50),                 -- RETRY, CANCEL, REQUEUE
  recovered_at TIMESTAMP,
  recovered_by UUID REFERENCES users_enhanced(id),
  
  -- Audit
  tenant_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sfh_settlement ON settlement_failure_history(settlement_id);

-- ============================================================================
-- 6. ENHANCED SETTLEMENT APPROVALS (Amount Tracking)
-- ============================================================================

ALTER TABLE settlement_approvals
ADD COLUMN IF NOT EXISTS amount_before DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS amount_after DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS items_allowed INTEGER,
ADD COLUMN IF NOT EXISTS items_disallowed INTEGER,
ADD COLUMN IF NOT EXISTS disallowed_item_ids UUID[];

-- ============================================================================
-- 7. FUNCTION: Handle Partial Disallow
-- ============================================================================

CREATE OR REPLACE FUNCTION process_partial_disallow(
  p_settlement_id UUID,
  p_line_item_ids UUID[],
  p_disallowed_by UUID,
  p_disallowed_role VARCHAR(50),
  p_reason TEXT,
  p_tenant_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  items_disallowed INTEGER,
  amount_disallowed DECIMAL,
  new_settlement_total DECIMAL
) AS $$
DECLARE
  v_item_id UUID;
  v_disallowed_count INTEGER := 0;
  v_disallowed_amount DECIMAL := 0;
  v_settlement_total DECIMAL;
  v_original_total DECIMAL;
  v_user_name VARCHAR;
  v_settlement_status VARCHAR;
BEGIN
  -- Get user name
  SELECT full_name INTO v_user_name FROM users WHERE id = p_disallowed_by;
  
  -- Get current settlement info
  SELECT total_amount, COALESCE(original_total_amount, total_amount), status 
  INTO v_settlement_total, v_original_total, v_settlement_status
  FROM settlements WHERE id = p_settlement_id;
  
  -- Process each disallowed item
  FOREACH v_item_id IN ARRAY p_line_item_ids LOOP
    -- Get item details before disallow
    WITH item_details AS (
      SELECT 
        sli.*,
        pr.status AS request_status
      FROM settlement_line_items sli
      LEFT JOIN payment_requests pr ON sli.payment_request_id = pr.id
      WHERE sli.id = v_item_id AND sli.settlement_id = p_settlement_id
    )
    -- Mark as disallowed
    UPDATE settlement_line_items
    SET 
      is_disallowed = true,
      disallowed_by = p_disallowed_by,
      disallowed_at = NOW(),
      disallowed_role = p_disallowed_role,
      disallow_reason = p_reason,
      disallow_stage = v_settlement_status,
      returned_to_queue_at = NOW(),
      updated_at = NOW()
    WHERE id = v_item_id
      AND settlement_id = p_settlement_id
      AND is_disallowed = false
    RETURNING amount_in_settlement INTO v_disallowed_amount;
    
    IF FOUND THEN
      v_disallowed_count := v_disallowed_count + 1;
      
      -- Create disallow history
      INSERT INTO settlement_disallow_history (
        settlement_id, line_item_id, payment_request_id,
        request_number, vendor_name, amount_disallowed,
        disallowed_by, disallowed_by_name, disallowed_role,
        reason, settlement_status_before, 
        settlement_total_before, settlement_total_after,
        request_status_before, request_status_after,
        tenant_id
      )
      SELECT
        p_settlement_id,
        v_item_id,
        sli.payment_request_id,
        sli.request_number,
        sli.vendor_name,
        sli.amount_in_settlement,
        p_disallowed_by,
        v_user_name,
        p_disallowed_role,
        p_reason,
        v_settlement_status,
        v_settlement_total,
        v_settlement_total - sli.amount_in_settlement,
        pr.status,
        CASE WHEN COALESCE(pr.paid_amount_total, 0) > 0 THEN 'PARTIALLY_SETTLED' ELSE 'APPROVED' END,
        p_tenant_id
      FROM settlement_line_items sli
      LEFT JOIN payment_requests pr ON sli.payment_request_id = pr.id
      WHERE sli.id = v_item_id;
      
      -- Revert payment request status
      UPDATE payment_requests pr
      SET 
        status = CASE 
          WHEN COALESCE(paid_amount_total, 0) > 0 THEN 'PARTIALLY_SETTLED'
          ELSE 'APPROVED'
        END,
        workflow_status = CASE 
          WHEN COALESCE(paid_amount_total, 0) > 0 THEN 'PARTIALLY_SETTLED'
          ELSE 'APPROVED'
        END,
        updated_at = NOW()
      FROM settlement_line_items sli
      WHERE sli.id = v_item_id
        AND sli.payment_request_id = pr.id;
        
      -- Accumulate disallowed amount
      v_disallowed_amount := v_disallowed_amount + (
        SELECT amount_in_settlement FROM settlement_line_items WHERE id = v_item_id
      );
    END IF;
  END LOOP;
  
  -- Update settlement totals
  UPDATE settlements
  SET 
    total_amount = total_amount - v_disallowed_amount,
    disallowed_amount = COALESCE(disallowed_amount, 0) + v_disallowed_amount,
    original_total_amount = COALESCE(original_total_amount, total_amount),
    line_item_count = (
      SELECT COUNT(*) FROM settlement_line_items 
      WHERE settlement_id = p_settlement_id AND is_disallowed = false
    ),
    updated_at = NOW()
  WHERE id = p_settlement_id;
  
  -- Get new total
  SELECT total_amount INTO v_settlement_total FROM settlements WHERE id = p_settlement_id;
  
  RETURN QUERY SELECT 
    true AS success,
    v_disallowed_count AS items_disallowed,
    v_disallowed_amount AS amount_disallowed,
    v_settlement_total AS new_settlement_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. FUNCTION: Handle Settlement Failure
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_settlement_failure(
  p_settlement_id UUID,
  p_failure_code VARCHAR(50),
  p_failure_reason TEXT,
  p_failure_source VARCHAR(50),
  p_reported_by UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_status_before VARCHAR;
  v_utr VARCHAR;
  v_bank_ref VARCHAR;
  v_reporter_name VARCHAR;
BEGIN
  -- Get current state
  SELECT status, utr_number, bank_reference
  INTO v_status_before, v_utr, v_bank_ref
  FROM settlements WHERE id = p_settlement_id;
  
  IF v_status_before = 'PAID' THEN
    RAISE EXCEPTION 'Cannot mark PAID settlement as failed';
  END IF;
  
  -- Get reporter name
  IF p_reported_by IS NOT NULL THEN
    SELECT full_name INTO v_reporter_name FROM users WHERE id = p_reported_by;
  END IF;
  
  -- Update settlement to FAILED
  UPDATE settlements
  SET 
    status = 'FAILED',
    current_stage = NULL,
    failed_at = NOW(),
    failure_reason = p_failure_reason,
    failure_code = p_failure_code,
    retry_count = retry_count + 1,
    last_retry_at = NOW(),
    updated_at = NOW()
  WHERE id = p_settlement_id;
  
  -- Revert all line items to QUEUED_FOR_SETTLEMENT
  UPDATE payment_requests pr
  SET 
    status = 'QUEUED_FOR_SETTLEMENT',
    workflow_status = 'QUEUED_FOR_SETTLEMENT',
    updated_at = NOW()
  FROM settlement_line_items sli
  WHERE sli.settlement_id = p_settlement_id
    AND sli.payment_request_id = pr.id
    AND sli.is_disallowed = false;
  
  -- Create failure history
  INSERT INTO settlement_failure_history (
    settlement_id, failure_code, failure_reason, failure_source,
    status_before, utr_number, bank_reference,
    reported_by, reported_by_name, tenant_id
  ) VALUES (
    p_settlement_id, p_failure_code, p_failure_reason, p_failure_source,
    v_status_before, v_utr, v_bank_ref,
    p_reported_by, v_reporter_name, p_tenant_id
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. VIEW: Settlement Review Mode (For FC/CFO)
-- ============================================================================

CREATE OR REPLACE VIEW v_settlement_review_items AS
SELECT 
  sli.id AS line_item_id,
  sli.settlement_id,
  sli.payment_request_id,
  sli.request_number,
  sli.vendor_name,
  sli.description,
  sli.amount_in_settlement,
  sli.is_disallowed,
  sli.disallowed_by,
  sli.disallow_reason,
  
  -- Settlement context
  s.settlement_number,
  s.status AS settlement_status,
  s.current_stage,
  s.total_amount AS settlement_total,
  s.purpose,
  
  -- For checkbox display (default: true if not disallowed)
  NOT COALESCE(sli.is_disallowed, false) AS is_allowed
  
FROM settlement_line_items sli
JOIN settlements s ON sli.settlement_id = s.id
WHERE s.status IN ('SUBMITTED_TO_FINANCE', 'FINANCE_CONTROLLER_APPROVED');

COMMIT;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
/*
BEGIN;

DROP VIEW IF EXISTS v_settlement_review_items;
DROP FUNCTION IF EXISTS handle_settlement_failure(UUID, VARCHAR, TEXT, VARCHAR, UUID, UUID);
DROP FUNCTION IF EXISTS process_partial_disallow(UUID, UUID[], UUID, VARCHAR, TEXT, UUID);
DROP TABLE IF EXISTS settlement_failure_history;
DROP TABLE IF EXISTS utr_correction_history;
DROP TABLE IF EXISTS settlement_disallow_history;

-- Revert column additions (selective)
ALTER TABLE settlements DROP COLUMN IF EXISTS failed_at;
ALTER TABLE settlements DROP COLUMN IF EXISTS failure_reason;
ALTER TABLE settlements DROP COLUMN IF EXISTS failure_code;
-- ... etc

COMMIT;
*/
