/**
 * ============================================================================
 * BISMAN ERP - Route Governance Hook (Frontend)
 * ============================================================================
 * 
 * React hook for client-side route governance enforcement.
 * 
 * Features:
 *   1. Fetches allowed routes from /api/governance/my-routes on mount
 *   2. Caches routes in sessionStorage for performance
 *   3. Provides checkRouteAccess() function for route validation
 *   4. Auto-redirects on access denial
 * 
 * Usage:
 *   const { hasAccess, loading, checkRoute } = useRouteGovernance();
 *   
 *   // In useEffect or route change handler:
 *   if (!loading && !checkRoute(pathname)) {
 *     router.push('/unauthorized');
 *   }
 * 
 * Date: 2025-01-19
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/common/hooks/useAuth';

// ============================================================================
// Types
// ============================================================================

interface RoutePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

interface RouteInfo {
  id: number;
  code: string;
  name: string;
  route: string;
  pattern: string | null;
  module: string | null;
  isGoverned: boolean;
  isPublic: boolean;
  isDynamic: boolean;
  permissions: RoutePermissions;
}

interface UseRouteGovernanceReturn {
  /** True while fetching routes from API */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** List of all accessible routes */
  routes: RouteInfo[];
  /** Check if user has access to a specific route */
  checkRoute: (path: string) => boolean;
  /** Get full route info for a path */
  getRouteInfo: (path: string) => RouteInfo | null;
  /** Check if user has specific permission on a route */
  hasPermission: (path: string, permission: keyof RoutePermissions) => boolean;
  /** Refresh routes from API */
  refresh: () => Promise<void>;
}

// ============================================================================
// Configuration
// ============================================================================

// Routes that bypass governance check (always allowed)
const BYPASS_ROUTES = [
  '/login',
  '/signup',
  '/auth',
  '/unauthorized',
  '/access-denied',
  '/status',
  '/privacy',
  '/terms',
  '/support',
  '/contact-sales',
  '/docs',
  '/onboarding',
  '/welcome',
  '/get-started',
];

// Cache key for sessionStorage
const CACHE_KEY = 'governance_routes_v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize a pathname for comparison
 */
function normalizePath(path: string): string {
  let normalized = path.split('?')[0].split('#')[0];
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

/**
 * Convert pathname with IDs to pattern for matching
 * e.g., /admin/users/123 → /admin/users/:id
 */
function pathToPattern(path: string): string {
  const segments = path.split('/');
  return segments.map(seg => {
    // UUID pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) {
      return ':id';
    }
    // Numeric ID
    if (/^\d+$/.test(seg)) {
      return ':id';
    }
    // Token-like string (long alphanumeric)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(seg)) {
      return ':token';
    }
    return seg;
  }).join('/');
}

/**
 * Check if path should bypass governance
 */
function shouldBypass(path: string): boolean {
  const normalized = normalizePath(path);
  return BYPASS_ROUTES.some(bypass => 
    normalized === bypass || normalized.startsWith(bypass + '/')
  );
}

/**
 * Match a path against a route pattern
 */
function matchesPattern(path: string, route: RouteInfo): boolean {
  const normalized = normalizePath(path);
  const pattern = pathToPattern(path);
  
  // Exact route match
  if (route.route === normalized) return true;
  
  // Pattern match
  if (route.pattern === pattern) return true;
  if (route.pattern === normalized) return true;
  
  // Dynamic route matching
  if (route.isDynamic && route.pattern) {
    // Convert pattern like /admin/users/:id to regex
    const regex = new RegExp(
      '^' + route.pattern.replace(/:[a-zA-Z_]+/g, '[^/]+') + '$'
    );
    if (regex.test(normalized)) return true;
  }
  
  return false;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRouteGovernance(): UseRouteGovernanceReturn {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch routes from API
  const fetchRoutes = useCallback(async () => {
    if (!user?.id) {
      setRoutes([]);
      setLoading(false);
      return;
    }
    
    // Try cache first
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { routes: cachedRoutes, timestamp, userId } = JSON.parse(cached);
        if (userId === user.id && Date.now() - timestamp < CACHE_TTL) {
          console.log('[RouteGovernance] Using cached routes');
          setRoutes(cachedRoutes);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/governance/my-routes`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch routes: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data?.routes) {
        const fetchedRoutes = result.data.routes as RouteInfo[];
        setRoutes(fetchedRoutes);
        
        // Cache the result
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            routes: fetchedRoutes,
            timestamp: Date.now(),
            userId: user.id,
          }));
        } catch (e) {
          // Ignore cache errors
        }
      } else {
        throw new Error(result.message || 'Invalid response');
      }
    } catch (err) {
      console.error('[RouteGovernance] Error fetching routes:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Don't block on errors - fail open but log
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  // Fetch routes on mount and user change
  useEffect(() => {
    if (!authLoading) {
      fetchRoutes();
    }
  }, [authLoading, fetchRoutes]);
  
  // Check if user has access to a specific route
  const checkRoute = useCallback((path: string): boolean => {
    // Bypass routes are always allowed
    if (shouldBypass(path)) {
      return true;
    }
    
    // If not logged in, deny governed routes
    if (!user?.id) {
      return false;
    }
    
    // If still loading, assume access (will be checked on page load)
    if (loading) {
      return true;
    }
    
    // Empty routes list = no access (fail secure)
    if (routes.length === 0) {
      console.warn('[RouteGovernance] No routes loaded - denying access');
      return false;
    }
    
    // Find matching route
    const matchedRoute = routes.find(r => matchesPattern(path, r));
    
    if (!matchedRoute) {
      console.warn(`[RouteGovernance] No match for path: ${path}`);
      return false;
    }
    
    // Public routes are always accessible
    if (matchedRoute.isPublic || !matchedRoute.isGoverned) {
      return true;
    }
    
    // Check view permission
    return matchedRoute.permissions.canView;
  }, [routes, loading, user?.id]);
  
  // Get full route info for a path
  const getRouteInfo = useCallback((path: string): RouteInfo | null => {
    return routes.find(r => matchesPattern(path, r)) || null;
  }, [routes]);
  
  // Check specific permission on a route
  const hasPermission = useCallback((
    path: string, 
    permission: keyof RoutePermissions
  ): boolean => {
    const routeInfo = getRouteInfo(path);
    if (!routeInfo) return false;
    return routeInfo.permissions[permission];
  }, [getRouteInfo]);
  
  return {
    loading: loading || authLoading,
    error,
    routes,
    checkRoute,
    getRouteInfo,
    hasPermission,
    refresh: fetchRoutes,
  };
}

// ============================================================================
// Route Guard Component
// ============================================================================

interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component wrapper that blocks access to unregistered routes
 */
export function RouteGuard({ 
  children, 
  fallback = null,
  redirectTo = '/unauthorized',
}: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { checkRoute, loading, error } = useRouteGovernance();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (loading || !pathname) return;
    
    const access = checkRoute(pathname);
    setHasAccess(access);
    
    if (!access) {
      console.warn(`[RouteGuard] Access denied to: ${pathname}`);
      if (redirectTo) {
        router.push(redirectTo);
      }
    }
  }, [pathname, checkRoute, loading, redirectTo, router]);
  
  // Still loading
  if (loading || hasAccess === null) {
    return fallback || <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }
  
  // Access denied
  if (!hasAccess) {
    return fallback;
  }
  
  // Access granted
  return <>{children}</>;
}

export default useRouteGovernance;
