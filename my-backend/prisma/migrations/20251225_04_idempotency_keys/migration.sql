-- ============================================================================
-- IDEMPOTENCY KEYS FOR SETTLEMENT OPERATIONS
-- Prevents duplicate executions from double-clicks or network retries
-- Migration: 20251225_idempotency_keys
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. IDEMPOTENCY KEYS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key identification
  idempotency_key VARCHAR(255) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,  -- SETTLEMENT_EXECUTE, SETTLEMENT_RETRY, UTR_CORRECTION
  
  -- Context
  resource_id UUID NOT NULL,            -- Settlement ID
  actor_id UUID NOT NULL,               -- User who initiated
  tenant_id UUID NOT NULL,
  
  -- Request/Response storage
  request_hash VARCHAR(64),             -- SHA-256 of request body for verification
  response_data JSONB,                  -- Cached response to return on duplicate
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',  -- PROCESSING, COMPLETED, FAILED
  
  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Constraints
  CONSTRAINT uq_idempotency_key UNIQUE (idempotency_key, operation_type, tenant_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_idempotency_lookup 
  ON idempotency_keys(idempotency_key, operation_type, tenant_id);

-- Index for cleanup of expired keys
CREATE INDEX IF NOT EXISTS idx_idempotency_expires 
  ON idempotency_keys(expires_at) 
  WHERE status = 'COMPLETED';

-- Index for finding stuck processing keys
CREATE INDEX IF NOT EXISTS idx_idempotency_processing 
  ON idempotency_keys(created_at) 
  WHERE status = 'PROCESSING';

-- ============================================================================
-- 2. CLEANUP FUNCTION FOR EXPIRED KEYS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_keys 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FUNCTION TO CHECK AND ACQUIRE IDEMPOTENCY LOCK
-- Returns: NULL if lock acquired (proceed), or existing response if duplicate
-- ============================================================================

CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key VARCHAR(255),
  p_operation VARCHAR(50),
  p_resource_id UUID,
  p_actor_id UUID,
  p_tenant_id UUID,
  p_request_hash VARCHAR(64) DEFAULT NULL
)
RETURNS TABLE (
  is_duplicate BOOLEAN,
  existing_status VARCHAR(20),
  existing_response JSONB,
  lock_id UUID
) AS $$
DECLARE
  v_existing RECORD;
  v_new_id UUID;
BEGIN
  -- Check for existing key
  SELECT ik.id, ik.status, ik.response_data, ik.request_hash, ik.created_at
  INTO v_existing
  FROM idempotency_keys ik
  WHERE ik.idempotency_key = p_key
    AND ik.operation_type = p_operation
    AND ik.tenant_id = p_tenant_id
    AND ik.expires_at > NOW()
  FOR UPDATE;  -- Lock the row if found
  
  IF FOUND THEN
    -- Key exists
    IF v_existing.status = 'COMPLETED' THEN
      -- Return cached response
      RETURN QUERY SELECT 
        TRUE::BOOLEAN,
        v_existing.status,
        v_existing.response_data,
        v_existing.id;
      RETURN;
    ELSIF v_existing.status = 'PROCESSING' THEN
      -- Check if it's a stale processing lock (> 5 minutes old)
      IF v_existing.created_at < NOW() - INTERVAL '5 minutes' THEN
        -- Stale lock, allow retry by marking as failed
        UPDATE idempotency_keys SET status = 'FAILED' WHERE id = v_existing.id;
        -- Fall through to create new lock
      ELSE
        -- Active processing, return as duplicate
        RETURN QUERY SELECT 
          TRUE::BOOLEAN,
          'PROCESSING'::VARCHAR(20),
          '{"message": "Request is currently being processed"}'::JSONB,
          v_existing.id;
        RETURN;
      END IF;
    END IF;
    -- Status is FAILED, fall through to create new lock
  END IF;
  
  -- Create new idempotency lock
  INSERT INTO idempotency_keys (
    idempotency_key, operation_type, resource_id, actor_id, tenant_id,
    request_hash, status, created_at, expires_at
  ) VALUES (
    p_key, p_operation, p_resource_id, p_actor_id, p_tenant_id,
    p_request_hash, 'PROCESSING', NOW(), NOW() + INTERVAL '24 hours'
  )
  ON CONFLICT (idempotency_key, operation_type, tenant_id) 
  DO UPDATE SET 
    status = 'PROCESSING',
    created_at = NOW(),
    expires_at = NOW() + INTERVAL '24 hours',
    resource_id = EXCLUDED.resource_id,
    actor_id = EXCLUDED.actor_id,
    request_hash = EXCLUDED.request_hash
  RETURNING id INTO v_new_id;
  
  -- Return: not a duplicate, proceed with operation
  RETURN QUERY SELECT 
    FALSE::BOOLEAN,
    NULL::VARCHAR(20),
    NULL::JSONB,
    v_new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNCTION TO COMPLETE IDEMPOTENCY KEY
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_idempotency_key(
  p_lock_id UUID,
  p_status VARCHAR(20),
  p_response JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE idempotency_keys
  SET 
    status = p_status,
    response_data = p_response,
    completed_at = NOW()
  WHERE id = p_lock_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ADD IDEMPOTENCY TRACKING TO SETTLEMENTS TABLE
-- ============================================================================

ALTER TABLE settlements 
  ADD COLUMN IF NOT EXISTS last_execute_idempotency_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_retry_idempotency_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS execution_attempt_count INTEGER DEFAULT 0;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE idempotency_keys IS 'Tracks idempotency keys for critical settlement operations to prevent duplicates';
COMMENT ON COLUMN idempotency_keys.idempotency_key IS 'Client-provided key (typically: {operation}_{resourceId}_{timestamp})';
COMMENT ON COLUMN idempotency_keys.operation_type IS 'Type: SETTLEMENT_EXECUTE, SETTLEMENT_RETRY, UTR_CORRECTION';
COMMENT ON COLUMN idempotency_keys.status IS 'PROCESSING (locked), COMPLETED (cached), FAILED (can retry)';
COMMENT ON COLUMN idempotency_keys.response_data IS 'Cached response to return on duplicate requests';

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
/*
BEGIN;

ALTER TABLE settlements 
  DROP COLUMN IF EXISTS last_execute_idempotency_key,
  DROP COLUMN IF EXISTS last_retry_idempotency_key,
  DROP COLUMN IF EXISTS execution_attempt_count;

DROP FUNCTION IF EXISTS complete_idempotency_key(UUID, VARCHAR, JSONB);
DROP FUNCTION IF EXISTS check_idempotency_key(VARCHAR, VARCHAR, UUID, UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS cleanup_expired_idempotency_keys();

DROP TABLE IF EXISTS idempotency_keys;

COMMIT;
*/
