/**
 * Permission Guard Component
 * Checks user permissions before rendering page content
 * Redirects to access-denied if user has no permissions
 */

'use client';

import React, { useEffect, useState } from 'react';
import { hasFullAdmin } from '../../constants/roles';
import { useRouter } from 'next/navigation';
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
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Check if user is Super Admin
  const isSuperAdmin = React.useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return hasFullAdmin(roleName);
  }, [user?.roleName, user?.role]);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user?.id) {
        setIsChecking(false);
        return;
      }

      // Super Admin always has access
      if (isSuperAdmin) {
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

      try {
        // Use Next.js API proxy (same-origin, no CORS)
        const response = await fetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const allowedPages = data.allowedPages || [];
          
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
  }, [user?.id, isSuperAdmin, requirePermissions, router]);

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
