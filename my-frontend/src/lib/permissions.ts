/**
 * SECURITY FIX PM-03: Consolidated permissions module
 * 
 * This file provides backward compatibility for legacy imports.
 * The authoritative RBAC configuration is in @/common/rbac/rolePermissions.ts
 * 
 * IMPORTANT: For new code, use:
 * - usePermissions() hook from @/common/hooks/usePermissions for runtime permissions
 * - hasPermission() from @/common/rbac/rolePermissions for role-based checks
 * 
 * This file will be deprecated in a future release.
 */

// Import for local use
import type { Permission as PermissionType } from '@/common/rbac/rolePermissions';

// Re-export from the authoritative source
export {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  type RoleType,
  type Permission,
  type RolePermissions,
} from '@/common/rbac/rolePermissions';

// Legacy exports for backward compatibility
export const PERMISSIONS_LEGACY = {
  ORGANIZATION_READ: 'organization.read',
  ORGANIZATION_WRITE: 'organization.write',
  USER_MANAGE: 'user.manage',
  MODULE_TOGGLE: 'module.toggle',
  BILLING_VIEW: 'billing.view',
  AUDIT_VIEW: 'audit.view',
  SETTINGS_MANAGE: 'settings.manage',
  APIKEY_MANAGE: 'apikey.manage',
  // Branch permissions
  BRANCH_CREATE: 'branch.create',
  BRANCH_EDIT: 'branch.edit',
  BRANCH_VIEW: 'branch.view',
  // Enterprise-wide permissions (visible only to SUPER/ENTERPRISE admins)
  ENTERPRISE_DASHBOARD_VIEW: 'enterprise.dashboard.view',
  ENTERPRISE_SUPERADMINS_MANAGE: 'enterprise.superadmins.manage',
  ENTERPRISE_ORGANIZATIONS_READ: 'enterprise.organizations.read',
  ENTERPRISE_MODULES_MANAGE: 'enterprise.modules.manage',
  ENTERPRISE_BILLING_VIEW: 'enterprise.billing.view',
  ENTERPRISE_AUDIT_VIEW: 'enterprise.audit.view',
  ENTERPRISE_INTEGRATIONS_MANAGE: 'enterprise.integrations.manage',
  ENTERPRISE_SUPPORT_VIEW: 'enterprise.support.view',
  ENTERPRISE_AI_MANAGE: 'enterprise.ai.manage',
  ENTERPRISE_REPORTS_VIEW: 'enterprise.reports.view',
  ENTERPRISE_SETTINGS_MANAGE: 'enterprise.settings.manage',
  ENTERPRISE_NOTIFICATIONS_MANAGE: 'enterprise.notifications.manage',
} as const;

export type RoleKey = 'SYSTEM_ADMIN' | 'ENTERPRISE_ADMIN' | 'ORG_ADMIN' | 'ORG_USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  roles: RoleKey[];
  memberships?: Array<{ organizationId: string; role: RoleKey }>;
}

/**
 * @deprecated Use hasPermission from @/common/rbac/rolePermissions instead
 * This function is kept for backward compatibility with legacy code.
 */
export function can(user: SessionUser | null | undefined, permission: string | PermissionType, orgId?: string) {
  if (!user) return false;
  
  // Extract key if Permission object is passed
  const permissionKey = typeof permission === 'string' ? permission : permission.key;
  
  // SECURITY FIX: Removed blanket ADMIN bypass - now admins use ROLE_PERMISSIONS like other roles
  // SYSTEM_ADMIN and SUPER_ADMIN still have full access as they are platform-level roles
  if (user.roles?.includes('SYSTEM_ADMIN') || user.roles?.includes('SUPER_ADMIN')) return true;
  
  // Check if permission is granted by any of user's roles
  const granted = new Set<string>();
  const rolePermissionMap: Record<RoleKey, string[]> = {
    SYSTEM_ADMIN: Object.values(PERMISSIONS_LEGACY),
    ADMIN: Object.values(PERMISSIONS_LEGACY),
    SUPER_ADMIN: Object.values(PERMISSIONS_LEGACY),
    ENTERPRISE_ADMIN: [
      PERMISSIONS_LEGACY.ORGANIZATION_READ,
      PERMISSIONS_LEGACY.ORGANIZATION_WRITE,
      PERMISSIONS_LEGACY.USER_MANAGE,
      PERMISSIONS_LEGACY.MODULE_TOGGLE,
      PERMISSIONS_LEGACY.BILLING_VIEW,
      PERMISSIONS_LEGACY.AUDIT_VIEW,
      PERMISSIONS_LEGACY.SETTINGS_MANAGE,
      PERMISSIONS_LEGACY.APIKEY_MANAGE,
      PERMISSIONS_LEGACY.ENTERPRISE_DASHBOARD_VIEW,
      PERMISSIONS_LEGACY.ENTERPRISE_SUPERADMINS_MANAGE,
      PERMISSIONS_LEGACY.ENTERPRISE_ORGANIZATIONS_READ,
      PERMISSIONS_LEGACY.ENTERPRISE_MODULES_MANAGE,
      PERMISSIONS_LEGACY.ENTERPRISE_BILLING_VIEW,
      PERMISSIONS_LEGACY.ENTERPRISE_AUDIT_VIEW,
      PERMISSIONS_LEGACY.ENTERPRISE_INTEGRATIONS_MANAGE,
      PERMISSIONS_LEGACY.ENTERPRISE_SUPPORT_VIEW,
      PERMISSIONS_LEGACY.ENTERPRISE_AI_MANAGE,
      PERMISSIONS_LEGACY.ENTERPRISE_REPORTS_VIEW,
      PERMISSIONS_LEGACY.ENTERPRISE_SETTINGS_MANAGE,
      PERMISSIONS_LEGACY.ENTERPRISE_NOTIFICATIONS_MANAGE,
    ],
    ORG_ADMIN: [
      PERMISSIONS_LEGACY.ORGANIZATION_READ,
      PERMISSIONS_LEGACY.USER_MANAGE,
      PERMISSIONS_LEGACY.MODULE_TOGGLE,
      PERMISSIONS_LEGACY.BILLING_VIEW,
      PERMISSIONS_LEGACY.AUDIT_VIEW,
    ],
    ORG_USER: [PERMISSIONS_LEGACY.ORGANIZATION_READ],
  };
  
  (user.roles || []).forEach((r) => rolePermissionMap[r]?.forEach((p) => granted.add(p)));
  if (!granted.has(permissionKey)) return false;
  
  // If org-scoped, require membership
  if (orgId) {
    return !!user.memberships?.some((m) => m.organizationId === orgId);
  }
  return true;
}
