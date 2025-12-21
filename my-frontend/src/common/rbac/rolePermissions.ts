/**
 * Module-Centric Role-Based Access Control (RBAC) Configuration
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROLE HIERARCHY
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * ENTERPRISE Level:
 * - ENTERPRISE_ADMIN: Highest authority, global access (1 per enterprise)
 *   → Can see: System logs, platform billing, deployments, backups, AI training
 *   → Manages: All Super Admins, all tenants
 * 
 * MODULE Level:
 * - SUPER_ADMIN: Module-level admin, creates clients (1+ per module)
 *   → Can see: Client management, module config, tenant oversight
 *   → Manages: Admins and users within assigned clients
 * 
 * CLIENT Level:
 * - ADMIN: Client/Tenant administrator (1+ per client)
 *   → ⚠️ STRICTLY TENANT-ISOLATED - All ADMIN permissions are tenant-scoped
 *   → Can: Manage users within tenant, configure tenant settings, view tenant audit logs
 *   → CANNOT: See system logs, platform billing, deployments, backups, AI training
 * 
 * - Other roles: Client-scoped operational roles (CFO, Manager, Staff, etc.)
 * 
 * There is NO system admin, NO IT admin, NO platform admin.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * USER TYPE DEFINITIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * USER role = Internal employee with no operational permissions
 * - Basic dashboard access only
 * - Tenant-isolated, read-only where applicable
 * 
 * Future User Types (to be implemented):
 * - INTERNAL_USER: Employee with limited operational access
 * - EXTERNAL_USER: Vendor/Customer portal user
 * - READONLY_USER: External stakeholder with view-only access
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMMON PAGES SECURITY GUARDRAILS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Payment Request: Requires role-based approval flows (cannot bypass hierarchy)
 * Chat: Respects tenant + role boundaries (no cross-tenant messaging)
 * Calendar: All data is strictly tenant-isolated
 * 
 * These are enforced at the backend API level, not just frontend.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type RoleLevel = 'ENTERPRISE' | 'MODULE' | 'CLIENT';

export type RoleType =
  | 'ENTERPRISE_ADMIN'
  | 'SUPER_ADMIN'
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
  /** Access level: 'view' = read-only, 'manage' = read/write, 'full' = all actions including delete */
  accessLevel?: 'view' | 'manage' | 'full';
}

export interface RolePermissions {
  role: RoleType;
  label: string;
  level: RoleLevel;
  permissions: string[];
  defaultRoute: string;
  /** Security notes and restrictions for this role */
  securityNotes?: string[];
}

// Define all available permissions
export const PERMISSIONS: Record<string, Permission> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM MODULE - Platform-level (Enterprise/Super Admin only)
  // ═══════════════════════════════════════════════════════════════════════════
  'system-settings': { key: 'system-settings', label: 'System Settings', description: 'Configure system-wide settings', module: 'system', accessLevel: 'full' },
  'user-management': { key: 'user-management', label: 'User Management', description: 'Manage users and accounts', module: 'system', accessLevel: 'full' },
  'permission-manager': { key: 'permission-manager', label: 'Permission Manager', description: 'Manage role permissions', module: 'system', accessLevel: 'full' },
  'audit-logs': { key: 'audit-logs', label: 'Audit Logs', description: 'View system audit trails', module: 'system', accessLevel: 'view' },
  'backup-restore': { key: 'backup-restore', label: 'Backup & Restore', description: 'Manage system backups', module: 'system', accessLevel: 'full' },
  'scheduler': { key: 'scheduler', label: 'Task Scheduler', description: 'Manage scheduled tasks', module: 'system', accessLevel: 'full' },
  'system-health': { key: 'system-health', label: 'System Health', description: 'Monitor system health', module: 'system', accessLevel: 'view' },
  'integration-settings': { key: 'integration-settings', label: 'Integration Settings', description: 'Configure integrations', module: 'system', accessLevel: 'full' },
  'error-logs': { key: 'error-logs', label: 'Error Logs', description: 'View system error logs', module: 'system', accessLevel: 'view' },
  
  // TENANT-SCOPED ADMIN PERMISSIONS (for ADMIN role only)
  'tenant-user-management': { key: 'tenant-user-management', label: 'Tenant User Management', description: 'Manage users within tenant only', module: 'system', accessLevel: 'manage' },
  'tenant-settings': { key: 'tenant-settings', label: 'Tenant Settings', description: 'Configure tenant-level settings', module: 'system', accessLevel: 'manage' },
  'tenant-audit-logs': { key: 'tenant-audit-logs', label: 'Tenant Audit Logs', description: 'View tenant-scoped audit logs only', module: 'system', accessLevel: 'view' },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  // Full authority permissions (CFO, Finance Controller)
  'financial-statements': { key: 'financial-statements', label: 'Financial Statements', description: 'Full access to financial statements', module: 'finance', accessLevel: 'full' },
  'financial-summary-view': { key: 'financial-summary-view', label: 'Financial Summary (View)', description: 'Read-only financial summaries for managers', module: 'finance', accessLevel: 'view' },
  'budgeting': { key: 'budgeting', label: 'Budgeting', description: 'Manage budgets', module: 'finance', accessLevel: 'full' },
  'cash-flow': { key: 'cash-flow', label: 'Cash Flow', description: 'Monitor cash flow', module: 'finance', accessLevel: 'view' },
  'executive-dashboard': { key: 'executive-dashboard', label: 'Executive Dashboard', description: 'Executive-level insights', module: 'finance', accessLevel: 'view' },
  'general-ledger': { key: 'general-ledger', label: 'General Ledger', description: 'Manage general ledger', module: 'finance', accessLevel: 'full' },
  'trial-balance': { key: 'trial-balance', label: 'Trial Balance', description: 'View trial balance', module: 'finance', accessLevel: 'view' },
  'journal-entries': { key: 'journal-entries', label: 'Journal Entries', description: 'Manage journal entries', module: 'finance', accessLevel: 'manage' },
  'reconciliation': { key: 'reconciliation', label: 'Reconciliation', description: 'Perform account reconciliation', module: 'finance', accessLevel: 'manage' },
  'tax-reports': { key: 'tax-reports', label: 'Tax Reports', description: 'Generate tax reports', module: 'finance', accessLevel: 'view' },
  'treasury-management': { key: 'treasury-management', label: 'Treasury Management', description: 'Manage treasury operations', module: 'finance', accessLevel: 'full' },
  'cash-management': { key: 'cash-management', label: 'Cash Management', description: 'Manage cash operations', module: 'finance', accessLevel: 'manage' },
  'investment-tracking': { key: 'investment-tracking', label: 'Investment Tracking', description: 'Track investments', module: 'finance', accessLevel: 'view' },
  'accounts-payable': { key: 'accounts-payable', label: 'Accounts Payable', description: 'Manage accounts payable', module: 'finance', accessLevel: 'manage' },
  'vendor-payments': { key: 'vendor-payments', label: 'Vendor Payments', description: 'Process vendor payments', module: 'finance', accessLevel: 'manage' },
  'payment-schedules': { key: 'payment-schedules', label: 'Payment Schedules', description: 'Manage payment schedules', module: 'finance', accessLevel: 'manage' },
  'banking-operations': { key: 'banking-operations', label: 'Banking Operations', description: 'Manage banking operations', module: 'finance', accessLevel: 'manage' },
  'bank-reconciliation': { key: 'bank-reconciliation', label: 'Bank Reconciliation', description: 'Reconcile bank accounts', module: 'finance', accessLevel: 'manage' },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCUREMENT MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  'purchase-request': { key: 'purchase-request', label: 'Purchase Request', description: 'Create purchase requests', module: 'procurement', accessLevel: 'manage' },
  'purchase-order': { key: 'purchase-order', label: 'Purchase Order', description: 'Manage purchase orders', module: 'procurement', accessLevel: 'manage' },
  'supplier-master': { key: 'supplier-master', label: 'Supplier Master', description: 'Manage supplier database', module: 'procurement', accessLevel: 'manage' },
  'material-request': { key: 'material-request', label: 'Material Request', description: 'Manage material requests', module: 'procurement', accessLevel: 'manage' },
  'rfq-management': { key: 'rfq-management', label: 'RFQ Management', description: 'Manage RFQs', module: 'procurement', accessLevel: 'manage' },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATIONS MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  'stock-entry': { key: 'stock-entry', label: 'Stock Entry', description: 'Record stock entries', module: 'operations', accessLevel: 'manage' },
  'stock-ledger': { key: 'stock-ledger', label: 'Stock Ledger', description: 'View stock ledger', module: 'operations', accessLevel: 'view' },
  'delivery-note': { key: 'delivery-note', label: 'Delivery Note', description: 'Manage delivery notes', module: 'operations', accessLevel: 'manage' },
  'quality-inspection': { key: 'quality-inspection', label: 'Quality Inspection', description: 'Perform quality inspections', module: 'operations', accessLevel: 'manage' },
  'sales-order': { key: 'sales-order', label: 'Sales Order', description: 'Manage sales orders', module: 'operations', accessLevel: 'manage' },
  'work-order': { key: 'work-order', label: 'Work Order', description: 'Manage work orders', module: 'operations', accessLevel: 'manage' },
  'shipping-logistics': { key: 'shipping-logistics', label: 'Shipping & Logistics', description: 'Manage shipping and logistics', module: 'operations', accessLevel: 'manage' },
  'kpi-dashboard': { key: 'kpi-dashboard', label: 'KPI Dashboard', description: 'View KPI metrics', module: 'operations', accessLevel: 'view' },
  'stock-transfer': { key: 'stock-transfer', label: 'Stock Transfer', description: 'Manage stock transfers', module: 'operations', accessLevel: 'manage' },
  'asset-register': { key: 'asset-register', label: 'Asset Register', description: 'Manage asset register', module: 'operations', accessLevel: 'manage' },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE MODULE
  // ═══════════════════════════════════════════════════════════════════════════
  'audit-trail': { key: 'audit-trail', label: 'Audit Trail', description: 'View audit trails', module: 'compliance', accessLevel: 'view' },
  'policy-management': { key: 'policy-management', label: 'Policy Management', description: 'Manage policies', module: 'compliance', accessLevel: 'manage' },
  'compliance-dashboard': { key: 'compliance-dashboard', label: 'Compliance Dashboard', description: 'Compliance overview', module: 'compliance', accessLevel: 'view' },
  'contract-management': { key: 'contract-management', label: 'Contract Management', description: 'Manage contracts', module: 'compliance', accessLevel: 'manage' },
  'litigation-tracker': { key: 'litigation-tracker', label: 'Litigation Tracker', description: 'Track legal cases', module: 'compliance', accessLevel: 'manage' },
  'document-repository': { key: 'document-repository', label: 'Document Repository', description: 'Manage legal documents', module: 'compliance', accessLevel: 'manage' },
};

// Define role-based permissions
export const ROLE_PERMISSIONS: Record<RoleType, RolePermissions> = {
  // Enterprise-level: Global authority
  ENTERPRISE_ADMIN: {
    role: 'ENTERPRISE_ADMIN',
    label: 'Enterprise Administrator',
    level: 'ENTERPRISE',
    permissions: Object.keys(PERMISSIONS), // Full access to everything
    defaultRoute: '/enterprise-admin',
    securityNotes: [
      'Full platform access including system logs, billing, deployments',
      'Can manage all Super Admins and tenants',
      'Has access to AI training and backup/restore functions',
    ],
  },
  
  // Module-level: Manages clients within their module
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    label: 'Super Administrator',
    level: 'MODULE',
    permissions: Object.keys(PERMISSIONS), // Full access within module
    defaultRoute: '/super-admin',
    securityNotes: [
      'Module-scoped access - cannot see other modules',
      'Can create and manage Admins within assigned clients',
      'Cannot access platform billing or system deployments',
    ],
  },
  
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * ADMIN ROLE - STRICTLY TENANT-ISOLATED
   * ═══════════════════════════════════════════════════════════════════════════
   * 
   * ✅ ALLOWED:
   * - Manage users within their tenant ONLY
   * - Configure tenant-level settings
   * - View tenant-scoped audit logs
   * 
   * ❌ NEVER ALLOWED:
   * - See system logs (error-logs, server-logs)
   * - See platform billing
   * - Touch deployment, backups, AI training
   * - Access other tenants' data
   * 
   * All ADMIN permissions are strictly tenant-isolated.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  ADMIN: {
    role: 'ADMIN',
    label: 'Administrator',
    level: 'CLIENT',
    permissions: [
      // ✅ Tenant-scoped permissions ONLY
      'tenant-user-management',  // Manage users within tenant
      'tenant-settings',         // Configure tenant settings
      'tenant-audit-logs',       // View tenant audit logs only
    ],
    defaultRoute: '/admin',
    securityNotes: [
      '⚠️ STRICTLY TENANT-ISOLATED - All permissions are tenant-scoped',
      'CANNOT see: system logs, platform billing, deployments, backups, AI training',
      'Can only manage users and settings within their own tenant',
    ],
  },
  CFO: {
    role: 'CFO',
    label: 'Chief Financial Officer',
    level: 'CLIENT',
    permissions: [
      // Full financial authority
      'financial-statements',    // Full access (not just view)
      'budgeting',
      'cash-flow',
      'executive-dashboard',
      'general-ledger',
      'trial-balance',
      'tax-reports',
    ],
    defaultRoute: '/finance/executive-dashboard',
    securityNotes: [
      'Full financial authority - can view and modify all financial data',
      'Has access to executive-level financial insights',
    ],
  },
  FINANCE_CONTROLLER: {
    role: 'FINANCE_CONTROLLER',
    label: 'Finance Controller',
    level: 'CLIENT',
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
    level: 'CLIENT',
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
    level: 'CLIENT',
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
    level: 'CLIENT',
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
    level: 'CLIENT',
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
    level: 'CLIENT',
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
    level: 'CLIENT',
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
    level: 'CLIENT',
    permissions: [
      'sales-order',
      'work-order',
      'shipping-logistics',
      'kpi-dashboard',
      'stock-ledger',
      'delivery-note',
    ],
    defaultRoute: '/operations-manager',
  },
  HUB_INCHARGE: {
    role: 'HUB_INCHARGE',
    label: 'Hub Incharge',
    level: 'CLIENT',
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
    level: 'CLIENT',
    permissions: [
      'audit-trail',
      'policy-management',
      'compliance-dashboard',
      'tenant-audit-logs',  // Changed from audit-logs to tenant-scoped
    ],
    defaultRoute: '/compliance/compliance-dashboard',
  },
  LEGAL: {
    role: 'LEGAL',
    label: 'Legal Officer',
    level: 'CLIENT',
    permissions: [
      'contract-management',
      'litigation-tracker',
      'document-repository',
      'compliance-dashboard',
    ],
    defaultRoute: '/compliance/contract-management',
  },
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * MANAGER ROLE - Operations Focus with Limited Financial Visibility
   * ═══════════════════════════════════════════════════════════════════════════
   * 
   * ✅ Gets: Read-only financial summaries (financial-summary-view)
   * ❌ Does NOT get: Full financial statements (that's CFO/Finance Controller)
   * 
   * This separation ensures:
   * - Manager can see operational KPIs and summaries
   * - CFO retains full financial authority
   * ═══════════════════════════════════════════════════════════════════════════
   */
  MANAGER: {
    role: 'MANAGER',
    label: 'Manager (Operations)',
    level: 'CLIENT',
    permissions: [
      'kpi-dashboard',
      'sales-order',
      'stock-ledger',
      'financial-summary-view',  // READ-ONLY summaries, NOT full financial-statements
    ],
    defaultRoute: '/operations-manager',
    securityNotes: [
      'Has READ-ONLY access to financial summaries',
      'Does NOT have full financial statement access (CFO/Finance Controller only)',
      'Focus is on operational metrics, not financial authority',
    ],
  },
  STAFF: {
    role: 'STAFF',
    label: 'Staff',
    level: 'CLIENT',
    permissions: [
      'stock-ledger',
      'delivery-note',
      'sales-order',
    ],
    defaultRoute: '/staff/dashboard',
  },
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * USER ROLE - Internal Employee with No Operational Permissions
   * ═══════════════════════════════════════════════════════════════════════════
   * 
   * Definition: USER = Internal employee with basic dashboard access only
   * - Tenant-isolated
   * - Read-only where applicable
   * - No operational permissions
   * 
   * ⚠️ FUTURE USER TYPES (To Be Implemented):
   * - INTERNAL_USER: Employee with limited operational access
   * - EXTERNAL_USER: Vendor/Customer portal user
   * - READONLY_USER: External stakeholder with view-only access
   * 
   * For now, USER is the baseline role for internal employees who need
   * system access but no specific operational permissions.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  USER: {
    role: 'USER',
    label: 'User',
    level: 'CLIENT',
    permissions: [],  // No operational permissions - dashboard access only
    defaultRoute: '/dashboard',
    securityNotes: [
      'Internal employee with no operational permissions',
      'Basic dashboard and common pages access only',
      'Tenant-isolated, read-only where applicable',
      'Future: Will be split into INTERNAL_USER, EXTERNAL_USER, READONLY_USER',
    ],
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMMON PAGES SECURITY ENFORCEMENT CHECKLIST
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * These pages are available to all roles but require backend enforcement:
 * 
 * ✅ Payment Request
 *    - Requires role-based approval flows
 *    - Cannot bypass approval hierarchy
 *    - Backend validates approver permissions
 * 
 * ✅ Chat
 *    - Respects tenant + role boundaries
 *    - No cross-tenant messaging allowed
 *    - Message history is tenant-isolated
 * 
 * ✅ Calendar
 *    - All data is strictly tenant-isolated
 *    - Cannot view other tenants' events
 *    - Backend filters by tenant_id
 * 
 * These guardrails are enforced at the backend API level, not just frontend.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

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

/**
 * Get security notes for a role
 */
export function getRoleSecurityNotes(role: string): string[] {
  const normalizedRole = role.toUpperCase().replace(/[\s-]+/g, '_') as RoleType;
  return ROLE_PERMISSIONS[normalizedRole]?.securityNotes || [];
}

/**
 * Check if a permission has a specific access level
 */
export function getPermissionAccessLevel(permissionKey: string): 'view' | 'manage' | 'full' | undefined {
  return PERMISSIONS[permissionKey]?.accessLevel;
}