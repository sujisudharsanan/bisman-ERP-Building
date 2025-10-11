'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import HubInchargeApp from '@/components/hub-incharge/HubInchargeApp';

export default function HubInchargePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // IMPORTANT: Wait for auth check to complete before making routing decisions
    // This prevents premature redirects during page refresh or initial load
    if (loading) {
      return; // Don't do anything while authentication is being checked
    }

    // After loading is complete, check authentication
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Role-based access control - allow STAFF, ADMIN, MANAGER
    if (!user.roleName || !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)) {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading hub interface...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.roleName || !['STAFF', 'ADMIN', 'MANAGER'].includes(user.roleName)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access the hub interface.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <HubInchargeApp />;
}
