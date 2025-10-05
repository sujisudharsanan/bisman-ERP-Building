-- Create activity tracking table for super admin control panel
CREATE TABLE IF NOT EXISTS recent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recent_activity_user_id ON recent_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_activity_created_at ON recent_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_activity_entity ON recent_activity(entity);

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id INTEGER,
    p_action TEXT,
    p_entity TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO recent_activity (user_id, action, entity, entity_id, details)
    VALUES (p_user_id, p_action, p_entity, p_entity_id, p_details)
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Clean up old activity records (keep last 1000 records)
CREATE OR REPLACE FUNCTION cleanup_old_activity() RETURNS void AS $$
BEGIN
    DELETE FROM recent_activity 
    WHERE id NOT IN (
        SELECT id FROM recent_activity 
        ORDER BY created_at DESC 
        LIMIT 1000
    );
END;
$$ LANGUAGE plpgsql;
