/**
 * Protected Route Component
 * Guards routes and redirects unauthenticated users to login
 * Supports role-based access control
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
  loadingTimeout?: number; // Max time to wait before showing error
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallback,
  loadingTimeout = 10000 // 10 second timeout
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const redirectAttempted = useRef(false);

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

  useEffect(() => {
    // Skip if already redirecting or redirect was attempted
    if (isRedirecting || redirectAttempted.current) return;

    if (!loading) {
      // Not logged in
      if (!user) {
        console.log('🚫 ProtectedRoute: No user, redirecting to login');
        redirectAttempted.current = true;
        setIsRedirecting(true);
        router.push('/auth/login');
        return;
      }

      // Role check
      const userRole = user.role || user.roleName;
      if (allowedRoles && allowedRoles.length > 0) {
        const hasAccess = allowedRoles.some(role => 
          userRole?.toLowerCase() === role.toLowerCase()
        );
        
        if (!hasAccess) {
          console.log(`🚫 ProtectedRoute: User role "${userRole}" not in allowed roles [${allowedRoles.join(', ')}]`);
          redirectAttempted.current = true;
          setIsRedirecting(true);
          router.push('/unauthorized');
          return;
        }
      }

      console.log(`✅ ProtectedRoute: User authorized with role "${userRole}"`);
      setIsAuthorized(true);
    }
  }, [user, loading, allowedRoles, router, isRedirecting]);

  // Handle timeout - redirect to login if stuck
  useEffect(() => {
    if (hasTimedOut && !isRedirecting && !redirectAttempted.current) {
      console.error('❌ ProtectedRoute: Timed out waiting for auth, redirecting to login');
      redirectAttempted.current = true;
      setIsRedirecting(true);
      router.push('/auth/login');
    }
  }, [hasTimedOut, isRedirecting, router]);

  // Default loading fallback
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          {hasTimedOut ? 'Taking longer than expected...' : 'Loading...'}
        </p>
        {hasTimedOut && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Redirecting to login...
          </p>
        )}
      </div>
    </div>
  );

  const loadingContent = fallback || defaultFallback;

  // Show loading state
  if (loading || isRedirecting) {
    return <>{loadingContent}</>;
  }

  // Not authorized yet (waiting for redirect or authorization)
  if (!isAuthorized) {
    return <>{loadingContent}</>;
  }

  return <>{children}</>;
}
