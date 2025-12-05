-- Migration: Add events table for analytics telemetry
-- Date: 2025-12-05
-- Description: Track all application events for usage analytics and audit
-- Note: This project uses 'clients' table instead of 'tenants'

-- ============================================================================
-- Events Table
-- ============================================================================
-- Stores all application events for analytics and audit

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    client_id UUID,
    user_id INT,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to clients table only (users is a view, can't FK to it)
    CONSTRAINT fk_events_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_client_created ON events(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_client_type ON events(client_id, event_type);

-- Partial index for API requests (most common event type)
CREATE INDEX IF NOT EXISTS idx_events_api_requests ON events(client_id, created_at) 
    WHERE event_type = 'api_request';

-- ============================================================================
-- Add billing columns to clients table
-- ============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS trial_expired BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_failed BOOLEAN DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP WITH TIME ZONE;

-- Index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer ON clients(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_clients_stripe_subscription ON clients(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_clients_trial_expires ON clients(trial_end_date) WHERE trial_expired = FALSE;

-- ============================================================================
-- Retention policy helper function
-- ============================================================================
-- Delete events older than retention period (run via cron)

CREATE OR REPLACE FUNCTION cleanup_old_events(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT cleanup_old_events(90);

-- ============================================================================
-- View for daily event summary
-- ============================================================================

CREATE OR REPLACE VIEW daily_event_summary AS
SELECT 
    client_id,
    DATE(created_at) as date,
    event_type,
    COUNT(*) as event_count
FROM events
GROUP BY client_id, DATE(created_at), event_type;

-- ============================================================================
-- Grant permissions (adjust role names as needed)
-- ============================================================================
-- GRANT SELECT, INSERT ON events TO bisman_app;
-- GRANT USAGE, SELECT ON SEQUENCE events_id_seq TO bisman_app;
