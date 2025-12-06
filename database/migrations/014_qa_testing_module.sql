-- QA Testing Module Migration
-- Creates tables for test tasks, issues, and issue history
-- Using UUID for tenant_id to match existing schema

-- ============================================================================
-- 1. QA TEST TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_test_tasks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Task details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    module VARCHAR(100),                    -- Which module this tests (e.g., 'inventory', 'billing')
    test_type VARCHAR(50) DEFAULT 'manual', -- manual, automated, regression
    priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    status VARCHAR(30) DEFAULT 'pending',   -- pending, in_progress, passed, failed, blocked
    
    -- Assignment (stored as user ID, no FK to users view)
    assigned_to BIGINT,
    due_date DATE,
    
    -- Test execution
    test_steps TEXT,                        -- JSON or markdown steps
    expected_result TEXT,
    actual_result TEXT,
    
    -- Metadata
    created_by BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_test_type CHECK (test_type IN ('manual', 'automated', 'regression', 'smoke', 'integration')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'blocked', 'skipped'))
);

-- Indexes for qa_test_tasks
CREATE INDEX IF NOT EXISTS idx_qa_test_tasks_tenant ON qa_test_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_test_tasks_status ON qa_test_tasks(status);
CREATE INDEX IF NOT EXISTS idx_qa_test_tasks_assigned ON qa_test_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qa_test_tasks_module ON qa_test_tasks(module);
CREATE INDEX IF NOT EXISTS idx_qa_test_tasks_due_date ON qa_test_tasks(due_date);

-- ============================================================================
-- 2. QA ISSUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_issues (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Auto-generated code
    issue_code VARCHAR(20) NOT NULL,        -- e.g., BUG-2024-0001
    
    -- Issue details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    
    -- Classification
    module VARCHAR(100),                    -- Which module is affected
    severity VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    issue_type VARCHAR(30) DEFAULT 'bug',   -- bug, enhancement, task, question
    status VARCHAR(30) DEFAULT 'open',      -- open, in_progress, resolved, closed, reopened, wont_fix
    
    -- Relationships
    related_task_id BIGINT REFERENCES qa_test_tasks(id) ON DELETE SET NULL,
    
    -- Assignment (no FK to users view)
    opened_by BIGINT,
    assigned_to BIGINT,
    
    -- Environment info
    environment TEXT,                       -- dev, staging, production
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Attachments (stored as JSON array of URLs)
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_issue_priority CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_issue_type CHECK (issue_type IN ('bug', 'enhancement', 'task', 'question', 'documentation')),
    CONSTRAINT valid_issue_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'reopened', 'wont_fix', 'duplicate')),
    CONSTRAINT unique_issue_code UNIQUE (tenant_id, issue_code)
);

-- Indexes for qa_issues
CREATE INDEX IF NOT EXISTS idx_qa_issues_tenant ON qa_issues(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_issues_code ON qa_issues(issue_code);
CREATE INDEX IF NOT EXISTS idx_qa_issues_status ON qa_issues(status);
CREATE INDEX IF NOT EXISTS idx_qa_issues_severity ON qa_issues(severity);
CREATE INDEX IF NOT EXISTS idx_qa_issues_assigned ON qa_issues(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qa_issues_module ON qa_issues(module);
CREATE INDEX IF NOT EXISTS idx_qa_issues_created ON qa_issues(created_at DESC);

-- ============================================================================
-- 3. QA ISSUE HISTORY TABLE (for timeline "how was it then / how now")
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_issue_history (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT NOT NULL REFERENCES qa_issues(id) ON DELETE CASCADE,
    
    -- Change tracking
    changed_by BIGINT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Field changes
    field_name VARCHAR(50) NOT NULL,        -- Which field changed (status, severity, assigned_to, etc.)
    old_value TEXT,                         -- Previous value
    new_value TEXT,                         -- New value
    
    -- Optional comment with the change
    comment TEXT
);

-- Indexes for qa_issue_history
CREATE INDEX IF NOT EXISTS idx_qa_issue_history_issue ON qa_issue_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_qa_issue_history_changed_at ON qa_issue_history(changed_at DESC);

-- ============================================================================
-- 4. QA ISSUE COMMENTS TABLE (separate from history for pure comments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS qa_issue_comments (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT NOT NULL REFERENCES qa_issues(id) ON DELETE CASCADE,
    
    -- Comment details
    author_id BIGINT,
    content TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for qa_issue_comments
CREATE INDEX IF NOT EXISTS idx_qa_issue_comments_issue ON qa_issue_comments(issue_id);

-- ============================================================================
-- 5. ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE qa_test_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_issue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_issue_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qa_test_tasks
DROP POLICY IF EXISTS qa_test_tasks_tenant_isolation ON qa_test_tasks;
CREATE POLICY qa_test_tasks_tenant_isolation ON qa_test_tasks
    FOR ALL
    USING (is_platform_admin() OR tenant_id = current_tenant_id())
    WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- RLS Policies for qa_issues
DROP POLICY IF EXISTS qa_issues_tenant_isolation ON qa_issues;
CREATE POLICY qa_issues_tenant_isolation ON qa_issues
    FOR ALL
    USING (is_platform_admin() OR tenant_id = current_tenant_id())
    WITH CHECK (is_platform_admin() OR tenant_id = current_tenant_id());

-- RLS Policies for qa_issue_history (join through qa_issues for tenant check)
DROP POLICY IF EXISTS qa_issue_history_tenant_isolation ON qa_issue_history;
CREATE POLICY qa_issue_history_tenant_isolation ON qa_issue_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM qa_issues 
            WHERE qa_issues.id = qa_issue_history.issue_id 
            AND (is_platform_admin() OR qa_issues.tenant_id = current_tenant_id())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM qa_issues 
            WHERE qa_issues.id = qa_issue_history.issue_id 
            AND (is_platform_admin() OR qa_issues.tenant_id = current_tenant_id())
        )
    );

-- RLS Policies for qa_issue_comments
DROP POLICY IF EXISTS qa_issue_comments_tenant_isolation ON qa_issue_comments;
CREATE POLICY qa_issue_comments_tenant_isolation ON qa_issue_comments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM qa_issues 
            WHERE qa_issues.id = qa_issue_comments.issue_id 
            AND (is_platform_admin() OR qa_issues.tenant_id = current_tenant_id())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM qa_issues 
            WHERE qa_issues.id = qa_issue_comments.issue_id 
            AND (is_platform_admin() OR qa_issues.tenant_id = current_tenant_id())
        )
    );

-- ============================================================================
-- 6. HELPER FUNCTION FOR ISSUE CODE GENERATION
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_qa_issue_code(p_tenant_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_year TEXT;
    v_next_num INT;
    v_code VARCHAR(20);
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next number for this tenant and year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(issue_code FROM 'BUG-' || v_year || '-(\d+)') AS INT)
    ), 0) + 1
    INTO v_next_num
    FROM qa_issues
    WHERE tenant_id = p_tenant_id
    AND issue_code LIKE 'BUG-' || v_year || '-%';
    
    v_code := 'BUG-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. TRIGGER FOR AUTO-GENERATING ISSUE CODE
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_issue_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.issue_code IS NULL OR NEW.issue_code = '' THEN
        NEW.issue_code := generate_qa_issue_code(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_issue_code_trigger ON qa_issues;
CREATE TRIGGER set_issue_code_trigger
    BEFORE INSERT ON qa_issues
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_issue_code();

-- ============================================================================
-- 8. TRIGGER FOR AUTO-UPDATING updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_qa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qa_test_tasks_updated_at ON qa_test_tasks;
CREATE TRIGGER qa_test_tasks_updated_at
    BEFORE UPDATE ON qa_test_tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_qa_updated_at();

DROP TRIGGER IF EXISTS qa_issues_updated_at ON qa_issues;
CREATE TRIGGER qa_issues_updated_at
    BEFORE UPDATE ON qa_issues
    FOR EACH ROW
    EXECUTE FUNCTION trigger_qa_updated_at();

DROP TRIGGER IF EXISTS qa_issue_comments_updated_at ON qa_issue_comments;
CREATE TRIGGER qa_issue_comments_updated_at
    BEFORE UPDATE ON qa_issue_comments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_qa_updated_at();

-- ============================================================================
-- DONE
-- ============================================================================
-- Tables created:
--   1. qa_test_tasks     - Test assignments for testers
--   2. qa_issues         - Bug/issue tracker with auto-generated codes
--   3. qa_issue_history  - Complete timeline of changes ("how was it then / how now")
--   4. qa_issue_comments - Separate comments on issues
-- 
-- Features:
--   - Row-Level Security for multi-tenant isolation
--   - Auto-generated issue codes (BUG-2024-0001)
--   - Auto-updating timestamps
--   - Full audit trail via history table
-- ============================================================================
