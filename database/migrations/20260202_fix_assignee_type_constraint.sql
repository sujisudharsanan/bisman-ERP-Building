-- Migration: Fix admin_page_assignments assignee_type constraint
-- Date: 2026-02-02
-- Description: Expand the assignee_type check constraint to include all role types

-- Drop the old restrictive constraint
ALTER TABLE admin_page_assignments 
DROP CONSTRAINT IF EXISTS admin_page_assignments_assignee_type_check;

-- Create new constraint with all role types
ALTER TABLE admin_page_assignments 
ADD CONSTRAINT admin_page_assignments_assignee_type_check 
CHECK (assignee_type IN (
  'SUPER_ADMIN', 'CLIENT_ADMIN', 'ADMIN', 'USER',
  'ACCOUNTS', 'ACCOUNTS_PAYABLE', 'ADMIN_OPS', 'BANKER', 'BASE_USER',
  'CEO', 'CFO', 'COMPLIANCE', 'COO', 'CTO', 'DEMO_USER',
  'FINANCE_CONTROLLER', 'HR_MANAGER', 'HUB_INCHARGE', 'IT_ADMIN',
  'LEGAL', 'MANAGER', 'OPERATIONS_MANAGER', 'PROCUREMENT_OFFICER',
  'STAFF', 'STORE_INCHARGE', 'SYSTEM_ADMIN', 'TREASURY',
  'ENTERPRISE_ADMIN', 'QUALITY_MANAGER', 'WAREHOUSE_MANAGER', 
  'BRANCH_MANAGER', 'COMPLIANCE_OFFICER', 'HR'
));
