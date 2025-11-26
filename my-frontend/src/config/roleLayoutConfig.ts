/**
 * Role-Based Layout Configuration
 * 
 * Defines which components, menu items, and widgets are visible for each role.
 * Add new roles here to customize their dashboard experience.
 */

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: string; // Icon name from lucide-react
  badge?: string | number;
  badgeLabel?: string; // Accessibility label for badge
  requiredPermissions?: string[];
}

export interface WidgetConfig {
  id: string;
  component: string;
  position: 'top' | 'sidebar' | 'main' | 'bottom';
  order: number;
  props?: Record<string, any>;
}

export interface RoleLayoutConfig {
  showHeader?: boolean;
  showSidebar?: boolean;
  showFooter?: boolean;
  menuItems: MenuItem[];
  widgets?: WidgetConfig[];
  allowedPages?: string[];
  customStyles?: Record<string, string>;
}

export const roleLayoutConfig: Record<string, RoleLayoutConfig> = {
  SUPER_ADMIN: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', href: '/super-admin', icon: 'LayoutDashboard' },
      { id: 'users', label: 'Users', href: '/super-admin/users', icon: 'Users' },
      { id: 'security', label: 'Security', href: '/super-admin/security', icon: 'Shield' },
      { id: 'database', label: 'Database', href: '/super-admin/database', icon: 'Database' },
      { id: 'orders', label: 'Orders', href: '/super-admin/orders', icon: 'ShoppingCart' },
      { id: 'system', label: 'System', href: '/super-admin/system', icon: 'Settings' },
      { id: 'reports', label: 'Reports', href: '/super-admin/reports', icon: 'BarChart2' },
    ],
    allowedPages: ['*'], // Super admin can access everything
  },

  ADMIN: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
      { id: 'users', label: 'Users', href: '/admin/users', icon: 'Users' },
      { id: 'permissions', label: 'Permissions', href: '/admin/permissions', icon: 'Shield' },
      { id: 'reports', label: 'Reports', href: '/admin/reports', icon: 'BarChart2' },
      { id: 'finance', label: 'Finance', href: '/finance', icon: 'Wallet' },
      { id: 'settings', label: 'Settings', href: '/admin/settings', icon: 'Settings' },
    ],
    allowedPages: ['/admin', '/admin/*', '/finance', '/reports', '/settings'],
  },

  MANAGER: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', href: '/operations-manager', icon: 'Home' },
      { id: 'tasks', label: 'Tasks', href: '/operations-manager/tasks', icon: 'CheckSquare', badge: 5 },
      { id: 'team', label: 'Team', href: '/operations-manager/team', icon: 'Users' },
      { id: 'reports', label: 'Reports', href: '/operations-manager/reports', icon: 'BarChart2' },
      { id: 'calendar', label: 'Calendar', href: '/operations-manager/calendar', icon: 'Calendar' },
      { id: 'messages', label: 'Messages', href: '/operations-manager/messages', icon: 'MessageSquare', badge: 3 },
      { id: 'settings', label: 'Settings', href: '/operations-manager/settings', icon: 'Settings' },
    ],
    allowedPages: ['/operations-manager', '/operations-manager/*', '/reports', '/finance'],
  },

  STAFF: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', href: '/hub-incharge', icon: 'Home' },
      { id: 'tasks', label: 'My Tasks', href: '/hub-incharge/tasks', icon: 'CheckSquare', badge: 8 },
      { id: 'inventory', label: 'Inventory', href: '/hub-incharge/inventory', icon: 'ShoppingCart' },
      { id: 'sales', label: 'Sales', href: '/hub-incharge/sales', icon: 'Wallet' },
      { id: 'approvals', label: 'Approvals', href: '/hub-incharge/approvals', icon: 'FileText' },
      { id: 'messages', label: 'Messages', href: '/hub-incharge/messages', icon: 'MessageSquare' },
      { id: 'settings', label: 'Settings', href: '/hub-incharge/settings', icon: 'Settings' },
    ],
    allowedPages: ['/hub-incharge', '/hub-incharge/*'],
  },

  CFO: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', href: '/cfo-dashboard', icon: 'LayoutDashboard' },
      { id: 'finance', label: 'Finance', href: '/finance', icon: 'Wallet' },
      { id: 'reports', label: 'Reports', href: '/cfo-dashboard/reports', icon: 'BarChart2' },
      { id: 'approvals', label: 'Approvals', href: '/cfo-dashboard/approvals', icon: 'FileText', badge: 12 },
      { id: 'budget', label: 'Budget', href: '/cfo-dashboard/budget', icon: 'ShoppingCart' },
      { id: 'settings', label: 'Settings', href: '/cfo-dashboard/settings', icon: 'Settings' },
    ],
    allowedPages: ['/cfo-dashboard', '/cfo-dashboard/*', '/finance', '/reports'],
  },

  IT_ADMIN: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', href: '/it-admin', icon: 'LayoutDashboard' },
      { id: 'system', label: 'System', href: '/it-admin/system', icon: 'Settings' },
      { id: 'users', label: 'Users', href: '/it-admin/users', icon: 'Users' },
      { id: 'logs', label: 'Logs', href: '/it-admin/logs', icon: 'FileText' },
      { id: 'monitoring', label: 'Monitoring', href: '/it-admin/monitoring', icon: 'BarChart2' },
      { id: 'backups', label: 'Backups', href: '/it-admin/backups', icon: 'Database' },
    ],
    allowedPages: ['/it-admin', '/it-admin/*', '/system', '/logs'],
  },

  // Default fallback for unknown roles
  DEFAULT: {
    showHeader: true,
    showSidebar: true,
    showFooter: true,
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'Home' },
      { id: 'tasks', label: 'Tasks', href: '/dashboard/tasks', icon: 'CheckSquare' },
      { id: 'reports', label: 'Reports', href: '/dashboard/reports', icon: 'BarChart2' },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
    ],
    allowedPages: ['/dashboard', '/dashboard/*'],
  },
};

/**
 * Check if a user role has access to a specific page
 */
export function hasPageAccess(role: string, pagePath: string): boolean {
  const config = roleLayoutConfig[role] || roleLayoutConfig.DEFAULT;
  const allowedPages = config.allowedPages || [];

  // Check for wildcard access
  if (allowedPages.includes('*')) {
    return true;
  }

  // Check exact match
  if (allowedPages.includes(pagePath)) {
    return true;
  }

  // Check pattern match (e.g., /admin/*)
  return allowedPages.some((pattern) => {
    if (pattern.endsWith('/*')) {
      const basePath = pattern.slice(0, -2);
      return pagePath.startsWith(basePath);
    }
    return false;
  });
}

/**
 * Get filtered menu items for a role
 */
export function getMenuItemsForRole(role: string): MenuItem[] {
  const config = roleLayoutConfig[role] || roleLayoutConfig.DEFAULT;
  return config.menuItems;
}
