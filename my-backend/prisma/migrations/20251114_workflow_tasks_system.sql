-- Task Workflow System Migration (Compatible with existing tables)
-- Uses workflow_tasks instead of tasks to avoid conflicts

-- 1. Workflow Tasks table (NEW TABLE NAME)
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', 
  
  -- User relationships
  creator_id UUID NOT NULL,
  creator_type TEXT NOT NULL,
  
  -- Approval chain tracking
  current_approver_level INTEGER DEFAULT 0,
  approver_id UUID,
  approver_type TEXT,
  
  -- Metadata
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Workflow Task History/Audit Trail
CREATE TABLE IF NOT EXISTS workflow_task_history (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  
  from_status TEXT,
  to_status TEXT,
  action TEXT NOT NULL,
  
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL,
  actor_name TEXT,
  actor_role TEXT,
  
  approval_level INTEGER,
  comment TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Workflow Task Approvers Configuration
CREATE TABLE IF NOT EXISTS workflow_task_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  
  approver_role TEXT NOT NULL,
  approval_level INTEGER NOT NULL,
  
  can_override BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, user_type, approver_role)
);

-- 4. Workflow Task Comments
CREATE TABLE IF NOT EXISTS workflow_task_comments (
  id BIGSERIAL PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL,
  user_name TEXT NOT NULL,
  
  comment TEXT NOT NULL,
  comment_type TEXT DEFAULT 'message',
  is_internal BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Workflow Task Attachments
CREATE TABLE IF NOT EXISTS workflow_task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  
  uploaded_by UUID NOT NULL,
  uploaded_by_type TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_creator ON workflow_tasks(creator_id, creator_type);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_approver ON workflow_tasks(approver_id, approver_type);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_created_at ON workflow_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_task_history_task_id ON workflow_task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_task_history_created_at ON workflow_task_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_task_approvers_user ON workflow_task_approvers(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_workflow_task_approvers_role ON workflow_task_approvers(approver_role);
CREATE INDEX IF NOT EXISTS idx_workflow_task_comments_task_id ON workflow_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_task_attachments_task_id ON workflow_task_attachments(task_id);

-- 7. Triggers
CREATE OR REPLACE FUNCTION update_workflow_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workflow_tasks_updated_at_trigger ON workflow_tasks;
CREATE TRIGGER update_workflow_tasks_updated_at_trigger 
  BEFORE UPDATE ON workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION update_workflow_tasks_updated_at();

DROP TRIGGER IF EXISTS update_workflow_task_approvers_updated_at_trigger ON workflow_task_approvers;
CREATE TRIGGER update_workflow_task_approvers_updated_at_trigger 
  BEFORE UPDATE ON workflow_task_approvers
  FOR EACH ROW EXECUTE FUNCTION update_workflow_tasks_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Task Workflow System tables created successfully!';
  RAISE NOTICE 'Tables: workflow_tasks, workflow_task_history, workflow_task_approvers, workflow_task_comments, workflow_task_attachments';
END $$;
