-- Task Workflow System Migration
-- Multi-level approval chain: DRAFT → IN_PROGRESS → EDITING → DONE

-- 1. Tasks table with approval tracking
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', 
  -- Statuses: 'draft', 'confirmed', 'in_progress', 'editing', 'done'
  
  -- User relationships
  creator_id UUID NOT NULL,
  creator_type TEXT NOT NULL, -- 'USER' | 'ENTERPRISE_ADMIN' | 'SUPER_ADMIN'
  
  -- Approval chain tracking
  current_approver_level INTEGER DEFAULT 0,
  -- 0 = no approval needed yet
  -- 1 = operation_manager
  -- 2 = accounts
  -- 3 = account_payable
  -- 4 = banker
  -- 5 = final approved
  
  approver_id UUID, -- Current approver
  approver_type TEXT, -- Type of current approver
  
  -- Metadata
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[], -- Array of tags
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Task History/Audit Trail
CREATE TABLE IF NOT EXISTS task_history (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- Transition details
  from_status TEXT,
  to_status TEXT,
  action TEXT NOT NULL, -- 'confirm', 'approve', 'reject', 'resubmit', 'complete', 'comment'
  
  -- Actor details
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  actor_name TEXT,
  actor_role TEXT, -- 'operation_manager', 'accounts', 'account_payable', 'banker'
  
  -- Approval level tracking
  approval_level INTEGER,
  
  -- Comments/Notes
  comment TEXT,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Task Approvers Configuration (define approval chain)
CREATE TABLE IF NOT EXISTS task_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User details
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  
  -- Approver role in chain
  approver_role TEXT NOT NULL, -- 'operation_manager', 'accounts', 'account_payable', 'banker'
  approval_level INTEGER NOT NULL, -- 1, 2, 3, 4
  
  -- Can this approver skip levels?
  can_override BOOLEAN DEFAULT false,
  
  -- Active status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one user can have multiple approver roles
  UNIQUE(user_id, user_type, approver_role)
);

-- 4. Task Comments (chat functionality)
CREATE TABLE IF NOT EXISTS task_comments (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- User details
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL,
  user_name TEXT NOT NULL,
  
  -- Comment content
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'message', -- 'message', 'system', 'approval', 'rejection'
  
  -- Metadata
  is_internal BOOLEAN DEFAULT false, -- Internal notes vs public comments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Task Attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  
  -- File details
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  
  -- Uploader
  uploaded_by UUID NOT NULL,
  uploaded_by_type TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_id, creator_type);
CREATE INDEX IF NOT EXISTS idx_tasks_approver ON tasks(approver_id, approver_type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_approvers_user ON task_approvers(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_task_approvers_role ON task_approvers(approver_role);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- 7. Insert default approver roles (example - adjust to your users)
INSERT INTO task_approvers (user_id, user_type, user_name, user_email, approver_role, approval_level, can_override)
VALUES 
  -- Level 1: Operation Manager
  ('11111111-1111-1111-1111-111111111111', 'USER', 'Operation Manager', 'operation@bisman.demo', 'operation_manager', 1, false),
  
  -- Level 2: Accounts
  ('22222222-2222-2222-2222-222222222222', 'USER', 'Accounts Manager', 'accounts@bisman.demo', 'accounts', 2, false),
  
  -- Level 3: Accounts Payable
  ('33333333-3333-3333-3333-333333333333', 'USER', 'Accounts Payable', 'payable@bisman.demo', 'account_payable', 3, false),
  
  -- Level 4: Banker
  ('44444444-4444-4444-4444-444444444444', 'USER', 'Banker', 'banker@bisman.demo', 'banker', 4, true)
ON CONFLICT (user_id, user_type, approver_role) DO NOTHING;

-- 8. Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Triggers
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_approvers_updated_at BEFORE UPDATE ON task_approvers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Comments
COMMENT ON TABLE tasks IS 'Main tasks table with multi-level approval workflow';
COMMENT ON TABLE task_history IS 'Audit trail of all task state transitions';
COMMENT ON TABLE task_approvers IS 'Configuration of approval chain and approver roles';
COMMENT ON TABLE task_comments IS 'Chat/comment functionality for tasks';
COMMENT ON TABLE task_attachments IS 'File attachments for tasks';

COMMENT ON COLUMN tasks.status IS 'draft | confirmed | in_progress | editing | done';
COMMENT ON COLUMN tasks.current_approver_level IS '0=none, 1=operation_manager, 2=accounts, 3=account_payable, 4=banker, 5=final';
COMMENT ON COLUMN task_approvers.approval_level IS 'Order in approval chain: 1(first) to 4(last)';
