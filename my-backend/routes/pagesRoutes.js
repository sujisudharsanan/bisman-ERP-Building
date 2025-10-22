// Pages API Routes - Returns available pages for permission management
// AUTO-GENERATED FILE - Updated to include Hub Incharge pages
// Generated on: 2025-10-23T00:00:00.000Z
// Total Pages: 67 (includes 10 Hub Incharge sub-pages)

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Define all available pages in the system
const SYSTEM_PAGES = [
  // Administration Pages
  { key: 'admin', name: 'Admin', module: 'Administration' },
  { key: 'admin/permissions', name: 'Admin - Permissions', module: 'Administration' },
  { key: 'it-admin', name: 'It Admin', module: 'Administration' },
  { key: 'manager', name: 'Manager', module: 'Administration' },
  { key: 'staff', name: 'Staff', module: 'Administration' },

  // Authentication Pages
  { key: 'auth/admin-login', name: 'Auth - Admin Login', module: 'Authentication' },
  { key: 'auth/hub-incharge-login', name: 'Auth - Hub Incharge Login', module: 'Authentication' },
  { key: 'auth/login', name: 'Auth - Login', module: 'Authentication' },
  { key: 'auth/manager-login', name: 'Auth - Manager Login', module: 'Authentication' },
  { key: 'auth/portals', name: 'Auth - Portals', module: 'Authentication' },
  { key: 'auth/standard-login', name: 'Auth - Standard Login', module: 'Authentication' },

  // Compliance Pages
  { key: 'compliance/compliance-dashboard', name: 'Compliance - Compliance Dashboard', module: 'Compliance' },
  { key: 'compliance/legal-case-management', name: 'Compliance - Legal Case Management', module: 'Compliance' },
  { key: 'compliance-officer', name: 'Compliance Officer', module: 'Compliance' },
  { key: 'legal', name: 'Legal', module: 'Compliance' },

  // Dashboard Pages
  { key: '(dashboard)/users', name: '(dashboard) - Users', module: 'Dashboard' },
  { key: 'cfo-dashboard', name: 'Cfo Dashboard', module: 'Dashboard' },
  { key: 'dashboard', name: 'Dashboard', module: 'Dashboard' },
  { key: 'home', name: 'Home', module: 'Dashboard' },
  { key: 'task-dashboard', name: 'Task Dashboard', module: 'Dashboard' },

  // Finance Pages
  { key: '(dashboard)/finance', name: '(dashboard) - Finance', module: 'Finance' },
  { key: 'accounts', name: 'Accounts', module: 'Finance' },
  { key: 'accounts-payable', name: 'Accounts Payable', module: 'Finance' },
  { key: 'banker', name: 'Banker', module: 'Finance' },
  { key: 'finance/accounts-payable-summary', name: 'Finance - Accounts Payable Summary', module: 'Finance' },
  { key: 'finance/accounts-receivable-summary', name: 'Finance - Accounts Receivable Summary', module: 'Finance' },
  { key: 'finance/executive-dashboard', name: 'Finance - Executive Dashboard', module: 'Finance' },
  { key: 'finance/general-ledger', name: 'Finance - General Ledger', module: 'Finance' },
  { key: 'finance-controller', name: 'Finance Controller', module: 'Finance' },
  { key: 'treasury', name: 'Treasury', module: 'Finance' },

  // IT & System Pages
  { key: 'super-admin/system', name: 'Super Admin - System', module: 'IT & System' },
  { key: 'system/about-me', name: 'System - About Me', module: 'IT & System' },
  { key: 'system/audit-logs', name: 'System - Audit Logs', module: 'IT & System' },
  { key: 'system/company-setup', name: 'System - Company Setup', module: 'IT & System' },
  { key: 'system/deployment-tools', name: 'System - Deployment Tools', module: 'IT & System' },
  { key: 'system/error-logs', name: 'System - Error Logs', module: 'IT & System' },
  { key: 'system/integration-settings', name: 'System - Integration Settings', module: 'IT & System' },
  { key: 'system/master-data-management', name: 'System - Master Data Management', module: 'IT & System' },
  { key: 'system/pages-roles-report', name: 'System - Pages Roles Report', module: 'IT & System' },
  { key: 'system/permission-manager', name: 'System - Permission Manager', module: 'IT & System' },
  { key: 'system/roles-users-report', name: 'System - Roles Users Report', module: 'IT & System' },
  { key: 'system/scheduler', name: 'System - Scheduler', module: 'IT & System' },
  { key: 'system/server-logs', name: 'System - Server Logs', module: 'IT & System' },
  { key: 'system/system-health-dashboard', name: 'System - System Health Dashboard', module: 'IT & System' },
  { key: 'system/system-settings', name: 'System - System Settings', module: 'IT & System' },
  { key: 'system/user-management', name: 'System - User Management', module: 'IT & System' },

  // Operations Pages
  { key: 'hub-incharge', name: 'Hub Incharge', module: 'Operations' },
  { key: 'hub-incharge/dashboard', name: 'Hub Incharge - Dashboard', module: 'Operations' },
  { key: 'hub-incharge/about-me', name: 'Hub Incharge - About Me', module: 'Operations' },
  { key: 'hub-incharge/approvals', name: 'Hub Incharge - Approvals', module: 'Operations' },
  { key: 'hub-incharge/purchase', name: 'Hub Incharge - Purchase', module: 'Operations' },
  { key: 'hub-incharge/expenses', name: 'Hub Incharge - Expenses', module: 'Operations' },
  { key: 'hub-incharge/performance', name: 'Hub Incharge - Performance', module: 'Operations' },
  { key: 'hub-incharge/messages', name: 'Hub Incharge - Messages', module: 'Operations' },
  { key: 'hub-incharge/create-task', name: 'Hub Incharge - Create Task', module: 'Operations' },
  { key: 'hub-incharge/tasks-requests', name: 'Hub Incharge - Tasks & Requests', module: 'Operations' },
  { key: 'hub-incharge/settings', name: 'Hub Incharge - Settings', module: 'Operations' },
  { key: 'operations/inventory-management', name: 'Operations - Inventory Management', module: 'Operations' },
  { key: 'operations/kpi-dashboard', name: 'Operations - Kpi Dashboard', module: 'Operations' },
  { key: 'operations-manager', name: 'Operations Manager', module: 'Operations' },
  { key: 'store-incharge', name: 'Store Incharge', module: 'Operations' },

  // Procurement Pages
  { key: 'procurement/purchase-orders', name: 'Procurement - Purchase Orders', module: 'Procurement' },
  { key: 'procurement-officer', name: 'Procurement Officer', module: 'Procurement' },

  // Super Admin Pages
  { key: 'super-admin', name: 'Super Admin', module: 'Super Admin' },
  { key: 'super-admin/orders', name: 'Super Admin - Orders', module: 'Super Admin' },
  { key: 'super-admin/security', name: 'Super Admin - Security', module: 'Super Admin' },

  // System Pages
  { key: 'access-denied', name: 'Access Denied', module: 'System' },
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
