'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';
import { RefreshProvider } from '@/contexts/RefreshContext';

// Use dynamic imports for TopNavbar and Sidebar to prevent SSR prerender errors
// These components depend on client-side hooks and contexts that aren't available during static generation
const TopNavbar = dynamic(() => import('./TopNavbar').then(mod => ({ default: mod.default })), { 
  ssr: false, 
  loading: () => <div style={{ height: 'var(--navbar-height)' }} /> 
});

const Sidebar = dynamic(() => import('./Sidebar').then(mod => ({ default: mod.default })), { 
  ssr: false, 
  loading: () => <div /> 
});

/**
 * Global AppShell
 * Renders TopNavbar + Sidebar + content for routes that do NOT already include their own sidebar layout.
 * Excludes known sections that ship with their own sidebars to avoid duplicates.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const excludedPrefixes = useMemo(
    () => [
      // Public/auth pages - no shell needed
      '/auth',
      '/landing',
      '/access-denied',
      '/unauthorized',
      '/signup',
      '/onboarding',
      '/get-started',
      '/login',
      '/welcome',
      '/pricing',
      '/privacy',
      '/terms',
      '/contact-sales',
      '/trust-security',
      '/status',
      // Admin sections with their own layout.tsx containing sidebar
      '/super-admin',       // Has layout.tsx with Sidebar
      '/enterprise-admin',  // Has layout.tsx with EnterpriseAdminSidebar
      '/admin',             // Has layout.tsx with Sidebar
      '/common',            // Has layout.tsx with Sidebar
      '/system',            // Has layout.tsx with Sidebar
      '/qa',                // Has layout.tsx (standalone testing)
      // Dashboard pages - use DashboardLayout with their own sidebar
      '/dashboard',         // Uses DashboardLayout
      '/task-dashboard',    // Uses DashboardLayout
      // API routes
      '/api',
    ],
    []
  );

  const shouldUseLocalShell = useMemo(() => {
    if (!pathname) return false; // Changed: Return false when pathname is null to avoid showing shell during hydration
    return !excludedPrefixes.some((p) => pathname.startsWith(p));
  }, [pathname, excludedPrefixes]);

  // Add a loading state to prevent flash of shell on excluded routes
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return <RefreshProvider>{children}</RefreshProvider>;
  }

  if (!shouldUseLocalShell) {
    return <RefreshProvider>{children}</RefreshProvider>;
  }

  const toggleSidebar = () => setSidebarOpen((s) => !s);

  return (
    <RefreshProvider>
      <ErrorBoundary>
      <div
        className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col theme-transition"
        style={{ ['--sidebar-width' as any]: sidebarOpen ? '13rem' : '3.5rem' }}
      >
        <ErrorBoundary fallback={<div className="h-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-sm">TopNavbar Error</p></div>}>
          <TopNavbar showThemeToggle />
        </ErrorBoundary>

        <div className="flex flex-1 pt-14">
          <ErrorBoundary fallback={<div className="w-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-xs">Sidebar Error</p></div>}>
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </ErrorBoundary>
          <main
            className="flex-1 overflow-auto transition-all duration-300 p-6"
            style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
          >
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
    </RefreshProvider>
  );
}
