'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Role-based access control - only ADMIN and SUPER_ADMIN can access
      if (!user.roleName || !['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)) {
        router.push('/dashboard');
        return;
      }

      // If SUPER_ADMIN, redirect to super-admin dashboard
      if (user.roleName === 'SUPER_ADMIN') {
        router.push('/super-admin');
        return;
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roleName || !['ADMIN', 'SUPER_ADMIN'].includes(user.roleName)) {
    return null; // Will redirect in useEffect
  }

  return <AdminDashboard user={user} />;
}
