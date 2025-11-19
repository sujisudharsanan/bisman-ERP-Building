'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import EnterpriseAdminNavbar from '@/components/EnterpriseAdminNavbar';
import EnterpriseAdminSidebar from '@/components/EnterpriseAdminSidebar';
import WelcomePopup from '@/components/WelcomePopup';
import { useAuth } from '@/contexts/AuthContext';

// Note: Client layouts cannot export `metadata`. Page-level metadata can be set in individual pages.

export default function EnterpriseAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user } = useAuth();
  
  const handleRefresh = () => {
    // Trigger a custom event that pages can listen to
    window.dispatchEvent(new CustomEvent('enterprise-admin-refresh'));
    // Fallback to reload if page doesn't handle the event
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };
  
  return (
    <ProtectedRoute allowedRoles={['ENTERPRISE_ADMIN']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
  <WelcomePopup userName={user?.name || user?.username} />
        {/* Fixed top navbar */}
        <EnterpriseAdminNavbar 
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          onRefresh={handleRefresh}
        />

  {/* Content starts below navbar height (global var) */}
  <div className="content-under-navbar flex">
          {/* Sidebar: hidden on mobile unless toggled; always visible on lg+ */}
          <div
            className={
              `shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 ` +
              `${sidebarOpen ? 'block' : 'hidden'} lg:block`
            }
          >
            <EnterpriseAdminSidebar className="w-52" />
          </div>

          {/* Main content */}
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
  {/* Chat widget moved to global RootLayout; old widget removed */}
      </div>
    </ProtectedRoute>
  );
}
