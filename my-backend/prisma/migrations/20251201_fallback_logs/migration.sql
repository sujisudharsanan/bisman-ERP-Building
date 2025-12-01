-- Fallback Logs Table Migration
-- Creates table for tracking all fallback events in the system

-- Create fallback_logs table
CREATE TABLE IF NOT EXISTS fallback_logs (
    id SERIAL PRIMARY KEY,
    
    -- Identification
    module_name VARCHAR(100) NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    
    -- Error details
    error_message TEXT NOT NULL,
    error_code VARCHAR(50),
    
    -- Context
    user_id VARCHAR(50),
    request_payload TEXT,
    
    -- Response info
    response_type VARCHAR(50) DEFAULT 'safe_default',
    
    -- Severity: info, warning, critical, alert
    severity VARCHAR(20) DEFAULT 'warning',
    
    -- Timestamps
    fallback_triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Resolution tracking
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(50),
    resolution_notes TEXT
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fallback_logs_module ON fallback_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_fallback_logs_operation ON fallback_logs(operation_name);
CREATE INDEX IF NOT EXISTS idx_fallback_logs_severity ON fallback_logs(severity);
CREATE INDEX IF NOT EXISTS idx_fallback_logs_triggered_at ON fallback_logs(fallback_triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_fallback_logs_resolved ON fallback_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_fallback_logs_user ON fallback_logs(user_id);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_fallback_logs_module_operation ON fallback_logs(module_name, operation_name);
CREATE INDEX IF NOT EXISTS idx_fallback_logs_severity_time ON fallback_logs(severity, fallback_triggered_at DESC);

-- Create fallback_alerts table for threshold violations
CREATE TABLE IF NOT EXISTS fallback_alerts (
    id SERIAL PRIMARY KEY,
    
    -- Alert identification
    module_name VARCHAR(100) NOT NULL,
    operation_name VARCHAR(100) NOT NULL,
    
    -- Alert details
    fallback_count INTEGER NOT NULL,
    window_minutes INTEGER NOT NULL,
    alert_message TEXT NOT NULL,
    
    -- Timestamps
    alert_triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Acknowledgment
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by VARCHAR(50)
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_fallback_alerts_module ON fallback_alerts(module_name);
CREATE INDEX IF NOT EXISTS idx_fallback_alerts_triggered ON fallback_alerts(alert_triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_fallback_alerts_acknowledged ON fallback_alerts(acknowledged);

-- Create view for dashboard statistics
CREATE OR REPLACE VIEW fallback_stats_hourly AS
SELECT 
    module_name,
    operation_name,
    severity,
    DATE_TRUNC('hour', fallback_triggered_at) as hour,
    COUNT(*) as fallback_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(*) FILTER (WHERE resolved = true) as resolved_count
FROM fallback_logs
WHERE fallback_triggered_at > NOW() - INTERVAL '24 hours'
GROUP BY module_name, operation_name, severity, DATE_TRUNC('hour', fallback_triggered_at)
ORDER BY hour DESC;

-- Create view for daily summary
CREATE OR REPLACE VIEW fallback_stats_daily AS
SELECT 
    module_name,
    operation_name,
    DATE(fallback_triggered_at) as date,
    COUNT(*) as total_fallbacks,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
    COUNT(*) FILTER (WHERE resolved = true) as resolved_count
FROM fallback_logs
WHERE fallback_triggered_at > NOW() - INTERVAL '30 days'
GROUP BY module_name, operation_name, DATE(fallback_triggered_at)
ORDER BY date DESC;

-- Add comments for documentation
COMMENT ON TABLE fallback_logs IS 'Stores all fallback events triggered in the system for monitoring and debugging';
COMMENT ON COLUMN fallback_logs.module_name IS 'The service/module that triggered the fallback (e.g., privilege, auth, inventory)';
COMMENT ON COLUMN fallback_logs.operation_name IS 'The specific operation that failed (e.g., getAllRoles, getUsersByRole)';
COMMENT ON COLUMN fallback_logs.error_code IS 'Categorized error type: TIMEOUT, DATABASE_ERROR, CONNECTION_ERROR, etc.';
COMMENT ON COLUMN fallback_logs.severity IS 'info, warning, critical, or alert';
COMMENT ON COLUMN fallback_logs.response_type IS 'Type of fallback response: safe_default, cached_data, empty_list';

-- Grant permissions (adjust role name as needed)
-- GRANT SELECT, INSERT ON fallback_logs TO your_app_role;
-- GRANT SELECT, INSERT ON fallback_alerts TO your_app_role;
-- GRANT SELECT ON fallback_stats_hourly TO your_app_role;
-- GRANT SELECT ON fallback_stats_daily TO your_app_role;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Fallback logs migration completed successfully';
END $$;
