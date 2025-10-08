'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import SecurityDashboard from '@/components/security/SecurityDashboard';

export default function SuperAdminSecurityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Role-based access control - only SUPER_ADMIN
      if (user.roleName !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.roleName !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access security monitoring.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Security Monitoring</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive security audit and monitoring dashboard
          </p>
        </div>

        {/* Security Dashboard Component */}
        <SecurityDashboard className="w-full" />
      </div>
    </div>
  );
}
