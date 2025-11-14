-- ==============================================
-- Support Tickets System - Database Migration
-- ==============================================
-- Created: 2025-01-XX
-- Purpose: Create complete support ticket system with ticketing, comments, attachments, and activity log
-- ==============================================

-- Create tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('login_access', 'data_mismatch', 'payment_billing', 'approvals_workflow', 'calendar_scheduling', 'erp_performance', 'request_feature', 'others')),
    module VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
    
    -- User information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    hub_id UUID, -- Hub/site information
    
    -- System information (stored as JSONB for flexibility)
    system_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    tags TEXT[], -- Array of tags for categorization
    internal_notes TEXT, -- Notes visible only to support staff
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    
    CONSTRAINT valid_ticket_number CHECK (ticket_number ~ '^TCK-[0-9]{4}$')
);

-- Create ticket comments table
CREATE TABLE IF NOT EXISTS support_ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes not visible to ticket creator
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT comment_not_empty CHECK (LENGTH(TRIM(message)) > 0)
);

-- Create ticket attachments table
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES support_ticket_comments(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    file_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT attachment_belongs_to_ticket_or_comment CHECK (
        (ticket_id IS NOT NULL AND comment_id IS NULL) OR
        (ticket_id IS NULL AND comment_id IS NOT NULL)
    ),
    CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760) -- Max 10MB
);

-- Create ticket activity log table
CREATE TABLE IF NOT EXISTS support_ticket_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- e.g., 'created', 'status_changed', 'assigned', 'commented', etc.
    details TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- INDEXES for better query performance
-- ==============================================

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_module ON support_tickets(module);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON support_tickets(ticket_number);

-- For searching tickets by title/description
CREATE INDEX IF NOT EXISTS idx_tickets_title_trgm ON support_tickets USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_description_trgm ON support_tickets USING gin(description gin_trgm_ops);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON support_ticket_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON support_ticket_comments(created_at DESC);

-- Attachments indexes
CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON support_ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachments_comment_id ON support_ticket_attachments(comment_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON support_ticket_attachments(uploaded_by);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_ticket_id ON support_ticket_activity_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON support_ticket_activity_log(created_at DESC);

-- ==============================================
-- TRIGGERS for automatic timestamp updates
-- ==============================================

-- Update updated_at on ticket changes
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_updated_at();

-- Update updated_at on comment changes
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_timestamp
    BEFORE UPDATE ON support_ticket_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_updated_at();

-- ==============================================
-- FUNCTION to generate sequential ticket numbers
-- ==============================================

CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    ticket_num TEXT;
BEGIN
    next_num := nextval('ticket_number_seq');
    ticket_num := 'TCK-' || LPAD(next_num::TEXT, 4, '0');
    RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- VIEWS for common queries
-- ==============================================

-- View to get ticket summary with user details
CREATE OR REPLACE VIEW v_ticket_summary AS
SELECT 
    t.id,
    t.ticket_number,
    t.title,
    t.description,
    t.category,
    t.module,
    t.priority,
    t.status,
    t.created_at,
    t.updated_at,
    t.resolved_at,
    t.closed_at,
    u.id AS user_id,
    u.username AS user_name,
    u.email AS user_email,
    a.id AS assigned_to_id,
    a.username AS assigned_to_name,
    a.email AS assigned_to_email,
    (SELECT COUNT(*) FROM support_ticket_comments WHERE ticket_id = t.id) AS comment_count,
    (SELECT COUNT(*) FROM support_ticket_attachments WHERE ticket_id = t.id) AS attachment_count,
    t.system_info
FROM support_tickets t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN users a ON t.assigned_to = a.id;

-- View to get ticket statistics
CREATE OR REPLACE VIEW v_ticket_statistics AS
SELECT
    COUNT(*) AS total_tickets,
    COUNT(*) FILTER (WHERE status = 'open') AS open_tickets,
    COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_tickets,
    COUNT(*) FILTER (WHERE status = 'waiting_response') AS waiting_response_tickets,
    COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_tickets,
    COUNT(*) FILTER (WHERE status = 'closed') AS closed_tickets,
    COUNT(*) FILTER (WHERE priority = 'critical') AS critical_priority,
    COUNT(*) FILTER (WHERE priority = 'high') AS high_priority,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::NUMERIC(10,2) AS avg_resolution_time_hours
FROM support_tickets;

-- ==============================================
-- SAMPLE DATA (optional - for testing)
-- ==============================================

-- Insert sample ticket categories and modules into a reference table (optional)
CREATE TABLE IF NOT EXISTS support_categories (
    value VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50)
);

INSERT INTO support_categories (value, label, description) VALUES
    ('login_access', 'Login / Access issue', 'Issues with login or accessing the system'),
    ('data_mismatch', 'Data mismatch', 'Incorrect or inconsistent data'),
    ('payment_billing', 'Payment / Billing', 'Payment processing or billing issues'),
    ('approvals_workflow', 'Approvals & Workflow', 'Issues with approval processes'),
    ('calendar_scheduling', 'Calendar & Scheduling', 'Calendar or scheduling problems'),
    ('erp_performance', 'ERP performance / lag', 'System performance or slowness'),
    ('request_feature', 'Request new feature', 'Feature requests and enhancements'),
    ('others', 'Others', 'Other types of support requests')
ON CONFLICT (value) DO NOTHING;

CREATE TABLE IF NOT EXISTS support_modules (
    value VARCHAR(100) PRIMARY KEY,
    label VARCHAR(200) NOT NULL,
    description TEXT
);

INSERT INTO support_modules (value, label, description) VALUES
    ('finance', 'Finance', 'Financial transactions and accounting'),
    ('hr', 'HR', 'Human resources and employee management'),
    ('logistics_hub', 'Logistics / Hub operations', 'Logistics and hub operations'),
    ('inventory', 'Inventory', 'Inventory management'),
    ('vendor_management', 'Vendor management', 'Vendor and supplier management'),
    ('reporting', 'Reporting', 'Reports and analytics'),
    ('user_settings', 'User settings', 'User settings and preferences'),
    ('chat_ai', 'Chat / AI', 'Chat and AI assistant features')
ON CONFLICT (value) DO NOTHING;

-- ==============================================
-- GRANTS (adjust as needed for your database users)
-- ==============================================

-- Example grants for application user (replace 'app_user' with your actual user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON support_tickets TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON support_ticket_comments TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON support_ticket_attachments TO app_user;
-- GRANT SELECT, INSERT ON support_ticket_activity_log TO app_user;
-- GRANT SELECT ON v_ticket_summary TO app_user;
-- GRANT SELECT ON v_ticket_statistics TO app_user;
-- GRANT USAGE ON SEQUENCE ticket_number_seq TO app_user;

-- ==============================================
-- ROLLBACK SCRIPT (commented out - use if needed)
-- ==============================================

/*
-- Drop views
DROP VIEW IF EXISTS v_ticket_statistics;
DROP VIEW IF EXISTS v_ticket_summary;

-- Drop function
DROP FUNCTION IF EXISTS generate_ticket_number();
DROP SEQUENCE IF EXISTS ticket_number_seq;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_update_ticket_timestamp ON support_tickets;
DROP TRIGGER IF EXISTS trigger_update_comment_timestamp ON support_ticket_comments;
DROP FUNCTION IF EXISTS update_ticket_updated_at();
DROP FUNCTION IF EXISTS update_comment_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_tickets_user_id;
DROP INDEX IF EXISTS idx_tickets_assigned_to;
DROP INDEX IF EXISTS idx_tickets_status;
DROP INDEX IF EXISTS idx_tickets_priority;
DROP INDEX IF EXISTS idx_tickets_category;
DROP INDEX IF EXISTS idx_tickets_module;
DROP INDEX IF EXISTS idx_tickets_created_at;
DROP INDEX IF EXISTS idx_tickets_ticket_number;
DROP INDEX IF EXISTS idx_tickets_title_trgm;
DROP INDEX IF EXISTS idx_tickets_description_trgm;
DROP INDEX IF EXISTS idx_comments_ticket_id;
DROP INDEX IF EXISTS idx_comments_user_id;
DROP INDEX IF EXISTS idx_comments_created_at;
DROP INDEX IF EXISTS idx_attachments_ticket_id;
DROP INDEX IF EXISTS idx_attachments_comment_id;
DROP INDEX IF EXISTS idx_attachments_uploaded_by;
DROP INDEX IF EXISTS idx_activity_ticket_id;
DROP INDEX IF EXISTS idx_activity_created_at;

-- Drop tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS support_ticket_activity_log;
DROP TABLE IF EXISTS support_ticket_attachments;
DROP TABLE IF EXISTS support_ticket_comments;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS support_modules;
DROP TABLE IF EXISTS support_categories;
*/

-- ==============================================
-- END OF MIGRATION
-- ==============================================

COMMENT ON TABLE support_tickets IS 'Main support tickets table for help & support system';
COMMENT ON TABLE support_ticket_comments IS 'Comments and conversation thread for tickets';
COMMENT ON TABLE support_ticket_attachments IS 'File attachments for tickets and comments';
COMMENT ON TABLE support_ticket_activity_log IS 'Activity and audit log for ticket changes';
