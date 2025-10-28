'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import EnterpriseAdminNavbar from '@/components/EnterpriseAdminNavbar';
import EnterpriseAdminSidebar from '@/components/EnterpriseAdminSidebar';
// Note: Client layouts cannot export `metadata`. Page-level metadata can be set in individual pages.

export default function EnterpriseAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  return (
    <ProtectedRoute allowedRoles={['ENTERPRISE_ADMIN']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Fixed top navbar */}
        <EnterpriseAdminNavbar onMenuToggle={() => setSidebarOpen((v) => !v)} />

        {/* Content starts below navbar height (h-14) */}
        <div className="pt-14 flex">
          {/* Sidebar: hidden on mobile unless toggled; always visible on lg+ */}
          <div
            className={
              `shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 ` +
              `${sidebarOpen ? 'block' : 'hidden'} lg:block`
            }
          >
            <EnterpriseAdminSidebar className="w-64" />
          </div>

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
