-- BISMAN ERP - Railway Seed Data
-- Run: psql "$RAILWAY_URL" -f railway-seed-data.sql

BEGIN;

-- =========================================================================
-- MODULES
-- =========================================================================
INSERT INTO modules_master (module_code, display_name, description, icon, base_route, sort_order, is_active, is_hidden, color_code, layout_group, product_type)
VALUES 
  ('SYSTEM', 'System Administration', 'System Administration module', 'Shield', '/system', 1, true, false, '#3B82F6', 'admin', 'all'),
  ('FINANCE', 'Finance & Accounting', 'Finance & Accounting module', 'DollarSign', '/finance', 2, true, false, '#10B981', 'common', 'all'),
  ('PROCUREMENT', 'Procurement', 'Procurement module', 'ShoppingCart', '/procurement', 3, true, false, '#8B5CF6', 'common', 'all'),
  ('OPERATIONS', 'Operations', 'Operations module', 'Package', '/operations', 4, true, false, '#F59E0B', 'common', 'all'),
  ('COMPLIANCE', 'Compliance & Legal', 'Compliance & Legal module', 'Scale', '/compliance', 5, true, false, '#EF4444', 'common', 'all'),
  ('HR', 'Human Resources', 'Human Resources module', 'Users', '/hr', 6, true, false, '#14B8A6', 'common', 'all'),
  ('BILLING', 'Billing & Subscription', 'Billing & Subscription module', 'CreditCard', '/billing', 7, true, false, '#6366F1', 'common', 'all'),
  ('REPORTS', 'Reports', 'Reports module', 'BarChart3', '/reports', 8, true, false, '#EC4899', 'common', 'all'),
  ('GOVERNANCE', 'Governance', 'Governance module', 'Shield', '/governance', 0, true, false, '#8B5CF6', 'admin', 'all'),
  ('INTERNAL', 'Internal Operations', 'Internal Operations module', 'Shield', '/internal', -1, true, true, '#F43F5E', 'internal', 'all'),
  ('SUPER_ADMIN', 'Super Admin', 'Super Admin module', 'Shield', '/super-admin', -2, true, false, '#6366F1', 'super-admin', 'all'),
  ('ENTERPRISE_ADMIN', 'Enterprise Admin', 'Enterprise Admin module', 'Building', '/enterprise-admin', -3, true, false, '#7C3AED', 'enterprise-admin', 'all'),
  ('ADMIN', 'Admin Console', 'Admin Console module', 'Shield', '/admin', 9, true, false, '#64748B', 'admin', 'all'),
  ('QA', 'QA & Testing', 'QA & Testing module', 'ClipboardCheck', '/qa', 10, true, true, '#06B6D4', 'internal', 'all'),
  ('COMMON', 'Common', 'Common module', 'User', '/common', 999, true, false, '#6B7280', 'common', 'all'),
  ('DASHBOARD', 'Dashboard', 'Dashboard module', 'LayoutDashboard', '/dashboard', 0, true, false, '#3B82F6', 'common', 'all'),
  ('SUBSCRIPTIONS', 'Subscriptions', 'Subscriptions module', 'CreditCard', '/super-admin/subscriptions', 3, true, false, '#F59E0B', 'super-admin', 'all'),
  ('ONBOARDING', 'Onboarding', 'Onboarding module', 'UserPlus', '/onboarding', 998, true, false, '#10B981', 'common', 'all'),
  ('PUBLIC', 'Public', 'Public module', 'Globe', '/', 1000, true, false, '#6B7280', 'public', 'all'),
  ('AUTH', 'Authentication', 'Authentication module', 'Lock', '/auth', 1001, true, false, '#EF4444', 'auth', 'all')
ON CONFLICT (module_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  icon = EXCLUDED.icon,
  base_route = EXCLUDED.base_route,
  sort_order = EXCLUDED.sort_order,
  is_hidden = EXCLUDED.is_hidden,
  color_code = EXCLUDED.color_code,
  layout_group = EXCLUDED.layout_group;

-- =========================================================================
-- PAGES - Core SSOT pages
-- =========================================================================
INSERT INTO pages_master (page_code, display_name, route, module_id, icon, sort_order, is_active, is_public)
SELECT page_code, display_name, route, m.id, icon, sort_order, true, is_public
FROM (VALUES
  -- ENTERPRISE ADMIN
  ('ENTERPRISE_ADMIN_DASHBOARD', 'Enterprise Dashboard', '/enterprise-admin/dashboard', 'ENTERPRISE_ADMIN', 'LayoutDashboard', 1, false),
  ('ENTERPRISE_ADMIN_MODULES', 'Module Management', '/enterprise-admin/modules', 'ENTERPRISE_ADMIN', 'Layers', 2, false),
  ('ENTERPRISE_ADMIN_USERS', 'User Management', '/enterprise-admin/users', 'ENTERPRISE_ADMIN', 'Users', 3, false),
  ('ENTERPRISE_ADMIN_HUBS', 'Hub Management', '/enterprise-admin/hubs', 'ENTERPRISE_ADMIN', 'Building', 4, false),
  ('ENTERPRISE_ADMIN_SETTINGS', 'Enterprise Settings', '/enterprise-admin/settings', 'ENTERPRISE_ADMIN', 'Settings', 5, false),
  ('ENTERPRISE_ADMIN_BILLING', 'Billing & Subscription', '/enterprise-admin/billing', 'ENTERPRISE_ADMIN', 'CreditCard', 6, false),
  
  -- SUPER ADMIN
  ('SUPER_ADMIN_DASHBOARD', 'Super Admin Dashboard', '/super-admin/dashboard', 'SUPER_ADMIN', 'LayoutDashboard', 1, false),
  ('SUPER_ADMIN_ENTERPRISES', 'Enterprises', '/super-admin/enterprises', 'SUPER_ADMIN', 'Building2', 2, false),
  ('SUPER_ADMIN_USERS', 'All Users', '/super-admin/users', 'SUPER_ADMIN', 'Users', 3, false),
  ('SUPER_ADMIN_SETTINGS', 'Settings', '/super-admin/settings', 'SUPER_ADMIN', 'Settings', 4, false),
  ('SUPER_ADMIN_SUBSCRIPTIONS', 'Subscriptions', '/super-admin/subscriptions', 'SUBSCRIPTIONS', 'CreditCard', 1, false),
  ('SUPER_ADMIN_SUBSCRIPTION_PLANS', 'Subscription Plans', '/super-admin/subscriptions/plans', 'SUBSCRIPTIONS', 'Package', 2, false),
  
  -- DASHBOARD
  ('DASHBOARD_MAIN', 'Dashboard', '/dashboard', 'DASHBOARD', 'LayoutDashboard', 1, false),
  
  -- FINANCE
  ('FINANCE_DASHBOARD', 'Finance Dashboard', '/finance/dashboard', 'FINANCE', 'LayoutDashboard', 1, false),
  ('FINANCE_LEDGER', 'General Ledger', '/finance/ledger', 'FINANCE', 'Book', 2, false),
  ('FINANCE_CASH_FLOW', 'Cash Flow', '/finance/cash-flow', 'FINANCE', 'TrendingUp', 3, false),
  ('FINANCE_PAYMENTS', 'Payments', '/finance/payments', 'FINANCE', 'Wallet', 4, false),
  ('FINANCE_INVOICES', 'Invoices', '/finance/invoices', 'FINANCE', 'FileText', 5, false),
  ('FINANCE_REPORTS', 'Finance Reports', '/finance/reports', 'FINANCE', 'BarChart', 6, false),
  
  -- PROCUREMENT
  ('PROCUREMENT_DASHBOARD', 'Procurement Dashboard', '/procurement/dashboard', 'PROCUREMENT', 'LayoutDashboard', 1, false),
  ('PROCUREMENT_ORDERS', 'Purchase Orders', '/procurement/orders', 'PROCUREMENT', 'ShoppingCart', 2, false),
  ('PROCUREMENT_VENDORS', 'Vendors', '/procurement/vendors', 'PROCUREMENT', 'Users', 3, false),
  
  -- OPERATIONS
  ('OPERATIONS_DASHBOARD', 'Operations Dashboard', '/operations/dashboard', 'OPERATIONS', 'LayoutDashboard', 1, false),
  ('OPERATIONS_INVENTORY', 'Inventory', '/operations/inventory', 'OPERATIONS', 'Package', 2, false),
  ('OPERATIONS_DISPATCH', 'Dispatch', '/operations/dispatch', 'OPERATIONS', 'Truck', 3, false),
  ('OPERATIONS_DELIVERY', 'Delivery', '/operations/delivery', 'OPERATIONS', 'MapPin', 4, false),
  ('OPERATIONS_TRIPS', 'Trip Management', '/operations/trips', 'OPERATIONS', 'Route', 5, false),
  
  -- COMPLIANCE
  ('COMPLIANCE_DASHBOARD', 'Compliance Dashboard', '/compliance/dashboard', 'COMPLIANCE', 'LayoutDashboard', 1, false),
  ('COMPLIANCE_DOCUMENTS', 'Documents', '/compliance/documents', 'COMPLIANCE', 'FileText', 2, false),
  
  -- HR
  ('HR_DASHBOARD', 'HR Dashboard', '/hr/dashboard', 'HR', 'LayoutDashboard', 1, false),
  ('HR_EMPLOYEES', 'Employees', '/hr/employees', 'HR', 'Users', 2, false),
  ('HR_ATTENDANCE', 'Attendance', '/hr/attendance', 'HR', 'Clock', 3, false),
  ('HR_PAYROLL', 'Payroll', '/hr/payroll', 'HR', 'DollarSign', 4, false),
  
  -- BILLING
  ('BILLING_DASHBOARD', 'Billing Dashboard', '/billing/dashboard', 'BILLING', 'LayoutDashboard', 1, false),
  ('BILLING_INVOICES', 'Invoices', '/billing/invoices', 'BILLING', 'FileText', 2, false),
  ('BILLING_CUSTOMERS', 'Customers', '/billing/customers', 'BILLING', 'Users', 3, false),
  
  -- REPORTS
  ('REPORTS_DASHBOARD', 'Reports Dashboard', '/reports', 'REPORTS', 'LayoutDashboard', 1, false),
  
  -- AUTH (public)
  ('LOGIN', 'Login', '/login', 'AUTH', 'LogIn', 1, true),
  ('FORGOT_PASSWORD', 'Forgot Password', '/forgot-password', 'AUTH', 'Key', 2, true),
  ('RESET_PASSWORD', 'Reset Password', '/reset-password', 'AUTH', 'RefreshCw', 3, true),
  ('REGISTER', 'Register', '/register', 'AUTH', 'UserPlus', 4, true),
  
  -- ADMIN
  ('ADMIN_DASHBOARD', 'Admin Dashboard', '/admin/dashboard', 'ADMIN', 'LayoutDashboard', 1, false),
  ('ADMIN_USERS', 'User Management', '/admin/users', 'ADMIN', 'Users', 2, false),
  ('ADMIN_ROLES', 'Role Management', '/admin/roles', 'ADMIN', 'Shield', 3, false),
  ('ADMIN_SETTINGS', 'Settings', '/admin/settings', 'ADMIN', 'Settings', 4, false),
  
  -- COMMON
  ('PROFILE', 'Profile', '/profile', 'COMMON', 'User', 1, false),
  ('SETTINGS', 'Settings', '/settings', 'COMMON', 'Settings', 2, false),
  ('NOTIFICATIONS', 'Notifications', '/notifications', 'COMMON', 'Bell', 3, false)
) AS t(page_code, display_name, route, module_code, icon, sort_order, is_public)
JOIN modules_master m ON m.module_code = t.module_code
ON CONFLICT (page_code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  route = EXCLUDED.route,
  module_id = EXCLUDED.module_id,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_public = EXCLUDED.is_public;

-- =========================================================================
-- ROLE PAGE ACCESS - Core role assignments
-- =========================================================================

-- SUPER_ADMIN access to Super Admin pages
INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
SELECT 'SUPER_ADMIN', p.id, true, true, true, true
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE m.module_code IN ('SUPER_ADMIN', 'SUBSCRIPTIONS', 'SYSTEM', 'DASHBOARD', 'COMMON')
ON CONFLICT (role_code, page_id) DO NOTHING;

-- ENTERPRISE_ADMIN access to Enterprise Admin pages
INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
SELECT 'ENTERPRISE_ADMIN', p.id, true, true, true, true
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE m.module_code IN ('ENTERPRISE_ADMIN', 'ADMIN', 'DASHBOARD', 'COMMON', 'FINANCE', 'PROCUREMENT', 'OPERATIONS', 'HR', 'BILLING', 'REPORTS', 'COMPLIANCE')
ON CONFLICT (role_code, page_id) DO NOTHING;

-- ACCOUNTANT access to Finance pages
INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
SELECT 'ACCOUNTANT', p.id, true, true, true, false
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE m.module_code IN ('FINANCE', 'DASHBOARD', 'COMMON', 'REPORTS')
ON CONFLICT (role_code, page_id) DO NOTHING;

-- CHIEF_ACCOUNTANT access
INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
SELECT 'CHIEF_ACCOUNTANT', p.id, true, true, true, true
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE m.module_code IN ('FINANCE', 'DASHBOARD', 'COMMON', 'REPORTS', 'BILLING')
ON CONFLICT (role_code, page_id) DO NOTHING;

-- HUB_INCHARGE access
INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
SELECT 'HUB_INCHARGE', p.id, true, true, true, false
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE m.module_code IN ('OPERATIONS', 'DASHBOARD', 'COMMON', 'PROCUREMENT')
ON CONFLICT (role_code, page_id) DO NOTHING;

-- DRIVER access
INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
SELECT 'DRIVER', p.id, true, false, false, false
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE m.module_code IN ('OPERATIONS', 'DASHBOARD', 'COMMON')
ON CONFLICT (role_code, page_id) DO NOTHING;

-- HR_MANAGER access
INSERT INTO role_page_access (role_code, page_id, can_view, can_create, can_edit, can_delete)
SELECT 'HR_MANAGER', p.id, true, true, true, true
FROM pages_master p
JOIN modules_master m ON p.module_id = m.id
WHERE m.module_code IN ('HR', 'DASHBOARD', 'COMMON')
ON CONFLICT (role_code, page_id) DO NOTHING;

COMMIT;

-- =========================================================================
-- VERIFICATION
-- =========================================================================
SELECT '========= RAILWAY SEED COMPLETE =========' AS status;
SELECT 'Modules: ' || COUNT(*)::text FROM modules_master;
SELECT 'Pages: ' || COUNT(*)::text FROM pages_master;
SELECT 'Role Access: ' || COUNT(*)::text FROM role_page_access;
SELECT 'Distinct Roles: ' || COUNT(DISTINCT role_code)::text FROM role_page_access;
