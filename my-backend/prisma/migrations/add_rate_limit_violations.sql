-- Migration: Add rate_limit_violations table for security audit
-- Purpose: Track and monitor rate limit violations for security analysis
-- Author: Security Team
-- Date: 2025-11-24

-- Create rate_limit_violations table
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  user_agent TEXT,
  violation_type VARCHAR(50) DEFAULT 'UNKNOWN',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Additional metadata
  country_code VARCHAR(2),
  user_id INTEGER,
  request_method VARCHAR(10),
  response_status INTEGER DEFAULT 429
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_violations_ip_timestamp 
  ON rate_limit_violations(ip_address, timestamp);

CREATE INDEX IF NOT EXISTS idx_violations_endpoint_timestamp 
  ON rate_limit_violations(endpoint, timestamp);

CREATE INDEX IF NOT EXISTS idx_violations_timestamp 
  ON rate_limit_violations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_violations_type 
  ON rate_limit_violations(violation_type);

-- Create view for daily violation summary
CREATE OR REPLACE VIEW daily_violation_summary AS
SELECT 
  DATE(timestamp) as date,
  violation_type,
  COUNT(*) as violation_count,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(DISTINCT endpoint) as affected_endpoints
FROM rate_limit_violations
GROUP BY DATE(timestamp), violation_type
ORDER BY date DESC, violation_count DESC;

-- Create view for top offending IPs
CREATE OR REPLACE VIEW top_offending_ips AS
SELECT 
  ip_address,
  COUNT(*) as violation_count,
  COUNT(DISTINCT endpoint) as endpoints_hit,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen,
  ARRAY_AGG(DISTINCT violation_type) as violation_types
FROM rate_limit_violations
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY violation_count DESC
LIMIT 100;

-- Function to clean up old violations (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_violations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rate_limit_violations 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old rate limit violations', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if IP should be blacklisted
CREATE OR REPLACE FUNCTION should_blacklist_ip(check_ip VARCHAR(45))
RETURNS BOOLEAN AS $$
DECLARE
  violation_count INTEGER;
  recent_violations INTEGER;
BEGIN
  -- Check total violations
  SELECT COUNT(*) INTO violation_count
  FROM rate_limit_violations
  WHERE ip_address = check_ip;
  
  -- Check recent violations (last 24 hours)
  SELECT COUNT(*) INTO recent_violations
  FROM rate_limit_violations
  WHERE ip_address = check_ip 
    AND timestamp > NOW() - INTERVAL '24 hours';
  
  -- Blacklist if: 100+ total violations OR 20+ violations in last 24 hours
  RETURN violation_count > 100 OR recent_violations > 20;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust role names as needed)
GRANT SELECT, INSERT ON rate_limit_violations TO PUBLIC;
GRANT SELECT ON daily_violation_summary TO PUBLIC;
GRANT SELECT ON top_offending_ips TO PUBLIC;

-- Insert sample comment
COMMENT ON TABLE rate_limit_violations IS 'Tracks rate limit violations for security audit and analysis';
COMMENT ON COLUMN rate_limit_violations.violation_type IS 'Type: LOGIN_RATE_LIMIT, API_RATE_LIMIT, EXPENSIVE_OPERATION_LIMIT, etc.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Rate limit violations table created successfully';
  RAISE NOTICE '📊 Views created: daily_violation_summary, top_offending_ips';
  RAISE NOTICE '🔧 Functions created: cleanup_old_violations(), should_blacklist_ip()';
END $$;
