// Pages API Routes - Returns available pages for permission management
// SYNCED WITH FRONTEND PAGE_REGISTRY
// Generated on: 2026-01-20T11:24:07.902Z
// Total Pages: 268

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Define all available pages in the system
const SYSTEM_PAGES = [
  // System Pages
  { key: 'task-clarifications', name: 'Task Clarifications', module: 'System' },
  { key: 'task-reviews', name: 'Task Reviews', module: 'System' },

  // admin Pages
  { key: 'admin-billing-tenant', name: 'Tenant Billing Admin', module: 'admin' },
  { key: 'admin-usage-dashboard', name: 'Usage Dashboard', module: 'admin' },
  { key: 'admin-sla-dashboard', name: 'SLA Dashboard', module: 'admin' },
  { key: 'admin-audit-dashboard', name: 'Audit Dashboard', module: 'admin' },
  { key: 'admin-system-flow', name: 'User Flow & Management', module: 'admin' },
  { key: 'admin-task-approvals', name: 'Task Approvals', module: 'admin' },
  { key: 'admin-client-dashboard', name: 'Dashboard', module: 'admin' },
  { key: 'admin-user-usage', name: 'User Usage Details', module: 'admin' },
  { key: 'analytics-dashboard', name: 'Analytics Dashboard', module: 'admin' },
  { key: 'admin-contracts', name: 'Contracts & Agreements', module: 'admin' },
  { key: 'admin-contracts-create', name: 'Create Contract', module: 'admin' },
  { key: 'admin-users-create', name: 'Create User', module: 'admin' },
  { key: 'admin-branches-create', name: 'Create Branch', module: 'admin' },
  { key: 'admin-bank-templates', name: 'Bank Templates', module: 'admin' },
  { key: 'admin-clients', name: 'Client Management', module: 'admin' },
  { key: 'admin-settings', name: 'Admin Settings', module: 'admin' },
  { key: 'admin-ai-analytics', name: 'AI Analytics', module: 'admin' },
  { key: 'admin-permissions', name: 'Permissions', module: 'admin' },
  { key: 'admin-rag-sources', name: 'RAG Sources', module: 'admin' },
  { key: 'admin-subscription-view', name: 'Subscription', module: 'admin' },
  { key: 'clients-create', name: 'Create Client', module: 'admin' },
  { key: 'clients-usage-dashboard', name: 'Client Usage Dashboard', module: 'admin' },
  { key: 'admin-client-dashboard', name: 'Client Dashboard', module: 'admin' },
  { key: 'admin-users', name: 'Users', module: 'admin' },
  { key: 'admin-modules', name: 'Modules', module: 'admin' },
  { key: 'admin-organizations', name: 'Organizations', module: 'admin' },
  { key: 'admin-billing', name: 'Billing', module: 'admin' },
  { key: 'admin-reports', name: 'Reports', module: 'admin' },
  { key: 'admin-support', name: 'Support', module: 'admin' },
  { key: 'admin-integrations', name: 'Integrations', module: 'admin' },
  { key: 'admin-notifications', name: 'Notifications', module: 'admin' },
  { key: 'admin-developer', name: 'Developer Tools', module: 'admin' },
  { key: 'admin-ai', name: 'AI Management', module: 'admin' },

  // billing Pages
  { key: 'billing-overview', name: 'Subscription', module: 'billing' },
  { key: 'billing-invoices', name: 'Invoices & Payments', module: 'billing' },
  { key: 'pricing', name: 'Pricing', module: 'billing' },

  // common Pages
  { key: 'branch-task-approvals', name: 'Task Approvals', module: 'common' },
  { key: 'about-me', name: 'About Me', module: 'common' },
  { key: 'common-user-settings', name: 'User Settings', module: 'common' },
  { key: 'common-payment-request', name: 'Payment Request', module: 'common' },
  { key: 'approvals', name: 'Task Management', module: 'common' },
  { key: 'task-create', name: 'Create Task', module: 'common' },
  { key: 'global-calendar', name: 'Calendar', module: 'common' },
  { key: 'dashboard', name: 'Dashboard', module: 'common' },
  { key: 'task-workbench', name: 'Task Workbench', module: 'common' },
  { key: 'communication-internal-chat', name: 'Internal Chat', module: 'common' },
  { key: 'dashboard-notifications', name: 'Notifications', module: 'common' },
  { key: 'common-bank-accounts', name: 'Bank Accounts', module: 'common' },
  { key: 'common-calendar', name: 'Calendar', module: 'common' },
  { key: 'common-documentation', name: 'Documentation', module: 'common' },
  { key: 'common-hr-policy', name: 'HR Policy', module: 'common' },
  { key: 'common-notifications', name: 'Notifications', module: 'common' },
  { key: 'common-security-settings', name: 'Security Settings', module: 'common' },
  { key: 'common-user-creation', name: 'User Creation', module: 'common' },
  { key: 'system-about-me', name: 'About Me', module: 'common' },
  { key: 'dashboard-requests', name: 'Requests', module: 'common' },
  { key: 'task-dashboard', name: 'Task Dashboard', module: 'common' },
  { key: 'assistant', name: 'AI Assistant', module: 'common' },
  { key: 'home', name: 'Home', module: 'common' },
  { key: 'settings', name: 'Settings', module: 'common' },
  { key: 'settings-security', name: 'Security Settings', module: 'common' },
  { key: 'change-password', name: 'Change Password', module: 'common' },
  { key: 'help-center', name: 'Help Center', module: 'common' },
  { key: 'create-payment-request', name: 'Create Payment Request', module: 'common' },
  { key: 'access-denied', name: 'Access Denied', module: 'common' },
  { key: 'chat', name: 'Chat', module: 'common' },
  { key: 'chat-ai', name: 'AI Assistant', module: 'common' },

  // compliance Pages
  { key: 'admin-branches', name: 'Branches', module: 'compliance' },
  { key: 'compliance-dashboard', name: 'Compliance Dashboard', module: 'compliance' },
  { key: 'audit-trail', name: 'Audit Trail', module: 'compliance' },
  { key: 'policy-management', name: 'Policy Management', module: 'compliance' },
  { key: 'regulatory-templates', name: 'Report Templates', module: 'compliance' },
  { key: 'approval-workflows', name: 'Approval Workflows', module: 'compliance' },
  { key: 'contract-management', name: 'Contract Management', module: 'compliance' },
  { key: 'litigation-tracker', name: 'Litigation Tracker', module: 'compliance' },
  { key: 'document-repository', name: 'Document Repository', module: 'compliance' },
  { key: 'legal-master', name: 'Legal Master Data', module: 'compliance' },
  { key: 'compliance-officer-dashboard', name: 'Compliance Officer Dashboard', module: 'compliance' },
  { key: 'compliance-document-management', name: 'Document Management', module: 'compliance' },
  { key: 'compliance-legal-case-management', name: 'Legal Case Management', module: 'compliance' },
  { key: 'compliance-regulatory-compliance', name: 'Regulatory Compliance', module: 'compliance' },
  { key: 'compliance-risk-management', name: 'Risk Management', module: 'compliance' },
  { key: 'legal-agreements', name: 'Legal Agreements', module: 'compliance' },
  { key: 'legal', name: 'Legal', module: 'compliance' },

  // enterprise-admin Pages
  { key: 'enterprise-admin-pages-roles-report', name: 'All Pages & Roles Report', module: 'enterprise-admin' },
  { key: 'enterprise-admin-dashboard', name: 'Enterprise Dashboard', module: 'enterprise-admin' },
  { key: 'enterprise-admin-roles', name: 'Role Management', module: 'enterprise-admin' },
  { key: 'enterprise-admin-subscription-access', name: 'Subscription Access Control', module: 'enterprise-admin' },
  { key: 'enterprise-admin-super-admins', name: 'Super Admins', module: 'enterprise-admin' },
  { key: 'enterprise-admin-logs', name: 'System Logs', module: 'enterprise-admin' },
  { key: 'enterprise-admin-activity-logs', name: 'Activity Logs', module: 'enterprise-admin' },
  { key: 'enterprise-admin-page-governance', name: 'Page Governance', module: 'enterprise-admin' },
  { key: 'enterprise-admin-billing', name: 'Billing Management', module: 'enterprise-admin' },
  { key: 'enterprise-admin-monitoring', name: 'System Monitoring', module: 'enterprise-admin' },
  { key: 'enterprise-admin-integrations', name: 'Integrations', module: 'enterprise-admin' },
  { key: 'enterprise-admin-subscriptions', name: 'Subscriptions', module: 'enterprise-admin' },
  { key: 'enterprise-admin-rbac-security', name: 'RBAC Security', module: 'enterprise-admin' },
  { key: 'enterprise-admin-security-operations', name: 'Security Operations', module: 'enterprise-admin' },
  { key: 'enterprise-admin-pages-report', name: 'Pages Report', module: 'enterprise-admin' },
  { key: 'enterprise-admin-monitoring-database', name: 'Database Monitoring', module: 'enterprise-admin' },
  { key: 'enterprise-admin-monitoring-live', name: 'Live Monitoring', module: 'enterprise-admin' },
  { key: 'enterprise-admin-monitoring-performance', name: 'Performance Monitoring', module: 'enterprise-admin' },
  { key: 'enterprise-admin-docs-production-ready', name: 'Production Ready Docs', module: 'enterprise-admin' },
  { key: 'enterprise-admin-super-admins-create', name: 'Create Super Admin', module: 'enterprise-admin' },
  { key: 'enterprise-admin-users', name: 'Users', module: 'enterprise-admin' },
  { key: 'enterprise-admin-organizations', name: 'Organizations', module: 'enterprise-admin' },
  { key: 'enterprise-admin-reports', name: 'Reports', module: 'enterprise-admin' },
  { key: 'enterprise-admin-notifications', name: 'Notifications', module: 'enterprise-admin' },
  { key: 'enterprise-admin-audit', name: 'Audit', module: 'enterprise-admin' },

  // finance Pages
  { key: 'executive-dashboard', name: 'Executive Dashboard', module: 'finance' },
  { key: 'financial-statements', name: 'Financial Statements', module: 'finance' },
  { key: 'general-ledger', name: 'General Ledger', module: 'finance' },
  { key: 'budgeting-forecasting', name: 'Budgeting & Forecasting', module: 'finance' },
  { key: 'cash-flow-statement', name: 'Cash Flow Statement', module: 'finance' },
  { key: 'company-dashboard', name: 'Company Dashboard', module: 'finance' },
  { key: 'period-end-closing', name: 'Period End Closing', module: 'finance' },
  { key: 'cost-center-analysis', name: 'Cost Center Analysis', module: 'finance' },
  { key: 'journal-entries-approval', name: 'Journal Entry Approval', module: 'finance' },
  { key: 'trial-balance', name: 'Trial Balance', module: 'finance' },
  { key: 'journal-entries', name: 'Journal Entries', module: 'finance' },
  { key: 'inter-company-reconciliation', name: 'Inter-Company Reconciliation', module: 'finance' },
  { key: 'fixed-asset-register', name: 'Fixed Asset Register', module: 'finance' },
  { key: 'tax-reports', name: 'Tax Reports', module: 'finance' },
  { key: 'bank-reconciliation', name: 'Bank Reconciliation', module: 'finance' },
  { key: 'cash-flow-forecast', name: 'Cash Flow Forecast', module: 'finance' },
  { key: 'payment-gateway', name: 'Payment Gateway', module: 'finance' },
  { key: 'foreign-exchange', name: 'Foreign Exchange', module: 'finance' },
  { key: 'loan-management', name: 'Loan Management', module: 'finance' },
  { key: 'chart-of-accounts', name: 'Chart of Accounts', module: 'finance' },
  { key: 'invoice-posting', name: 'Invoice Posting', module: 'finance' },
  { key: 'period-adjustments', name: 'Period Adjustments', module: 'finance' },
  { key: 'purchase-invoice', name: 'Purchase Invoice', module: 'finance' },
  { key: 'payment-entry', name: 'Payment Entry', module: 'finance' },
  { key: 'vendor-master', name: 'Vendor Master', module: 'finance' },
  { key: 'expense-report', name: 'Expense Report', module: 'finance' },
  { key: 'payment-batch', name: 'Batch Processing', module: 'finance' },
  { key: 'payment-view', name: 'Payment View', module: 'finance' },
  { key: 'bank-upload', name: 'Bank Statement Upload', module: 'finance' },
  { key: 'bank-reconcile-exec', name: 'Execute Reconciliation', module: 'finance' },
  { key: 'payment-approval', name: 'Payment Approval', module: 'finance' },
  { key: 'bank-reconciliation-list', name: 'Bank Reconciliation', module: 'finance' },
  { key: 'bank-reconciliation-upload', name: 'Upload Statement', module: 'finance' },
  { key: 'settlements-list', name: 'Settlements', module: 'finance' },
  { key: 'payment-summary-report', name: 'Payment Summary', module: 'finance' },
  { key: 'settlement-audit-report', name: 'Settlement Audit', module: 'finance' },
  { key: 'finance-controller-dashboard', name: 'Finance Controller Dashboard', module: 'finance' },
  { key: 'finance-accounts-payable-summary', name: 'Accounts Payable Summary', module: 'finance' },
  { key: 'finance-accounts-receivable-summary', name: 'Accounts Receivable Summary', module: 'finance' },
  { key: 'finance-approval-structure-overview', name: 'Approval Structure Overview', module: 'finance' },
  { key: 'finance-budget-approval', name: 'Budget Approval', module: 'finance' },
  { key: 'accounts', name: 'Accounts', module: 'finance' },
  { key: 'accounts-payable', name: 'Accounts Payable', module: 'finance' },
  { key: 'cfo-dashboard', name: 'CFO Dashboard', module: 'finance' },
  { key: 'banker', name: 'Banker Portal', module: 'finance' },

  // governance Pages
  { key: 'governance-security-overview', name: 'Security Overview', module: 'governance' },
  { key: 'governance-audit-integrity', name: 'Audit Integrity', module: 'governance' },
  { key: 'governance-security-violations', name: 'Security Violations', module: 'governance' },
  { key: 'governance-rbac-structure', name: 'RBAC Structure', module: 'governance' },

  // hr Pages
  { key: 'hr-attendance-tracking', name: 'Attendance Tracking', module: 'hr' },
  { key: 'hr-performance-review', name: 'Performance Review', module: 'hr' },
  { key: 'hr-policy', name: 'HR Policy', module: 'hr' },
  { key: 'hr-training', name: 'Training Management', module: 'hr' },
  { key: 'staff', name: 'Staff Portal', module: 'hr' },
  { key: 'hr-user-creation', name: 'User Creation', module: 'hr' },

  // internal Pages
  { key: 'internal-teams-management', name: 'Internal Teams', module: 'internal' },
  { key: 'internal-support-sessions', name: 'Support Sessions', module: 'internal' },
  { key: 'internal-customer-assistance', name: 'Customer Assistance', module: 'internal' },
  { key: 'internal-support-playbooks', name: 'Support Playbooks', module: 'internal' },

  // operations Pages
  { key: 'stock-entry', name: 'Stock Entry', module: 'operations' },
  { key: 'item-master', name: 'Item Master', module: 'operations' },
  { key: 'stock-ledger', name: 'Stock Ledger', module: 'operations' },
  { key: 'delivery-note', name: 'Delivery Note', module: 'operations' },
  { key: 'quality-inspection', name: 'Quality Inspection', module: 'operations' },
  { key: 'sales-order', name: 'Sales Order', module: 'operations' },
  { key: 'work-order', name: 'Work Order', module: 'operations' },
  { key: 'bom-view', name: 'Bill of Materials', module: 'operations' },
  { key: 'shipping-logistics', name: 'Shipping & Logistics', module: 'operations' },
  { key: 'stock-transfer', name: 'Stock Transfer', module: 'operations' },
  { key: 'sales-order-view', name: 'Sales Order View', module: 'operations' },
  { key: 'asset-register', name: 'Asset Register', module: 'operations' },
  { key: 'hub-incharge-dashboard', name: 'Hub Incharge Dashboard', module: 'operations' },
  { key: 'store-incharge-dashboard', name: 'Store Incharge Dashboard', module: 'operations' },
  { key: 'branch-incharge-dashboard', name: 'Branch Dashboard', module: 'operations' },
  { key: 'operations-manager-dashboard', name: 'Operations Manager Dashboard', module: 'operations' },
  { key: 'inventory-barcode-scanning', name: 'Barcode Scanning', module: 'operations' },
  { key: 'inventory-category-management', name: 'Category Management', module: 'operations' },
  { key: 'inventory-reorder-rules', name: 'Reorder Rules', module: 'operations' },
  { key: 'inventory-reports', name: 'Inventory Reports', module: 'operations' },
  { key: 'production-scheduling', name: 'Production Scheduling', module: 'operations' },
  { key: 'production-machine-management', name: 'Machine Management', module: 'operations' },
  { key: 'production-workflow', name: 'Production Workflow', module: 'operations' },
  { key: 'production-analytics', name: 'Production Analytics', module: 'operations' },
  { key: 'warehouse-bin-location', name: 'Bin Location', module: 'operations' },
  { key: 'shipping-carrier-management', name: 'Carrier Management', module: 'operations' },
  { key: 'shipping-shipment-tracking', name: 'Shipment Tracking', module: 'operations' },
  { key: 'sales-customer-master', name: 'Customer Master', module: 'operations' },
  { key: 'sales-quotation-management', name: 'Quotation Management', module: 'operations' },
  { key: 'assets-maintenance-scheduling', name: 'Maintenance Scheduling', module: 'operations' },
  { key: 'operations-inventory-management', name: 'Inventory Management', module: 'operations' },
  { key: 'operations-kpi-dashboard', name: 'Operations KPI Dashboard', module: 'operations' },

  // procurement Pages
  { key: 'purchase-order', name: 'Purchase Order', module: 'procurement' },
  { key: 'purchase-request', name: 'Purchase Request', module: 'procurement' },
  { key: 'supplier-quotation', name: 'Supplier Quotation', module: 'procurement' },
  { key: 'supplier-master', name: 'Supplier Master', module: 'procurement' },
  { key: 'material-request', name: 'Material Request', module: 'procurement' },
  { key: 'procurement-officer-dashboard', name: 'Procurement Officer Dashboard', module: 'procurement' },
  { key: 'procurement-goods-receipt', name: 'Goods Receipt', module: 'procurement' },
  { key: 'procurement-purchase-orders', name: 'Purchase Orders List', module: 'procurement' },
  { key: 'procurement-rfq', name: 'Request for Quotation', module: 'procurement' },

  // qa Pages
  { key: 'qa-dashboard', name: 'QA Dashboard', module: 'qa' },
  { key: 'qa-test-tasks', name: 'Test Tasks', module: 'qa' },
  { key: 'qa-issues', name: 'Bug Tracker', module: 'qa' },
  { key: 'qa-new-task', name: 'New Test Task', module: 'qa' },
  { key: 'qa-new-issue', name: 'Report Issue', module: 'qa' },
  { key: 'qa-role-access-explorer', name: 'Role & Access Explorer', module: 'qa' },
  { key: 'qa-login', name: 'QA Login', module: 'qa' },

  // subscriptions Pages
  { key: 'subscriptions', name: 'Subscriptions', module: 'subscriptions' },
  { key: 'subscription-plans', name: 'Plan Management', module: 'subscriptions' },
  { key: 'subscription-tenants', name: 'Tenant Subscriptions', module: 'subscriptions' },
  { key: 'subscription-billing', name: 'Billing Overrides', module: 'subscriptions' },
  { key: 'subscription-audit', name: 'Subscription Audit', module: 'subscriptions' },
  { key: 'subscription-coupons', name: 'Coupons', module: 'subscriptions' },
  { key: 'super-admin-subscriptions-micro-unlock', name: 'Micro Unlock', module: 'subscriptions' },
  { key: 'super-admin-subscriptions-settings', name: 'Subscription Settings', module: 'subscriptions' },

  // super-admin Pages
  { key: 'super-admin-dashboard', name: 'Dashboard', module: 'super-admin' },
  { key: 'super-admin-user-management', name: 'Client Management', module: 'super-admin' },
  { key: 'super-admin-permission-manager', name: 'Permission Manager', module: 'super-admin' },
  { key: 'super-admin-roles-users-report', name: 'Modules & Roles', module: 'super-admin' },
  { key: 'super-admin-pages-roles-report', name: 'Pages & Roles Report', module: 'super-admin' },
  { key: 'super-admin-backup-restore', name: 'Backup & Restore', module: 'super-admin' },
  { key: 'super-admin-system-health', name: 'System Health', module: 'super-admin' },
  { key: 'super-admin-integration-settings', name: 'Integration Settings', module: 'super-admin' },
  { key: 'super-admin-deployment-tools', name: 'Deployment Tools', module: 'super-admin' },
  { key: 'super-admin-about-me', name: 'About Me', module: 'super-admin' },
  { key: 'fallback-recovery', name: 'Fallback & Recovery', module: 'super-admin' },
  { key: 'security', name: 'Security Management', module: 'super-admin' },
  { key: 'super-admin-decision-load', name: 'Decision Load', module: 'super-admin' },
  { key: 'super-admin-orders', name: 'Orders', module: 'super-admin' },
  { key: 'super-admin-subscription-page', name: 'Subscription', module: 'super-admin' },
  { key: 'super-admin-system-index', name: 'System Overview', module: 'super-admin' },
  { key: 'super-admin-it-admin', name: 'IT Administration', module: 'super-admin' },
  { key: 'super-admin-role-access-explorer', name: 'Role Access Explorer', module: 'super-admin' },
  { key: 'super-admin-system-settings', name: 'System Settings', module: 'super-admin' },
  { key: 'super-admin-system-health', name: 'System Health', module: 'super-admin' },
  { key: 'super-admin-about-me', name: 'About Me', module: 'super-admin' },

  // system Pages
  { key: 'user-management', name: 'Client Management', module: 'system' },
  { key: 'user-creation', name: 'Create New User', module: 'system' },
  { key: 'permission-manager', name: 'Permission Manager', module: 'system' },
  { key: 'roles-users-report', name: 'Modules & Roles', module: 'system' },
  { key: 'pages-roles-report', name: 'Pages & Roles Report', module: 'system' },
  { key: 'role-access-explorer', name: 'Role & Access Explorer', module: 'system' },
  { key: 'audit-logs', name: 'Audit Logs', module: 'system' },
  { key: 'audit-integrity', name: 'Audit Integrity', module: 'system' },
  { key: 'backup-restore', name: 'Backup & Restore', module: 'system' },
  { key: 'system-health', name: 'System Health', module: 'system' },
  { key: 'integration-settings', name: 'Integration Settings', module: 'system' },
  { key: 'error-logs', name: 'Error Logs', module: 'system' },
  { key: 'trust-security', name: 'Trust & Security', module: 'system' },
  { key: 'server-logs', name: 'Server Logs', module: 'system' },
  { key: 'deployment-tools', name: 'Deployment Tools', module: 'system' },
  { key: 'ai-training', name: 'AI Training', module: 'system' },
  { key: 'system-clients-new', name: 'New Client', module: 'system' },
  { key: 'trace', name: 'Trace', module: 'system' },
  { key: 'system-clients', name: 'System Clients', module: 'system' },
];

// GET /api/pages - Return all available pages
router.get('/', authMiddleware.authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: SYSTEM_PAGES,
      count: SYSTEM_PAGES.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch pages',
        code: 'PAGES_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/pages/by-module - Return pages grouped by module
router.get('/by-module', authMiddleware.authenticate, async (req, res) => {
  try {
    const pagesByModule = {};
    SYSTEM_PAGES.forEach(page => {
      if (!pagesByModule[page.module]) {
        pagesByModule[page.module] = [];
      }
      pagesByModule[page.module].push(page);
    });

    res.json({
      success: true,
      data: pagesByModule,
      modules: Object.keys(pagesByModule),
      totalPages: SYSTEM_PAGES.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pages by module:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch pages by module',
        code: 'PAGES_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
