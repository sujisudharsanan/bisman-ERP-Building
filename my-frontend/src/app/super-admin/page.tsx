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
    // Fallback UI for environments where router push may be blocked (e.g., embedded Simple Browser)
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        try {
          window.location.href = '/auth/login';
        } catch (e) {
          // ignore
        }
      }, 0);
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-700">
          <p>Redirecting to login…</p>
          <p className="text-sm text-gray-500 mt-2">
            If nothing happens, click <a href="/auth/login" className="text-blue-600 underline">here</a>.
          </p>
        </div>
      </div>
    );
  }

  return <SuperAdminControlPanel />;
}
