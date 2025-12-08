'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MonitoringPage() {
  const router = useRouter();

  // Redirect to System Health Dashboard by default
  useEffect(() => {
    router.replace('/enterprise-admin/monitoring/system-health');
  }, [router]);

  // Minimal loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
    </div>
  );
}
