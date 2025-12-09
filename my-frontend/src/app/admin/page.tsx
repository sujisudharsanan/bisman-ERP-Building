'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // This page is just a redirect handler - it immediately redirects to the actual dashboard
  // For best performance, login should redirect directly to /admin/client-dashboard
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/auth/login');
      } else if (user.roleName === 'MANAGER') {
        router.replace('/operations-manager');
      } else if (user.roleName === 'STAFF') {
        router.replace('/hub-incharge');
      } else {
        // SUPER_ADMIN, ADMIN, and other roles go to admin client dashboard
        router.replace('/admin/client-dashboard');
      }
    }
  }, [user, authLoading, router]);

  // Minimal loading state - just show spinner without old dashboard styles
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
    </div>
  );
}
