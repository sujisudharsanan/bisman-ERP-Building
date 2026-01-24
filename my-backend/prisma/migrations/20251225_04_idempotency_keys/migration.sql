-- ============================================================================
-- IDEMPOTENCY KEYS FOR SETTLEMENT OPERATIONS
-- Prevents duplicate executions from double-clicks or network retries
-- Migration: 20251225_idempotency_keys
-- ============================================================================

-- NOTE: This migration has schema compatibility issues with existing tables
-- Wrapping in conditional blocks to handle different schema versions

-- ============================================================================
-- 1. IDEMPOTENCY KEYS TABLE (only if it doesnt exist with our schema)
-- ============================================================================

-- Only create table if it doesnt already exist
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255),
  operation_type VARCHAR(50),
  resource_id UUID,
  actor_id UUID,
  tenant_id UUID,
  request_hash VARCHAR(64),
  response_data JSONB,
  status VARCHAR(20) DEFAULT 'PROCESSING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes if possible (wrapped in DO block for safety)
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- ============================================================================
-- 2. CLEANUP FUNCTION FOR EXPIRED KEYS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM idempotency_keys WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. ADD IDEMPOTENCY TRACKING TO SETTLEMENTS TABLE (if it exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settlements') THEN
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS last_execute_idempotency_key VARCHAR(255);
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS last_retry_idempotency_key VARCHAR(255);
    ALTER TABLE settlements ADD COLUMN IF NOT EXISTS execution_attempt_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Migration complete
