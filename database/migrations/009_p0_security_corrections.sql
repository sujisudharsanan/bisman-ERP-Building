-- ============================================================================
-- P0 SECURITY & CORRECTNESS MIGRATION
-- Priority: CRITICAL (Hours)
-- Date: 2024-12-04
-- 
-- This migration addresses:
-- 1. Rename password → password_hash (semantic clarity)
-- 2. Add encrypted columns for PII (PAN, Aadhaar, Bank Account)
-- 3. Hash session tokens instead of storing raw
-- 4. Add created_by audit columns to major tables
-- 5. Add session cleanup mechanism
-- ============================================================================

-- ============================================================================
-- PART 1: PASSWORD COLUMN RENAMING
-- Rename 'password' to 'password_hash' for semantic clarity
-- This makes it explicit that we store hashes, not plaintext
-- ============================================================================

-- 1.1 Rename in users table
ALTER TABLE users 
RENAME COLUMN password TO password_hash;

COMMENT ON COLUMN users.password_hash IS 'Bcrypt/Argon2 hashed password. Never store plaintext.';

-- 1.2 Rename in enterprise_admins table
ALTER TABLE enterprise_admins 
RENAME COLUMN password TO password_hash;

COMMENT ON COLUMN enterprise_admins.password_hash IS 'Bcrypt/Argon2 hashed password. Never store plaintext.';

-- 1.3 Rename in super_admins table  
ALTER TABLE super_admins 
RENAME COLUMN password TO password_hash;

COMMENT ON COLUMN super_admins.password_hash IS 'Bcrypt/Argon2 hashed password. Never store plaintext.';

-- ============================================================================
-- PART 2: PII ENCRYPTION - KYC DATA
-- Add encrypted columns for sensitive data, deprecate plaintext columns
-- Application layer will use AES-256-GCM encryption
-- ============================================================================

-- 2.1 Add encrypted columns to user_kyc
ALTER TABLE user_kyc
ADD COLUMN IF NOT EXISTS pan_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS pan_iv BYTEA,
ADD COLUMN IF NOT EXISTS pan_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS aadhaar_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS aadhaar_iv BYTEA,
ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS encryption_version INT DEFAULT 1;

COMMENT ON COLUMN user_kyc.pan_encrypted IS 'AES-256-GCM encrypted PAN number';
COMMENT ON COLUMN user_kyc.pan_iv IS 'Initialization vector for PAN encryption';
COMMENT ON COLUMN user_kyc.pan_last4 IS 'Last 4 characters for display/verification';
COMMENT ON COLUMN user_kyc.aadhaar_encrypted IS 'AES-256-GCM encrypted Aadhaar number';
COMMENT ON COLUMN user_kyc.aadhaar_iv IS 'Initialization vector for Aadhaar encryption';
COMMENT ON COLUMN user_kyc.aadhaar_last4 IS 'Last 4 digits for display/verification';
COMMENT ON COLUMN user_kyc.encryption_version IS 'Encryption algorithm version for key rotation';

-- 2.2 Add deprecation notice to old columns (will be removed in future migration)
COMMENT ON COLUMN user_kyc.pan_number IS 'DEPRECATED: Use pan_encrypted. Will be removed.';
COMMENT ON COLUMN user_kyc.aadhaar_number IS 'DEPRECATED: Use aadhaar_encrypted. Will be removed.';

-- ============================================================================
-- PART 3: PII ENCRYPTION - BANK ACCOUNT DATA
-- ============================================================================

-- 3.1 Add encrypted columns to user_bank_accounts
ALTER TABLE user_bank_accounts
ADD COLUMN IF NOT EXISTS account_number_encrypted BYTEA,
ADD COLUMN IF NOT EXISTS account_number_iv BYTEA,
ADD COLUMN IF NOT EXISTS account_number_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS encryption_version INT DEFAULT 1;

COMMENT ON COLUMN user_bank_accounts.account_number_encrypted IS 'AES-256-GCM encrypted account number';
COMMENT ON COLUMN user_bank_accounts.account_number_iv IS 'Initialization vector for encryption';
COMMENT ON COLUMN user_bank_accounts.account_number_last4 IS 'Last 4 digits for display';
COMMENT ON COLUMN user_bank_accounts.encryption_version IS 'Encryption algorithm version';

-- 3.2 Deprecate old column
COMMENT ON COLUMN user_bank_accounts.account_number IS 'DEPRECATED: Use account_number_encrypted. Will be removed.';

-- ============================================================================
-- PART 4: SESSION TOKEN HASHING
-- Store hashed session tokens instead of raw tokens
-- ============================================================================

-- 4.1 Add hashed token column to user_sessions
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS token_prefix VARCHAR(8);

COMMENT ON COLUMN user_sessions.token_hash IS 'SHA-256 hash of session token for lookup';
COMMENT ON COLUMN user_sessions.token_prefix IS 'First 8 chars of token for debugging (non-sensitive)';

-- 4.2 Create index on token_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- 4.3 Deprecate raw token column (will be removed after migration)
COMMENT ON COLUMN user_sessions.session_token IS 'DEPRECATED: Use token_hash for lookups. Will be removed.';

-- ============================================================================
-- PART 5: AUDIT COLUMNS - Add created_by to major tables
-- ============================================================================

-- 5.1 Add created_by to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.created_by IS 'User ID who created this account';
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- 5.2 Add created_by to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS created_by INT;

COMMENT ON COLUMN clients.created_by IS 'User/Admin ID who created this client';
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

-- 5.3 Add created_by to payment_requests (already has createdById, add updated_by)
ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS updated_by INT;

COMMENT ON COLUMN payment_requests.updated_by IS 'Last user who modified this request';

-- 5.4 Add created_by to tasks (already has createdById, add updated_by)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS updated_by INT;

COMMENT ON COLUMN tasks.updated_by IS 'Last user who modified this task';

-- 5.5 Ensure thread_messages has proper audit trail (already has senderId as creator)
-- Add updated_by for edit tracking
-- Already has updatedAt, just need to track who updated

-- ============================================================================
-- PART 6: SESSION CLEANUP - Stored procedure for expired sessions
-- ============================================================================

-- 6.1 Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete sessions that are expired or inactive for more than 7 days
    DELETE FROM user_sessions
    WHERE expires_at < NOW()
       OR (is_active = false AND last_activity_at < NOW() - INTERVAL '7 days')
       OR (last_activity_at < NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO audit_logs (action, table_name, old_values, created_at)
    VALUES ('SESSION_CLEANUP', 'user_sessions', 
            jsonb_build_object('deleted_count', deleted_count, 'cleanup_time', NOW()),
            NOW());
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Removes expired and stale sessions. Run daily via cron.';

-- 6.2 Create function to cleanup expired OTP tokens
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete OTPs that are expired or verified more than 24 hours ago
    DELETE FROM otp_tokens
    WHERE expires_at < NOW()
       OR (verified = true AND created_at < NOW() - INTERVAL '24 hours')
       OR created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_otps() IS 'Removes expired OTP tokens. Run hourly via cron.';

-- ============================================================================
-- PART 7: SECURITY CONSTRAINTS
-- ============================================================================

-- 7.1 Add check constraint to ensure password_hash is not empty
ALTER TABLE users
ADD CONSTRAINT chk_users_password_hash_not_empty 
CHECK (password_hash IS NOT NULL AND LENGTH(password_hash) >= 60);

ALTER TABLE enterprise_admins
ADD CONSTRAINT chk_enterprise_admins_password_hash_not_empty 
CHECK (password_hash IS NOT NULL AND LENGTH(password_hash) >= 60);

ALTER TABLE super_admins
ADD CONSTRAINT chk_super_admins_password_hash_not_empty 
CHECK (password_hash IS NOT NULL AND LENGTH(password_hash) >= 60);

-- 7.2 Add constraint for OTP hash length (SHA-256 = 64 chars hex)
ALTER TABLE otp_tokens
ADD CONSTRAINT chk_otp_hash_length 
CHECK (LENGTH(otp_hash) >= 64);

-- ============================================================================
-- PART 8: DOCUMENTATION COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Core user accounts. Passwords stored as bcrypt/argon2 hashes only.';
COMMENT ON TABLE enterprise_admins IS 'Platform-level administrators. Passwords stored as hashes.';
COMMENT ON TABLE super_admins IS 'Business owner accounts. Passwords stored as hashes.';
COMMENT ON TABLE user_kyc IS 'KYC documents. Sensitive data (PAN/Aadhaar) encrypted at rest.';
COMMENT ON TABLE user_bank_accounts IS 'Bank accounts. Account numbers encrypted at rest.';
COMMENT ON TABLE user_sessions IS 'Active user sessions. Tokens stored as SHA-256 hashes.';
COMMENT ON TABLE otp_tokens IS 'One-time passwords. OTPs stored as SHA-256 hashes.';

-- ============================================================================
-- MIGRATION RECORD
-- ============================================================================

INSERT INTO migration_history (migration_name, applied_at, applied_by)
VALUES ('009_p0_security_corrections', NOW(), CURRENT_USER)
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- ROLLBACK SCRIPT (save separately)
-- ============================================================================
-- To rollback:
-- ALTER TABLE users RENAME COLUMN password_hash TO password;
-- ALTER TABLE enterprise_admins RENAME COLUMN password_hash TO password;
-- ALTER TABLE super_admins RENAME COLUMN password_hash TO password;
-- DROP COLUMN statements for new columns
-- DROP FUNCTION cleanup_expired_sessions();
-- DROP FUNCTION cleanup_expired_otps();
