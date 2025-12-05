-- Migration: Add tenant usage metering and quota tables
-- Date: 2025-01-02
-- Description: Per-tenant usage tracking for API calls, storage, and quota overrides

-- ============================================================================
-- Tenant Usage Table
-- ============================================================================
-- Tracks daily usage metrics per tenant (API calls, storage, active users)

CREATE TABLE IF NOT EXISTS tenant_usage (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Core metrics
    api_calls INTEGER NOT NULL DEFAULT 0,
    storage_bytes BIGINT NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    
    -- Feature-specific usage (JSON for flexibility)
    feature_usage JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one row per tenant per day
    CONSTRAINT tenant_usage_tenant_date_unique UNIQUE (tenant_id, date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_id ON tenant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_date ON tenant_usage(date);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_date ON tenant_usage(tenant_id, date);

-- ============================================================================
-- Tenant Quota Overrides Table
-- ============================================================================
-- Custom quota limits per tenant (overrides plan defaults)

CREATE TABLE IF NOT EXISTS tenant_quota_overrides (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL UNIQUE,
    
    -- Custom limits (NULL means use plan default)
    api_calls_per_minute INTEGER,
    api_calls_per_day INTEGER,
    storage_limit_bytes BIGINT,
    
    -- Override metadata
    reason TEXT,
    approved_by VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_quota_overrides_tenant_id ON tenant_quota_overrides(tenant_id);

-- ============================================================================
-- Tenant Plan Type (if not exists in your schema)
-- ============================================================================
-- This can be added to your existing tenant table or as a separate mapping

-- If you have a tenants table, add this column:
-- ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free';

-- ============================================================================
-- Trigger for updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tenant_usage
DROP TRIGGER IF EXISTS update_tenant_usage_updated_at ON tenant_usage;
CREATE TRIGGER update_tenant_usage_updated_at
    BEFORE UPDATE ON tenant_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to tenant_quota_overrides
DROP TRIGGER IF EXISTS update_tenant_quota_overrides_updated_at ON tenant_quota_overrides;
CREATE TRIGGER update_tenant_quota_overrides_updated_at
    BEFORE UPDATE ON tenant_quota_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Usage Rollup View (optional - for analytics)
-- ============================================================================
-- Monthly usage summary per tenant

CREATE OR REPLACE VIEW tenant_usage_monthly AS
SELECT 
    tenant_id,
    DATE_TRUNC('month', date) AS month,
    SUM(api_calls) AS total_api_calls,
    MAX(storage_bytes) AS max_storage_bytes,
    AVG(active_users) AS avg_active_users,
    COUNT(*) AS days_active
FROM tenant_usage
GROUP BY tenant_id, DATE_TRUNC('month', date);

-- ============================================================================
-- Grant permissions (adjust role names as needed)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE ON tenant_usage TO your_app_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_quota_overrides TO your_app_role;
-- GRANT USAGE, SELECT ON SEQUENCE tenant_usage_id_seq TO your_app_role;
-- GRANT USAGE, SELECT ON SEQUENCE tenant_quota_overrides_id_seq TO your_app_role;

-- ============================================================================
-- Sample data (optional - for testing)
-- ============================================================================
-- INSERT INTO tenant_usage (tenant_id, date, api_calls, storage_bytes, active_users)
-- VALUES 
--     ('tenant_001', CURRENT_DATE, 150, 1048576, 5),
--     ('tenant_002', CURRENT_DATE, 450, 5242880, 12);

-- INSERT INTO tenant_quota_overrides (tenant_id, api_calls_per_minute, api_calls_per_day, reason, approved_by)
-- VALUES 
--     ('tenant_001', 100, 10000, 'Beta partner - increased limits', 'admin@bisman.io');
