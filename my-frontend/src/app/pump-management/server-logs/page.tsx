'use client';

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import SystemLogViewer from '@/components/system/SystemLogViewer';
import { useAuth } from '@/common/hooks/useAuth';

export default function PumpServerLogsPage() {
  const { hasAccess } = useAuth();
  const canView =
    hasAccess('system-settings') ||
    hasAccess('pump-management:common') ||
    hasAccess('pump:common') ||
    hasAccess('pump-management-common') ||
    hasAccess('pump-management');

  if (!canView) {
    return (
      <SuperAdminLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to view this page.</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout title="Server Logs" description="Access server logs and diagnostics">
      <SystemLogViewer />
    </SuperAdminLayout>
  );
}
