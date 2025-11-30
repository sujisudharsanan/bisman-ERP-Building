'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleAccessGuardProps {
  children: React.ReactNode;
}

/**
 * ModuleAccessGuard - Route protection based on module/page assignments
 * 
 * Access Hierarchy:
 * - Enterprise Admin: Full access to all modules and pages
 * - Super Admin: Access to modules assigned by Enterprise Admin
 * - Admin: Access to modules assigned by Super Admin
 * - Users: Access to pages assigned by Admin
 * - Common Module: Always accessible by all authenticated users
 */
export function ModuleAccessGuard({ children }: ModuleAccessGuardProps) {
  const { user, loading, hasPageAccess, isCommonPage, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);

  useEffect(() => {
    if (loading) return;
    
    // Handle null pathname
    if (!pathname) {
      setAccessChecked(true);
      setHasAccess(true);
      return;
    }
    
    // Skip access check for auth pages
    if (pathname.startsWith('/auth')) {
      setAccessChecked(true);
      setHasAccess(true);
      return;
    }

    // If not authenticated, let the main auth middleware handle redirect
    if (!isAuthenticated) {
      setAccessChecked(true);
      setHasAccess(false);
      return;
    }

    // Enterprise Admin bypass - full access
    if (user?.role === 'ENTERPRISE_ADMIN' || user?.userType === 'ENTERPRISE_ADMIN') {
      setAccessChecked(true);
      setHasAccess(true);
      return;
    }

    // Common pages are always accessible
    if (isCommonPage(pathname)) {
      setAccessChecked(true);
      setHasAccess(true);
      return;
    }

    // Special routes that are always accessible
    const alwaysAccessibleRoutes = [
      '/dashboard',
      '/profile',
      '/settings',
      '/notifications',
      '/chat',
    ];
    
    if (alwaysAccessibleRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      setAccessChecked(true);
      setHasAccess(true);
      return;
    }

    // Role-based dashboard routes
    const roleDashboards: Record<string, string[]> = {
      'SUPER_ADMIN': ['/super-admin'],
      'ADMIN': ['/admin'],
      'CFO': ['/cfo-dashboard', '/finance'],
      'FINANCE_CONTROLLER': ['/finance-controller', '/finance'],
      'TREASURY': ['/treasury', '/finance'],
      'ACCOUNTS': ['/accounts', '/finance'],
      'ACCOUNTS_PAYABLE': ['/accounts-payable', '/finance'],
      'BANKER': ['/banker', '/finance'],
      'PROCUREMENT_OFFICER': ['/procurement-officer', '/procurement'],
      'STORE_INCHARGE': ['/store-incharge', '/operations'],
      'OPERATIONS_MANAGER': ['/operations-manager', '/operations'],
      'HUB_INCHARGE': ['/hub-incharge', '/operations'],
      'COMPLIANCE': ['/compliance-officer', '/compliance'],
      'LEGAL': ['/legal', '/compliance'],
      'HR': ['/hr'],
      'IT_ADMIN': ['/it-admin', '/system'],
      'MANAGER': ['/manager'],
      'STAFF': ['/staff'],
    };

    const userRole = user?.role || user?.roleName;
    if (userRole && roleDashboards[userRole]) {
      const allowedPaths = roleDashboards[userRole];
      if (allowedPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
        setAccessChecked(true);
        setHasAccess(true);
        return;
      }
    }

    // Check page-level access from assignments
    const pageAccessAllowed = hasPageAccess(pathname);
    setHasAccess(pageAccessAllowed);
    setAccessChecked(true);

    // If no access, redirect to appropriate dashboard
    if (!pageAccessAllowed) {
      console.warn(`🚫 Access denied to ${pathname} for user ${user?.email}`);
      // Don't redirect immediately - show access denied message
    }
  }, [pathname, user, loading, isAuthenticated, hasPageAccess, isCommonPage]);

  // Show loading while checking
  if (loading || !accessChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show access denied
  if (!hasAccess && isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Restricted
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to access this page. Please contact your administrator
            to request access to this module.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go Back
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ModuleAccessGuard;
