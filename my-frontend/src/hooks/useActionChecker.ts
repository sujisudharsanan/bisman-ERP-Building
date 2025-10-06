/**
 * Action Checker Hook
 * Provides utilities for checking user permissions for specific actions
 */

'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  ACTIONS,
  type ActionType,
  type FeatureKey,
} from '@/config/permissions';

export function useActionChecker() {
  const { user } = useAuth();
  const { hasPermission, loading } = usePermission();

  /**
   * Check if user can perform a specific action on a feature
   */
  const canPerformAction = (
    featureKey: FeatureKey,
    action: ActionType
  ): boolean => {
    if (loading) return false;
    if (!user) return false;

    // Super admin has all permissions
    if (user.roleName === 'SUPER_ADMIN') return true;

    return hasPermission(featureKey, action);
  };

  /**
   * Check multiple actions at once
   */
  const canPerformActions = (
    checks: Array<{ featureKey: FeatureKey; action: ActionType }>
  ): boolean[] => {
    return checks.map(({ featureKey, action }) =>
      canPerformAction(featureKey, action)
    );
  };

  /**
   * Get user's role-based capabilities
   */
  const getUserCapabilities = () => {
    if (!user) return { role: null, isAdmin: false, isSuperAdmin: false };

    return {
      role: user.roleName,
      isAdmin: user.roleName === 'ADMIN',
      isSuperAdmin: user.roleName === 'SUPER_ADMIN',
      isManager: user.roleName === 'MANAGER',
      isStaff: user.roleName === 'STAFF',
    };
  };

  /**
   * Check if user has administrative privileges
   */
  const hasAdminAccess = (): boolean => {
    const capabilities = getUserCapabilities();
    return capabilities.isAdmin || capabilities.isSuperAdmin;
  };

  /**
   * Check if user has super admin privileges
   */
  const hasSuperAdminAccess = (): boolean => {
    return getUserCapabilities().isSuperAdmin;
  };

  return {
    canPerformAction,
    canPerformActions,
    getUserCapabilities,
    hasAdminAccess,
    hasSuperAdminAccess,
    loading,
    user,
    // Action constants for easy access
    ACTIONS,
  };
}
