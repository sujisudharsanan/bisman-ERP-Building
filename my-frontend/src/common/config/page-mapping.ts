/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * UNIFIED PAGE MAPPING SYSTEM - BISMAN ERP
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This file provides a SIMPLIFIED and UNIFIED mapping system for:
 * 1. Pages → Routes (URL paths)
 * 2. Pages → Sidebar visibility
 * 3. Pages → Modules
 * 4. Pages → Icons and metadata
 * 
 * Use this instead of scattered configurations across multiple files.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleKey = 
  | 'enterprise-admin'
  | 'super-admin'
  | 'admin'
  | 'system'
  | 'finance'
  | 'procurement'
  | 'operations'
  | 'compliance'
  | 'hr'
  | 'billing'
  | 'common'
  | 'chat'
  | 'pump-management'
  | 'crm'
  | 'inventory'
  | 'sales';

export interface PageDefinition {
  id: string;           // Unique page identifier (e.g., 'enterprise-admin-dashboard')
  name: string;         // Display name (e.g., 'Dashboard')
  route: string;        // URL path (e.g., '/enterprise-admin/dashboard')
  module: ModuleKey;    // Parent module
  icon?: string;        // Icon name from lucide-react (e.g., 'LayoutDashboard')
  
  // Visibility
  showInSidebar: boolean;       // Show in sidebar navigation?
  showInModulePages: boolean;   // Show in module management page count?
  
  // Access control
  roles: string[];              // Which roles can access this page
  isProtected?: boolean;        // Cannot be unassigned from certain users
  
  // Metadata
  description?: string;
  order?: number;               // Display order in sidebar (lower = higher)
  badge?: string;               // Badge text like "New", "Beta"
  parentPageId?: string;        // For nested pages (e.g., '/monitoring/database' → 'enterprise-admin-monitoring')
  status?: 'active' | 'coming-soon' | 'disabled';
}

export interface ModuleDefinition {
  id: ModuleKey;
  name: string;
  description: string;
  icon: string;           // Icon name from lucide-react
  color: string;          // Tailwind color (e.g., 'blue', 'green')
  order: number;          // Display order
  
  // Access control
  isProtected?: boolean;          // Cannot be removed from certain roles
  protectedForRoles?: string[];   // Roles for which this module is always assigned
  alwaysAccessible?: boolean;     // Accessible to ALL users
  hideFromAssignment?: boolean;   // Don't show in module assignment UI
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const MODULE_DEFINITIONS: Record<ModuleKey, ModuleDefinition> = {
  'enterprise-admin': {
    id: 'enterprise-admin',
    name: 'Enterprise Admin',
    description: 'Enterprise-wide administration and monitoring',
    icon: 'Globe',
    color: 'purple',
    order: 0,
    isProtected: true,
    protectedForRoles: ['ENTERPRISE_ADMIN'],
    hideFromAssignment: true, // Enterprise Admin role automatically gets this
  },
  'super-admin': {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'Super Admin management and system control',
    icon: 'Shield',
    color: 'indigo',
    order: 1,
    isProtected: true,
    protectedForRoles: ['SUPER_ADMIN'],
    hideFromAssignment: true, // Super Admin role automatically gets this
  },
  'admin': {
    id: 'admin',
    name: 'Admin Console',
    description: 'Platform administration',
    icon: 'Settings',
    color: 'slate',
    order: 2,
    isProtected: true,
    protectedForRoles: ['ADMIN', 'SUPER_ADMIN'],
  },
  'system': {
    id: 'system',
    name: 'System Administration',
    description: 'System management and configuration',
    icon: 'Server',
    color: 'blue',
    order: 3,
    isProtected: true,
    protectedForRoles: ['SUPER_ADMIN'],
  },
  'common': {
    id: 'common',
    name: 'Common',
    description: 'Common pages accessible to all users',
    icon: 'Home',
    color: 'gray',
    order: 99,
    alwaysAccessible: true,
  },
  'chat': {
    id: 'chat',
    name: 'Chat & Communication',
    description: 'Messaging and communication tools',
    icon: 'MessageCircle',
    color: 'green',
    order: 98,
    alwaysAccessible: true,
  },
  'finance': {
    id: 'finance',
    name: 'Finance & Accounting',
    description: 'Financial management and reporting',
    icon: 'DollarSign',
    color: 'green',
    order: 10,
  },
  'procurement': {
    id: 'procurement',
    name: 'Procurement',
    description: 'Purchase and supplier management',
    icon: 'ShoppingCart',
    color: 'purple',
    order: 11,
  },
  'operations': {
    id: 'operations',
    name: 'Operations',
    description: 'Operational workflows and inventory',
    icon: 'Package',
    color: 'orange',
    order: 12,
  },
  'compliance': {
    id: 'compliance',
    name: 'Compliance & Legal',
    description: 'Compliance and legal management',
    icon: 'Scale',
    color: 'red',
    order: 13,
  },
  'hr': {
    id: 'hr',
    name: 'Human Resources',
    description: 'HR management and employee operations',
    icon: 'Users',
    color: 'teal',
    order: 14,
  },
  'billing': {
    id: 'billing',
    name: 'Billing & Subscription',
    description: 'Subscription management and invoices',
    icon: 'CreditCard',
    color: 'indigo',
    order: 15,
  },
  'pump-management': {
    id: 'pump-management',
    name: 'Pump Management',
    description: 'Pump operations and diagnostics',
    icon: 'Factory',
    color: 'amber',
    order: 16,
  },
  'crm': {
    id: 'crm',
    name: 'CRM',
    description: 'Customer relationship management',
    icon: 'Users',
    color: 'blue',
    order: 17,
  },
  'inventory': {
    id: 'inventory',
    name: 'Inventory',
    description: 'Inventory and stock management',
    icon: 'Package',
    color: 'yellow',
    order: 18,
  },
  'sales': {
    id: 'sales',
    name: 'Sales',
    description: 'Sales and order management',
    icon: 'TrendingUp',
    color: 'emerald',
    order: 19,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_DEFINITIONS: PageDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ENTERPRISE ADMIN PAGES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'enterprise-admin-dashboard',
    name: 'Enterprise Dashboard',
    route: '/enterprise-admin/dashboard',
    module: 'enterprise-admin',
    icon: 'LayoutDashboard',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 1,
  },
  {
    id: 'enterprise-admin-modules',
    name: 'Module Management',
    route: '/enterprise-admin/modules',
    module: 'enterprise-admin',
    icon: 'Layers',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 2,
  },
  {
    id: 'enterprise-admin-roles',
    name: 'Role Management',
    route: '/enterprise-admin/roles',
    module: 'enterprise-admin',
    icon: 'Shield',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 3,
  },
  {
    id: 'enterprise-admin-super-admins',
    name: 'Super Admins',
    route: '/enterprise-admin/super-admins',
    module: 'enterprise-admin',
    icon: 'Users',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 4,
  },
  {
    id: 'enterprise-admin-super-admins-create',
    name: 'Create Super Admin',
    route: '/enterprise-admin/super-admins/create',
    module: 'enterprise-admin',
    icon: 'UserPlus',
    showInSidebar: false, // Accessed from Super Admins page
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    parentPageId: 'enterprise-admin-super-admins',
  },
  {
    id: 'enterprise-admin-subscription-access',
    name: 'Subscription Access',
    route: '/enterprise-admin/subscription-access',
    module: 'enterprise-admin',
    icon: 'CreditCard',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 5,
  },
  {
    id: 'enterprise-admin-subscriptions',
    name: 'Subscriptions',
    route: '/enterprise-admin/subscriptions',
    module: 'enterprise-admin',
    icon: 'CreditCard',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 6,
  },
  {
    id: 'enterprise-admin-billing',
    name: 'Billing Management',
    route: '/enterprise-admin/billing',
    module: 'enterprise-admin',
    icon: 'DollarSign',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 7,
  },
  {
    id: 'enterprise-admin-users',
    name: 'Users',
    route: '/enterprise-admin/users',
    module: 'enterprise-admin',
    icon: 'Users',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 8,
  },
  {
    id: 'enterprise-admin-organizations',
    name: 'Organizations',
    route: '/enterprise-admin/organizations',
    module: 'enterprise-admin',
    icon: 'Building',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 9,
  },
  {
    id: 'enterprise-admin-logs',
    name: 'System Logs',
    route: '/enterprise-admin/logs',
    module: 'enterprise-admin',
    icon: 'ScrollText',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 10,
  },
  {
    id: 'enterprise-admin-activity-logs',
    name: 'Activity Logs',
    route: '/enterprise-admin/activity-logs',
    module: 'enterprise-admin',
    icon: 'Activity',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 11,
  },
  {
    id: 'enterprise-admin-audit',
    name: 'Audit',
    route: '/enterprise-admin/audit',
    module: 'enterprise-admin',
    icon: 'FileText',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 12,
  },
  {
    id: 'enterprise-admin-monitoring',
    name: 'System Monitoring',
    route: '/enterprise-admin/monitoring',
    module: 'enterprise-admin',
    icon: 'Monitor',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 13,
  },
  {
    id: 'enterprise-admin-monitoring-database',
    name: 'Database Monitoring',
    route: '/enterprise-admin/monitoring/database',
    module: 'enterprise-admin',
    icon: 'Database',
    showInSidebar: false, // Accessed from Monitoring page
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    parentPageId: 'enterprise-admin-monitoring',
  },
  {
    id: 'enterprise-admin-monitoring-live',
    name: 'Live Monitoring',
    route: '/enterprise-admin/monitoring/live',
    module: 'enterprise-admin',
    icon: 'Activity',
    showInSidebar: false, // Accessed from Monitoring page
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    parentPageId: 'enterprise-admin-monitoring',
  },
  {
    id: 'enterprise-admin-monitoring-performance',
    name: 'Performance Monitoring',
    route: '/enterprise-admin/monitoring/performance',
    module: 'enterprise-admin',
    icon: 'TrendingUp',
    showInSidebar: false, // Accessed from Monitoring page
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    parentPageId: 'enterprise-admin-monitoring',
  },
  {
    id: 'enterprise-admin-integrations',
    name: 'Integrations',
    route: '/enterprise-admin/integrations',
    module: 'enterprise-admin',
    icon: 'Zap',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 14,
  },
  {
    id: 'enterprise-admin-rbac-security',
    name: 'RBAC Security',
    route: '/enterprise-admin/rbac-security',
    module: 'enterprise-admin',
    icon: 'Lock',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 15,
  },
  {
    id: 'enterprise-admin-security-operations',
    name: 'Security Operations',
    route: '/enterprise-admin/security-operations',
    module: 'enterprise-admin',
    icon: 'ShieldCheck',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 16,
  },
  {
    id: 'enterprise-admin-page-governance',
    name: 'Page Governance',
    route: '/enterprise-admin/page-governance',
    module: 'enterprise-admin',
    icon: 'FileCheck',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 17,
  },
  {
    id: 'enterprise-admin-pages-report',
    name: 'Pages Report',
    route: '/enterprise-admin/pages-report',
    module: 'enterprise-admin',
    icon: 'BarChart3',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 18,
  },
  {
    id: 'enterprise-admin-reports',
    name: 'Reports',
    route: '/enterprise-admin/reports',
    module: 'enterprise-admin',
    icon: 'FileText',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 19,
  },
  {
    id: 'enterprise-admin-notifications',
    name: 'Notifications',
    route: '/enterprise-admin/notifications',
    module: 'enterprise-admin',
    icon: 'Bell',
    showInSidebar: true,
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
    order: 20,
  },
  {
    id: 'enterprise-admin-docs-production-ready',
    name: 'Production Ready Docs',
    route: '/enterprise-admin/docs/production-ready',
    module: 'enterprise-admin',
    icon: 'BookOpen',
    showInSidebar: false, // Documentation page
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
  },
  {
    id: 'enterprise-admin-pages-roles-report',
    name: 'All Pages & Roles Report',
    route: '/enterprise-admin/system/pages-roles-report',
    module: 'enterprise-admin',
    icon: 'FileText',
    showInSidebar: false, // System report
    showInModulePages: true,
    roles: ['ENTERPRISE_ADMIN'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMON MODULE PAGES (Always accessible)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'common-profile',
    name: 'My Profile',
    route: '/profile',
    module: 'common',
    icon: 'User',
    showInSidebar: false, // Accessed from user menu
    showInModulePages: true,
    roles: ['*'], // All roles
  },
  {
    id: 'common-settings',
    name: 'Settings',
    route: '/settings',
    module: 'common',
    icon: 'Settings',
    showInSidebar: false, // Accessed from user menu
    showInModulePages: true,
    roles: ['*'],
  },
  {
    id: 'common-notifications',
    name: 'Notifications',
    route: '/notifications',
    module: 'common',
    icon: 'Bell',
    showInSidebar: false, // Accessed from header
    showInModulePages: true,
    roles: ['*'],
  },
  {
    id: 'common-help',
    name: 'Help & Support',
    route: '/help',
    module: 'common',
    icon: 'HelpCircle',
    showInSidebar: false,
    showInModulePages: true,
    roles: ['*'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all pages for a specific module
 */
export function getModulePages(moduleKey: ModuleKey): PageDefinition[] {
  return PAGE_DEFINITIONS.filter(p => p.module === moduleKey);
}

/**
 * Get pages that should appear in the sidebar for a module
 */
export function getSidebarPages(moduleKey: ModuleKey): PageDefinition[] {
  return PAGE_DEFINITIONS
    .filter(p => p.module === moduleKey && p.showInSidebar)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Get the count of sidebar-visible pages for a module
 */
export function getSidebarPageCount(moduleKey: ModuleKey): number {
  return PAGE_DEFINITIONS.filter(p => p.module === moduleKey && p.showInSidebar).length;
}

/**
 * Get the total page count for a module (including hidden pages)
 */
export function getTotalPageCount(moduleKey: ModuleKey): number {
  return PAGE_DEFINITIONS.filter(p => p.module === moduleKey).length;
}

/**
 * Get page by ID
 */
export function getPageById(pageId: string): PageDefinition | undefined {
  return PAGE_DEFINITIONS.find(p => p.id === pageId);
}

/**
 * Get page by route
 */
export function getPageByRoute(route: string): PageDefinition | undefined {
  return PAGE_DEFINITIONS.find(p => p.route === route);
}

/**
 * Get module definition by key
 */
export function getModule(moduleKey: ModuleKey): ModuleDefinition | undefined {
  return MODULE_DEFINITIONS[moduleKey];
}

/**
 * Check if a module is protected for a given role
 */
export function isModuleProtectedForRole(moduleKey: ModuleKey, role: string): boolean {
  const mod = MODULE_DEFINITIONS[moduleKey];
  if (!mod) return false;
  if (mod.alwaysAccessible) return true;
  if (mod.isProtected && mod.protectedForRoles?.includes(role)) return true;
  return false;
}

/**
 * Get all modules accessible to a role
 */
export function getModulesForRole(role: string): ModuleDefinition[] {
  return Object.values(MODULE_DEFINITIONS).filter(mod => {
    if (mod.alwaysAccessible) return true;
    if (mod.protectedForRoles?.includes(role)) return true;
    return false;
  });
}

/**
 * Get sidebar menu items for a role
 * Returns modules with their visible pages
 */
export function getSidebarMenuForRole(role: string): Array<{
  module: ModuleDefinition;
  pages: PageDefinition[];
}> {
  const modules = getModulesForRole(role);
  return modules
    .map(mod => ({
      module: mod,
      pages: getSidebarPages(mod.id),
    }))
    .filter(item => item.pages.length > 0)
    .sort((a, b) => a.module.order - b.module.order);
}

/**
 * Build a flat route map for quick lookups
 */
export function buildRouteMap(): Map<string, PageDefinition> {
  const map = new Map<string, PageDefinition>();
  for (const page of PAGE_DEFINITIONS) {
    map.set(page.route, page);
  }
  return map;
}

/**
 * Get summary statistics
 */
export function getPageStats(): {
  totalPages: number;
  sidebarPages: number;
  hiddenPages: number;
  moduleStats: Array<{
    module: ModuleKey;
    total: number;
    sidebar: number;
    hidden: number;
  }>;
} {
  const modules = Object.keys(MODULE_DEFINITIONS) as ModuleKey[];
  const moduleStats = modules.map(mod => {
    const total = getTotalPageCount(mod);
    const sidebar = getSidebarPageCount(mod);
    return {
      module: mod,
      total,
      sidebar,
      hidden: total - sidebar,
    };
  }).filter(s => s.total > 0);

  return {
    totalPages: PAGE_DEFINITIONS.length,
    sidebarPages: PAGE_DEFINITIONS.filter(p => p.showInSidebar).length,
    hiddenPages: PAGE_DEFINITIONS.filter(p => !p.showInSidebar).length,
    moduleStats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS FOR SYNC WITH BACKEND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export pages in a format compatible with backend master-modules.js
 */
export function exportForBackend(): Array<{
  id: ModuleKey;
  name: string;
  description: string;
  icon: string;
  category: string;
  pages: Array<{ id: string; name: string; path: string }>;
}> {
  return Object.values(MODULE_DEFINITIONS).map(mod => ({
    id: mod.id,
    name: mod.name,
    description: mod.description,
    icon: mod.icon,
    category: mod.color,
    pages: getModulePages(mod.id).map(p => ({
      id: p.id,
      name: p.name,
      path: p.route,
    })),
  }));
}
