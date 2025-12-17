/**
 * Module-Centric RBAC Role Constants
 * 
 * Hierarchy:
 * - ENTERPRISE_ADMIN: Highest authority, global access (1 per enterprise)
 * - SUPER_ADMIN: Module-level admin, creates clients (1+ per module)
 * - ADMIN: Client-level admin (1+ per client)
 * - Other roles: Client-scoped operational roles
 * 
 * There is NO system admin, NO IT admin, NO platform admin.
 */

// Role level enum matching backend RoleLevel
export type RoleLevel = 'ENTERPRISE' | 'MODULE' | 'CLIENT';

// Enterprise-level (global) roles
export const ROLE_ENTERPRISE_ADMIN = 'ENTERPRISE_ADMIN';

// Module-level roles (scoped to a module)
export const ROLE_SUPER_ADMIN = 'SUPER_ADMIN';

// Client-level roles (scoped to a client within a module)
export const ROLE_ADMIN = 'ADMIN';

// Legacy aliases for backward compatibility (will be deprecated)
/** @deprecated Use ROLE_ENTERPRISE_ADMIN instead */
export const ROLE_PLATFORM_ADMIN = 'ENTERPRISE_ADMIN';
/** @deprecated Use ROLE_ADMIN instead */
export const ROLE_TENANT_ADMIN = 'ADMIN';
/** @deprecated Use ROLE_SUPER_ADMIN instead */
export const LEGACY_SUPER_ADMIN = 'SUPER_ADMIN';

/**
 * Check if role is Enterprise Admin (highest authority)
 */
export function isEnterpriseAdmin(role?: string): boolean {
  return role === ROLE_ENTERPRISE_ADMIN;
}

/**
 * Check if role is Super Admin (module-level)
 */
export function isSuperAdmin(role?: string): boolean {
  return role === ROLE_SUPER_ADMIN;
}

/**
 * Check if role is Client Admin
 */
export function isAdmin(role?: string): boolean {
  return role === ROLE_ADMIN;
}

/**
 * @deprecated Use isEnterpriseAdmin instead
 */
export function isPlatformAdmin(role?: string): boolean {
  return isEnterpriseAdmin(role);
}

/**
 * @deprecated Use isAdmin instead
 */
export function isTenantAdmin(role?: string): boolean {
  return role === ROLE_ADMIN;
}

/**
 * @deprecated Use isSuperAdmin instead
 */
export function isLegacySuper(role?: string): boolean {
  return isSuperAdmin(role);
}

/**
 * Check if role has full administrative access
 * Enterprise Admin > Super Admin > Admin
 */
export function hasFullAdmin(role?: string): boolean {
  return isEnterpriseAdmin(role) || isSuperAdmin(role) || isAdmin(role);
}

/**
 * Get the role level for a given role
 */
export function getRoleLevel(role?: string): RoleLevel | null {
  if (isEnterpriseAdmin(role)) return 'ENTERPRISE';
  if (isSuperAdmin(role)) return 'MODULE';
  if (role) return 'CLIENT'; // All other roles are client-level
  return null;
}

/**
 * Check if a role can manage another role based on hierarchy
 * Enterprise Admin > Super Admin > Admin > Other roles
 */
export function canManageRole(managerRole?: string, targetRole?: string): boolean {
  if (!managerRole || !targetRole) return false;
  
  // Enterprise Admin can manage everyone
  if (isEnterpriseAdmin(managerRole)) return true;
  
  // Super Admin can manage Admin and below (within their module)
  if (isSuperAdmin(managerRole)) {
    return !isEnterpriseAdmin(targetRole) && !isSuperAdmin(targetRole);
  }
  
  // Admin can manage non-admin roles (within their client)
  if (isAdmin(managerRole)) {
    return !isEnterpriseAdmin(targetRole) && !isSuperAdmin(targetRole) && !isAdmin(targetRole);
  }
  
  return false;
}