/**
 * Protected Route Component
 * Guards routes and redirects unauthenticated users to login
 * Supports role-based access control AND dynamic page-level permissions
 * 
 * IMPORTANT: This component now checks BOTH:
 * 1. Role-based access (allowedRoles prop) - for backward compatibility
 * 2. Dynamic page access (useEffectiveAccess) - for EA-assigned page permissions
 * 
 * If EA has assigned a page to a role (e.g., ADMIN_OPS -> /admin/branches),
 * the user will have access even if their role isn't in the hardcoded allowedRoles list.
 */

'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveAccess } from '@/hooks/useEffectiveAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
  loadingTimeout?: number; // Max time to wait before showing error
}

// Pages always accessible regardless of permissions
const ALWAYS_ACCESSIBLE = ['dashboard', 'about-me', 'profile', 'settings', 'help', 'support', 'notifications', 'chat'];

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallback,
  loadingTimeout = 10000 // 10 second timeout
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const redirectAttempted = useRef(false);
  
  // Use effective access hook for dynamic page-level permissions
  const { 
    hasPageAccess, 
    effectivePages,
    loading: effectiveAccessLoading 
  } = useEffectiveAccess();
  
  // Derive multiple page key formats for matching (backend stores both page_code and route)
  // e.g., /admin/branches -> ['branches', '/admin/branches', 'ADMIN_BRANCHES']
  const pageKeys = useMemo(() => {
    const segments = pathname?.split('/').filter(Boolean) || [];
    const lastSegment = segments[segments.length - 1] || 'dashboard';
    
    // Generate potential page codes from route
    // /admin/branches -> ADMIN_BRANCHES
    const pageCode = segments
      .filter(s => s.length > 0)
      .map(s => s.toUpperCase().replace(/-/g, '_'))
      .join('_');
    
    return {
      route: pathname || '/',
      segment: lastSegment,
      pageCode: pageCode,
    };
  }, [pathname]);
  
  // Check if user has dynamic page access (checks multiple formats)
  const hasDynamicPageAccess = useCallback((): boolean => {
    // Check route match (e.g., '/admin/branches')
    if (hasPageAccess(pageKeys.route)) return true;
    
    // Check last segment (e.g., 'branches')
    if (hasPageAccess(pageKeys.segment)) return true;
    
    // Check page code format (e.g., 'ADMIN_BRANCHES')
    if (hasPageAccess(pageKeys.pageCode)) return true;
    
    // Also check if the route is in effectivePages directly
    if (effectivePages.includes(pageKeys.route)) return true;
    if (effectivePages.includes(pageKeys.segment)) return true;
    if (effectivePages.includes(pageKeys.pageCode)) return true;
    
    return false;
  }, [hasPageAccess, effectivePages, pageKeys]);

  // Compute authorization synchronously to avoid flash of loading state
  const isAuthorized = (() => {
    if (loading || effectiveAccessLoading) return false;
    if (!user) return false;
    
    const userRole = user.role || user.roleName;
    
    // 1. Check if page is always accessible
    if (ALWAYS_ACCESSIBLE.includes(pageKeys.segment)) {
      return true;
    }
    
    // 3. Check dynamic page-level access (EA-assigned permissions)
    // This is now the PRIMARY authorization check since we removed hardcoded roles
    // Users must have the page explicitly assigned via admin_page_assignments
    if (hasDynamicPageAccess()) {
      return true;
    }
    
    // 4. If allowedRoles is specified, check role-based access (legacy support)
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRoleAccess = allowedRoles.some(role => 
        userRole?.toLowerCase() === role.toLowerCase()
      );
      if (hasRoleAccess) {
        return true;
      }
    }
    
    // 5. Not authorized - no dynamic access and no role match
    return false;
  })();

  // Loading timeout to prevent infinite loading state
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.warn('⚠️ ProtectedRoute: Loading timeout exceeded');
        setHasTimedOut(true);
      }, loadingTimeout);
      return () => clearTimeout(timer);
    }
  }, [loading, loadingTimeout]);

  // Handle redirects when auth check is complete
  useEffect(() => {
    // Skip if already redirecting or redirect was attempted
    if (isRedirecting || redirectAttempted.current || loading || effectiveAccessLoading) return;

    // Not logged in - redirect to login
    if (!user) {
      console.log('🚫 ProtectedRoute: No user, redirecting to login');
      redirectAttempted.current = true;
      setIsRedirecting(true);
      router.push('/auth/login');
      return;
    }

    const userRole = user.role || user.roleName;
    
    // Check if page is always accessible
    if (ALWAYS_ACCESSIBLE.includes(pageKeys.segment)) {
      console.log(`✅ ProtectedRoute: Page "${pageKeys.segment}" is always accessible`);
      return;
    }
    
    // Check role-based access (hardcoded allowedRoles)
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRoleAccess = allowedRoles.some(role => 
        userRole?.toLowerCase() === role.toLowerCase()
      );
      
      if (hasRoleAccess) {
        console.log(`✅ ProtectedRoute: User role "${userRole}" in allowed roles [${allowedRoles.join(', ')}]`);
        return;
      }
    }
    
    // Check dynamic page-level access (EA-assigned permissions)
    if (hasDynamicPageAccess()) {
      console.log(`✅ ProtectedRoute: User has dynamic page access to "${pageKeys.route}" via effective permissions`);
      return;
    }
    
    // If no allowedRoles specified, allow access (backward compatibility)
    if (!allowedRoles || allowedRoles.length === 0) {
      console.log(`✅ ProtectedRoute: No roles required, user "${userRole}" authorized`);
      return;
    }
    
    // No access - redirect to access-denied
    console.log(`🚫 ProtectedRoute: User role "${userRole}" denied access to "${pageKeys.route}". Not in [${allowedRoles.join(', ')}] and no dynamic page access.`);
    redirectAttempted.current = true;
    setIsRedirecting(true);
    router.push('/access-denied');
  }, [user, loading, effectiveAccessLoading, allowedRoles, router, isRedirecting, pageKeys, hasDynamicPageAccess]);

  // Handle timeout - redirect to login if stuck
  useEffect(() => {
    if (hasTimedOut && !isRedirecting && !redirectAttempted.current) {
      console.error('❌ ProtectedRoute: Timed out waiting for auth, redirecting to login');
      redirectAttempted.current = true;
      setIsRedirecting(true);
      router.push('/auth/login');
    }
  }, [hasTimedOut, isRedirecting, router]);

  // Default loading fallback - centered on screen
  const defaultFallback = (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-slate-900/80 z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {hasTimedOut ? 'Taking longer than expected...' : 'Loading...'}
        </p>
        {hasTimedOut && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Redirecting to login...
          </p>
        )}
      </div>
    </div>
  );

  const loadingContent = fallback || defaultFallback;

  // Show loading state
  if (loading || effectiveAccessLoading || isRedirecting) {
    return <>{loadingContent}</>;
  }

  // Not authorized yet (waiting for redirect or authorization)
  if (!isAuthorized) {
    return <>{loadingContent}</>;
  }

  return <>{children}</>;
}
