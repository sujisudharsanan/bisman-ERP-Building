'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MonitoringPage() {
  const router = useRouter();

  // Redirect to System Health Dashboard by default (works on all deployments)
  useEffect(() => {
    router.replace('/enterprise-admin/monitoring/system-health');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading System Health Dashboard...</p>
      </div>
    </div>
  );
}
