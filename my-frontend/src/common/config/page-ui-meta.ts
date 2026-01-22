/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PAGE UI METADATA - BISMAN ERP
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file contains UI-ONLY metadata for pages (icons, descriptions, display names).
 * 
 * ⚠️ THIS IS NOT THE SOURCE OF TRUTH FOR NAVIGATION OR ACCESS CONTROL!
 * 
 * Navigation/Menu: Comes from /api/menu/sidebar (database-driven)
 * Access Control: Enforced in backend via RBAC middleware
 * 
 * This file is used for:
 * - Icon lookups when sidebar doesn't specify one
 * - Page descriptions for tooltips/SEO
 * - Display name fallbacks
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface PageUIMeta {
  iconKey: string;
  description?: string;
  displayName?: string;
  keywords?: string[];
}

/**
 * UI Metadata keyed by page_code (same as page ID)
 * Used as fallback when DB doesn't have icon/description
 */
export const PAGE_UI_META: Record<string, PageUIMeta> = {
  // ==================== SUPER ADMIN PAGES ====================
  'super-admin-dashboard': {
    iconKey: 'LayoutDashboard',
    description: 'Super Admin overview and system statistics',
    displayName: 'Dashboard',
  },
  'super-admin-tenants': {
    iconKey: 'Building2',
    description: 'Manage all tenant organizations',
    displayName: 'Tenant Management',
  },
  'super-admin-modules': {
    iconKey: 'Puzzle',
    description: 'Configure system modules and features',
    displayName: 'Module Management',
  },
  'super-admin-users': {
    iconKey: 'Users',
    description: 'Manage super admin users',
    displayName: 'User Management',
  },
  'super-admin-roles': {
    iconKey: 'Shield',
    description: 'Configure system-wide roles',
    displayName: 'Role Management',
  },
  'super-admin-subscriptions': {
    iconKey: 'CreditCard',
    description: 'Manage subscription plans',
    displayName: 'Subscriptions',
  },
  'super-admin-logs': {
    iconKey: 'FileText',
    description: 'System audit logs',
    displayName: 'Audit Logs',
  },
  'super-admin-settings': {
    iconKey: 'Settings',
    description: 'System-wide settings',
    displayName: 'Settings',
  },

  // ==================== ENTERPRISE ADMIN PAGES ====================
  'enterprise-admin-dashboard': {
    iconKey: 'LayoutDashboard',
    description: 'Enterprise Admin overview',
    displayName: 'Dashboard',
  },
  'enterprise-admin-roles': {
    iconKey: 'Shield',
    description: 'Configure enterprise roles',
    displayName: 'Role Management',
  },
  'enterprise-admin-users': {
    iconKey: 'Users',
    description: 'Manage enterprise users',
    displayName: 'Super Admins',
  },
  'enterprise-admin-billing': {
    iconKey: 'CreditCard',
    description: 'Billing and subscription management',
    displayName: 'Billing Management',
  },
  'enterprise-admin-monitoring': {
    iconKey: 'Activity',
    description: 'System monitoring dashboard',
    displayName: 'System Monitoring',
  },
  'pages-report': {
    iconKey: 'FileText',
    description: 'Compare pages across registry and backend',
    displayName: 'Pages Report',
  },

  // ==================== FINANCE PAGES ====================
  'executive-dashboard': {
    iconKey: 'BarChart3',
    description: 'Executive financial overview',
    displayName: 'Executive Dashboard',
  },
  'accounts-payable': {
    iconKey: 'ArrowDownCircle',
    description: 'Manage accounts payable',
    displayName: 'Accounts Payable',
  },
  'accounts-receivable': {
    iconKey: 'ArrowUpCircle',
    description: 'Manage accounts receivable',
    displayName: 'Accounts Receivable',
  },
  'general-ledger': {
    iconKey: 'Book',
    description: 'General ledger management',
    displayName: 'General Ledger',
  },
  'budget-management': {
    iconKey: 'Wallet',
    description: 'Budget planning and tracking',
    displayName: 'Budget Management',
  },
  'bank-reconciliation': {
    iconKey: 'Building',
    description: 'Bank statement reconciliation',
    displayName: 'Bank Reconciliation',
  },
  'financial-reports': {
    iconKey: 'FileSpreadsheet',
    description: 'Financial reporting and analytics',
    displayName: 'Financial Reports',
  },
  'tax-management': {
    iconKey: 'Receipt',
    description: 'Tax compliance and filing',
    displayName: 'Tax Management',
  },

  // ==================== OPERATIONS PAGES ====================
  'operations-dashboard': {
    iconKey: 'Activity',
    description: 'Operations overview',
    displayName: 'Operations Dashboard',
  },
  'warehouse-management': {
    iconKey: 'Warehouse',
    description: 'Warehouse and inventory management',
    displayName: 'Warehouse',
  },
  'inventory-management': {
    iconKey: 'Package',
    description: 'Inventory tracking and control',
    displayName: 'Inventory',
  },
  'logistics': {
    iconKey: 'Truck',
    description: 'Logistics and delivery management',
    displayName: 'Logistics',
  },
  'delivery-tracking': {
    iconKey: 'MapPin',
    description: 'Track deliveries in real-time',
    displayName: 'Delivery Tracking',
  },

  // ==================== PROCUREMENT PAGES ====================
  'procurement-dashboard': {
    iconKey: 'ShoppingCart',
    description: 'Procurement overview',
    displayName: 'Procurement Dashboard',
  },
  'purchase-orders': {
    iconKey: 'ClipboardList',
    description: 'Manage purchase orders',
    displayName: 'Purchase Orders',
  },
  'vendor-management': {
    iconKey: 'Users',
    description: 'Vendor relationship management',
    displayName: 'Vendors',
  },
  'rfq-management': {
    iconKey: 'FileQuestion',
    description: 'Request for quotation management',
    displayName: 'RFQ Management',
  },

  // ==================== COMPLIANCE PAGES ====================
  'compliance-dashboard': {
    iconKey: 'ShieldCheck',
    description: 'Compliance overview',
    displayName: 'Compliance Dashboard',
  },
  'audit-trail': {
    iconKey: 'History',
    description: 'System audit trail',
    displayName: 'Audit Trail',
  },
  'policy-management': {
    iconKey: 'FileText',
    description: 'Policy documentation',
    displayName: 'Policy Management',
  },
  'regulatory-templates': {
    iconKey: 'FileCheck',
    description: 'Regulatory report templates',
    displayName: 'Report Templates',
  },

  // ==================== COMMON PAGES ====================
  'dashboard': {
    iconKey: 'LayoutDashboard',
    description: 'Main dashboard',
    displayName: 'Dashboard',
  },
  'profile': {
    iconKey: 'User',
    description: 'User profile settings',
    displayName: 'Profile',
  },
  'notifications': {
    iconKey: 'Bell',
    description: 'Notifications center',
    displayName: 'Notifications',
  },
  'calendar': {
    iconKey: 'Calendar',
    description: 'Calendar and scheduling',
    displayName: 'Calendar',
  },
  'chat': {
    iconKey: 'MessageSquare',
    description: 'Team chat and messaging',
    displayName: 'Chat',
  },
  'help-center': {
    iconKey: 'HelpCircle',
    description: 'Help and documentation',
    displayName: 'Help Center',
  },
  'settings': {
    iconKey: 'Settings',
    description: 'User settings',
    displayName: 'Settings',
  },

  // ==================== BILLING PAGES ====================
  'billing-overview': {
    iconKey: 'CreditCard',
    description: 'Subscription and billing overview',
    displayName: 'Subscription',
  },
  'billing-invoices': {
    iconKey: 'FileText',
    description: 'Invoices and payment history',
    displayName: 'Invoices & Payments',
  },
  'pricing': {
    iconKey: 'Tag',
    description: 'View subscription plans and pricing',
    displayName: 'Pricing',
  },

  // ==================== SYSTEM PAGES ====================
  'user-management': {
    iconKey: 'Users',
    description: 'Manage system users',
    displayName: 'User Management',
  },
  'permission-manager': {
    iconKey: 'Key',
    description: 'Configure permissions',
    displayName: 'Permission Manager',
  },
  'system-health': {
    iconKey: 'Activity',
    description: 'System health monitoring',
    displayName: 'System Health',
  },
  'backup-restore': {
    iconKey: 'Database',
    description: 'Backup and restore management',
    displayName: 'Backup & Restore',
  },
  'error-logs': {
    iconKey: 'AlertCircle',
    description: 'System error logs',
    displayName: 'Error Logs',
  },
};

/**
 * Get UI metadata for a page code
 * Returns default values if page not found
 */
export function getPageUIMeta(pageCode: string): PageUIMeta {
  return PAGE_UI_META[pageCode] || {
    iconKey: 'Circle',
    description: '',
    displayName: pageCode.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
  };
}

/**
 * Get icon key for a page (with fallback)
 */
export function getPageIcon(pageCode: string, fallback = 'Circle'): string {
  return PAGE_UI_META[pageCode]?.iconKey || fallback;
}

/**
 * Merge backend menu data with UI metadata
 * Used by sidebar to add icons/descriptions from UI meta
 */
export function mergeWithUIMeta<T extends { id: string; iconKey?: string; description?: string }>(
  menuItems: T[]
): (T & { iconKey: string; description: string })[] {
  return menuItems.map(item => {
    const meta = getPageUIMeta(item.id);
    return {
      ...item,
      iconKey: item.iconKey || meta.iconKey,
      description: item.description || meta.description || '',
    };
  });
}

export default PAGE_UI_META;
