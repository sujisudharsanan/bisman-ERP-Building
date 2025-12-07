'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';

// Lazy load the admin dashboard component - use AdminDashboard for ADMIN users
const AdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard'),
  { ssr: false }
);

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shouldShowDashboard, setShouldShowDashboard] = useState(false);

  // Redirect based on user role - ALL hooks must be before any return statement
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.roleName === 'SUPER_ADMIN') {
        // Super Admin goes to /super-admin
        router.push('/super-admin');
      } else if (user.roleName === 'MANAGER') {
        router.push('/operations-manager');
      } else if (user.roleName === 'STAFF') {
        router.push('/hub-incharge');
      } else if (user.roleName === 'ADMIN') {
        // ADMIN users stay on /admin and see the dashboard
        setShouldShowDashboard(true);
      } else if (user.roleName) {
        // Unknown role - redirect to login
        router.push('/auth/login');
      }
    }
  }, [user, authLoading, router]);

  // Show dashboard for ADMIN users
  if (shouldShowDashboard && user) {
    return <AdminDashboard user={user} />;
  }

  // Always show consistent loading state to avoid hydration mismatch
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading...</p>
      </div>
    </div>
  );
}
