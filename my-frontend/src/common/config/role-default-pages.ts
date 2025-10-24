/**
 * Role-Based Default Pages Configuration
 * Defines default page access for each role
 */

export interface RoleDefaultPages {
  role: string;
  defaultPages: string[];
  description: string;
}

/**
 * Default Page Registry for Each Role
 * Maps role names to their default accessible pages
 */
export const ROLE_DEFAULT_PAGES: RoleDefaultPages[] = [
  // ==================== SUPER ADMIN ====================
  {
    role: 'SUPER_ADMIN',
    description: 'Full system access - all pages',
    defaultPages: ['*'], // Wildcard means all pages
  },

  // ==================== SYSTEM ADMINISTRATION ====================
  {
    role: 'ADMIN',
    description: 'System administrator with broad access',
    defaultPages: [
      'dashboard',
      'admin',
      'system-settings',
      'user-management',
      'permission-manager',
      'audit-logs',
      'backup-restore',
      'system-health',
      'integration-settings',
      'error-logs',
    ],
  },
  {
    role: 'SYSTEM ADMINISTRATOR',
    description: 'System configuration and management',
    defaultPages: [
      'dashboard',
      'admin',
      'system-settings',
      'user-management',
      'audit-logs',
      'backup-restore',
      'scheduler',
      'system-health',
      'integration-settings',
    ],
  },
  {
    role: 'IT ADMIN',
    description: 'IT support and system maintenance',
    defaultPages: [
      'dashboard',
      'it-admin',
      'system-settings',
      'system-health',
      'error-logs',
      'server-logs',
    ],
  },

  // ==================== FINANCE ROLES ====================
  {
    role: 'CFO',
    description: 'Chief Financial Officer - Financial oversight',
    defaultPages: [
      'dashboard',
      'cfo-dashboard',
      'finance/executive-dashboard',
      'finance/general-ledger',
      'finance/financial-statements',
      'finance/cash-flow-statement',
      'finance/budget-management',
      'finance/financial-planning',
      'finance/cost-analysis',
      'finance/accounts-payable-summary',
      'finance/accounts-receivable-summary',
    ],
  },
  {
    role: 'FINANCE CONTROLLER',
    description: 'Financial reporting and control',
    defaultPages: [
      'dashboard',
      'finance-controller',
      'finance/general-ledger',
      'finance/financial-statements',
      'finance/accounts-payable-summary',
      'finance/accounts-receivable-summary',
      'finance/inter-company-reconciliation',
      'finance/month-end-close',
    ],
  },
  {
    role: 'TREASURY',
    description: 'Cash and liquidity management',
    defaultPages: [
      'dashboard',
      'treasury',
      'finance/cash-flow-statement',
      'finance/bank-reconciliation',
      'finance/payment-approval-queue',
      'finance/credit-management',
    ],
  },
  {
    role: 'ACCOUNTS',
    description: 'General accounting operations',
    defaultPages: [
      'dashboard',
      'accounts',
      'finance/general-ledger',
      'finance/journal-entries',
      'finance/accounts-payable-summary',
      'finance/accounts-receivable-summary',
    ],
  },
  {
    role: 'ACCOUNTS PAYABLE',
    description: 'Vendor payments and payables',
    defaultPages: [
      'dashboard',
      'accounts-payable',
      'finance/accounts-payable-summary',
      'finance/vendor-management',
      'finance/purchase-invoice',
      'finance/payment-approval-queue',
    ],
  },
  {
    role: 'ACCOUNTS RECEIVABLE',
    description: 'Customer collections and receivables',
    defaultPages: [
      'dashboard',
      'finance/accounts-receivable-summary',
      'finance/customer-management',
      'finance/invoice-management',
      'finance/credit-management',
    ],
  },
  {
    role: 'BANKER',
    description: 'Banking operations and reconciliation',
    defaultPages: [
      'dashboard',
      'banker',
      'finance/bank-reconciliation',
      'finance/cash-flow-statement',
      'finance/payment-approval-queue',
    ],
  },

  // ==================== PROCUREMENT ROLES ====================
  {
    role: 'PROCUREMENT OFFICER',
    description: 'Purchase order management',
    defaultPages: [
      'dashboard',
      'procurement-officer',
      'procurement/purchase-orders',
      'procurement/vendor-management',
      'procurement/purchase-requisitions',
      'procurement/rfq-management',
    ],
  },
  {
    role: 'PROCUREMENT HEAD',
    description: 'Procurement strategy and oversight',
    defaultPages: [
      'dashboard',
      'procurement/purchase-orders',
      'procurement/vendor-management',
      'procurement/purchase-requisitions',
      'procurement/rfq-management',
      'procurement/contract-management',
      'procurement/spend-analysis',
    ],
  },
  {
    role: 'PROCUREMENT MANAGER',
    description: 'Procurement operations management',
    defaultPages: [
      'dashboard',
      'procurement/purchase-orders',
      'procurement/vendor-management',
      'procurement/purchase-requisitions',
      'procurement/rfq-management',
    ],
  },
  {
    role: 'SUPPLIER MANAGER',
    description: 'Supplier relationship management',
    defaultPages: [
      'dashboard',
      'procurement/vendor-management',
      'procurement/supplier-performance',
      'procurement/contract-management',
    ],
  },

  // ==================== OPERATIONS ROLES ====================
  {
    role: 'OPERATIONS MANAGER',
    description: 'Operational oversight and KPIs',
    defaultPages: [
      'dashboard',
      'operations-manager',
      'operations/kpi-dashboard',
      'operations/inventory-management',
      'operations/production-planning',
      'operations/quality-control',
    ],
  },
  {
    role: 'STORE INCHARGE',
    description: 'Store and inventory management',
    defaultPages: [
      'dashboard',
      'store-incharge',
      'operations/inventory-management',
      'operations/stock-management',
      'operations/goods-receipt',
      'operations/goods-issue',
      'procurement/purchase-orders',
    ],
  },
  {
    role: 'HUB INCHARGE',
    description: 'Distribution hub operations',
    defaultPages: [
      'dashboard',
      'hub-incharge-dashboard',
      'delivery-note',
      'material-receipt',
      'goods-receipt-note',
      'goods-issue-note',
    ],
  },
  {
    role: 'HUB_INCHARGE',
    description: 'Distribution hub operations (underscore format)',
    defaultPages: [
      'dashboard',
      'hub-incharge-dashboard',
      'delivery-note',
      'material-receipt',
      'goods-receipt-note',
      'goods-issue-note',
    ],
  },
  {
    role: 'WAREHOUSE MANAGER',
    description: 'Warehouse operations and logistics',
    defaultPages: [
      'dashboard',
      'operations/warehouse-management',
      'operations/inventory-management',
      'operations/stock-management',
      'operations/goods-receipt',
      'operations/goods-issue',
    ],
  },
  {
    role: 'LOGISTICS MANAGER',
    description: 'Transportation and logistics',
    defaultPages: [
      'dashboard',
      'operations/dispatch-management',
      'operations/route-optimization',
      'operations/fleet-management',
    ],
  },
  {
    role: 'INVENTORY CONTROLLER',
    description: 'Inventory tracking and control',
    defaultPages: [
      'dashboard',
      'operations/inventory-management',
      'operations/stock-management',
      'operations/cycle-counting',
      'operations/stock-adjustments',
    ],
  },

  // ==================== COMPLIANCE & LEGAL ====================
  {
    role: 'COMPLIANCE',
    description: 'Regulatory compliance monitoring',
    defaultPages: [
      'dashboard',
      'compliance-officer',
      'compliance/compliance-dashboard',
      'compliance/regulatory-filings',
      'compliance/audit-management',
      'compliance/policy-management',
    ],
  },
  {
    role: 'COMPLIANCE OFFICER',
    description: 'Compliance oversight and reporting',
    defaultPages: [
      'dashboard',
      'compliance-officer',
      'compliance/compliance-dashboard',
      'compliance/regulatory-filings',
      'compliance/audit-management',
      'compliance/risk-assessment',
      'compliance/policy-management',
    ],
  },
  {
    role: 'LEGAL',
    description: 'Legal matters and contracts',
    defaultPages: [
      'dashboard',
      'legal',
      'compliance/legal-case-management',
      'compliance/contract-management',
      'compliance/document-management',
    ],
  },
  {
    role: 'LEGAL HEAD',
    description: 'Legal department management',
    defaultPages: [
      'dashboard',
      'legal',
      'compliance/legal-case-management',
      'compliance/contract-management',
      'compliance/compliance-dashboard',
      'compliance/document-management',
    ],
  },
  {
    role: 'RISK MANAGER',
    description: 'Risk assessment and mitigation',
    defaultPages: [
      'dashboard',
      'compliance/risk-assessment',
      'compliance/compliance-dashboard',
      'compliance/audit-management',
    ],
  },

  // ==================== GENERAL ROLES ====================
  {
    role: 'MANAGER',
    description: 'Department management',
    defaultPages: [
      'dashboard',
      'manager',
      'operations/kpi-dashboard',
      'task-dashboard',
    ],
  },
  {
    role: 'STAFF',
    description: 'General staff access',
    defaultPages: [
      'dashboard',
      'staff',
      'task-dashboard',
    ],
  },
];

/**
 * Get default pages for a specific role
 */
export function getDefaultPagesForRole(roleName: string): string[] {
  const normalizedRole = roleName.toUpperCase().trim();
  
  // Find exact match
  const roleConfig = ROLE_DEFAULT_PAGES.find(
    r => r.role.toUpperCase() === normalizedRole
  );
  
  if (roleConfig) {
    // If wildcard, return empty array (will be handled by caller to grant all)
    if (roleConfig.defaultPages.includes('*')) {
      return ['*'];
    }
    return roleConfig.defaultPages;
  }
  
  // Fallback: return basic dashboard only
  return ['dashboard'];
}

/**
 * Check if role should have all pages
 */
export function roleHasAllAccess(roleName: string): boolean {
  const defaultPages = getDefaultPagesForRole(roleName);
  return defaultPages.includes('*');
}

/**
 * Get role description
 */
export function getRoleDescription(roleName: string): string {
  const normalizedRole = roleName.toUpperCase().trim();
  const roleConfig = ROLE_DEFAULT_PAGES.find(
    r => r.role.toUpperCase() === normalizedRole
  );
  return roleConfig?.description || 'Standard user access';
}

/**
 * Get all roles with their default page counts
 */
export function getAllRolesWithPageCounts(): Array<{
  role: string;
  description: string;
  pageCount: number | string;
}> {
  return ROLE_DEFAULT_PAGES.map(config => ({
    role: config.role,
    description: config.description,
    pageCount: config.defaultPages.includes('*') ? 'All' : config.defaultPages.length,
  }));
}
