-- Migration: Hierarchical Task Request & Approval Workflow
-- Date: 2025-12-24
-- Description: Implements request-based workflow for subordinate-to-superior task assignments
-- 
-- Business Rule: Subordinates cannot directly assign tasks to superiors.
-- They can only send task requests that require approval.

-- ============================================
-- 1. TASK REQUESTS TABLE
-- ============================================
-- Stores task requests from subordinates to superiors
-- These are NOT tasks until accepted/delegated

CREATE TABLE IF NOT EXISTS task_requests (
    id SERIAL PRIMARY KEY,
    
    -- Request identification
    request_number VARCHAR(20) NOT NULL UNIQUE,
    
    -- Request content (what task would be created)
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    suggested_due_date TIMESTAMP,
    
    -- Request participants
    requested_by INTEGER NOT NULL,          -- The subordinate who created the request
    requested_to INTEGER NOT NULL,          -- The superior who receives the request
    
    -- Role levels at time of request (for audit trail)
    requester_role_level INTEGER NOT NULL,
    target_role_level INTEGER NOT NULL,
    
    -- Request status (state machine)
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    
    -- Resolution details
    resolved_at TIMESTAMP,
    resolved_by INTEGER,
    resolution_action VARCHAR(50),          -- ACCEPTED, DELEGATED, REJECTED, DEFERRED
    resolution_reason TEXT,
    
    -- If accepted: the task that was created
    converted_task_id INTEGER,
    
    -- If delegated: who was assigned
    delegated_to INTEGER,
    
    -- If deferred: reminder date
    deferred_until TIMESTAMP,
    
    -- Clarification tracking
    clarification_count INTEGER DEFAULT 0,
    last_clarification_at TIMESTAMP,
    
    -- Watchers (users who should be notified of updates)
    watcher_ids INTEGER[] DEFAULT '{}',
    
    -- Tags and metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Multi-tenant support
    tenant_id INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_task_requests_requested_by FOREIGN KEY (requested_by) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_requests_requested_to FOREIGN KEY (requested_to) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_requests_resolved_by FOREIGN KEY (resolved_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_task_requests_delegated_to FOREIGN KEY (delegated_to) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_task_requests_converted_task FOREIGN KEY (converted_task_id) 
        REFERENCES workflow_tasks(id) ON DELETE SET NULL,
    
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
-- For clarification discussions on requests

CREATE TABLE IF NOT EXISTS task_request_messages (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'TEXT',
    
    -- Message metadata
    is_system_message BOOLEAN DEFAULT FALSE,
    is_clarification_request BOOLEAN DEFAULT FALSE,
    is_clarification_response BOOLEAN DEFAULT FALSE,
    
    -- Attachments reference
    attachment_ids INTEGER[] DEFAULT '{}',
    
    -- Read receipts
    read_by INTEGER[] DEFAULT '{}',
    
    -- Tenant isolation
    tenant_id INTEGER,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_request_messages_request FOREIGN KEY (request_id) 
        REFERENCES task_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_messages_sender FOREIGN KEY (sender_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT chk_request_message_type CHECK (message_type IN (
        'TEXT', 'SYSTEM', 'CLARIFICATION_REQUEST', 'CLARIFICATION_RESPONSE',
        'STATUS_CHANGE', 'DELEGATION_NOTICE', 'REJECTION_NOTICE'
    ))
);

-- ============================================
-- 3. TASK REQUEST HISTORY TABLE (Audit Trail)
-- ============================================
-- Complete audit trail for all request actions

CREATE TABLE IF NOT EXISTS task_request_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL,
    
    -- Actor information
    actor_id INTEGER NOT NULL,
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
    tenant_id INTEGER,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_request_history_request FOREIGN KEY (request_id) 
        REFERENCES task_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_history_actor FOREIGN KEY (actor_id) 
        REFERENCES users(id) ON DELETE CASCADE
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
DECLARE
    v_actor_role_level INTEGER;
    v_actor_role_name VARCHAR(100);
BEGIN
    -- Get actor's role info
    SELECT r.level, r.display_name 
    INTO v_actor_role_level, v_actor_role_name
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = COALESCE(NEW.resolved_by, NEW.requested_by);
    
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
            v_actor_role_level,
            v_actor_role_name,
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
            v_actor_role_level,
            v_actor_role_name,
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
-- 6. HELPER FUNCTION: Check Hierarchy
-- ============================================
-- Returns TRUE if user1 is superior to user2 (has higher role level)

CREATE OR REPLACE FUNCTION is_superior_to(superior_user_id INTEGER, subordinate_user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_superior_level INTEGER;
    v_subordinate_level INTEGER;
BEGIN
    -- Get superior's role level
    SELECT COALESCE(r.level, 0) INTO v_superior_level
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = superior_user_id;
    
    -- Get subordinate's role level
    SELECT COALESCE(r.level, 0) INTO v_subordinate_level
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = subordinate_user_id;
    
    RETURN v_superior_level > v_subordinate_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. HELPER FUNCTION: Get User Role Level
-- ============================================

CREATE OR REPLACE FUNCTION get_user_role_level(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER;
BEGIN
    SELECT COALESCE(r.level, 0) INTO v_level
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = p_user_id;
    
    RETURN COALESCE(v_level, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. HELPER FUNCTION: Can Assign Directly
-- ============================================
-- Returns TRUE if creator can directly assign to assignee (no request needed)
-- Direct assignment allowed when: creator's level >= assignee's level

CREATE OR REPLACE FUNCTION can_assign_directly(creator_id INTEGER, assignee_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_creator_level INTEGER;
    v_assignee_level INTEGER;
BEGIN
    v_creator_level := get_user_role_level(creator_id);
    v_assignee_level := get_user_role_level(assignee_id);
    
    -- Can assign directly if creator is same level or higher
    RETURN v_creator_level >= v_assignee_level;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. VIEWS
-- ============================================

-- Active requests for superiors (inbox)
CREATE OR REPLACE VIEW v_pending_requests_inbox AS
SELECT 
    r.*,
    requester.username AS requester_name,
    requester.email AS requester_email,
    requester_role.display_name AS requester_role,
    target.username AS target_name,
    target.email AS target_email,
    target_role.display_name AS target_role,
    (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id) AS message_count
FROM task_requests r
LEFT JOIN users requester ON r.requested_by = requester.id
LEFT JOIN rbac_roles requester_role ON requester.role_id = requester_role.id
LEFT JOIN users target ON r.requested_to = target.id
LEFT JOIN rbac_roles target_role ON target.role_id = target_role.id
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
    target_role.display_name AS target_role,
    (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id) AS message_count
FROM task_requests r
LEFT JOIN users requester ON r.requested_by = requester.id
LEFT JOIN users target ON r.requested_to = target.id
LEFT JOIN rbac_roles target_role ON target.role_id = target_role.id
WHERE r.status NOT IN ('ACCEPTED', 'DELEGATED', 'REJECTED', 'CANCELLED')
ORDER BY r.created_at DESC;

-- Request statistics by user
CREATE OR REPLACE VIEW v_request_statistics AS
SELECT 
    u.id AS user_id,
    u.username,
    r.display_name AS role_name,
    r.level AS role_level,
    COUNT(CASE WHEN tr.requested_by = u.id THEN 1 END) AS requests_sent,
    COUNT(CASE WHEN tr.requested_to = u.id THEN 1 END) AS requests_received,
    COUNT(CASE WHEN tr.requested_to = u.id AND tr.status = 'REQUESTED' THEN 1 END) AS pending_inbox,
    COUNT(CASE WHEN tr.requested_by = u.id AND tr.status = 'REQUESTED' THEN 1 END) AS pending_outbox,
    COUNT(CASE WHEN tr.requested_to = u.id AND tr.status = 'ACCEPTED' THEN 1 END) AS accepted_count,
    COUNT(CASE WHEN tr.requested_to = u.id AND tr.status = 'REJECTED' THEN 1 END) AS rejected_count
FROM users u
LEFT JOIN rbac_roles r ON u.role_id = r.id
LEFT JOIN task_requests tr ON (tr.requested_by = u.id OR tr.requested_to = u.id)
GROUP BY u.id, u.username, r.display_name, r.level;

-- ============================================
-- 10. SEQUENCE for Request Numbers
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
-- 11. COMMENTS
-- ============================================

COMMENT ON TABLE task_requests IS 'Task requests from subordinates to superiors - requires approval before becoming tasks';
COMMENT ON TABLE task_request_messages IS 'Messages and clarification discussions on task requests';
COMMENT ON TABLE task_request_history IS 'Complete audit trail of all request actions';

COMMENT ON COLUMN task_requests.status IS 'Request state: REQUESTED, NEED_INFO, DEFERRED, ACCEPTED, DELEGATED, REJECTED, CANCELLED';
COMMENT ON COLUMN task_requests.requester_role_level IS 'Role level of requester at time of request (for audit)';
COMMENT ON COLUMN task_requests.target_role_level IS 'Role level of target at time of request (for audit)';
COMMENT ON COLUMN task_requests.converted_task_id IS 'Reference to task created when request is accepted';

COMMENT ON FUNCTION is_superior_to(INTEGER, INTEGER) IS 'Check if first user is superior (higher role level) to second user';
COMMENT ON FUNCTION can_assign_directly(INTEGER, INTEGER) IS 'Check if creator can directly assign to assignee without request';
COMMENT ON FUNCTION get_user_role_level(INTEGER) IS 'Get the role hierarchy level for a user';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
