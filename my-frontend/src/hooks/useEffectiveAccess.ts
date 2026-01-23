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
 * Usage:
 *   const { effectivePages, blockedPages, hasPageAccess, loading, refresh } = useEffectiveAccess();
 *   
 *   if (!hasPageAccess('finance-dashboard')) {
 *     return <AccessDenied reason={getBlockedReason('finance-dashboard')} />;
 *   }
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
const CACHE_KEY_PREFIX = 'effective_access_v1_';

// Cache TTL: 5 minutes for normal use, 1 hour in localStorage
const MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_CACHE_TTL_MS = 60 * 60 * 1000;

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
  
  // Check if user is Enterprise Admin (full access)
  const isEnterpriseAdmin = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'ENTERPRISE_ADMIN';
  }, [user?.roleName, user?.role]);
  
  // Fetch effective access from API
  const fetchEffectiveAccess = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    // Enterprise Admin bypasses - they have full access
    if (isEnterpriseAdmin) {
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
  }, [user?.id, isEnterpriseAdmin, cacheKey]);
  
  // Initial fetch on mount
  useEffect(() => {
    if (!authLoading) {
      fetchEffectiveAccess();
    }
  }, [authLoading, fetchEffectiveAccess]);
  
  // Refresh function for manual refresh
  const refresh = useCallback(async () => {
    await fetchEffectiveAccess(true);
  }, [fetchEffectiveAccess]);
  
  // Check if user has access to a specific page
  const hasPageAccess = useCallback((pageKey: string): boolean => {
    // Always accessible pages
    if (ALWAYS_ACCESSIBLE_PAGES.includes(pageKey)) {
      return true;
    }
    
    // Enterprise Admin has full access
    if (isEnterpriseAdmin) {
      return true;
    }
    
    // Check if page is in effective pages
    if (!data) return false;
    
    // Wildcard means full access
    if (data.effectivePages.includes('*')) {
      return true;
    }
    
    return data.effectivePages.includes(pageKey);
  }, [data, isEnterpriseAdmin]);
  
  // Check if user has access to a specific role
  const hasRoleAccess = useCallback((roleName: string): boolean => {
    if (isEnterpriseAdmin) {
      return true;
    }
    
    if (!data) return false;
    
    if (data.effectiveRoles.includes('*')) {
      return true;
    }
    
    return data.effectiveRoles.includes(roleName);
  }, [data, isEnterpriseAdmin]);
  
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
