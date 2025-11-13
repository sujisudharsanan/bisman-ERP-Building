'use client';

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import AboutMePage from '@/common/components/AboutMePage';

/**
 * Common Module - About Me Page
 * Accessible to ALL authenticated users regardless of role
 */
export default function CommonAboutMe() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SuperAdminLayout title="About Me">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  if (!user) {
    return (
      <SuperAdminLayout title="About Me">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to view your profile.
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
      <AboutMePage showTeamSidebar={false} />
    </SuperAdminLayout>
  );
}
