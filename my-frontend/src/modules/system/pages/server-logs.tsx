'use client';

import React, { useState } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import { Search, Plus, RefreshCw } from 'lucide-react';
import SystemLogViewer from '@/components/system/SystemLogViewer';

export default function ServerLogs() {
  const { hasAccess } = useAuth();
  const [loading, setLoading] = useState(false);

  // Allow via System Settings OR Pump Management (common module)
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to view this page.
            </p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title="Server Logs"
      description="Access server logs and diagnostics"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Server Logs
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Access server logs and diagnostics</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLoading(true)}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>

  {/* System Log Viewer */}
  <SystemLogViewer />
      </div>
    </SuperAdminLayout>
  );
}
