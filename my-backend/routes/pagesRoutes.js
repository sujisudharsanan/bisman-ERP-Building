// Pages API Routes - Returns available pages for permission management
// SYNCED WITH FRONTEND PAGE_REGISTRY
// Generated on: 2025-12-08T12:00:00.000Z
// Total Pages: 141 (synced with frontend PAGE_REGISTRY)

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Define all available pages in the system - SYNCED WITH FRONTEND PAGE_REGISTRY
const SYSTEM_PAGES = [
  // ==================== SUPER ADMIN PAGES ====================
  { key: 'super-admin-dashboard', name: 'Super Admin Dashboard', module: 'super-admin' },
  { key: 'super-admin-user-management', name: 'Client Management', module: 'super-admin' },
  { key: 'super-admin-permission-manager', name: 'Permission Manager', module: 'super-admin' },
  { key: 'super-admin-roles-users-report', name: 'Modules & Roles', module: 'super-admin' },
  { key: 'super-admin-pages-roles-report', name: 'Pages & Roles Report', module: 'super-admin' },
  { key: 'super-admin-backup-restore', name: 'Backup & Restore', module: 'super-admin' },
  { key: 'super-admin-system-health', name: 'System Health', module: 'super-admin' },
  { key: 'super-admin-integration-settings', name: 'Integration Settings', module: 'super-admin' },
  { key: 'super-admin-deployment-tools', name: 'Deployment Tools', module: 'super-admin' },
  { key: 'super-admin-about-me', name: 'About Me (Super Admin)', module: 'super-admin' },

  // ==================== ENTERPRISE ADMIN PAGES ====================
  { key: 'enterprise-admin-pages-roles-report', name: 'All Pages & Roles Report', module: 'enterprise-admin' },

  // ==================== COMMON PAGES (for all authenticated users) ====================
  { key: 'about-me', name: 'About Me', module: 'common' },
  { key: 'common', name: 'Common Module', module: 'common' },
  { key: 'common-about-me', name: 'About Me (Common)', module: 'common' },
  { key: 'common-help-center', name: 'Help Center', module: 'common' },
  { key: 'common-user-settings', name: 'User Settings', module: 'common' },
  { key: 'common-payment-request', name: 'Payment Request', module: 'common' },
  { key: 'dashboard', name: 'Dashboard', module: 'common' },
  
  // ==================== BILLING PAGES ====================
  { key: 'billing', name: 'Billing Module', module: 'billing' },
  { key: 'billing-overview', name: 'Billing Overview', module: 'billing' },
  { key: 'billing-invoices', name: 'Invoices & Payments', module: 'billing' },
  { key: 'billing-payment-method', name: 'Payment Method', module: 'billing' },
  { key: 'billing-trial', name: 'Trial Management', module: 'billing' },
  { key: 'billing-subscription', name: 'Subscription Plans', module: 'billing' },
  { key: 'billing-usage', name: 'Usage & Quotas', module: 'billing' },
  { key: 'billing-settings', name: 'Billing Settings', module: 'billing' },
  { key: 'settings-billing', name: 'Settings - Billing', module: 'billing' },
  
  // ==================== ADMIN PAGES ====================
  { key: 'admin', name: 'Admin Module', module: 'admin' },
  { key: 'admin-dashboard', name: 'Admin Dashboard', module: 'admin' },
  { key: 'admin-billing-tenant', name: 'Tenant Billing', module: 'admin' },
  { key: 'admin-audit-dashboard', name: 'Audit Dashboard', module: 'admin' },
  { key: 'admin-sla-dashboard', name: 'SLA Dashboard', module: 'admin' },
  { key: 'admin-usage-dashboard', name: 'Usage Dashboard', module: 'admin' },
  { key: 'admin-user-usage', name: 'User Usage', module: 'admin' },

  // ==================== QA PAGES ====================
  { key: 'qa', name: 'QA Module', module: 'qa' },
  { key: 'qa-dashboard', name: 'QA Dashboard', module: 'qa' },
  { key: 'qa-issues', name: 'QA Issues', module: 'qa' },
  { key: 'qa-new-issue', name: 'New QA Issue', module: 'qa' },
  { key: 'qa-new-task', name: 'New QA Task', module: 'qa' },
  { key: 'qa-test-tasks', name: 'Test Tasks', module: 'qa' },
  { key: 'qa-role-access-explorer', name: 'Role Access Explorer (QA)', module: 'qa' },

  // ==================== HR PAGES ====================
  { key: 'hr', name: 'HR Module', module: 'hr' },

  // ==================== SECURITY PAGES ====================
  { key: 'security', name: 'Security Module', module: 'security' },

  // ==================== ANALYTICS PAGES ====================
  { key: 'analytics-dashboard', name: 'Analytics Dashboard', module: 'analytics' },
  { key: 'dashboard-analytics', name: 'Dashboard Analytics', module: 'analytics' },

  // ==================== AI PAGES ====================
  { key: 'ai-handling', name: 'AI Handling', module: 'ai' },

  // ==================== LEGAL PAGES ====================
  { key: 'legal-agreements', name: 'Legal Agreements', module: 'legal' },

  // Module Landing Pages
  { key: 'compliance', name: 'Compliance Module', module: 'compliance' },
  { key: 'finance', name: 'Finance Module', module: 'finance' },
  { key: 'operations', name: 'Operations Module', module: 'operations' },
  { key: 'procurement', name: 'Procurement Module', module: 'procurement' },
  { key: 'system', name: 'System Module', module: 'system' },

  // ==================== COMPLIANCE PAGES ====================
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

  // ==================== FINANCE PAGES ====================
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
  { key: 'finance-controller-dashboard', name: 'Finance Controller Dashboard', module: 'finance' },

  // ==================== OPERATIONS PAGES ====================
  { key: 'kpi-dashboard', name: 'KPI Dashboard', module: 'operations' },
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
  { key: 'operations-manager-dashboard', name: 'Operations Manager Dashboard', module: 'operations' },
  { key: 'pump-management', name: 'Pump Management', module: 'operations' },

  // ==================== PROCUREMENT PAGES ====================
  { key: 'purchase-order', name: 'Purchase Order', module: 'procurement' },
  { key: 'purchase-request', name: 'Purchase Request', module: 'procurement' },
  { key: 'supplier-quotation', name: 'Supplier Quotation', module: 'procurement' },
  { key: 'supplier-master', name: 'Supplier Master', module: 'procurement' },
  { key: 'material-request', name: 'Material Request', module: 'procurement' },
  { key: 'procurement-officer-dashboard', name: 'Procurement Officer Dashboard', module: 'procurement' },

  // ==================== SYSTEM PAGES ====================
  { key: 'system-settings', name: 'System Settings', module: 'system' },
  { key: 'user-management', name: 'User Management', module: 'system' },
  { key: 'user-creation', name: 'User Creation', module: 'system' },
  { key: 'permission-manager', name: 'Permission Manager', module: 'system' },
  { key: 'roles-users-report', name: 'Roles & Users Report', module: 'system' },
  { key: 'pages-roles-report', name: 'Pages & Roles Report', module: 'system' },
  { key: 'role-access-explorer', name: 'Role Access Explorer', module: 'system' },
  { key: 'audit-logs', name: 'Audit Logs', module: 'system' },
  { key: 'backup-restore', name: 'Backup & Restore', module: 'system' },
  { key: 'scheduler', name: 'Task Scheduler', module: 'system' },
  { key: 'system-health', name: 'System Health', module: 'system' },
  { key: 'integration-settings', name: 'Integration Settings', module: 'system' },
  { key: 'error-logs', name: 'Error Logs', module: 'system' },
  { key: 'server-logs', name: 'Server Logs', module: 'system' },
  { key: 'deployment-tools', name: 'Deployment Tools', module: 'system' },
  { key: 'api-config', name: 'API Configuration', module: 'system' },
  { key: 'company-setup', name: 'Company Setup', module: 'system' },
  { key: 'master-data', name: 'Master Data', module: 'system' },
  { key: 'fallback-recovery', name: 'Fallback & Recovery', module: 'system' },
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
