'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Lazy load heavy unified dashboard (SuperAdminControlPanel)
  const SuperAdminControlPanel = React.useMemo(() => dynamic(() => import('@/components/SuperAdminControlPanel'), { ssr: false }), []);

  // Redirect if user is not authenticated or doesn't have ADMIN access
  React.useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.roleName === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (user.roleName === 'MANAGER') {
        router.push('/operations-manager');
      } else if (user.roleName === 'STAFF') {
        router.push('/hub-incharge');
      } else if (user.roleName && !['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)) {
        router.push('/auth/login');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  // If unified dashboard lives at /super-admin, redirect /admin there for both roles
  useEffect(() => {
    const role = user?.roleName || '';
    if (role && ['ADMIN','SUPER_ADMIN'].includes(role)) {
      // Avoid infinite loop if already at /super-admin
      if (window.location.pathname === '/admin') {
        window.location.replace('/super-admin');
      }
    }
  }, [user?.roleName]);

  // Render nothing; redirect will happen client-side
  return null;

  // Previously returned unified dashboard directly
  // Now handled via redirect to /super-admin
}
