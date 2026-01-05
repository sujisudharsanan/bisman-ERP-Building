/**
 * usePermissions hook - Security fix PM-01
 * Fetches permissions from backend /api/permissions/me endpoint
 * instead of using hardcoded frontend permission maps
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth as useBaseAuth } from '@/hooks/useAuth';

export interface BackendPermissions {
  userId: string;
  role: string;
  business_level: number;
  tenant_id: string | null;
  allowedPages: string[];
  permissions: Record<string, Record<string, string[]>>; // { module: { action: [routes] } }
  cached?: boolean;
}

interface UsePermissionsResult {
  permissions: BackendPermissions | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  hasPageAccess: (pageKey: string) => boolean;
  canAccessAny: (pageKeys: string[]) => boolean;
}

// In-memory cache to avoid excessive API calls
let permissionsCache: BackendPermissions | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function usePermissions(): UsePermissionsResult {
  const { user } = useBaseAuth();
  const [permissions, setPermissions] = useState<BackendPermissions | null>(permissionsCache);
  const [loading, setLoading] = useState<boolean>(!permissionsCache);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    // Check cache validity
    const now = Date.now();
    if (permissionsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
      setPermissions(permissionsCache);
      setLoading(false);
      return;
    }

    if (!user) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/permissions/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        // SECURITY: Fail closed - no permissions if backend unavailable
        console.error('[usePermissions] Backend returned non-OK status:', response.status);
        setPermissions(null);
        setError('Failed to fetch permissions');
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        permissionsCache = result.data;
        cacheTimestamp = now;
        setPermissions(result.data);
      } else {
        // SECURITY: Fail closed
        console.error('[usePermissions] Invalid response:', result);
        setPermissions(null);
        setError(result.error?.message || 'Invalid permissions response');
      }
    } catch (err) {
      // SECURITY: Fail closed - no permissions on error
      console.error('[usePermissions] Fetch error:', err);
      setPermissions(null);
      setError('Network error fetching permissions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Check if user has a specific module/action permission
   */
  const hasPermission = useCallback((module: string, action: string): boolean => {
    if (!permissions) return false;
    
    // Platform admins with '*' in allowedPages have full access
    if (permissions.allowedPages.includes('*')) return true;
    
    const modulePerms = permissions.permissions?.[module];
    if (!modulePerms) return false;
    
    return Array.isArray(modulePerms[action]) && modulePerms[action].length > 0;
  }, [permissions]);

  /**
   * Check if user has access to a specific page
   */
  const hasPageAccess = useCallback((pageKey: string): boolean => {
    if (!permissions) return false;
    
    // Platform admins with '*' have access to all pages
    if (permissions.allowedPages.includes('*')) return true;
    
    return permissions.allowedPages.includes(pageKey);
  }, [permissions]);

  /**
   * Check if user has access to any of the specified pages
   */
  const canAccessAny = useCallback((pageKeys: string[]): boolean => {
    return pageKeys.some(key => hasPageAccess(key));
  }, [hasPageAccess]);

  /**
   * Force refresh permissions from backend
   */
  const refresh = useCallback(async () => {
    permissionsCache = null;
    cacheTimestamp = 0;
    await fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    error,
    refresh,
    hasPermission,
    hasPageAccess,
    canAccessAny,
  };
}

// Clear cache on logout
export function clearPermissionsCache(): void {
  permissionsCache = null;
  cacheTimestamp = 0;
}
