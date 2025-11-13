/**
 * Protected Route Component
 * Guards routes and redirects unauthenticated users to login
 * Supports role-based access control
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallback = (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      // Not logged in
      if (!user) {
        console.log('🚫 ProtectedRoute: No user, redirecting to login');
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
          router.push('/unauthorized');
          return;
        }
      }

      console.log(`✅ ProtectedRoute: User authorized with role "${userRole}"`);
      setIsAuthorized(true);
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
