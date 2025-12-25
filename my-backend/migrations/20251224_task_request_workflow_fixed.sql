-- Migration: Hierarchical Task Request & Approval Workflow (FIXED)
-- Date: 2025-12-24
-- Description: Implements request-based workflow for subordinate-to-superior task assignments
-- 
-- FIXES:
-- - Uses UUID for user references (matching users_enhanced.id)
-- - Removes foreign key constraints to users view (uses application-level validation)
-- - Uses role string instead of role_id reference

-- ============================================
-- 1. TASK REQUESTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS task_requests (
    id SERIAL PRIMARY KEY,
    
    -- Request identification
    request_number VARCHAR(20) NOT NULL UNIQUE,
    
    -- Request content (what task would be created)
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    suggested_due_date TIMESTAMP,
    
    -- Request participants (UUIDs to match users_enhanced.id)
    requested_by UUID NOT NULL,          -- The subordinate who created the request
    requested_to UUID NOT NULL,          -- The superior who receives the request
    
    -- Role levels at time of request (for audit trail)
    requester_role_level INTEGER NOT NULL,
    requester_role_name VARCHAR(100),
    target_role_level INTEGER NOT NULL,
    target_role_name VARCHAR(100),
    
    -- Request status (state machine)
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    
    -- Resolution details
    resolved_at TIMESTAMP,
    resolved_by UUID,
    resolution_action VARCHAR(50),          -- ACCEPTED, DELEGATED, REJECTED, DEFERRED
    resolution_reason TEXT,
    
    -- If accepted: the task that was created
    converted_task_id INTEGER,
    
    -- If delegated: who was assigned
    delegated_to UUID,
    
    -- If deferred: reminder date
    deferred_until TIMESTAMP,
    
    -- Clarification tracking
    clarification_count INTEGER DEFAULT 0,
    last_clarification_at TIMESTAMP,
    
    -- Watchers (users who should be notified of updates)
    watcher_ids UUID[] DEFAULT '{}',
    
    -- Tags and metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Multi-tenant support
    tenant_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Check constraints
    CONSTRAINT chk_request_status CHECK (status IN (
        'REQUESTED',        -- Initial state: waiting for superior's action
        'NEED_INFO',        -- Superior asked for clarification
        'DEFERRED',         -- Superior deferred to a later date
        'ACCEPTED',         -- Superior accepted and will work on it
        'DELEGATED',        -- Superior delegated to another subordinate
        'REJECTED',         -- Superior rejected the request
        'CANCELLED'         -- Requester cancelled the request
    )),
    CONSTRAINT chk_request_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL')),
    CONSTRAINT chk_resolution_action CHECK (resolution_action IS NULL OR resolution_action IN (
        'ACCEPTED', 'DELEGATED', 'REJECTED', 'DEFERRED', 'NEED_INFO', 'CANCELLED'
    )),
    
    -- Hierarchy enforcement: requester level must be lower than target level
    CONSTRAINT chk_hierarchy_valid CHECK (requester_role_level < target_role_level)
);

-- ============================================
-- 2. TASK REQUEST MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS task_request_messages (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES task_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'TEXT',
    
    -- Message metadata
    is_system_message BOOLEAN DEFAULT FALSE,
    is_clarification_request BOOLEAN DEFAULT FALSE,
    is_clarification_response BOOLEAN DEFAULT FALSE,
    
    -- Attachments reference
    attachment_ids INTEGER[] DEFAULT '{}',
    
    -- Read receipts
    read_by UUID[] DEFAULT '{}',
    
    -- Tenant isolation
    tenant_id UUID,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Check constraints
    CONSTRAINT chk_request_message_type CHECK (message_type IN (
        'TEXT', 'SYSTEM', 'CLARIFICATION_REQUEST', 'CLARIFICATION_RESPONSE',
        'STATUS_CHANGE', 'DELEGATION_NOTICE', 'REJECTION_NOTICE'
    ))
);

-- ============================================
-- 3. TASK REQUEST HISTORY TABLE (Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS task_request_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES task_requests(id) ON DELETE CASCADE,
    
    -- Actor information
    actor_id UUID NOT NULL,
    actor_role_level INTEGER,
    actor_role_name VARCHAR(100),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    action_category VARCHAR(50),            -- CREATE, STATUS_CHANGE, RESOLUTION, COMMENT
    
    -- State change tracking
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- Additional context
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    
    -- IP and session tracking (for security audit)
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Tenant isolation
    tenant_id UUID,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. INDEXES for Performance
-- ============================================

-- Task requests indexes
CREATE INDEX IF NOT EXISTS idx_task_requests_requested_by ON task_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_task_requests_requested_to ON task_requests(requested_to);
CREATE INDEX IF NOT EXISTS idx_task_requests_status ON task_requests(status);
CREATE INDEX IF NOT EXISTS idx_task_requests_tenant ON task_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_task_requests_created_at ON task_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_requests_composite_status_to ON task_requests(status, requested_to);
CREATE INDEX IF NOT EXISTS idx_task_requests_composite_status_by ON task_requests(status, requested_by);

-- Request messages indexes
CREATE INDEX IF NOT EXISTS idx_request_messages_request ON task_request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_request_messages_sender ON task_request_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_request_messages_created ON task_request_messages(created_at);

-- Request history indexes
CREATE INDEX IF NOT EXISTS idx_request_history_request ON task_request_history(request_id);
CREATE INDEX IF NOT EXISTS idx_request_history_actor ON task_request_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_request_history_created ON task_request_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_history_action ON task_request_history(action);

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_task_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_requests_updated_at ON task_requests;
CREATE TRIGGER trg_task_requests_updated_at
    BEFORE UPDATE ON task_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_task_request_updated_at();

-- Log request status changes to history
CREATE OR REPLACE FUNCTION log_task_request_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO task_request_history (
            request_id, actor_id, actor_role_level, actor_role_name,
            action, action_category, previous_status, new_status,
            reason, tenant_id
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.resolved_by, NEW.requested_by),
            CASE WHEN NEW.resolved_by IS NOT NULL THEN NEW.target_role_level ELSE NEW.requester_role_level END,
            CASE WHEN NEW.resolved_by IS NOT NULL THEN NEW.target_role_name ELSE NEW.requester_role_name END,
            'STATUS_CHANGED',
            'STATUS_CHANGE',
            OLD.status,
            NEW.status,
            NEW.resolution_reason,
            NEW.tenant_id
        );
    END IF;
    
    -- Log resolution
    IF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
        INSERT INTO task_request_history (
            request_id, actor_id, actor_role_level, actor_role_name,
            action, action_category, previous_status, new_status,
            field_changed, new_value, reason, tenant_id
        )
        VALUES (
            NEW.id,
            NEW.resolved_by,
            NEW.target_role_level,
            NEW.target_role_name,
            NEW.resolution_action,
            'RESOLUTION',
            OLD.status,
            NEW.status,
            'resolution_action',
            NEW.resolution_action,
            NEW.resolution_reason,
            NEW.tenant_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_request_log_changes ON task_requests;
CREATE TRIGGER trg_task_request_log_changes
    AFTER UPDATE ON task_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_task_request_status_changes();

-- ============================================
-- 6. SEQUENCE for Request Numbers
-- ============================================

CREATE SEQUENCE IF NOT EXISTS task_request_number_seq START WITH 1;

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    SELECT nextval('task_request_number_seq') INTO v_seq;
    RETURN 'REQ-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VIEWS
-- ============================================

-- Active requests for superiors (inbox)
CREATE OR REPLACE VIEW v_pending_requests_inbox AS
SELECT 
    r.*,
    requester.username AS requester_name,
    requester.email AS requester_email,
    target.username AS target_name,
    target.email AS target_email,
    (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id) AS message_count
FROM task_requests r
LEFT JOIN users requester ON r.requested_by = requester.uuid_id
LEFT JOIN users target ON r.requested_to = target.uuid_id
WHERE r.status IN ('REQUESTED', 'NEED_INFO')
ORDER BY 
    CASE r.priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'URGENT' THEN 2 
        WHEN 'HIGH' THEN 3 
        WHEN 'MEDIUM' THEN 4 
        ELSE 5 
    END,
    r.created_at ASC;

-- Sent requests for subordinates (outbox)
CREATE OR REPLACE VIEW v_sent_requests_outbox AS
SELECT 
    r.*,
    requester.username AS requester_name,
    target.username AS target_name,
    (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id) AS message_count
FROM task_requests r
LEFT JOIN users requester ON r.requested_by = requester.uuid_id
LEFT JOIN users target ON r.requested_to = target.uuid_id
WHERE r.status NOT IN ('ACCEPTED', 'DELEGATED', 'REJECTED', 'CANCELLED')
ORDER BY r.created_at DESC;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON task_requests TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_request_messages TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON task_request_history TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE task_requests_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE task_request_messages_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE task_request_history_id_seq TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE task_request_number_seq TO PUBLIC;

-- ============================================
-- 9. COMMENTS
-- ============================================

COMMENT ON TABLE task_requests IS 'Task requests from subordinates to superiors - requires approval before becoming tasks';
COMMENT ON TABLE task_request_messages IS 'Messages and clarification discussions on task requests';
COMMENT ON TABLE task_request_history IS 'Complete audit trail of all request actions';

COMMENT ON COLUMN task_requests.status IS 'Request state: REQUESTED, NEED_INFO, DEFERRED, ACCEPTED, DELEGATED, REJECTED, CANCELLED';
COMMENT ON COLUMN task_requests.requester_role_level IS 'Role level of requester at time of request (for audit)';
COMMENT ON COLUMN task_requests.target_role_level IS 'Role level of target at time of request (for audit)';
COMMENT ON COLUMN task_requests.converted_task_id IS 'Reference to task created when request is accepted';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
