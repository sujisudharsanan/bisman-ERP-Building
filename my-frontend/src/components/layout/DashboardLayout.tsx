'use client';

import React, { useEffect } from 'react';
import DashboardSidebar from './DashboardSidebar';
import TopNavbar from './TopNavbar';
import { HubInchargeBottomBar } from '@/components/hub-incharge/HubInchargeTabs';
import ErrorBoundary from '@/components/ErrorBoundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  useEffect(() => {
    console.log('🎨 DashboardLayout mounted for role:', role);
    return () => console.log('🎨 DashboardLayout unmounted');
  }, [role]);

  return (
    <ErrorBoundary>
      <div className="bg-theme text-theme min-h-screen flex overflow-hidden theme-transition">
        <ErrorBoundary fallback={<div className="w-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-xs">Sidebar Error</p></div>}>
          <DashboardSidebar />
        </ErrorBoundary>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ErrorBoundary fallback={<div className="h-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-sm">TopNavbar Error</p></div>}>
            <TopNavbar showThemeToggle />
          </ErrorBoundary>
          <main className="py-px flex-1 overflow-auto">
            <ErrorBoundary fallback={
              <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600 mb-4">Content Error</h2>
                <p className="text-gray-600">The main content failed to render.</p>
              </div>
            }>
              {children}
            </ErrorBoundary>
          </main>
        </div>
        {/* Place bottom bar outside the scrollable main so it's not clipped */}
        {/* Only render for hub-incharge role to avoid unnecessary rendering */}
        {(role === 'STAFF' || role?.toLowerCase().includes('hub') || role?.toLowerCase().includes('incharge')) && (
          <ErrorBoundary fallback={null}>
            <HubInchargeBottomBar />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default DashboardLayout;
