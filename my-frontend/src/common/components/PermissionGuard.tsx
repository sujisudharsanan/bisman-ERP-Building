/**
 * Permission Guard Component
 * Checks user permissions before rendering page content
 * Redirects to access-denied if user has no permissions
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/common/hooks/useAuth';

interface PermissionGuardProps {
  children: React.ReactNode;
  requirePermissions?: boolean; // If true, checks if user has any permissions
}

export default function PermissionGuard({ 
  children, 
  requirePermissions = true 
}: PermissionGuardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Check if user is Enterprise Admin (top-most role - has access to everything)
  const isEnterpriseAdmin = React.useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'ENTERPRISE_ADMIN';
  }, [user?.roleName, user?.role]);

  // Check if user is Super Admin (must respect Enterprise Admin page permissions)
  // Note: Only SUPER_ADMIN role, NOT ADMIN (which is tenant-level admin using rbac_user_permissions)
  const isSuperAdmin = React.useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'SUPER_ADMIN';
  }, [user?.roleName, user?.role]);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id) {
        setIsChecking(false);
        return;
      }

      // Enterprise Admin always has full access
      if (isEnterpriseAdmin) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // If not requiring permission check, grant access
      if (!requirePermissions) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Super Admin: Has full access to /super-admin/* pages
      if (isSuperAdmin && pathname?.startsWith('/super-admin')) {
        console.log('[PermissionGuard] Super Admin accessing super-admin page:', pathname);
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Super Admin: Check page permissions from Enterprise Admin assignment for other pages
      if (isSuperAdmin) {
        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
          const response = await fetch(`${baseURL}/api/auth/me/permissions`, {
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            const pagePermissions = result.user?.permissions?.pagePermissions || {};
            
            // Flatten all allowed page IDs
            const allowedPages: string[] = [];
            Object.values(pagePermissions).forEach((pages: any) => {
              if (Array.isArray(pages)) {
                allowedPages.push(...pages);
              }
            });

            // Check if current path is allowed
            // Extract page id from pathname (e.g., /common/about-me -> about-me)
            const pathSegments = pathname?.split('/').filter(Boolean) || [];
            const pageId = pathSegments[pathSegments.length - 1] || '';
            
            if (allowedPages.length === 0 || !allowedPages.includes(pageId)) {
              console.log('[PermissionGuard] Super Admin denied access to:', pageId, 'Allowed:', allowedPages);
              router.replace('/access-denied');
              setHasAccess(false);
            } else {
              setHasAccess(true);
            }
          } else {
            // API failed - deny access for security
            router.replace('/access-denied');
            setHasAccess(false);
          }
        } catch (error) {
          console.error('[PermissionGuard] Error checking Super Admin permissions:', error);
          router.replace('/access-denied');
          setHasAccess(false);
        } finally {
          setIsChecking(false);
        }
        return;
      }

      // Regular users: Check from rbac_user_permissions
      try {
        // Use Next.js API proxy (same-origin, no CORS)
        const response = await fetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const allowedPages = data.data?.allowedPages || data.allowedPages || [];
          
          if (allowedPages.length === 0) {
            // No permissions - redirect
            router.replace('/access-denied');
            setHasAccess(false);
          } else {
            // Has permissions - allow access
            setHasAccess(true);
          }
        } else {
          // Error fetching permissions - redirect for safety
          router.replace('/access-denied');
          setHasAccess(false);
        }
      } catch (error) {
        console.error('[PermissionGuard] Error checking permissions:', error);
        router.replace('/access-denied');
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkPermissions();
  }, [user?.id, isEnterpriseAdmin, isSuperAdmin, requirePermissions, router, pathname]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render children if no access
  if (!hasAccess) {
    return null;
  }

  // Render children if access granted
  return <>{children}</>;
}
