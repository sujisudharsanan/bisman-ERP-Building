/**
 * Super Admin Layout
 * Reusable layout wrapper for all ERP pages
 * Features: Dynamic Sidebar, RBAC Integration, Dark Mode
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { useRouter } from 'next/navigation';
import TopNavbar from '@/components/layout/TopNavbar';
import Sidebar from '@/components/layout/Sidebar';
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
  // header remains fixed across pages
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

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
            <svg className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 9v4" />
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01" />
            </svg>
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
  <TopNavbar showThemeToggle fixed />
      
      {/* Use unified Sidebar component */}
      <Sidebar isOpen={true} />

    {/* Main Content - offset for fixed navbar via global variable */}
  <div className="lg:pl-52 content-under-navbar">
        {/* Page Header (Mobile) */}
        {(title || description) && (
  <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 sticky sticky-below-navbar z-30">
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
