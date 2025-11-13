/**
 * Super Admin Layout
 * Reusable layout wrapper for all ERP pages
 * Features: Dynamic Sidebar, RBAC Integration, Dark Mode
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Shield, AlertTriangle, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import TopNavbar from '@/components/layout/TopNavbar';
import DynamicSidebar from '@/common/components/DynamicSidebar';
import DarkModeToggle from '@/components/ui/DarkModeToggle';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function SuperAdminLayout({
  children,
  title,
  description,
}: SuperAdminLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading state
  if (loading) {
    return (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!isAuthenticated || !user) {
    return (
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to be logged in to access this page.
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    router.push('/auth/login');
  };

  return (
  <div
    className="min-h-screen bg-gray-50 dark:bg-slate-900"
    style={{ ['--sidebar-width' as any]: '13rem' }}
  >
      {/* Standard top navbar for common pages */}
      <TopNavbar showThemeToggle />
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-11 left-0 bottom-0 z-40 w-52 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          overflow-y-auto transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <DynamicSidebar />
      </aside>

      {/* Main Content */}
  <div className="lg:pl-52 pt-11">
        {/* Page Header (Mobile) */}
        {(title || description) && (
  <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky top-11 z-30">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {description && (
        <p className="text-[13px] text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content Area */}
  <div className="p-3 sm:p-5 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
