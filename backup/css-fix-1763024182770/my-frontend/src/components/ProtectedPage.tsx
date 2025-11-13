/**
 * Protected Page Wrapper Component
 * 
 * Wraps any page to enforce permission checks before rendering.
 * Redirects unauthorized users to access-denied page.
 * 
 * Usage:
 * ```tsx
 * import ProtectedPage from '@/components/ProtectedPage';
 * 
 * export default function MyPage() {
 *   return (
 *     <ProtectedPage pageId="finance-dashboard" moduleName="finance">
 *       <div>Your page content here</div>
 *     </ProtectedPage>
 *   );
 * }
 * ```
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedPageProps {
  children: React.ReactNode;
  pageId: string;              // Page identifier from PAGE_REGISTRY
  moduleName?: string;          // Optional: module name for additional check
  requiredRole?: string[];      // Optional: specific roles required
  fallbackUrl?: string;         // Optional: custom redirect URL
}

export default function ProtectedPage({
  children,
  pageId,
  moduleName,
  requiredRole,
  fallbackUrl = '/access-denied'
}: ProtectedPageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to complete
      if (loading) {
        return;
      }

      // No user - redirect to login
      if (!user) {
        console.log(`🚫 [PAGE GUARD] No user - redirecting to login`);
        router.replace('/auth/login');
        return;
      }

      try {
        // Check if user role is in required roles (if specified)
        if (requiredRole && requiredRole.length > 0) {
          const userRole = user.role || user.roleName || '';
          const hasRequiredRole = requiredRole.some(
            role => role.toUpperCase() === userRole.toUpperCase()
          );

          if (!hasRequiredRole) {
            console.log(`🚫 [PAGE GUARD] User ${user.email} missing required role for page: ${pageId}`);
            console.log(`   Required: ${requiredRole.join(', ')}, Has: ${userRole}`);
            router.replace(fallbackUrl);
            return;
          }
        }

        // Enterprise Admin: Check if trying to access business page
        if (user.role === 'ENTERPRISE_ADMIN' || user.roleName === 'ENTERPRISE_ADMIN') {
          const isEnterprisePageId = pageId.startsWith('enterprise-') || 
                                      pageId.includes('super-admins') ||
                                      pageId.includes('clients-manage');
          
          if (!isEnterprisePageId) {
            console.log(`🚫 [PAGE GUARD] Enterprise Admin cannot access business page: ${pageId}`);
            router.replace(fallbackUrl);
            return;
          }

          // Enterprise Admin has access to enterprise pages
          console.log(`✅ [PAGE GUARD] Enterprise Admin accessing: ${pageId}`);
          setHasAccess(true);
          setIsChecking(false);
          return;
        }

        // For Super Admin and regular users: Check backend permissions
        const response = await fetch(`/api/permissions/check-page?pageId=${pageId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          console.log(`🚫 [PAGE GUARD] Permission check failed for ${user.email} on page: ${pageId}`);
          router.replace(fallbackUrl);
          return;
        }

        const result = await response.json();
        
        if (result.hasAccess) {
          console.log(`✅ [PAGE GUARD] User ${user.email} has access to page: ${pageId}`);
          setHasAccess(true);
        } else {
          console.log(`🚫 [PAGE GUARD] User ${user.email} denied access to page: ${pageId}`);
          router.replace(fallbackUrl);
        }
      } catch (error) {
        console.error(`❌ [PAGE GUARD] Error checking access for page ${pageId}:`, error);
        router.replace(fallbackUrl);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [user, loading, pageId, moduleName, requiredRole, router, fallbackUrl]);

  // Show loading state while checking permissions
  if (loading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Only render children if user has access
  if (!hasAccess) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}

/**
 * HOC version of ProtectedPage for easier wrapping
 * 
 * Usage:
 * ```tsx
 * const MyProtectedPage = withPageProtection(MyPage, {
 *   pageId: 'finance-dashboard',
 *   moduleName: 'finance'
 * });
 * ```
 */
export function withPageProtection<P extends object>(
  Component: React.ComponentType<P>,
  protectionConfig: Omit<ProtectedPageProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedPage {...protectionConfig}>
        <Component {...props} />
      </ProtectedPage>
    );
  };
}
