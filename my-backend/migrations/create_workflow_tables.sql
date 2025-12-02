-- =====================================================
-- BISMAN ERP - WORKFLOW-DRIVEN CHAT SYSTEM
-- Database Tables for Dynamic UI Navigation & RBAC
-- =====================================================

-- 1. WORKFLOWS - Main workflow table (one workflow = one user task)
CREATE TABLE IF NOT EXISTS workflows (
  id              SERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,           -- machine id e.g. "profile_edit"
  module          TEXT NOT NULL,                  -- "HR", "Attendance", "Finance", "Inventory", "Sales"
  title           TEXT NOT NULL,                  -- human-readable title
  description     TEXT,                           -- detailed help text
  ui_path         TEXT,                           -- canonical UI hint: "Profile → Edit"
  ui_path_mobile  TEXT,                           -- mobile-specific path
  ui_steps        JSONB DEFAULT '[]'::jsonb,      -- ordered step objects [{step:1, action:"click", target:"profile_photo"}, ...]
  required_roles  JSONB DEFAULT '[]'::jsonb,      -- allowed roles array ["HR_ADMIN","EMPLOYEE"]
  required_permissions JSONB DEFAULT '[]'::jsonb, -- permission keys required
  frontend_route  TEXT,                           -- Next.js route e.g. "/profile/edit"
  can_view_expr   TEXT,                           -- optional SQL expression for row-level visibility
  examples        JSONB DEFAULT '[]'::jsonb,      -- sample Q&A [{q:"...", a:"..."}]
  tags            TEXT[] DEFAULT '{}',            -- ["settings","profile","navigation"]
  keywords        TEXT[] DEFAULT '{}',            -- search keywords for NLP matching
  priority        INTEGER DEFAULT 50,             -- higher = more relevant in search
  is_active       BOOLEAN DEFAULT true,
  version         INTEGER DEFAULT 1,
  screenshot_url  TEXT,                           -- optional help screenshot
  video_url       TEXT,                           -- optional help video
  created_by      INTEGER,
  updated_by      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORKFLOW_ROLE_MAP - Explicit many-to-many for role access
CREATE TABLE IF NOT EXISTS workflow_role_map (
  id          SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
  role_id     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, role_id)
);

-- 3. PERMISSION_KEYS - Fine-grained permission flags
CREATE TABLE IF NOT EXISTS permission_keys (
  permission_key TEXT PRIMARY KEY,
  module         TEXT,
  description    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. WORKFLOW_PERMISSION_MAP - Map workflows to permission keys
CREATE TABLE IF NOT EXISTS workflow_permission_map (
  id             SERIAL PRIMARY KEY,
  workflow_id    INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
  permission_key TEXT REFERENCES permission_keys(permission_key) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, permission_key)
);

-- 5. WORKFLOW_AUDIT - Logs when chat uses workflow for compliance
CREATE TABLE IF NOT EXISTS workflow_audit (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER,
  workflow_id INTEGER REFERENCES workflows(id),
  user_role   TEXT,
  query       TEXT,                               -- original user query
  resolved    BOOLEAN DEFAULT true,
  response    TEXT,                               -- response given
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WORKFLOW_FEEDBACK - User feedback on workflow answers
CREATE TABLE IF NOT EXISTS workflow_feedback (
  id          SERIAL PRIMARY KEY,
  workflow_id INTEGER REFERENCES workflows(id),
  user_id     INTEGER,
  helpful     BOOLEAN,
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workflows_module ON workflows(module);
CREATE INDEX IF NOT EXISTS idx_workflows_slug ON workflows(slug);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_tags ON workflows USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_workflows_keywords ON workflows USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_workflow_role_map_role ON workflow_role_map(role_id);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_user ON workflow_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_workflow ON workflow_audit(workflow_id);

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_workflow ON workflows;
CREATE TRIGGER trigger_update_workflow
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_timestamp();

-- =====================================================
-- INSERT COMMON PERMISSION KEYS
-- =====================================================
INSERT INTO permission_keys (permission_key, module, description) VALUES
('VIEW_PROFILE', 'GENERAL', 'View own profile'),
('EDIT_PROFILE', 'GENERAL', 'Edit own profile'),
('VIEW_ATTENDANCE', 'HR', 'View own attendance'),
('EDIT_ATTENDANCE', 'HR', 'Request attendance correction'),
('VIEW_LEAVE', 'HR', 'View own leave balance'),
('APPLY_LEAVE', 'HR', 'Apply for leave'),
('APPROVE_LEAVE', 'HR', 'Approve team leave requests'),
('VIEW_PAYROLL', 'HR', 'View own salary/payslip'),
('VIEW_TEAM_PAYROLL', 'HR', 'View team payroll (HR Admin)'),
('VIEW_TASKS', 'TASKS', 'View assigned tasks'),
('CREATE_TASK', 'TASKS', 'Create new tasks'),
('APPROVE_TASK', 'TASKS', 'Approve task completion'),
('VIEW_INVENTORY', 'INVENTORY', 'View stock levels'),
('MANAGE_INVENTORY', 'INVENTORY', 'Add/Edit stock'),
('CREATE_GRN', 'INVENTORY', 'Create goods receipt'),
('CREATE_PO', 'PURCHASE', 'Create purchase orders'),
('APPROVE_PO', 'PURCHASE', 'Approve purchase orders'),
('VIEW_SALES', 'SALES', 'View sales data'),
('CREATE_INVOICE', 'SALES', 'Create invoices'),
('CREATE_QUOTATION', 'SALES', 'Create quotations'),
('VIEW_FINANCE', 'FINANCE', 'View financial data'),
('CREATE_VOUCHER', 'FINANCE', 'Create payment/receipt vouchers'),
('VIEW_REPORTS', 'REPORTS', 'View reports'),
('EXPORT_REPORTS', 'REPORTS', 'Export reports'),
('MANAGE_USERS', 'ADMIN', 'Manage users'),
('MANAGE_ROLES', 'ADMIN', 'Manage roles and permissions'),
('SYSTEM_CONFIG', 'ADMIN', 'System configuration')
ON CONFLICT (permission_key) DO NOTHING;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Workflow tables created successfully' as result;
