/**
 * useRoleDisplay Hook
 * ====================
 * React hook for getting user-friendly role display names.
 * Integrates with the roleDisplay utility for consistent naming across the app.
 * 
 * @example
 * const { getDisplayName, getBadge, getRoleInfo } = useRoleDisplay();
 * const displayName = getDisplayName('BRANCH_INCHARGE'); // "Branch Manager"
 */

import { useMemo, useCallback } from 'react';
import {
  getRoleDisplayName,
  getRoleDisplayInfo,
  getHierarchyBadge,
  getHierarchyBadgeInfo,
  type RoleDisplayInfo,
  type HierarchyBadgeInfo,
} from '@/utils/roleDisplay';

export interface UseRoleDisplayReturn {
  /** Get user-friendly display name for a role key */
  getDisplayName: (roleKey: string | null | undefined) => string;
  
  /** Get hierarchy badge (L1-L10) for authority level */
  getBadge: (authorityLevel: number) => string;
  
  /** Get full badge info including color and meaning */
  getBadgeInfo: (authorityLevel: number) => HierarchyBadgeInfo;
  
  /** Get complete role display info for UI */
  getRoleInfo: (roleKey: string | null | undefined, authorityLevel: number) => RoleDisplayInfo;
  
  /** Format role name for display (handles underscores, casing) */
  formatRoleName: (roleKey: string | null | undefined) => string;
}

/**
 * Hook for role display functionality.
 * All display transformations are handled here - do NOT use raw role names in UI.
 */
export function useRoleDisplay(): UseRoleDisplayReturn {
  const getDisplayName = useCallback((roleKey: string | null | undefined): string => {
    return getRoleDisplayName(roleKey);
  }, []);

  const getBadge = useCallback((authorityLevel: number): string => {
    return getHierarchyBadge(authorityLevel);
  }, []);

  const getBadgeInfo = useCallback((authorityLevel: number): HierarchyBadgeInfo => {
    return getHierarchyBadgeInfo(authorityLevel);
  }, []);

  const getRoleInfo = useCallback((roleKey: string | null | undefined, authorityLevel: number): RoleDisplayInfo => {
    return getRoleDisplayInfo(roleKey, authorityLevel);
  }, []);

  /**
   * Format a raw role key for basic display.
   * Use getDisplayName() for canonical display names.
   * This is a fallback for cases where the role key is not in the mapping.
   */
  const formatRoleName = useCallback((roleKey: string | null | undefined): string => {
    if (!roleKey) return 'User';
    
    // First try to get the canonical display name
    const displayName = getRoleDisplayName(roleKey);
    
    // If it returned the same as input (not found in map), format it nicely
    if (displayName === roleKey) {
      return roleKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }
    
    return displayName;
  }, []);

  return useMemo(() => ({
    getDisplayName,
    getBadge,
    getBadgeInfo,
    getRoleInfo,
    formatRoleName,
  }), [getDisplayName, getBadge, getBadgeInfo, getRoleInfo, formatRoleName]);
}

export default useRoleDisplay;
