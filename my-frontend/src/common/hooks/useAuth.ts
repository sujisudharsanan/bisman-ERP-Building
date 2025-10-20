/**
 * Enhanced useAuth hook with RBAC support
 * Extends the base AuthContext with permission checking
 */

'use client';

import { useAuth as useBaseAuth } from '@/hooks/useAuth';
import { hasPermission as checkPermission } from '@/common/rbac/rolePermissions';

export function useAuth() {
  const auth = useBaseAuth();

  /**
   * Check if the current user has access to a specific permission
   */
  const hasAccess = (permissionKey: string): boolean => {
    if (!auth.user || !auth.user.roleName) {
      return false;
    }
    return checkPermission(auth.user.roleName, permissionKey);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyAccess = (permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasAccess(key));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllAccess = (permissionKeys: string[]): boolean => {
    return permissionKeys.every(key => hasAccess(key));
  };

  return {
    ...auth,
    hasAccess,
    hasAnyAccess,
    hasAllAccess,
  };
}
