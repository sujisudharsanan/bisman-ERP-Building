-- Create activity tracking table for super admin control panel (standalone)
CREATE TABLE IF NOT EXISTS recent_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER,
    username VARCHAR(255),
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
    p_username VARCHAR(255),
    p_action TEXT,
    p_entity TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO recent_activity (user_id, username, action, entity, entity_id, details)
    VALUES (p_user_id, p_username, p_action, p_entity, p_entity_id, p_details)
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample activity data
INSERT INTO recent_activity (user_id, username, action, entity, entity_id, details) VALUES
(1, 'Suji Sudharsanan', 'CREATE', 'RBAC_SYSTEM', 'rbac_tables', '{"tables_created": 5, "permissions_seeded": 72}'),
(4, 'admin', 'UPDATE', 'USER_ROLE', '5', '{"old_role": "USER", "new_role": "MANAGER", "user": "manager"}'),
(1, 'Suji Sudharsanan', 'CREATE', 'PERMISSIONS', 'admin_matrix', '{"role": "ADMIN", "permissions_granted": 72}'),
(2, 'Suji', 'VIEW', 'ADMIN_DASHBOARD', 'permissions', '{"section": "permissions_matrix"}'),
(4, 'admin', 'CREATE', 'ROUTE', '/api/rbac/activity', '{"method": "GET", "module": "RBAC"}')
ON CONFLICT DO NOTHING;
