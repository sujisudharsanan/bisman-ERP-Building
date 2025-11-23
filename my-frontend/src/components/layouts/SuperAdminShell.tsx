"use client";

import React, { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
// Load DynamicSidebar client-side only to avoid importing icons/permissions during server prerender
const DynamicSidebar = dynamic(() => import('@/common/components/DynamicSidebar'), { ssr: false });
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { TopNavDbIndicator } from '@/components/user-management';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [icons, setIcons] = useState<{ RefreshCw?: any; LogOut?: any }>({});

  // Format role name for display
  const formatRoleName = (role: string | undefined) => {
    if (!role) return 'Admin';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const roleName = formatRoleName(user?.roleName || user?.role);

  useEffect(() => {
    // Load lucide icons on client only
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return;
      try {
        const mod = await import('lucide-react');
        if (!mounted) return;
        setIcons({ RefreshCw: mod.RefreshCw, LogOut: mod.LogOut });
      } catch (e) {
        // ignore — icons will remain undefined and fallbacks used
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); } catch {}
    try { window.location.href = '/auth/login'; } catch {}
  };

  return (
    <div
      className="min-h-screen w-full bg-gray-50 dark:bg-slate-900"
      style={{ ['--sidebar-width' as any]: '13rem' }}
    >
    {/* Top Bar */}
  <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-transparent z-50 shadow-sm" style={{ height: 'var(--navbar-height)' }}>
        {/* Left rail aligned with sidebar */}
        <div
          aria-hidden
          className="absolute left-0 top-0 bottom-0 border-r border-gray-200 dark:border-gray-800"
          style={{ width: 'var(--sidebar-width, 13rem)' }}
        />
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between" style={{ height: 'var(--navbar-height)' }}>
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
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{roleName}</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">{title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 dark:bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
                aria-label="Refresh"
                title="Refresh"
              >
                  {/* Guard icon rendering - lazy-load lucide icon, fallback to simple SVG if undefined */}
                  {icons.RefreshCw ? (
                    <icons.RefreshCw className="w-3.5 h-3.5" />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M23 4v6h-6"/><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 20v-6h6"/></svg>
                  )}
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-700 dark:bg-gray-600 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
                aria-label="Logout"
                title="Logout"
              >
                {icons.LogOut ? (
                  <icons.LogOut className="w-3.5 h-3.5" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5"/><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 12H9"/></svg>
                )}
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
        className={`fixed left-0 bottom-0 w-52 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-transparent overflow-y-auto z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ top: 'var(--navbar-height)' }}
      >
        <Suspense fallback={<div className="h-full" />}>
          <DynamicSidebar className="h-full" />
        </Suspense>
      </aside>

      {/* Main content */}
  <div className="content-under-navbar lg:pl-52 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </div>
    </div>
  );
}
