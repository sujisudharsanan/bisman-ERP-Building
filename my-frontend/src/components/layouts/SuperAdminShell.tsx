'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import DynamicSidebar from '@/common/components/DynamicSidebar';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { TopNavDbIndicator } from '@/components/user-management';
import { LogOut, RefreshCw } from 'lucide-react';

type SuperAdminShellProps = {
  title?: string;
  children: React.ReactNode;
};

const HeaderLogo: React.FC = () => {
  const [logoError, setLogoError] = useState(false);
  if (logoError) {
    return (
      <div className="mr-3 w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        B
      </div>
    );
  }
  return (
    <Image
      src="/brand/logo.svg"
      alt="Company logo"
      title="Company logo"
      width={80}
      height={80}
      className="mr-3 h-10 w-auto object-contain align-middle shrink-0 filter-none invert-0 dark:invert-0"
      priority
      onError={() => setLogoError(true)}
    />
  );
};

export default function SuperAdminShell({ title = 'Super Admin', children }: SuperAdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); } catch {}
    try { window.location.href = '/auth/login'; } catch {}
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-900">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-transparent z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <HeaderLogo />
              <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <TopNavDbIndicator />
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 dark:bg-blue-500 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-700 dark:bg-gray-600 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <DarkModeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-52 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-transparent overflow-y-auto z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <DynamicSidebar className="h-full" />
      </aside>

      {/* Main content */}
      <div className="pt-14 lg:pl-52 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </div>
    </div>
  );
}
