-- Migration: Add tenant_usage table for per-tenant usage metering
-- ================================================================
-- 
-- This table tracks daily usage metrics per tenant for:
-- - API calls (request count)
-- - Storage usage (bytes)
-- - Active users (unique users who made requests)
--
-- Usage data is aggregated daily and used for:
-- - Billing calculations
-- - Usage analytics dashboards
-- - Quota enforcement validation
--
-- Run: psql -d bisman_prod -f migrations/add_tenant_usage.sql

-- Create the tenant_usage table
CREATE TABLE IF NOT EXISTS tenant_usage (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    date DATE NOT NULL,
    api_calls INTEGER NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    
    -- Feature-specific counters (extensible)
    feature_usage JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Ensure one row per tenant per day
    CONSTRAINT tenant_usage_tenant_date_unique UNIQUE (tenant_id, date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_id ON tenant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_date ON tenant_usage(date);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_date ON tenant_usage(tenant_id, date);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_tenant_usage_date_range ON tenant_usage(tenant_id, date DESC);

-- Add foreign key constraint if tenants table exists
-- Uncomment if you have a tenants table:
-- ALTER TABLE tenant_usage 
--     ADD CONSTRAINT fk_tenant_usage_tenant 
--     FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tenant_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_tenant_usage_updated_at ON tenant_usage;
CREATE TRIGGER trigger_tenant_usage_updated_at
    BEFORE UPDATE ON tenant_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_usage_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to increment API calls (atomic upsert)
CREATE OR REPLACE FUNCTION increment_tenant_api_calls(
    p_tenant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_increment INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
    INSERT INTO tenant_usage (tenant_id, date, api_calls)
    VALUES (p_tenant_id, p_date, p_increment)
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET 
        api_calls = tenant_usage.api_calls + p_increment,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update storage bytes
CREATE OR REPLACE FUNCTION update_tenant_storage(
    p_tenant_id UUID,
    p_storage_bytes BIGINT,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
BEGIN
    INSERT INTO tenant_usage (tenant_id, date, storage_bytes)
    VALUES (p_tenant_id, p_date, p_storage_bytes)
    ON CONFLICT (tenant_id, date)
    DO UPDATE SET 
        storage_bytes = p_storage_bytes,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to record active user
CREATE OR REPLACE FUNCTION record_tenant_active_user(
    p_tenant_id UUID,
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
    current_users JSONB;
    user_key TEXT;
BEGIN
    user_key := p_user_id::TEXT;
    
    -- Get current feature_usage or initialize
    SELECT COALESCE(feature_usage, '{}')
    INTO current_users
    FROM tenant_usage
    WHERE tenant_id = p_tenant_id AND date = p_date;
    
    IF NOT FOUND THEN
        -- Create new row
        INSERT INTO tenant_usage (tenant_id, date, active_users, feature_usage)
        VALUES (p_tenant_id, p_date, 1, jsonb_build_object('active_user_ids', jsonb_build_array(p_user_id)));
    ELSE
        -- Check if user already recorded
        IF NOT (current_users->'active_user_ids' ? user_key) THEN
            UPDATE tenant_usage
            SET 
                active_users = active_users + 1,
                feature_usage = jsonb_set(
                    COALESCE(feature_usage, '{}'),
                    '{active_user_ids}',
                    COALESCE(feature_usage->'active_user_ids', '[]') || to_jsonb(p_user_id)
                ),
                updated_at = NOW()
            WHERE tenant_id = p_tenant_id AND date = p_date;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get usage summary for a tenant
CREATE OR REPLACE FUNCTION get_tenant_usage_summary(
    p_tenant_id UUID,
    p_from_date DATE,
    p_to_date DATE
)
RETURNS TABLE (
    total_api_calls BIGINT,
    total_storage_bytes BIGINT,
    max_active_users INTEGER,
    avg_daily_calls NUMERIC,
    days_active INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(api_calls), 0)::BIGINT as total_api_calls,
        COALESCE(MAX(storage_bytes), 0)::BIGINT as total_storage_bytes,
        COALESCE(MAX(active_users), 0)::INTEGER as max_active_users,
        COALESCE(AVG(api_calls), 0)::NUMERIC as avg_daily_calls,
        COUNT(*)::INTEGER as days_active
    FROM tenant_usage
    WHERE tenant_id = p_tenant_id
      AND date >= p_from_date
      AND date <= p_to_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TENANT QUOTAS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_quotas (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    
    -- Rate limits
    api_calls_per_minute INTEGER NOT NULL DEFAULT 60,
    api_calls_per_day INTEGER NOT NULL DEFAULT 5000,
    
    -- Resource limits
    storage_bytes_limit BIGINT NOT NULL DEFAULT 1073741824, -- 1GB
    active_users_limit INTEGER NOT NULL DEFAULT 5,
    
    -- Feature flags
    features JSONB DEFAULT '{}',
    
    -- Override settings
    is_unlimited BOOLEAN DEFAULT FALSE,
    custom_limits JSONB DEFAULT NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for quota lookups
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_tenant_id ON tenant_quotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_plan ON tenant_quotas(plan);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_tenant_quotas_updated_at ON tenant_quotas;
CREATE TRIGGER trigger_tenant_quotas_updated_at
    BEFORE UPDATE ON tenant_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_usage_updated_at();

-- ============================================================================
-- SEED DEFAULT QUOTAS (optional)
-- ============================================================================

-- Insert plan definitions (can be used as templates)
-- This is a reference table, not per-tenant
CREATE TABLE IF NOT EXISTS quota_plans (
    plan VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    api_calls_per_minute INTEGER NOT NULL,
    api_calls_per_day INTEGER NOT NULL,
    storage_bytes_limit BIGINT NOT NULL,
    active_users_limit INTEGER NOT NULL,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO quota_plans (plan, display_name, api_calls_per_minute, api_calls_per_day, storage_bytes_limit, active_users_limit, features)
VALUES 
    ('free', 'Free Tier', 60, 5000, 1073741824, 5, '{"analytics": false, "exports": false, "api_access": false}'),
    ('pro', 'Professional', 300, 50000, 10737418240, 25, '{"analytics": true, "exports": true, "api_access": true}'),
    ('enterprise', 'Enterprise', 1000, 500000, 107374182400, -1, '{"analytics": true, "exports": true, "api_access": true, "sso": true, "audit_log": true}')
ON CONFLICT (plan) DO UPDATE SET
    api_calls_per_minute = EXCLUDED.api_calls_per_minute,
    api_calls_per_day = EXCLUDED.api_calls_per_day,
    storage_bytes_limit = EXCLUDED.storage_bytes_limit,
    active_users_limit = EXCLUDED.active_users_limit,
    features = EXCLUDED.features;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE tenant_usage IS 'Daily usage metrics per tenant for billing and analytics';
COMMENT ON TABLE tenant_quotas IS 'Per-tenant quota configuration and limits';
COMMENT ON TABLE quota_plans IS 'Plan definitions with default quota values';
COMMENT ON COLUMN tenant_usage.feature_usage IS 'JSONB for tracking feature-specific usage (e.g., reports generated, exports)';
COMMENT ON COLUMN tenant_quotas.is_unlimited IS 'If true, bypass all quota checks (for enterprise/special accounts)';
