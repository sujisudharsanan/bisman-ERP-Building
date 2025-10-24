// Pages API Routes - Returns available pages for permission management
// SYNCED WITH FRONTEND PAGE_REGISTRY
// Generated on: 2025-10-24T16:24:00.000Z
// Total Pages: 90

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Define all available pages in the system
const SYSTEM_PAGES = [
  // Module Landing Pages (5)
  { key: 'compliance', name: 'Compliance Module', module: 'compliance' },
  { key: 'finance', name: 'Finance Module', module: 'finance' },
  { key: 'operations', name: 'Operations Module', module: 'operations' },
  { key: 'procurement', name: 'Procurement Module', module: 'procurement' },
  { key: 'system', name: 'System Module', module: 'system' },

  // compliance Pages
  { key: 'compliance-dashboard', name: 'Compliance Dashboard', module: 'compliance' },
  { key: 'audit-trail', name: 'Audit Trail', module: 'compliance' },
  { key: 'policy-management', name: 'Policy Management', module: 'compliance' },
  { key: 'regulatory-templates', name: 'Report Templates', module: 'compliance' },
  { key: 'approval-workflows', name: 'Approval Workflows', module: 'compliance' },
  { key: 'contract-management', name: 'Contract Management', module: 'compliance' },
  { key: 'litigation-tracker', name: 'Litigation Tracker', module: 'compliance' },
  { key: 'document-repository', name: 'Document Repository', module: 'compliance' },
  { key: 'legal-master', name: 'Legal Master Data', module: 'compliance' },
  { key: 'compliance-about', name: 'About Me', module: 'compliance' },
  { key: 'compliance-officer-dashboard', name: 'Compliance Officer Dashboard', module: 'compliance' },

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
  { key: 'finance-about', name: 'About Me', module: 'finance' },
  { key: 'finance-controller-dashboard', name: 'Finance Controller Dashboard', module: 'finance' },

  // operations Pages
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
  { key: 'operations-about', name: 'About Me', module: 'operations' },
  { key: 'hub-incharge-dashboard', name: 'Hub Incharge Dashboard', module: 'operations' },
  { key: 'store-incharge-dashboard', name: 'Store Incharge Dashboard', module: 'operations' },
  { key: 'operations-manager-dashboard', name: 'Operations Manager Dashboard', module: 'operations' },

  // procurement Pages
  { key: 'purchase-order', name: 'Purchase Order', module: 'procurement' },
  { key: 'purchase-request', name: 'Purchase Request', module: 'procurement' },
  { key: 'supplier-quotation', name: 'Supplier Quotation', module: 'procurement' },
  { key: 'supplier-master', name: 'Supplier Master', module: 'procurement' },
  { key: 'material-request', name: 'Material Request', module: 'procurement' },
  { key: 'procurement-about', name: 'About Me', module: 'procurement' },
  { key: 'procurement-officer-dashboard', name: 'Procurement Officer Dashboard', module: 'procurement' },

  // system Pages
  { key: 'system-settings', name: 'System Settings', module: 'system' },
  { key: 'user-management', name: 'User Management', module: 'system' },
  { key: 'permission-manager', name: 'Permission Manager', module: 'system' },
  { key: 'roles-users-report', name: 'Roles & Users Report', module: 'system' },
  { key: 'pages-roles-report', name: 'Pages & Roles Report', module: 'system' },
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
  { key: 'system-about', name: 'About Me', module: 'system' },
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
