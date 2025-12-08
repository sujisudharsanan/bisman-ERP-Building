'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect all users to appropriate dashboard based on role
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/auth/login');
      } else if (user.roleName === 'SUPER_ADMIN') {
        router.replace('/super-admin');
      } else if (user.roleName === 'MANAGER') {
        router.replace('/operations-manager');
      } else if (user.roleName === 'STAFF') {
        router.replace('/hub-incharge');
      } else if (user.roleName === 'ADMIN') {
        // ADMIN users go to the new Business Health Dashboard
        router.replace('/admin/dashboard');
      } else {
        // Default: go to admin dashboard
        router.replace('/admin/dashboard');
      }
    }
  }, [user, authLoading, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
