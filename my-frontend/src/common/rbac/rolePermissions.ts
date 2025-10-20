/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines permissions and page access for each role
 */

export type RoleType =
  | 'SUPER_ADMIN'
  | 'SYSTEM_ADMINISTRATOR'
  | 'IT_ADMIN'
  | 'ADMIN'
  | 'CFO'
  | 'FINANCE_CONTROLLER'
  | 'TREASURY'
  | 'ACCOUNTS'
  | 'ACCOUNTS_PAYABLE'
  | 'BANKER'
  | 'PROCUREMENT_OFFICER'
  | 'STORE_INCHARGE'
  | 'OPERATIONS_MANAGER'
  | 'HUB_INCHARGE'
  | 'COMPLIANCE'
  | 'LEGAL'
  | 'MANAGER'
  | 'STAFF'
  | 'USER';

export interface Permission {
  key: string;
  label: string;
  description: string;
  module: string;
}

export interface RolePermissions {
  role: RoleType;
  label: string;
  permissions: string[];
  defaultRoute: string;
}

// Define all available permissions
export const PERMISSIONS: Record<string, Permission> = {
  // System Module
  'system-settings': { key: 'system-settings', label: 'System Settings', description: 'Configure system-wide settings', module: 'system' },
  'user-management': { key: 'user-management', label: 'User Management', description: 'Manage users and accounts', module: 'system' },
  'permission-manager': { key: 'permission-manager', label: 'Permission Manager', description: 'Manage role permissions', module: 'system' },
  'audit-logs': { key: 'audit-logs', label: 'Audit Logs', description: 'View system audit trails', module: 'system' },
  'backup-restore': { key: 'backup-restore', label: 'Backup & Restore', description: 'Manage system backups', module: 'system' },
  'scheduler': { key: 'scheduler', label: 'Task Scheduler', description: 'Manage scheduled tasks', module: 'system' },
  'system-health': { key: 'system-health', label: 'System Health', description: 'Monitor system health', module: 'system' },
  'integration-settings': { key: 'integration-settings', label: 'Integration Settings', description: 'Configure integrations', module: 'system' },
  'error-logs': { key: 'error-logs', label: 'Error Logs', description: 'View system error logs', module: 'system' },

  // Finance Module
  'financial-statements': { key: 'financial-statements', label: 'Financial Statements', description: 'View financial statements', module: 'finance' },
  'budgeting': { key: 'budgeting', label: 'Budgeting', description: 'Manage budgets', module: 'finance' },
  'cash-flow': { key: 'cash-flow', label: 'Cash Flow', description: 'Monitor cash flow', module: 'finance' },
  'executive-dashboard': { key: 'executive-dashboard', label: 'Executive Dashboard', description: 'Executive-level insights', module: 'finance' },
  'general-ledger': { key: 'general-ledger', label: 'General Ledger', description: 'Manage general ledger', module: 'finance' },
  'trial-balance': { key: 'trial-balance', label: 'Trial Balance', description: 'View trial balance', module: 'finance' },
  'journal-entries': { key: 'journal-entries', label: 'Journal Entries', description: 'Manage journal entries', module: 'finance' },
  'reconciliation': { key: 'reconciliation', label: 'Reconciliation', description: 'Perform account reconciliation', module: 'finance' },
  'tax-reports': { key: 'tax-reports', label: 'Tax Reports', description: 'Generate tax reports', module: 'finance' },
  'treasury-management': { key: 'treasury-management', label: 'Treasury Management', description: 'Manage treasury operations', module: 'finance' },
  'cash-management': { key: 'cash-management', label: 'Cash Management', description: 'Manage cash operations', module: 'finance' },
  'investment-tracking': { key: 'investment-tracking', label: 'Investment Tracking', description: 'Track investments', module: 'finance' },
  'accounts-payable': { key: 'accounts-payable', label: 'Accounts Payable', description: 'Manage accounts payable', module: 'finance' },
  'vendor-payments': { key: 'vendor-payments', label: 'Vendor Payments', description: 'Process vendor payments', module: 'finance' },
  'payment-schedules': { key: 'payment-schedules', label: 'Payment Schedules', description: 'Manage payment schedules', module: 'finance' },
  'banking-operations': { key: 'banking-operations', label: 'Banking Operations', description: 'Manage banking operations', module: 'finance' },
  'bank-reconciliation': { key: 'bank-reconciliation', label: 'Bank Reconciliation', description: 'Reconcile bank accounts', module: 'finance' },

  // Procurement Module
  'purchase-request': { key: 'purchase-request', label: 'Purchase Request', description: 'Create purchase requests', module: 'procurement' },
  'purchase-order': { key: 'purchase-order', label: 'Purchase Order', description: 'Manage purchase orders', module: 'procurement' },
  'supplier-master': { key: 'supplier-master', label: 'Supplier Master', description: 'Manage supplier database', module: 'procurement' },
  'material-request': { key: 'material-request', label: 'Material Request', description: 'Manage material requests', module: 'procurement' },
  'rfq-management': { key: 'rfq-management', label: 'RFQ Management', description: 'Manage RFQs', module: 'procurement' },

  // Operations Module
  'stock-entry': { key: 'stock-entry', label: 'Stock Entry', description: 'Record stock entries', module: 'operations' },
  'stock-ledger': { key: 'stock-ledger', label: 'Stock Ledger', description: 'View stock ledger', module: 'operations' },
  'delivery-note': { key: 'delivery-note', label: 'Delivery Note', description: 'Manage delivery notes', module: 'operations' },
  'quality-inspection': { key: 'quality-inspection', label: 'Quality Inspection', description: 'Perform quality inspections', module: 'operations' },
  'sales-order': { key: 'sales-order', label: 'Sales Order', description: 'Manage sales orders', module: 'operations' },
  'work-order': { key: 'work-order', label: 'Work Order', description: 'Manage work orders', module: 'operations' },
  'shipping-logistics': { key: 'shipping-logistics', label: 'Shipping & Logistics', description: 'Manage shipping and logistics', module: 'operations' },
  'kpi-dashboard': { key: 'kpi-dashboard', label: 'KPI Dashboard', description: 'View KPI metrics', module: 'operations' },
  'stock-transfer': { key: 'stock-transfer', label: 'Stock Transfer', description: 'Manage stock transfers', module: 'operations' },
  'asset-register': { key: 'asset-register', label: 'Asset Register', description: 'Manage asset register', module: 'operations' },

  // Compliance Module
  'audit-trail': { key: 'audit-trail', label: 'Audit Trail', description: 'View audit trails', module: 'compliance' },
  'policy-management': { key: 'policy-management', label: 'Policy Management', description: 'Manage policies', module: 'compliance' },
  'compliance-dashboard': { key: 'compliance-dashboard', label: 'Compliance Dashboard', description: 'Compliance overview', module: 'compliance' },
  'contract-management': { key: 'contract-management', label: 'Contract Management', description: 'Manage contracts', module: 'compliance' },
  'litigation-tracker': { key: 'litigation-tracker', label: 'Litigation Tracker', description: 'Track legal cases', module: 'compliance' },
  'document-repository': { key: 'document-repository', label: 'Document Repository', description: 'Manage legal documents', module: 'compliance' },
};

// Define role-based permissions
export const ROLE_PERMISSIONS: Record<RoleType, RolePermissions> = {
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: 'Super Administrator',
    permissions: Object.keys(PERMISSIONS), // Full access
    defaultRoute: '/super-admin',
  },
  SYSTEM_ADMINISTRATOR: {
    role: 'SYSTEM_ADMINISTRATOR',
    label: 'System Administrator',
    permissions: [
      'system-settings',
      'user-management',
      'permission-manager',
      'audit-logs',
      'backup-restore',
      'scheduler',
      'system-health',
      'integration-settings',
      'error-logs',
    ],
    defaultRoute: '/system/system-settings',
  },
  IT_ADMIN: {
    role: 'IT_ADMIN',
    label: 'IT Administrator',
    permissions: [
      'system-health',
      'integration-settings',
      'error-logs',
      'audit-logs',
      'backup-restore',
    ],
    defaultRoute: '/system/system-health',
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrator',
    permissions: [
      'user-management',
      'audit-logs',
      'system-settings',
    ],
    defaultRoute: '/admin/dashboard',
  },
  CFO: {
    role: 'CFO',
    label: 'Chief Financial Officer',
    permissions: [
      'financial-statements',
      'budgeting',
      'cash-flow',
      'executive-dashboard',
      'general-ledger',
      'trial-balance',
      'tax-reports',
    ],
    defaultRoute: '/finance/executive-dashboard',
  },
  FINANCE_CONTROLLER: {
    role: 'FINANCE_CONTROLLER',
    label: 'Finance Controller',
    permissions: [
      'general-ledger',
      'trial-balance',
      'journal-entries',
      'reconciliation',
      'tax-reports',
      'financial-statements',
    ],
    defaultRoute: '/finance/general-ledger',
  },
  TREASURY: {
    role: 'TREASURY',
    label: 'Treasury Officer',
    permissions: [
      'treasury-management',
      'cash-management',
      'investment-tracking',
      'banking-operations',
      'cash-flow',
    ],
    defaultRoute: '/finance/treasury-management',
  },
  ACCOUNTS: {
    role: 'ACCOUNTS',
    label: 'Accounts Officer',
    permissions: [
      'journal-entries',
      'reconciliation',
      'general-ledger',
      'trial-balance',
      'accounts-payable',
    ],
    defaultRoute: '/finance/journal-entries',
  },
  ACCOUNTS_PAYABLE: {
    role: 'ACCOUNTS_PAYABLE',
    label: 'Accounts Payable Officer',
    permissions: [
      'accounts-payable',
      'vendor-payments',
      'payment-schedules',
    ],
    defaultRoute: '/finance/accounts-payable',
  },
  BANKER: {
    role: 'BANKER',
    label: 'Banking Officer',
    permissions: [
      'banking-operations',
      'bank-reconciliation',
      'cash-management',
    ],
    defaultRoute: '/finance/banking-operations',
  },
  PROCUREMENT_OFFICER: {
    role: 'PROCUREMENT_OFFICER',
    label: 'Procurement Officer',
    permissions: [
      'purchase-request',
      'purchase-order',
      'supplier-master',
      'material-request',
      'rfq-management',
    ],
    defaultRoute: '/procurement/purchase-request',
  },
  STORE_INCHARGE: {
    role: 'STORE_INCHARGE',
    label: 'Store Incharge',
    permissions: [
      'stock-entry',
      'stock-ledger',
      'delivery-note',
      'quality-inspection',
      'material-request',
    ],
    defaultRoute: '/operations/stock-entry',
  },
  OPERATIONS_MANAGER: {
    role: 'OPERATIONS_MANAGER',
    label: 'Operations Manager',
    permissions: [
      'sales-order',
      'work-order',
      'shipping-logistics',
      'kpi-dashboard',
      'stock-ledger',
      'delivery-note',
    ],
    defaultRoute: '/operations/kpi-dashboard',
  },
  HUB_INCHARGE: {
    role: 'HUB_INCHARGE',
    label: 'Hub Incharge',
    permissions: [
      'stock-transfer',
      'delivery-note',
      'asset-register',
      'stock-ledger',
    ],
    defaultRoute: '/hub-incharge',
  },
  COMPLIANCE: {
    role: 'COMPLIANCE',
    label: 'Compliance Officer',
    permissions: [
      'audit-trail',
      'policy-management',
      'compliance-dashboard',
      'audit-logs',
    ],
    defaultRoute: '/compliance/compliance-dashboard',
  },
  LEGAL: {
    role: 'LEGAL',
    label: 'Legal Officer',
    permissions: [
      'contract-management',
      'litigation-tracker',
      'document-repository',
      'compliance-dashboard',
    ],
    defaultRoute: '/compliance/contract-management',
  },
  MANAGER: {
    role: 'MANAGER',
    label: 'Manager',
    permissions: [
      'kpi-dashboard',
      'sales-order',
      'stock-ledger',
      'financial-statements',
    ],
    defaultRoute: '/manager/dashboard',
  },
  STAFF: {
    role: 'STAFF',
    label: 'Staff',
    permissions: [
      'stock-ledger',
      'delivery-note',
      'sales-order',
    ],
    defaultRoute: '/staff/dashboard',
  },
  USER: {
    role: 'USER',
    label: 'User',
    permissions: [],
    defaultRoute: '/dashboard',
  },
};

/**
 * Check if a role has access to a specific permission
 */
export function hasPermission(role: string, permissionKey: string): boolean {
  const normalizedRole = role.toUpperCase().replace(/[\s-]+/g, '_') as RoleType;
  const rolePerms = ROLE_PERMISSIONS[normalizedRole];
  return rolePerms?.permissions.includes(permissionKey) || false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: string): string[] {
  const normalizedRole = role.toUpperCase().replace(/[\s-]+/g, '_') as RoleType;
  return ROLE_PERMISSIONS[normalizedRole]?.permissions || [];
}

/**
 * Get default route for a role
 */
export function getDefaultRoute(role: string): string {
  const normalizedRole = role.toUpperCase().replace(/[\s-]+/g, '_') as RoleType;
  return ROLE_PERMISSIONS[normalizedRole]?.defaultRoute || '/dashboard';
}
