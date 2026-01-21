/**
 * Protected Modules and Roles Configuration
 * 
 * These modules and roles are always allowed for specific user types
 * and cannot be removed/unassigned through the UI.
 * 
 * NOTE: This file should be kept in sync with the MODULES configuration
 * in page-registry.ts which defines isProtected, protectedForRoles, and alwaysAccessible.
 */

// Module keys that are always accessible to ALL users
export const ALWAYS_ACCESSIBLE_MODULES = [
  'common',
  'chat',
  'notifications',
];

// Modules that SUPER_ADMIN role always has access to (cannot be removed)
export const SUPER_ADMIN_PROTECTED_MODULES = [
  'super-admin',
  'enterprise-admin',
  'system',
  'common',
];

// Modules that ENTERPRISE_ADMIN role always has access to (cannot be removed)
export const ENTERPRISE_ADMIN_PROTECTED_MODULES = [
  'enterprise-admin',
  'common',
];

// Modules that all ADMIN roles always have access to
export const ADMIN_PROTECTED_MODULES = [
  'admin',
  'common',
];

// Roles that cannot be removed from SUPER_ADMIN users
export const SUPER_ADMIN_PROTECTED_ROLES = [
  'SUPER_ADMIN',
];

// Roles that cannot be removed from ENTERPRISE_ADMIN users
export const ENTERPRISE_ADMIN_PROTECTED_ROLES = [
  'ENTERPRISE_ADMIN',
];

/**
 * Check if a module is protected for a given role
 */
export function isModuleProtected(moduleKey: string, userRole: string): boolean {
  const key = (moduleKey || '').toLowerCase().replace(/_/g, '-');
  const role = (userRole || '').toUpperCase();
  
  // Common modules are always protected for everyone
  if (ALWAYS_ACCESSIBLE_MODULES.includes(key)) {
    return true;
  }
  
  // Helper function to check if a key matches a protected module
  // Uses exact match or prefix match (e.g., 'super-admin' matches 'super-admin-dashboard')
  // Does NOT use contains match to avoid 'system-health' matching 'system'
  const matchesProtected = (protectedModules: string[]) => {
    return protectedModules.some(m => 
      key === m || key.startsWith(m + '-')
    );
  };
  
  switch (role) {
    case 'SUPER_ADMIN':
      return matchesProtected(SUPER_ADMIN_PROTECTED_MODULES);
    case 'ENTERPRISE_ADMIN':
      return matchesProtected(ENTERPRISE_ADMIN_PROTECTED_MODULES);
    default:
      // For other admin roles, protect admin and common
      if (role.includes('ADMIN')) {
        return matchesProtected(ADMIN_PROTECTED_MODULES);
      }
      // For regular users, only common is protected
      return ALWAYS_ACCESSIBLE_MODULES.includes(key);
  }
}

/**
 * Check if a role is protected for a given user
 */
export function isRoleProtected(roleName: string, userRole: string): boolean {
  const role = (roleName || '').toUpperCase();
  const userRoleUpper = (userRole || '').toUpperCase();
  
  if (userRoleUpper === 'SUPER_ADMIN') {
    return SUPER_ADMIN_PROTECTED_ROLES.includes(role);
  }
  
  if (userRoleUpper === 'ENTERPRISE_ADMIN') {
    return ENTERPRISE_ADMIN_PROTECTED_ROLES.includes(role);
  }
  
  return false;
}

/**
 * Get a user-friendly message when trying to remove a protected module
 */
export function getProtectedModuleMessage(moduleKey: string, userRole: string): string {
  const key = (moduleKey || '').toLowerCase().replace(/_/g, '-');
  const role = (userRole || '').toUpperCase();
  
  // Helper function to check if a key matches a protected module
  const matchesProtected = (protectedModules: string[]) => {
    return protectedModules.some(m => key === m || key.startsWith(m + '-'));
  };
  
  if (ALWAYS_ACCESSIBLE_MODULES.includes(key)) {
    return `The "${moduleKey}" module is always accessible to all users and cannot be removed.`;
  }
  
  if (role === 'SUPER_ADMIN' && matchesProtected(SUPER_ADMIN_PROTECTED_MODULES)) {
    return `The "${moduleKey}" module is a core module for Super Admins and cannot be removed.`;
  }
  
  if (role === 'ENTERPRISE_ADMIN' && matchesProtected(ENTERPRISE_ADMIN_PROTECTED_MODULES)) {
    return `The "${moduleKey}" module is a core module for Enterprise Admins and cannot be removed.`;
  }
  
  return `The "${moduleKey}" module is protected and cannot be removed.`;
}

/**
 * Get a user-friendly message when trying to remove a protected role
 */
export function getProtectedRoleMessage(roleName: string, userRole: string): string {
  return `The "${roleName}" role is a core role for ${userRole} users and cannot be removed.`;
}

/**
 * Get the list of protected/default role names for a given user role
 * These roles should always be assigned and cannot be removed
 */
export function getDefaultRoleNames(userRole: string): string[] {
  const role = (userRole || '').toUpperCase();
  
  switch (role) {
    case 'SUPER_ADMIN':
      return SUPER_ADMIN_PROTECTED_ROLES;
    case 'ENTERPRISE_ADMIN':
      return ENTERPRISE_ADMIN_PROTECTED_ROLES;
    default:
      return [];
  }
}
