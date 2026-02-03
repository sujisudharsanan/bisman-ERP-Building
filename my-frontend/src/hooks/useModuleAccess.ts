/**
 * Module Access Hook
 * ==================
 * Custom hook for checking subscription-based module access.
 * Enforces Free vs Paid module restrictions.
 * 
 * Usage:
 * const { hasAccess, checkModuleAccess, moduleAccess, loading } = useModuleAccess();
 * 
 * if (!hasAccess('finance')) {
 *   return <UpgradePrompt module="finance" />;
 * }
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ModuleAccessLevel = 'full' | 'read_only' | 'none';

export interface ModuleAccessInfo {
  accessLevel: ModuleAccessLevel;
  pageLimit: number;
  features: Record<string, unknown>;
}

export interface TenantModuleAccess {
  planId: number;
  planCode: string;
  planName: string;
  modules: Record<string, ModuleAccessInfo>;
  alwaysAccessible: string[];
}

export interface ModuleCheckResult {
  hasAccess: boolean;
  accessLevel: ModuleAccessLevel;
  moduleId: string;
  planName: string;
  upgradeRequired?: boolean;
  message?: string;
  pageLimit?: number;
  features?: Record<string, unknown>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

// Core modules that are always accessible
// AUDIT FIX 2026-02-03: Using UPPERCASE to match backend constants
// Comparisons should use .toUpperCase() for case-insensitive matching
const ALWAYS_ACCESSIBLE_MODULES = ['DASHBOARD', 'COMMON', 'CHAT', 'SUPPORT', 'HELP'];

// Module display names for user-friendly messages
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  finance: 'Finance & Accounting',
  operations: 'Operations Management',
  procurement: 'Procurement',
  hr: 'Human Resources',
  admin: 'Administration',
  reports: 'Advanced Reports',
  analytics: 'Analytics & BI',
  quality: 'Quality Control',
  compliance: 'Compliance',
  inventory: 'Inventory Management',
  transport: 'Transport & Logistics',
  sales: 'Sales Management',
  crm: 'Customer Relations',
  marketing: 'Marketing',
  production: 'Production',
  project: 'Project Management',
  field_ops: 'Field Operations',
  integrations: 'Integrations',
  api_access: 'API Access',
  audit: 'Audit Trail',
};

// ============================================================================
// HOOK: useModuleAccess
// ============================================================================

export function useModuleAccess() {
  const [moduleAccess, setModuleAccess] = useState<TenantModuleAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch module access from API
   */
  const fetchModuleAccess = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiUrl()}/api/subscriptions/module-access`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated, return null (component should handle auth redirect)
          setModuleAccess(null);
          return null;
        }
        throw new Error('Failed to fetch module access');
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch module access');
      }

      const accessData: TenantModuleAccess = {
        planId: data.planId,
        planCode: data.planCode,
        planName: data.planName,
        modules: data.modules,
        alwaysAccessible: data.alwaysAccessible || ALWAYS_ACCESSIBLE_MODULES,
      };

      setModuleAccess(accessData);
      return accessData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch module access';
      setError(message);
      console.error('[useModuleAccess] Error:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchModuleAccess();
  }, [fetchModuleAccess]);

  /**
   * Check if user has access to a specific module
   */
  const hasAccess = useCallback(
    (moduleId: string): boolean => {
      // AUDIT FIX 2026-02-03: Using toUpperCase to match UPPERCASE constants
      const normalizedId = moduleId.toUpperCase();

      // Always allow core modules
      if (ALWAYS_ACCESSIBLE_MODULES.includes(normalizedId)) {
        return true;
      }

      // If module access not loaded yet, optimistically allow
      if (!moduleAccess) {
        return true;
      }

      const moduleInfo = moduleAccess.modules[moduleId.toLowerCase()];

      // No explicit record = no access for paid modules
      if (!moduleInfo) {
        return false;
      }

      return moduleInfo.accessLevel !== 'none';
    },
    [moduleAccess]
  );

  /**
   * Get access level for a module
   */
  const getAccessLevel = useCallback(
    (moduleId: string): ModuleAccessLevel => {
      // AUDIT FIX 2026-02-03: Using toUpperCase for constant comparison
      const normalizedId = moduleId.toUpperCase();

      if (ALWAYS_ACCESSIBLE_MODULES.includes(normalizedId)) {
        return 'full';
      }

      if (!moduleAccess) {
        return 'full'; // Optimistic until loaded
      }

      const moduleInfo = moduleAccess.modules[moduleId.toLowerCase()];
      return moduleInfo?.accessLevel || 'none';
    },
    [moduleAccess]
  );

  /**
   * Check if user can write (POST/PUT/DELETE) to a module
   */
  const canWrite = useCallback(
    (moduleId: string): boolean => {
      const accessLevel = getAccessLevel(moduleId);
      return accessLevel === 'full';
    },
    [getAccessLevel]
  );

  /**
   * Get detailed check result for a module
   */
  const checkModuleAccess = useCallback(
    (moduleId: string): ModuleCheckResult => {
      const lowerCaseId = moduleId.toLowerCase();
      // AUDIT FIX 2026-02-03: Using toUpperCase for constant comparison
      const normalizedId = moduleId.toUpperCase();
      const displayName = MODULE_DISPLAY_NAMES[lowerCaseId] || moduleId;

      if (ALWAYS_ACCESSIBLE_MODULES.includes(normalizedId)) {
        return {
          hasAccess: true,
          accessLevel: 'full',
          moduleId: lowerCaseId,
          planName: 'Any',
          message: 'Core module - always accessible',
        };
      }

      if (!moduleAccess) {
        return {
          hasAccess: true,
          accessLevel: 'full',
          moduleId: normalizedId,
          planName: 'Loading',
          message: 'Access not yet determined',
        };
      }

      const moduleInfo = moduleAccess.modules[normalizedId];

      if (!moduleInfo || moduleInfo.accessLevel === 'none') {
        return {
          hasAccess: false,
          accessLevel: 'none',
          moduleId: normalizedId,
          planName: moduleAccess.planName,
          upgradeRequired: true,
          message: `${displayName} is not available in your ${moduleAccess.planName} plan. Upgrade to access this feature.`,
        };
      }

      return {
        hasAccess: true,
        accessLevel: moduleInfo.accessLevel,
        moduleId: normalizedId,
        planName: moduleAccess.planName,
        pageLimit: moduleInfo.pageLimit,
        features: moduleInfo.features,
        message:
          moduleInfo.accessLevel === 'read_only'
            ? `Read-only access to ${displayName}`
            : undefined,
      };
    },
    [moduleAccess]
  );

  /**
   * Filter a list of modules to only those accessible
   */
  const filterAccessibleModules = useCallback(
    (moduleIds: string[]): string[] => {
      return moduleIds.filter((id) => hasAccess(id));
    },
    [hasAccess]
  );

  /**
   * Get all accessible module IDs
   */
  const accessibleModules = useMemo(() => {
    if (!moduleAccess) {
      return ALWAYS_ACCESSIBLE_MODULES;
    }

    const accessible = new Set(ALWAYS_ACCESSIBLE_MODULES);

    Object.entries(moduleAccess.modules).forEach(([moduleId, info]) => {
      if (info.accessLevel !== 'none') {
        accessible.add(moduleId);
      }
    });

    return Array.from(accessible);
  }, [moduleAccess]);

  /**
   * Get modules that require upgrade
   */
  const upgradeRequiredModules = useMemo(() => {
    if (!moduleAccess) {
      return [];
    }

    const locked: string[] = [];

    Object.entries(moduleAccess.modules).forEach(([moduleId, info]) => {
      if (info.accessLevel === 'none') {
        locked.push(moduleId);
      }
    });

    return locked;
  }, [moduleAccess]);

  return {
    // State
    moduleAccess,
    loading,
    error,

    // Plan info
    planName: moduleAccess?.planName || 'Free',
    planCode: moduleAccess?.planCode || 'FREE',
    planId: moduleAccess?.planId || 1,

    // Check methods
    hasAccess,
    getAccessLevel,
    canWrite,
    checkModuleAccess,
    filterAccessibleModules,

    // Computed lists
    accessibleModules,
    upgradeRequiredModules,
    alwaysAccessible: ALWAYS_ACCESSIBLE_MODULES,

    // Refresh
    refresh: fetchModuleAccess,
  };
}

// ============================================================================
// HOOK: useModuleCheck (for single module)
// ============================================================================

/**
 * Check access for a single module with caching
 */
export function useModuleCheck(moduleId: string) {
  const { checkModuleAccess, loading, error, refresh } = useModuleAccess();

  const result = useMemo(() => {
    return checkModuleAccess(moduleId);
  }, [checkModuleAccess, moduleId]);

  return {
    ...result,
    loading,
    error,
    refresh,
  };
}

export default useModuleAccess;
