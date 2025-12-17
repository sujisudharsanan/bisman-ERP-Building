-- BISMAN Internal Operations: Support Sessions Table
-- This table tracks time-limited support access to client data
-- All support sessions are explicitly logged for audit compliance

CREATE TABLE IF NOT EXISTS support_sessions (
  id SERIAL PRIMARY KEY,
  
  -- Support user (internal BISMAN staff)
  support_user_id UUID NOT NULL,
  
  -- Target client being accessed
  target_client_id UUID NOT NULL,
  
  -- Reason for access (mandatory for audit)
  reason TEXT NOT NULL,
  
  -- Session security
  session_token VARCHAR(255) NOT NULL UNIQUE,
  
  -- Time bounds
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Audit fields
  ip_address INET,
  user_agent TEXT,
  actions_performed INTEGER DEFAULT 0,
  
  -- Foreign keys
  CONSTRAINT fk_support_user FOREIGN KEY (support_user_id) 
    REFERENCES users_enhanced(id) ON DELETE CASCADE,
  CONSTRAINT fk_target_client FOREIGN KEY (target_client_id) 
    REFERENCES clients(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_sessions_user ON support_sessions(support_user_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_client ON support_sessions(target_client_id);
CREATE INDEX IF NOT EXISTS idx_support_sessions_active ON support_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_support_sessions_created ON support_sessions(created_at DESC);

-- Auto-expire trigger function
CREATE OR REPLACE FUNCTION auto_expire_support_sessions()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark session as inactive if expired
  IF NEW.expires_at <= NOW() AND NEW.is_active = TRUE THEN
    NEW.is_active := FALSE;
    NEW.ended_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-expire on update
DROP TRIGGER IF EXISTS trg_auto_expire_support_sessions ON support_sessions;
CREATE TRIGGER trg_auto_expire_support_sessions
  BEFORE UPDATE ON support_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_expire_support_sessions();

-- Scheduled job to expire old sessions (run this periodically via cron/pg_cron)
-- This query can be run every minute to clean up expired sessions
-- UPDATE support_sessions SET is_active = FALSE, ended_at = NOW() 
-- WHERE is_active = TRUE AND expires_at <= NOW();

-- Internal users table marker (for quick identification)
-- This is informational - internal users are identified by:
-- 1. No module_id
-- 2. No tenant_id
-- 3. role IN ('BISMAN_FINANCE', 'BISMAN_BILLING', 'BISMAN_SUPPORT', 'BISMAN_ENGINEERING', 'BISMAN_CUSTOMER_CARE')

COMMENT ON TABLE support_sessions IS 'Tracks time-limited support access sessions for BISMAN internal staff accessing client data. All sessions are audit-logged.';
COMMENT ON COLUMN support_sessions.reason IS 'Mandatory reason for accessing client data - required for audit compliance';
COMMENT ON COLUMN support_sessions.session_token IS 'Secure token for session validation - never exposed to client';
COMMENT ON COLUMN support_sessions.actions_performed IS 'Count of actions performed during this support session';
