-- Fix Railway Database Schema Issues
-- Date: 2025-11-14

-- 1. Add missing is_active column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        COMMENT ON COLUMN users.is_active IS 'Indicates if the user account is active';
    END IF;
END $$;

-- 2. Create ai_analytics_cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    tenant_id INTEGER,
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create index for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_ai_analytics_cache_expires_at ON ai_analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_cache_tenant_id ON ai_analytics_cache(tenant_id);

-- 3. Create cleanup_ai_cache function
CREATE OR REPLACE FUNCTION cleanup_ai_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_analytics_cache
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Create ai_conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    conversation_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_conv FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_id ON ai_conversations(tenant_id);

-- 5. Create cleanup_old_ai_conversations function
CREATE OR REPLACE FUNCTION cleanup_old_ai_conversations(days_to_keep BIGINT)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_conversations
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Create scheduled cleanup jobs (if pg_cron is available)
-- Note: Railway may not have pg_cron enabled by default
DO $$
BEGIN
    -- Try to create cron jobs if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Cleanup expired AI cache every hour
        PERFORM cron.schedule('cleanup-ai-cache', '0 * * * *', 'SELECT cleanup_ai_cache()');
        
        -- Cleanup old conversations (older than 90 days) daily at 2 AM
        PERFORM cron.schedule('cleanup-old-conversations', '0 2 * * *', 'SELECT cleanup_old_ai_conversations(90)');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available, skipping scheduled jobs';
END $$;

-- 7. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_analytics_cache TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_conversations TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE ai_analytics_cache_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE ai_conversations_id_seq TO PUBLIC;

-- Display summary
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema fixes applied successfully!';
    RAISE NOTICE '- Added is_active column to users table';
    RAISE NOTICE '- Created ai_analytics_cache table';
    RAISE NOTICE '- Created ai_conversations table';
    RAISE NOTICE '- Created cleanup_ai_cache() function';
    RAISE NOTICE '- Created cleanup_old_ai_conversations() function';
END $$;
