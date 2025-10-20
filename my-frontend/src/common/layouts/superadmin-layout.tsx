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
  <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo & Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:block text-lg font-bold text-gray-900 dark:text-gray-100">
                  BISMAN ERP
                </span>
              </div>

              {/* Page Title (Desktop) */}
              {title && (
                <div className="hidden md:block pl-4 border-l border-gray-300 dark:border-gray-700">
                  <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                  </h1>
                  {description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center space-x-2">
              <DarkModeToggle />
              
              {/* User Menu */}
              {user && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <UserIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.username || user.name}
                  </span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

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
          fixed top-16 left-0 bottom-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          overflow-y-auto transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <DynamicSidebar />
      </aside>

      {/* Main Content */}
      <div className="pt-16 lg:pl-64">
        {/* Page Header (Mobile) */}
        {(title || description) && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
