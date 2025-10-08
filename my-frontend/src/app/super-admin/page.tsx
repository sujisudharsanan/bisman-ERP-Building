'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import SuperAdminControlPanel from '@/components/SuperAdminControlPanel';

export default function SuperAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to complete before checking
    if (loading) {
      return;
    }

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Role-based access control - only SUPER_ADMIN can access
    if (user.roleName !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.roleName !== 'SUPER_ADMIN') {
    return null;
  }

  return <SuperAdminControlPanel />;
}
