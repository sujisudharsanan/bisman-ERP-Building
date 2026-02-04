/**
 * Effective Access Hook
 * =====================
 * 
 * Fetches EFFECTIVE page/role access using THREE-LAYER INTERSECTION:
 *   effectivePages = subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
 * 
 * This is the single source of truth for frontend page access.
 * Backend enforces the same logic, so this is purely for UI hiding.
 * 
 * CACHE INVALIDATION:
 *   - Cache is automatically invalidated when role assignments change
 *   - Checks for stale cache on each load
 *   - Forces refresh if assignments have changed since last cache
 * 
 * Usage:
 *   const { effectivePages, blockedPages, hasPageAccess, loading, refresh } = useEffectiveAccess();
 *   
 *   if (!hasPageAccess('finance-dashboard')) {
 *     return <AccessDenied reason={getBlockedReason('finance-dashboard')} />;
 *   }
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/common/hooks/useAuth';

// ============================================================================
// TYPES
// ============================================================================

export interface BlockedPage {
  pageKey: string;
  reason: 'subscription' | 'enterprise' | 'superadmin' | 'unknown';
  reasonDetail: string;
}

export interface EffectiveAccessDetails {
  [pageKey: string]: {
    inSubscription: boolean;
    inEnterprise: boolean;
    inSuperadmin: boolean;
    isEffective: boolean;
    blockedReason: string | null;
  };
}

export interface EffectiveAccessData {
  effectivePages: string[];
  effectiveRoles: string[];
  blockedPages: BlockedPage[];
  accessDetails: EffectiveAccessDetails;
  planId: number | null;
  tenantId: string | null;
  layers: {
    subscription: number;
    enterprise: number;
    superadmin: number;
    effective: number;
  };
  cached: boolean;
  computedAt: string;
}

export interface UseEffectiveAccessResult {
  effectivePages: string[];
  effectiveRoles: string[];
  blockedPages: BlockedPage[];
  accessDetails: EffectiveAccessDetails;
  loading: boolean;
  error: string | null;
  hasPageAccess: (pageKey: string) => boolean;
  hasRoleAccess: (roleName: string) => boolean;
  getBlockedReason: (pageKey: string) => string | null;
  refresh: () => Promise<void>;
  layers: {
    subscription: number;
    enterprise: number;
    superadmin: number;
    effective: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

// Cache key prefix for localStorage
const CACHE_KEY_PREFIX = 'effective_access_v2_'; // v2 includes cachedAt timestamp

// Cache TTL: 2 minutes for memory, 30 minutes in localStorage (reduced for quicker updates)
const MEMORY_CACHE_TTL_MS = 2 * 60 * 1000;
const STORAGE_CACHE_TTL_MS = 30 * 60 * 1000;

// How often to check for stale cache (every 30 seconds)
const STALE_CHECK_INTERVAL_MS = 30 * 1000;

// Pages that are always accessible (no permission check needed)
const ALWAYS_ACCESSIBLE_PAGES = [
  'dashboard',
  'about-me',
  'profile',
  'settings',
  'help',
  'support',
  'notifications',
  'chat',
];

// ============================================================================
// HELPER: Check if cache is stale via backend
// ============================================================================

async function checkCacheStale(cachedAt: number): Promise<boolean> {
  try {
    const baseURL = getApiUrl();
    const response = await fetch(`${baseURL}/api/access/check-stale?cachedAt=${cachedAt}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) return true; // Assume stale on error
    
    const result = await response.json();
    return result.isStale || false;
  } catch (e) {
    console.warn('[useEffectiveAccess] Stale check failed:', e);
    return false; // Don't force refresh on network error
  }
}

// ============================================================================
// EVENT SYSTEM: Allow immediate cache invalidation from role management pages
// ============================================================================

const RBAC_INVALIDATION_EVENT = 'rbac-permissions-changed';

/**
 * Trigger immediate cache invalidation across all useEffectiveAccess hooks.
 * Call this after successfully saving role page assignments.
 * 
 * @param roleName - Optional: the specific role that was updated
 */
export function triggerPermissionsRefresh(roleName?: string) {
  console.log('[useEffectiveAccess] Broadcasting permissions refresh event', roleName ? `for role: ${roleName}` : '');
  
  // Clear all localStorage caches that start with our prefix
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
  
  // Dispatch custom event for hooks to listen
  window.dispatchEvent(new CustomEvent(RBAC_INVALIDATION_EVENT, {
    detail: { roleName, timestamp: Date.now() }
  }));
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useEffectiveAccess(): UseEffectiveAccessResult {
  const { user, loading: authLoading } = useAuth();
  
  // State
  const [data, setData] = useState<EffectiveAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache key based on user
  const cacheKey = useMemo(() => {
    if (!user?.id) return null;
    return `${CACHE_KEY_PREFIX}${user.id}`;
  }, [user?.id]);
  
  // Check if user is Enterprise Admin or Super Admin (full access)
  const hasFullAccessRole = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'ENTERPRISE_ADMIN' || roleName === 'SUPER_ADMIN';
  }, [user?.roleName, user?.role]);
  
  // Fetch effective access from API
  const fetchEffectiveAccess = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    // Enterprise Admin and Super Admin bypass - they have full access
    if (hasFullAccessRole) {
      const roleName = String(user?.roleName || user?.role || '').toUpperCase();
      console.log(`[useEffectiveAccess] ${roleName} bypass - full access granted`);
      setData({
        effectivePages: ['*'], // Special wildcard for full access
        effectiveRoles: ['*'],
        blockedPages: [],
        accessDetails: {},
        planId: null,
        tenantId: null,
        layers: { subscription: -1, enterprise: -1, superadmin: -1, effective: -1 },
        cached: false,
        computedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }
    
    // Try localStorage cache first (for instant load)
    if (!forceRefresh && cacheKey) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < STORAGE_CACHE_TTL_MS) {
            console.log('[useEffectiveAccess] Using cached data, age:', Math.round(age / 1000), 's');
            setData(cachedData);
            setLoading(false);
            
            // Background refresh if stale
            if (age > MEMORY_CACHE_TTL_MS) {
              console.log('[useEffectiveAccess] Cache stale, refreshing in background...');
              // Continue to fetch (don't return)
            } else {
              return;
            }
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }
    
    try {
      setLoading(true);
      const baseURL = getApiUrl();
      const url = forceRefresh 
        ? `${baseURL}/api/access/refresh`
        : `${baseURL}/api/access/effective`;
      
      const response = await fetch(url, {
        method: forceRefresh ? 'POST' : 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch effective access: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const accessData: EffectiveAccessData = {
          effectivePages: result.data.effectivePages || [],
          effectiveRoles: result.data.effectiveRoles || [],
          blockedPages: result.data.blockedPages || [],
          accessDetails: result.data.accessDetails || {},
          planId: result.data.planId,
          tenantId: result.data.tenantId,
          layers: result.data.layers || { subscription: 0, enterprise: 0, superadmin: 0, effective: 0 },
          cached: result.data.cached || false,
          computedAt: result.data.computedAt || new Date().toISOString(),
        };
        
        setData(accessData);
        setError(null);
        
        // Cache in localStorage
        if (cacheKey) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              data: accessData,
              timestamp: Date.now(),
            }));
          } catch (e) {
            // Ignore storage errors
          }
        }
      } else {
        throw new Error(result.error || 'Unknown error fetching effective access');
      }
    } catch (err: any) {
      console.error('[useEffectiveAccess] Error:', err);
      setError(err.message || 'Failed to fetch effective access');
      
      // On error, fall back to empty access (security: deny by default)
      setData({
        effectivePages: ALWAYS_ACCESSIBLE_PAGES,
        effectiveRoles: [],
        blockedPages: [],
        accessDetails: {},
        planId: null,
        tenantId: null,
        layers: { subscription: 0, enterprise: 0, superadmin: 0, effective: 0 },
        cached: false,
        computedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.roleName, user?.role, hasFullAccessRole, cacheKey]);
  
  // Track when we last checked for stale cache
  const lastStaleCheckRef = useRef<number>(0);
  const staleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initial fetch on mount
  useEffect(() => {
    if (!authLoading) {
      fetchEffectiveAccess();
    }
  }, [authLoading, fetchEffectiveAccess]);
  
  // Listen for immediate invalidation events (from role management pages)
  useEffect(() => {
    const handleInvalidation = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[useEffectiveAccess] Received invalidation event:', customEvent.detail);
      
      // Force refresh from server
      fetchEffectiveAccess(true);
    };
    
    window.addEventListener(RBAC_INVALIDATION_EVENT, handleInvalidation);
    
    return () => {
      window.removeEventListener(RBAC_INVALIDATION_EVENT, handleInvalidation);
    };
  }, [fetchEffectiveAccess]);
  
  // Periodic stale check - automatically refresh if role assignments changed
  useEffect(() => {
    if (authLoading || !user?.id || hasFullAccessRole) {
      return;
    }
    
    const checkAndRefreshIfStale = async () => {
      try {
        // Get the cached timestamp
        if (!cacheKey) return;
        
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return;
        
        const { timestamp } = JSON.parse(cached);
        if (!timestamp) return;
        
        // Check if cache is stale
        const isStale = await checkCacheStale(timestamp);
        
        if (isStale) {
          console.log('[useEffectiveAccess] Cache is stale, auto-refreshing...');
          // Clear localStorage cache before refresh to ensure fresh data
          localStorage.removeItem(cacheKey);
          await fetchEffectiveAccess(true);
        }
      } catch (e) {
        console.warn('[useEffectiveAccess] Auto-refresh check failed:', e);
      }
    };
    
    // Run check immediately if enough time has passed since last check
    const now = Date.now();
    if (now - lastStaleCheckRef.current > STALE_CHECK_INTERVAL_MS) {
      lastStaleCheckRef.current = now;
      checkAndRefreshIfStale();
    }
    
    // Set up periodic check
    staleCheckIntervalRef.current = setInterval(() => {
      lastStaleCheckRef.current = Date.now();
      checkAndRefreshIfStale();
    }, STALE_CHECK_INTERVAL_MS);
    
    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
    };
  }, [authLoading, user?.id, hasFullAccessRole, cacheKey, fetchEffectiveAccess]);
  
  // Refresh function for manual refresh
  const refresh = useCallback(async () => {
    // Clear cache before refresh
    if (cacheKey) {
      localStorage.removeItem(cacheKey);
    }
    await fetchEffectiveAccess(true);
  }, [fetchEffectiveAccess, cacheKey]);
  
  // Check if user has access to a specific page
  const hasPageAccess = useCallback((pageKey: string): boolean => {
    // Always accessible pages
    if (ALWAYS_ACCESSIBLE_PAGES.includes(pageKey)) {
      return true;
    }
    
    // Enterprise Admin and Super Admin have full access
    if (hasFullAccessRole) {
      return true;
    }
    
    // Check if page is in effective pages
    if (!data) return false;
    
    // Wildcard means full access
    if (data.effectivePages.includes('*')) {
      return true;
    }
    
    return data.effectivePages.includes(pageKey);
  }, [data, hasFullAccessRole]);
  
  // Check if user has access to a specific role
  const hasRoleAccess = useCallback((roleName: string): boolean => {
    if (hasFullAccessRole) {
      return true;
    }
    
    if (!data) return false;
    
    if (data.effectiveRoles.includes('*')) {
      return true;
    }
    
    return data.effectiveRoles.includes(roleName);
  }, [data, hasFullAccessRole]);
  
  // Get blocked reason for a page
  const getBlockedReason = useCallback((pageKey: string): string | null => {
    if (!data) return null;
    
    const blocked = data.blockedPages.find(b => b.pageKey === pageKey);
    if (blocked) {
      return blocked.reasonDetail;
    }
    
    const details = data.accessDetails[pageKey];
    if (details && !details.isEffective) {
      return details.blockedReason;
    }
    
    return null;
  }, [data]);
  
  // Return values
  return {
    effectivePages: data?.effectivePages || [],
    effectiveRoles: data?.effectiveRoles || [],
    blockedPages: data?.blockedPages || [],
    accessDetails: data?.accessDetails || {},
    loading: loading || authLoading,
    error,
    hasPageAccess,
    hasRoleAccess,
    getBlockedReason,
    refresh,
    layers: data?.layers || { subscription: 0, enterprise: 0, superadmin: 0, effective: 0 },
  };
}

export default useEffectiveAccess;
