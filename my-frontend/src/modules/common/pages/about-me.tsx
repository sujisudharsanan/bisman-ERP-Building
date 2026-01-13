'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/common/hooks/useAuth';
import AboutMePage from '@/common/components/AboutMePage';
import LoadingLogo from '@/components/common/LoadingLogo';

/**
 * Common Module - About Me Page
 * Accessible to ALL authenticated users regardless of role
 */
export default function CommonAboutMe() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <DashboardLayout role={user?.roleName || user?.role || 'User'}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <LoadingLogo size={100} logoSrc="/logo.png" />
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout role="Guest">
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={user.roleName || user.role || 'User'}>
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          About Me
        </h1>
        <AboutMePage showTeamSidebar={false} />
      </div>
    </DashboardLayout>
  );
}
