'use client';

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import AboutMePage from '@/common/components/AboutMePage';

/**
 * System Module - About Me Page
 * Accessible to System Administrators and IT Admin roles
 */
export default function SystemAboutMe() {
  const { hasAccess } = useAuth();

  // Check if user has system access
  if (!hasAccess('system-settings') && !hasAccess('user-management')) {
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
      title="About Me"
      description="View and manage your profile information"
    >
      <AboutMePage showTeamSidebar={true} />
    </SuperAdminLayout>
  );
}
