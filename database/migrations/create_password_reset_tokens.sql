-- ============================================================================
-- Password Reset Tokens Table - BISMAN ERP
-- ============================================================================
-- Secure password reset implementation with single-use, time-limited tokens
-- Stores only hashed tokens to prevent recovery if DB is compromised
-- ============================================================================

-- Drop existing table if exists (for development)
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Security: Store only hash(token), never plaintext
  token_hash TEXT NOT NULL,
  
  -- Token lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit trail
  request_ip TEXT,
  request_user_agent TEXT,
  confirmed_ip TEXT,
  confirmed_user_agent TEXT,
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT used_at_requires_used CHECK (
    (used = TRUE AND used_at IS NOT NULL) OR 
    (used = FALSE AND used_at IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_used ON password_reset_tokens(used) WHERE used = FALSE;

-- Composite index for token validation
CREATE INDEX idx_password_reset_validation 
ON password_reset_tokens(user_id, token_hash, used, expires_at);

-- ============================================================================
-- Function: Cleanup expired tokens (run via cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete tokens older than 7 days (keep for audit trail)
  DELETE FROM password_reset_tokens
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Invalidate previous tokens when new one is created
-- ============================================================================
CREATE OR REPLACE FUNCTION invalidate_previous_reset_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all unused, non-expired tokens for this user as expired
  UPDATE password_reset_tokens
  SET expires_at = CURRENT_TIMESTAMP
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND used = FALSE
    AND expires_at > CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-invalidate old tokens
CREATE TRIGGER trigger_invalidate_previous_reset_tokens
AFTER INSERT ON password_reset_tokens
FOR EACH ROW
EXECUTE FUNCTION invalidate_previous_reset_tokens();

-- ============================================================================
-- View: Active password reset requests (for monitoring)
-- ============================================================================
CREATE OR REPLACE VIEW active_password_reset_requests AS
SELECT 
  prt.id,
  prt.user_id,
  u.email,
  u.username,
  prt.created_at,
  prt.expires_at,
  prt.request_ip,
  prt.request_user_agent,
  EXTRACT(EPOCH FROM (prt.expires_at - CURRENT_TIMESTAMP)) / 60 AS minutes_until_expiry
FROM password_reset_tokens prt
JOIN users u ON prt.user_id = u.id
WHERE prt.used = FALSE
  AND prt.expires_at > CURRENT_TIMESTAMP
ORDER BY prt.created_at DESC;

-- ============================================================================
-- View: Password reset audit log
-- ============================================================================
CREATE OR REPLACE VIEW password_reset_audit_log AS
SELECT 
  prt.id,
  prt.user_id,
  u.email,
  u.username,
  prt.created_at AS requested_at,
  prt.used_at AS completed_at,
  prt.used,
  CASE 
    WHEN prt.used THEN 'COMPLETED'
    WHEN prt.expires_at < CURRENT_TIMESTAMP THEN 'EXPIRED'
    ELSE 'PENDING'
  END AS status,
  prt.request_ip,
  prt.request_user_agent,
  prt.confirmed_ip,
  prt.confirmed_user_agent,
  CASE 
    WHEN prt.used THEN EXTRACT(EPOCH FROM (prt.used_at - prt.created_at)) / 60
    ELSE NULL
  END AS completion_time_minutes
FROM password_reset_tokens prt
JOIN users u ON prt.user_id = u.id
ORDER BY prt.created_at DESC;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens with security features: hashed tokens, single-use, time-limited, audit trail';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of reset token (never store plaintext)';
COMMENT ON COLUMN password_reset_tokens.used IS 'Single-use flag - prevents token reuse';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiry (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.request_ip IS 'IP address where reset was requested (audit trail)';
COMMENT ON COLUMN password_reset_tokens.confirmed_ip IS 'IP address where password was changed (audit trail)';

-- ============================================================================
-- Grant permissions
-- ============================================================================
-- Grant appropriate permissions to your application user
-- GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO bisman_app;
-- GRANT USAGE ON SEQUENCE password_reset_tokens_id_seq TO bisman_app;
-- GRANT SELECT ON active_password_reset_requests TO bisman_app;
-- GRANT SELECT ON password_reset_audit_log TO bisman_app;

-- ============================================================================
-- Sample queries for monitoring
-- ============================================================================

-- Check active reset requests
-- SELECT * FROM active_password_reset_requests;

-- Check recent reset activity
-- SELECT * FROM password_reset_audit_log WHERE requested_at > CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- Count reset requests per user (detect abuse)
-- SELECT user_id, email, COUNT(*) as request_count
-- FROM password_reset_audit_log
-- WHERE requested_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
-- GROUP BY user_id, email
-- HAVING COUNT(*) > 5
-- ORDER BY request_count DESC;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
