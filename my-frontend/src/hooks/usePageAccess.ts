/**
 * usePageAccess Hook
 * 
 * Frontend route guard that checks page access via backend API.
 * Use this in page components to verify user can access the page.
 * 
 * The backend is the source of truth - this is just for UX (showing access denied page).
 * Even if bypassed, the backend API will still reject unauthorized requests.
 * 
 * Usage:
 *   const { hasAccess, loading, accessLevel } = usePageAccess('DASHBOARD');
 *   if (loading) return <Loading />;
 *   if (!hasAccess) return <AccessDenied />;
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface PageAccessResult {
  hasAccess: boolean;
  loading: boolean;
  accessLevel: 'none' | 'view' | 'edit' | 'full';
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
  };
  error: string | null;
  checkAccess: (pageCode: string) => Promise<boolean>;
}

// Cache for page access checks (avoid repeated API calls)
const accessCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export function usePageAccess(pageCode?: string): PageAccessResult {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState<'none' | 'view' | 'edit' | 'full'>('none');
  const [permissions, setPermissions] = useState({
    canView: false,
    canEdit: false,
    canDelete: false,
    canExport: false
  });
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async (code: string): Promise<boolean> => {
    if (!user?.id) {
      return false;
    }

    // Check cache first
    const cacheKey = `${user.id}_${code}`;
    const cached = accessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result.hasAccess;
    }

    try {
      const response = await fetch(`/api/menu/check-access/${encodeURIComponent(code)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(`[usePageAccess] API returned ${response.status}`);
        return false;
      }

      const result = await response.json();
      
      // Cache the result
      accessCache.set(cacheKey, { result, timestamp: Date.now() });
      
      return result.hasAccess || false;
    } catch (err) {
      console.error('[usePageAccess] Error checking access:', err);
      return false;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!pageCode) {
      setLoading(false);
      return;
    }

    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const doCheck = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check cache first
        const cacheKey = `${user.id}_${pageCode}`;
        const cached = accessCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          const result = cached.result;
          setHasAccess(result.hasAccess || false);
          setAccessLevel(result.accessLevel || 'none');
          setPermissions(result.permissions || {
            canView: false,
            canEdit: false,
            canDelete: false,
            canExport: false
          });
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/menu/check-access/${encodeURIComponent(pageCode)}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        
        // Cache the result
        accessCache.set(cacheKey, { result, timestamp: Date.now() });

        setHasAccess(result.hasAccess || false);
        setAccessLevel(result.accessLevel || 'none');
        setPermissions(result.permissions || {
          canView: false,
          canEdit: false,
          canDelete: false,
          canExport: false
        });

        // If no access, optionally redirect to access denied
        if (!result.hasAccess) {
          console.warn(`[usePageAccess] Access denied for ${pageCode}: ${result.reason}`);
        }

      } catch (err) {
        console.error('[usePageAccess] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to check access');
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    doCheck();
  }, [pageCode, user?.id, authLoading]);

  return {
    hasAccess,
    loading: loading || authLoading,
    accessLevel,
    permissions,
    error,
    checkAccess
  };
}

/**
 * Clear the access cache (call on logout or role change)
 */
export function clearAccessCache() {
  accessCache.clear();
}

export default usePageAccess;
