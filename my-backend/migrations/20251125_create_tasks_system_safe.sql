-- Safe Migration: Rename old tasks table and create new task system
-- Date: 2025-11-25

-- Step 1: Rename existing tasks table to legacy_tasks for backup
ALTER TABLE IF EXISTS tasks RENAME TO legacy_tasks_backup_20251125;

-- Step 2: Create new task system tables
-- (Rest of the migration from original file)

-- ============================================
-- 1. TASKS TABLE (Main task entity)
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    
    -- User relationships
    creator_id INTEGER NOT NULL,
    assignee_id INTEGER NOT NULL,
    approver_id INTEGER,
    
    -- Approval hierarchy
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    approved_at TIMESTAMP,
    approved_by INTEGER,
    
    -- Task metadata
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completed_at TIMESTAMP,
    archived_at TIMESTAMP,
    
    -- Tracking
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_hours DECIMAL(10, 2),
    actual_hours DECIMAL(10, 2),
    
    -- Organization context
    organization_id INTEGER,
    department_id INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_tasks_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_approver FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Check constraints
    CONSTRAINT chk_task_status CHECK (status IN ('DRAFT', 'OPEN', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CANCELLED', 'ARCHIVED')),
    CONSTRAINT chk_task_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL')),
    CONSTRAINT chk_approval_status CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'))
);

-- ============================================
-- 2. TASK MESSAGES TABLE (Chat messages)
-- ============================================
CREATE TABLE IF NOT EXISTS task_messages (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'TEXT',
    
    -- Message metadata
    is_system_message BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    
    -- Read receipts
    read_by INTEGER[] DEFAULT '{}',
    read_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_task_messages_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Check constraints
    CONSTRAINT chk_message_type CHECK (message_type IN ('TEXT', 'SYSTEM', 'STATUS_CHANGE', 'ASSIGNEE_CHANGE', 'APPROVAL_REQUEST', 'APPROVAL_RESPONSE'))
);

-- ============================================
-- 3. TASK ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    message_id INTEGER,
    
    -- File information
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    
    -- Upload metadata
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Storage metadata
    storage_provider VARCHAR(50) DEFAULT 'LOCAL',
    storage_key TEXT,
    
    -- Foreign keys
    CONSTRAINT fk_task_attachments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_attachments_message FOREIGN KEY (message_id) REFERENCES task_messages(id) ON DELETE SET NULL,
    CONSTRAINT fk_task_attachments_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 4. TASK PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_participants (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(50) DEFAULT 'VIEWER',
    added_by INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Permissions
    can_edit BOOLEAN DEFAULT FALSE,
    can_comment BOOLEAN DEFAULT TRUE,
    can_approve BOOLEAN DEFAULT FALSE,
    
    -- Foreign keys
    CONSTRAINT fk_task_participants_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_participants_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT uk_task_participants UNIQUE (task_id, user_id),
    
    -- Check constraints
    CONSTRAINT chk_participant_role CHECK (role IN ('VIEWER', 'COLLABORATOR', 'REVIEWER', 'APPROVER'))
);

-- ============================================
-- 5. TASK HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    
    -- Change tracking
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    
    -- Additional context
    notes TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_task_history_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 6. TASK DEPENDENCIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL,
    depends_on_task_id INTEGER NOT NULL,
    dependency_type VARCHAR(50) DEFAULT 'BLOCKS',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_task_dependencies_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_dependencies_depends_on FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Prevent self-dependency
    CONSTRAINT chk_no_self_dependency CHECK (task_id != depends_on_task_id),
    
    -- Check constraints
    CONSTRAINT chk_dependency_type CHECK (dependency_type IN ('BLOCKS', 'BLOCKED_BY', 'RELATES_TO', 'DUPLICATES', 'PARENT', 'CHILD'))
);

-- ============================================
-- 7. TASK TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS task_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_title VARCHAR(500),
    default_content TEXT,
    default_priority VARCHAR(20) DEFAULT 'MEDIUM',
    default_estimated_hours DECIMAL(10, 2),
    
    -- Template metadata
    created_by INTEGER NOT NULL,
    organization_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_task_templates_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_creator ON tasks(creator_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_approver ON tasks(approver_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_organization ON tasks(organization_id);
CREATE INDEX idx_tasks_composite_status_assignee ON tasks(status, assignee_id);

CREATE INDEX idx_task_messages_task ON task_messages(task_id);
CREATE INDEX idx_task_messages_sender ON task_messages(sender_id);
CREATE INDEX idx_task_messages_created_at ON task_messages(created_at);

CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_uploader ON task_attachments(uploaded_by);

CREATE INDEX idx_task_participants_task ON task_participants(task_id);
CREATE INDEX idx_task_participants_user ON task_participants(user_id);

CREATE INDEX idx_task_history_task ON task_history(task_id);
CREATE INDEX idx_task_history_user ON task_history(user_id);
CREATE INDEX idx_task_history_created_at ON task_history(created_at);

CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_task_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_updated_at();

CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO task_history (task_id, user_id, action, field_changed, old_value, new_value)
        VALUES (NEW.id, NEW.assignee_id, 'STATUS_CHANGED', 'status', OLD.status, NEW.status);
    END IF;
    
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
        INSERT INTO task_history (task_id, user_id, action, field_changed, old_value, new_value)
        VALUES (NEW.id, NEW.creator_id, 'ASSIGNEE_CHANGED', 'assignee_id', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT);
    END IF;
    
    IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
        INSERT INTO task_history (task_id, user_id, action, field_changed, old_value, new_value)
        VALUES (NEW.id, NEW.assignee_id, 'TASK_COMPLETED', 'completed_at', NULL, NEW.completed_at::TEXT);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_log_changes
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_changes();

-- ============================================
-- VIEWS
-- ============================================
CREATE OR REPLACE VIEW v_active_tasks AS
SELECT 
    t.*,
    creator.username AS creator_name,
    creator.email AS creator_email,
    assignee.username AS assignee_name,
    assignee.email AS assignee_email,
    approver.username AS approver_name,
    (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) AS message_count,
    (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) AS attachment_count
FROM tasks t
LEFT JOIN users creator ON t.creator_id = creator.id
LEFT JOIN users assignee ON t.assignee_id = assignee.id
LEFT JOIN users approver ON t.approver_id = approver.id
WHERE t.status NOT IN ('ARCHIVED', 'CANCELLED')
ORDER BY t.created_at DESC;

CREATE OR REPLACE VIEW v_user_task_summary AS
SELECT 
    u.id AS user_id,
    u.username,
    COUNT(CASE WHEN t.status = 'DRAFT' AND t.creator_id = u.id THEN 1 END) AS draft_count,
    COUNT(CASE WHEN t.status = 'OPEN' AND t.assignee_id = u.id THEN 1 END) AS open_count,
    COUNT(CASE WHEN t.status = 'IN_PROGRESS' AND t.assignee_id = u.id THEN 1 END) AS in_progress_count,
    COUNT(CASE WHEN t.status = 'IN_REVIEW' AND (t.assignee_id = u.id OR t.approver_id = u.id) THEN 1 END) AS review_count,
    COUNT(CASE WHEN t.status = 'COMPLETED' AND t.assignee_id = u.id THEN 1 END) AS completed_count
FROM users u
LEFT JOIN tasks t ON (t.creator_id = u.id OR t.assignee_id = u.id OR t.approver_id = u.id)
GROUP BY u.id, u.username;

COMMENT ON TABLE tasks IS 'Main tasks table for integrated chat-based task management';
COMMENT ON TABLE task_messages IS 'Chat messages associated with tasks';
COMMENT ON TABLE task_attachments IS 'File attachments for tasks';
COMMENT ON TABLE task_participants IS 'Additional task participants and their permissions';
COMMENT ON TABLE task_history IS 'Audit trail for task changes';
COMMENT ON TABLE task_dependencies IS 'Task relationships and dependencies';
COMMENT ON TABLE task_templates IS 'Reusable task templates';
