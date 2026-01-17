#!/usr/bin/env node
/**
 * ============================================================================
 * BISMAN ERP - Seed Modules & Pages from page-registry.ts
 * ============================================================================
 * 
 * This script migrates data from the frontend page-registry.ts to DB tables:
 * - modules_master
 * - pages_master  
 * - role_page_access
 * 
 * Run: node scripts/seed-modules-pages.js
 * ============================================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// ============================================================================
// MODULE DEFINITIONS (from page-registry.ts MODULES)
// ============================================================================

const MODULES = [
  { module_code: 'SYSTEM', display_name: 'System Administration', icon: 'Shield', base_route: '/system', sort_order: 1, color_code: '#3B82F6', layout_group: 'admin' },
  { module_code: 'FINANCE', display_name: 'Finance & Accounting', icon: 'DollarSign', base_route: '/finance', sort_order: 2, color_code: '#10B981', layout_group: 'common' },
  { module_code: 'PROCUREMENT', display_name: 'Procurement', icon: 'ShoppingCart', base_route: '/procurement', sort_order: 3, color_code: '#8B5CF6', layout_group: 'common' },
  { module_code: 'OPERATIONS', display_name: 'Operations', icon: 'Package', base_route: '/operations', sort_order: 4, color_code: '#F59E0B', layout_group: 'common' },
  { module_code: 'COMPLIANCE', display_name: 'Compliance & Legal', icon: 'Scale', base_route: '/compliance', sort_order: 5, color_code: '#EF4444', layout_group: 'common' },
  { module_code: 'HR', display_name: 'Human Resources', icon: 'Users', base_route: '/hr', sort_order: 6, color_code: '#14B8A6', layout_group: 'common' },
  { module_code: 'BILLING', display_name: 'Billing & Subscription', icon: 'CreditCard', base_route: '/billing', sort_order: 7, color_code: '#6366F1', layout_group: 'common' },
  { module_code: 'REPORTS', display_name: 'Reports', icon: 'BarChart3', base_route: '/reports', sort_order: 8, color_code: '#EC4899', layout_group: 'common' },
  { module_code: 'GOVERNANCE', display_name: 'Governance', icon: 'Shield', base_route: '/governance', sort_order: 0, color_code: '#8B5CF6', layout_group: 'admin' },
  { module_code: 'INTERNAL', display_name: 'Internal Operations', icon: 'Shield', base_route: '/internal', sort_order: -1, color_code: '#F43F5E', layout_group: 'internal', is_hidden: true },
  { module_code: 'SUPER_ADMIN', display_name: 'Super Admin', icon: 'Shield', base_route: '/super-admin', sort_order: -2, color_code: '#6366F1', layout_group: 'super-admin' },
  { module_code: 'ENTERPRISE_ADMIN', display_name: 'Enterprise Admin', icon: 'Building', base_route: '/enterprise-admin', sort_order: -3, color_code: '#7C3AED', layout_group: 'enterprise-admin' },
  { module_code: 'ADMIN', display_name: 'Admin Console', icon: 'Shield', base_route: '/admin', sort_order: 9, color_code: '#64748B', layout_group: 'admin' },
  { module_code: 'QA', display_name: 'QA & Testing', icon: 'ClipboardCheck', base_route: '/qa', sort_order: 10, color_code: '#06B6D4', layout_group: 'internal', is_hidden: true },
  { module_code: 'COMMON', display_name: 'Common', icon: 'User', base_route: '/common', sort_order: 999, color_code: '#6B7280', layout_group: 'common' },
  { module_code: 'DASHBOARD', display_name: 'Dashboard', icon: 'LayoutDashboard', base_route: '/dashboard', sort_order: 0, color_code: '#3B82F6', layout_group: 'common' },
  { module_code: 'SUBSCRIPTIONS', display_name: 'Subscriptions', icon: 'CreditCard', base_route: '/super-admin/subscriptions', sort_order: 3, color_code: '#F59E0B', layout_group: 'super-admin' },
];

// ============================================================================
// PAGE DEFINITIONS (extracted from page-registry.ts)
// ============================================================================

const PAGES = [
  // ENTERPRISE ADMIN
  { page_code: 'ENTERPRISE_ADMIN_DASHBOARD', display_name: 'Enterprise Dashboard', route: '/enterprise-admin/dashboard', module_code: 'ENTERPRISE_ADMIN', icon: 'LayoutDashboard', sort_order: 1, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_MODULES', display_name: 'Module Management', route: '/enterprise-admin/modules', module_code: 'ENTERPRISE_ADMIN', icon: 'Layers', sort_order: 2, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_ROLES', display_name: 'Role Management', route: '/enterprise-admin/roles', module_code: 'ENTERPRISE_ADMIN', icon: 'Shield', sort_order: 3, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_SUPER_ADMINS', display_name: 'Super Admins', route: '/enterprise-admin/super-admins', module_code: 'ENTERPRISE_ADMIN', icon: 'Users', sort_order: 4, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_LOGS', display_name: 'System Logs', route: '/enterprise-admin/logs', module_code: 'ENTERPRISE_ADMIN', icon: 'ScrollText', sort_order: 5, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_ACTIVITY_LOGS', display_name: 'Activity Logs', route: '/enterprise-admin/activity-logs', module_code: 'ENTERPRISE_ADMIN', icon: 'Activity', sort_order: 6, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_BILLING', display_name: 'Billing Management', route: '/enterprise-admin/billing', module_code: 'ENTERPRISE_ADMIN', icon: 'CreditCard', sort_order: 7, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_SETTINGS', display_name: 'Enterprise Settings', route: '/enterprise-admin/settings', module_code: 'ENTERPRISE_ADMIN', icon: 'Settings', sort_order: 8, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_MONITORING', display_name: 'System Monitoring', route: '/enterprise-admin/monitoring', module_code: 'ENTERPRISE_ADMIN', icon: 'Monitor', sort_order: 9, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_PAGE_GOVERNANCE', display_name: 'Page Governance', route: '/enterprise-admin/page-governance', module_code: 'ENTERPRISE_ADMIN', icon: 'Shield', sort_order: 10, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_INTEGRATIONS', display_name: 'Integrations', route: '/enterprise-admin/integrations', module_code: 'ENTERPRISE_ADMIN', icon: 'Package', sort_order: 11, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_SUPPORT', display_name: 'Support', route: '/enterprise-admin/support', module_code: 'ENTERPRISE_ADMIN', icon: 'HelpCircle', sort_order: 12, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_LIVE_DASHBOARD', display_name: 'Live Dashboard', route: '/enterprise-admin/live-dashboard', module_code: 'ENTERPRISE_ADMIN', icon: 'Activity', sort_order: 13, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_RBAC_SECURITY', display_name: 'RBAC Security', route: '/enterprise-admin/rbac-security', module_code: 'ENTERPRISE_ADMIN', icon: 'Lock', sort_order: 14, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_SECURITY_OPS', display_name: 'Security Operations', route: '/enterprise-admin/security-operations', module_code: 'ENTERPRISE_ADMIN', icon: 'Shield', sort_order: 15, roles: ['ENTERPRISE_ADMIN'] },
  { page_code: 'ENTERPRISE_ADMIN_SUBSCRIPTIONS', display_name: 'Subscriptions', route: '/enterprise-admin/subscriptions', module_code: 'ENTERPRISE_ADMIN', icon: 'CreditCard', sort_order: 16, roles: ['ENTERPRISE_ADMIN'] },

  // SUPER ADMIN
  { page_code: 'SUPER_ADMIN_DASHBOARD', display_name: 'Dashboard', route: '/super-admin', module_code: 'SUPER_ADMIN', icon: 'LayoutDashboard', sort_order: 0, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_CLIENT_MANAGEMENT', display_name: 'Client Management', route: '/super-admin/system/user-management', module_code: 'SUPER_ADMIN', icon: 'Users', sort_order: 1, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_SECURITY', display_name: 'Security Management', route: '/super-admin/security', module_code: 'SUPER_ADMIN', icon: 'Shield', sort_order: 2, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_SUBSCRIPTIONS', display_name: 'Subscriptions', route: '/super-admin/subscriptions', module_code: 'SUBSCRIPTIONS', icon: 'CreditCard', sort_order: 3, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_PERMISSION_MANAGER', display_name: 'Permission Manager', route: '/super-admin/system/permission-manager', module_code: 'SUPER_ADMIN', icon: 'Key', sort_order: 4, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_ROLES_USERS', display_name: 'Modules & Roles', route: '/super-admin/system/roles-users-report', module_code: 'SUPER_ADMIN', icon: 'LayoutGrid', sort_order: 5, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_BACKUP_RESTORE', display_name: 'Backup & Restore', route: '/super-admin/system/backup-restore', module_code: 'SUPER_ADMIN', icon: 'Database', sort_order: 6, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_SYSTEM_HEALTH', display_name: 'System Health', route: '/super-admin/system/system-health-dashboard', module_code: 'SUPER_ADMIN', icon: 'Activity', sort_order: 7, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_INTEGRATION_SETTINGS', display_name: 'Integration Settings', route: '/super-admin/system/integration-settings', module_code: 'SUPER_ADMIN', icon: 'Route', sort_order: 8, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_DEPLOYMENT_TOOLS', display_name: 'Deployment Tools', route: '/super-admin/system/deployment-tools', module_code: 'SUPER_ADMIN', icon: 'Upload', sort_order: 9, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_FALLBACK_RECOVERY', display_name: 'Fallback & Recovery', route: '/super-admin/system/fallback-recovery', module_code: 'SUPER_ADMIN', icon: 'AlertTriangle', sort_order: 10, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUPER_ADMIN_DECISION_LOAD', display_name: 'Decision Load', route: '/super-admin/decision-load', module_code: 'SUPER_ADMIN', icon: 'TrendingUp', sort_order: 11, roles: ['SUPER_ADMIN'] },

  // SUBSCRIPTIONS (Sub-pages)
  { page_code: 'SUBSCRIPTION_PLANS', display_name: 'Plan Management', route: '/super-admin/subscriptions/plans', module_code: 'SUBSCRIPTIONS', icon: 'Package', sort_order: 1, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUBSCRIPTION_TENANTS', display_name: 'Tenant Subscriptions', route: '/super-admin/subscriptions/tenants', module_code: 'SUBSCRIPTIONS', icon: 'Building2', sort_order: 2, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUBSCRIPTION_BILLING', display_name: 'Billing Overrides', route: '/super-admin/subscriptions/billing', module_code: 'SUBSCRIPTIONS', icon: 'DollarSign', sort_order: 3, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUBSCRIPTION_AUDIT', display_name: 'Subscription Audit', route: '/super-admin/subscriptions/audit', module_code: 'SUBSCRIPTIONS', icon: 'FileText', sort_order: 4, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUBSCRIPTION_COUPONS', display_name: 'Coupons', route: '/super-admin/subscriptions/coupons', module_code: 'SUBSCRIPTIONS', icon: 'Ticket', sort_order: 5, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },
  { page_code: 'SUBSCRIPTION_MICRO_UNLOCK', display_name: 'Micro Unlock', route: '/super-admin/subscriptions/micro-unlock', module_code: 'SUBSCRIPTIONS', icon: 'Unlock', sort_order: 6, show_in_sidebar: false, roles: ['SUPER_ADMIN'] },

  // SYSTEM (Admin)
  { page_code: 'SYSTEM_USER_MANAGEMENT', display_name: 'Client Management', route: '/system/user-management', module_code: 'SYSTEM', icon: 'Users', sort_order: 1, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'] },
  { page_code: 'SYSTEM_USER_CREATION', display_name: 'Create New User', route: '/system/user-creation', module_code: 'SYSTEM', icon: 'UserPlus', sort_order: 2, show_in_sidebar: false, roles: ['SYSTEM_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'] },
  { page_code: 'SYSTEM_PERMISSION_MANAGER', display_name: 'Permission Manager', route: '/system/permission-manager', module_code: 'SYSTEM', icon: 'Key', sort_order: 3, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  { page_code: 'SYSTEM_ROLES_USERS_REPORT', display_name: 'Modules & Roles', route: '/system/roles-users-report', module_code: 'SYSTEM', icon: 'FileText', sort_order: 4, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  { page_code: 'SYSTEM_PAGES_ROLES_REPORT', display_name: 'Pages & Roles Report', route: '/system/pages-roles-report', module_code: 'SYSTEM', icon: 'FileText', sort_order: 5, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  { page_code: 'SYSTEM_ROLE_ACCESS_EXPLORER', display_name: 'Role & Access Explorer', route: '/system/role-access-explorer', module_code: 'SYSTEM', icon: 'FileText', sort_order: 6, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  { page_code: 'SYSTEM_BACKUP_RESTORE', display_name: 'Backup & Restore', route: '/system/backup-restore', module_code: 'SYSTEM', icon: 'Database', sort_order: 7, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  { page_code: 'SYSTEM_HEALTH', display_name: 'System Health', route: '/system/system-health-dashboard', module_code: 'SYSTEM', icon: 'Activity', sort_order: 8, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'IT_ADMIN'] },
  { page_code: 'SYSTEM_INTEGRATION_SETTINGS', display_name: 'Integration Settings', route: '/system/integration-settings', module_code: 'SYSTEM', icon: 'Route', sort_order: 9, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },
  { page_code: 'SYSTEM_SERVER_LOGS', display_name: 'Server Logs', route: '/system/server-logs', module_code: 'SYSTEM', icon: 'Server', sort_order: 10, roles: ['SUPER_ADMIN', 'SYSTEM_ADMIN'] },

  // ADMIN MODULE
  { page_code: 'ADMIN_DASHBOARD', display_name: 'Admin Dashboard', route: '/admin', module_code: 'ADMIN', icon: 'LayoutDashboard', sort_order: 0, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_CLIENTS', display_name: 'Clients', route: '/admin/clients', module_code: 'ADMIN', icon: 'Building', sort_order: 1, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_PERMISSIONS', display_name: 'Permissions', route: '/admin/permissions', module_code: 'ADMIN', icon: 'Shield', sort_order: 2, roles: ['ADMIN'] },
  { page_code: 'ADMIN_SETTINGS', display_name: 'Settings', route: '/admin/settings', module_code: 'ADMIN', icon: 'Settings', sort_order: 3, roles: ['ADMIN'] },
  { page_code: 'ADMIN_USAGE', display_name: 'Usage', route: '/admin/usage', module_code: 'ADMIN', icon: 'BarChart3', sort_order: 4, roles: ['ADMIN'] },
  { page_code: 'ADMIN_AUDIT', display_name: 'Audit', route: '/admin/audit', module_code: 'ADMIN', icon: 'FileText', sort_order: 5, roles: ['ADMIN'] },
  { page_code: 'ADMIN_BRANCHES', display_name: 'Branches', route: '/admin/branches', module_code: 'ADMIN', icon: 'Building2', sort_order: 6, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'ADMIN_TASK_APPROVALS', display_name: 'Task Approvals', route: '/admin/task-approvals', module_code: 'ADMIN', icon: 'CheckSquare', sort_order: 7, roles: ['ADMIN'] },
  { page_code: 'ADMIN_SYSTEM_FLOW', display_name: 'System Flow', route: '/admin/system-flow', module_code: 'ADMIN', icon: 'Workflow', sort_order: 8, roles: ['ADMIN'] },
  { page_code: 'ADMIN_SUBSCRIPTION', display_name: 'Subscription', route: '/admin/subscription', module_code: 'ADMIN', icon: 'CreditCard', sort_order: 9, roles: ['ADMIN'] },

  // GOVERNANCE
  { page_code: 'GOVERNANCE_SECURITY_OVERVIEW', display_name: 'Security Overview', route: '/governance/security-overview', module_code: 'GOVERNANCE', icon: 'Shield', sort_order: 1, roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'GOVERNANCE_AUDIT_INTEGRITY', display_name: 'Audit Integrity', route: '/governance/audit-integrity', module_code: 'GOVERNANCE', icon: 'FileCheck', sort_order: 2, roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'GOVERNANCE_SECURITY_VIOLATIONS', display_name: 'Security Violations', route: '/governance/security-violations', module_code: 'GOVERNANCE', icon: 'ShieldX', sort_order: 3, roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'] },
  { page_code: 'GOVERNANCE_RBAC_STRUCTURE', display_name: 'RBAC Structure', route: '/governance/rbac-structure', module_code: 'GOVERNANCE', icon: 'Lock', sort_order: 4, roles: ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'] },

  // INTERNAL (BISMAN Staff Only)
  { page_code: 'INTERNAL_TEAMS', display_name: 'Internal Teams', route: '/internal/teams', module_code: 'INTERNAL', icon: 'Users', sort_order: 1, roles: ['BISMAN_FINANCE', 'BISMAN_BILLING', 'BISMAN_SUPPORT', 'BISMAN_ENGINEERING', 'ENTERPRISE_ADMIN'] },
  { page_code: 'INTERNAL_SUPPORT_SESSIONS', display_name: 'Support Sessions', route: '/internal/support-sessions', module_code: 'INTERNAL', icon: 'Headphones', sort_order: 2, roles: ['BISMAN_SUPPORT', 'BISMAN_CUSTOMER_CARE', 'ENTERPRISE_ADMIN'] },
  { page_code: 'INTERNAL_CUSTOMERS', display_name: 'Customer Assistance', route: '/internal/customers', module_code: 'INTERNAL', icon: 'HelpCircle', sort_order: 3, roles: ['BISMAN_SUPPORT', 'BISMAN_CUSTOMER_CARE', 'ENTERPRISE_ADMIN'] },
  { page_code: 'INTERNAL_PLAYBOOKS', display_name: 'Support Playbooks', route: '/internal/playbooks', module_code: 'INTERNAL', icon: 'BookOpen', sort_order: 4, roles: ['BISMAN_FINANCE', 'BISMAN_BILLING', 'BISMAN_SUPPORT', 'BISMAN_ENGINEERING', 'ENTERPRISE_ADMIN'] },

  // FINANCE
  { page_code: 'FINANCE_EXECUTIVE_DASHBOARD', display_name: 'Executive Dashboard', route: '/finance/executive-dashboard', module_code: 'FINANCE', icon: 'BarChart3', sort_order: 1, roles: ['CFO', 'FINANCE_CONTROLLER', 'TREASURY'] },
  { page_code: 'FINANCE_GENERAL_LEDGER', display_name: 'General Ledger', route: '/finance/general-ledger', module_code: 'FINANCE', icon: 'BookOpen', sort_order: 2, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS'] },
  { page_code: 'FINANCE_PAYMENT_APPROVAL_QUEUE', display_name: 'Payment Approval Queue', route: '/finance/payment-approval-queue', module_code: 'FINANCE', icon: 'CheckSquare', sort_order: 3, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'TREASURY', 'BANKER'] },
  { page_code: 'FINANCE_APPROVAL_STRUCTURE', display_name: 'Approval Structure', route: '/finance/approval-structure-overview', module_code: 'FINANCE', icon: 'Workflow', sort_order: 4, roles: ['CFO', 'FINANCE_CONTROLLER'] },
  { page_code: 'FINANCE_ACCOUNTS_PAYABLE', display_name: 'Accounts Payable', route: '/finance/accounts-payable-summary', module_code: 'FINANCE', icon: 'CreditCard', sort_order: 5, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS_PAYABLE'] },
  { page_code: 'FINANCE_ACCOUNTS_RECEIVABLE', display_name: 'Accounts Receivable', route: '/finance/accounts-receivable-summary', module_code: 'FINANCE', icon: 'DollarSign', sort_order: 6, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS'] },

  // OPERATIONS
  { page_code: 'OPERATIONS_INVENTORY', display_name: 'Inventory Management', route: '/operations/inventory-management', module_code: 'OPERATIONS', icon: 'Package', sort_order: 1, roles: ['OPERATIONS_MANAGER', 'STORE_INCHARGE', 'HUB_INCHARGE'] },
  { page_code: 'OPERATIONS_KPI_DASHBOARD', display_name: 'KPI Dashboard', route: '/operations/kpi-dashboard', module_code: 'OPERATIONS', icon: 'TrendingUp', sort_order: 2, roles: ['OPERATIONS_MANAGER', 'CFO', 'CEO'] },

  // COMPLIANCE
  { page_code: 'COMPLIANCE_DASHBOARD', display_name: 'Compliance Dashboard', route: '/compliance/compliance-dashboard', module_code: 'COMPLIANCE', icon: 'Shield', sort_order: 1, roles: ['COMPLIANCE', 'LEGAL', 'CFO'] },
  { page_code: 'COMPLIANCE_LEGAL_CASES', display_name: 'Legal Case Management', route: '/compliance/legal-case-management', module_code: 'COMPLIANCE', icon: 'Gavel', sort_order: 2, roles: ['LEGAL', 'COMPLIANCE'] },

  // HR
  { page_code: 'HR_POLICY', display_name: 'HR Policy', route: '/hr/policy', module_code: 'HR', icon: 'FileText', sort_order: 1, roles: ['HR', 'HR_MANAGER', 'ADMIN'] },

  // REPORTS
  { page_code: 'REPORTS_PAYMENT_SUMMARY', display_name: 'Payment Summary', route: '/reports/payment-summary', module_code: 'REPORTS', icon: 'DollarSign', sort_order: 1, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS'] },
  { page_code: 'REPORTS_SETTLEMENT_AUDIT', display_name: 'Settlement Audit', route: '/reports/settlement-audit', module_code: 'REPORTS', icon: 'FileText', sort_order: 2, roles: ['CFO', 'FINANCE_CONTROLLER', 'AUDITOR'] },

  // BILLING
  { page_code: 'BILLING_DASHBOARD', display_name: 'Billing Dashboard', route: '/billing', module_code: 'BILLING', icon: 'CreditCard', sort_order: 1, roles: ['ADMIN', 'CFO'] },
  { page_code: 'BILLING_INVOICES', display_name: 'Invoices', route: '/billing/invoices', module_code: 'BILLING', icon: 'FileText', sort_order: 2, roles: ['ADMIN', 'CFO', 'ACCOUNTS'] },

  // COMMON (All users)
  { page_code: 'COMMON_TASK_APPROVALS', display_name: 'Task Approvals', route: '/common/task-approvals', module_code: 'COMMON', icon: 'CheckSquare', sort_order: 1, roles: ['ADMIN', 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'OPERATIONS_MANAGER', 'HUB_INCHARGE', 'STORE_INCHARGE'] },
  { page_code: 'COMMON_PAYMENT_REQUEST', display_name: 'Payment Request', route: '/common/payment-request', module_code: 'COMMON', icon: 'CreditCard', sort_order: 2, roles: ['ADMIN', 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'OPERATIONS_MANAGER', 'HUB_INCHARGE'] },
  { page_code: 'COMMON_CALENDAR', display_name: 'Calendar', route: '/common/calendar', module_code: 'COMMON', icon: 'Calendar', sort_order: 3, roles: ['ADMIN', 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'OPERATIONS_MANAGER', 'HUB_INCHARGE', 'STORE_INCHARGE'] },
  { page_code: 'COMMON_NOTIFICATIONS', display_name: 'Notifications', route: '/common/notifications', module_code: 'COMMON', icon: 'Bell', sort_order: 4, roles: ['ADMIN', 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'OPERATIONS_MANAGER', 'HUB_INCHARGE', 'STORE_INCHARGE'] },
  // Removed: COMMON_MESSAGES (use /chat instead)
  { page_code: 'COMMON_ABOUT_ME', display_name: 'About Me', route: '/common/about-me', module_code: 'COMMON', icon: 'User', sort_order: 6, show_in_sidebar: false, roles: ['*'] },
  { page_code: 'COMMON_BANK_ACCOUNTS', display_name: 'Bank Accounts', route: '/common/bank-accounts', module_code: 'COMMON', icon: 'Building', sort_order: 7, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'BANKER'] },
  { page_code: 'COMMON_SECURITY_SETTINGS', display_name: 'Security Settings', route: '/common/security-settings', module_code: 'COMMON', icon: 'Shield', sort_order: 8, show_in_sidebar: false, roles: ['*'] },

  // DASHBOARD
  { page_code: 'DASHBOARD_HOME', display_name: 'Dashboard', route: '/dashboard', module_code: 'DASHBOARD', icon: 'LayoutDashboard', sort_order: 0, roles: ['ADMIN', 'MANAGER', 'STAFF', 'HUB_INCHARGE', 'STORE_INCHARGE', 'OPERATIONS_MANAGER'] },
  { page_code: 'DASHBOARD_REQUESTS', display_name: 'My Requests', route: '/dashboard/requests', module_code: 'DASHBOARD', icon: 'GitPullRequest', sort_order: 1, roles: ['ADMIN', 'MANAGER', 'STAFF', 'HUB_INCHARGE', 'STORE_INCHARGE', 'OPERATIONS_MANAGER'] },
  { page_code: 'DASHBOARD_WORKBENCH', display_name: 'Workbench', route: '/dashboard/workbench', module_code: 'DASHBOARD', icon: 'Briefcase', sort_order: 2, roles: ['ADMIN', 'MANAGER', 'STAFF', 'HUB_INCHARGE', 'STORE_INCHARGE'] },

  // RECONCILIATION
  { page_code: 'RECONCILIATION_DASHBOARD', display_name: 'Bank Reconciliation', route: '/reconciliation', module_code: 'FINANCE', icon: 'Scale', sort_order: 10, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'BANKER'] },
  { page_code: 'RECONCILIATION_UPLOAD', display_name: 'Upload Statement', route: '/reconciliation/upload', module_code: 'FINANCE', icon: 'Upload', sort_order: 11, show_in_sidebar: false, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS'] },

  // SETTLEMENTS
  { page_code: 'SETTLEMENTS_DASHBOARD', display_name: 'Settlements', route: '/settlements', module_code: 'FINANCE', icon: 'Wallet', sort_order: 12, roles: ['CFO', 'FINANCE_CONTROLLER', 'ACCOUNTS', 'BANKER'] },

  // QA (Internal testing)
  { page_code: 'QA_DASHBOARD', display_name: 'QA Dashboard', route: '/qa', module_code: 'QA', icon: 'ClipboardCheck', sort_order: 0, roles: ['QA', 'ENTERPRISE_ADMIN'] },
  { page_code: 'QA_ISSUES', display_name: 'Issues', route: '/qa/issues', module_code: 'QA', icon: 'Bug', sort_order: 1, roles: ['QA', 'ENTERPRISE_ADMIN'] },
  { page_code: 'QA_TEST_TASKS', display_name: 'Test Tasks', route: '/qa/test-tasks', module_code: 'QA', icon: 'TestTube', sort_order: 2, roles: ['QA', 'ENTERPRISE_ADMIN'] },
  { page_code: 'QA_ROLE_ACCESS_EXPLORER', display_name: 'Role Access Explorer', route: '/qa/role-access-explorer', module_code: 'QA', icon: 'Search', sort_order: 3, roles: ['QA', 'ENTERPRISE_ADMIN'] },
];

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const needSSL = !/localhost|127\.0\.0\.1/i.test(url);
  return new Pool({ connectionString: url, ssl: needSSL ? { rejectUnauthorized: false } : false });
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function seedModulesAndPages() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('🚀 Starting modules & pages seed...\n');

    // Start transaction
    await client.query('BEGIN');

    // =========================================================================
    // STEP 1: Insert Modules
    // =========================================================================
    console.log('📦 Inserting modules...');
    const moduleIdMap = {};

    for (const mod of MODULES) {
      const result = await client.query(`
        INSERT INTO modules_master (module_code, display_name, description, icon, base_route, sort_order, is_active, is_hidden, color_code, layout_group, product_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (module_code) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          icon = EXCLUDED.icon,
          base_route = EXCLUDED.base_route,
          sort_order = EXCLUDED.sort_order,
          is_hidden = EXCLUDED.is_hidden,
          color_code = EXCLUDED.color_code,
          layout_group = EXCLUDED.layout_group,
          updated_at = NOW()
        RETURNING id
      `, [
        mod.module_code,
        mod.display_name,
        mod.description || null,
        mod.icon,
        mod.base_route,
        mod.sort_order,
        mod.is_active !== false,
        mod.is_hidden || false,
        mod.color_code,
        mod.layout_group || 'common',
        mod.product_type || 'ALL'
      ]);
      moduleIdMap[mod.module_code] = result.rows[0].id;
      console.log(`   ✅ ${mod.module_code} (id: ${result.rows[0].id})`);
    }

    console.log(`\n📦 ${Object.keys(moduleIdMap).length} modules inserted.\n`);

    // =========================================================================
    // STEP 2: Insert Pages
    // =========================================================================
    console.log('📄 Inserting pages...');
    const pageIdMap = {};
    let pageCount = 0;

    for (const page of PAGES) {
      const moduleId = moduleIdMap[page.module_code];
      if (!moduleId) {
        console.warn(`   ⚠️ Skipping ${page.page_code}: module ${page.module_code} not found`);
        continue;
      }

      const result = await client.query(`
        INSERT INTO pages_master (page_code, display_name, description, route, module_id, icon, sort_order, is_active, show_in_sidebar, required_roles, layout_group, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (page_code) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          route = EXCLUDED.route,
          module_id = EXCLUDED.module_id,
          icon = EXCLUDED.icon,
          sort_order = EXCLUDED.sort_order,
          show_in_sidebar = EXCLUDED.show_in_sidebar,
          required_roles = EXCLUDED.required_roles,
          updated_at = NOW()
        RETURNING id
      `, [
        page.page_code,
        page.display_name,
        page.description || null,
        page.route,
        moduleId,
        page.icon,
        page.sort_order || 0,
        page.is_active !== false,
        page.show_in_sidebar !== false,
        page.roles || [],
        page.layout_group || 'common',
        page.status || 'active'
      ]);
      pageIdMap[page.page_code] = { id: result.rows[0].id, roles: page.roles || [] };
      pageCount++;
    }

    console.log(`\n📄 ${pageCount} pages inserted.\n`);

    // =========================================================================
    // STEP 3: Insert Role Page Access
    // =========================================================================
    console.log('🔐 Inserting role page access...');
    let accessCount = 0;

    for (const [, pageData] of Object.entries(pageIdMap)) {
      const pageId = pageData.id;
      const roles = pageData.roles;

      // Handle wildcard '*' for all authenticated users
      const effectiveRoles = roles.includes('*') 
        ? ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'CFO', 'FINANCE_CONTROLLER', 'OPERATIONS_MANAGER', 'HUB_INCHARGE', 'STORE_INCHARGE', 'HR', 'IT_ADMIN', 'COMPLIANCE', 'LEGAL', 'TREASURY', 'ACCOUNTS', 'BANKER']
        : roles;

      for (const roleName of effectiveRoles) {
        try {
          await client.query(`
            INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, granted_at)
            VALUES ($1, $2, TRUE, FALSE, NOW())
            ON CONFLICT (role_name, page_id) DO NOTHING
          `, [roleName, pageId]);
          accessCount++;
        } catch {
          // Ignore duplicates
        }
      }
    }

    console.log(`\n🔐 ${accessCount} role-page access records inserted.\n`);

    // Commit transaction
    await client.query('COMMIT');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SEED COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Modules:     ${Object.keys(moduleIdMap).length}`);
    console.log(`   Pages:       ${pageCount}`);
    console.log(`   Role Access: ${accessCount}`);
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run
seedModulesAndPages()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
