'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import { HubInchargeBottomBar } from '@/components/hub-incharge/HubInchargeTabs';
import ErrorBoundary from '@/components/ErrorBoundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  

  useEffect(() => {
    console.log('🎨 DashboardLayout mounted for role:', role);
    return () => console.log('🎨 DashboardLayout unmounted');
  }, [role]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ErrorBoundary>
      <div
        className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col theme-transition"
        style={{ ['--sidebar-width' as any]: sidebarOpen ? '13rem' : '4rem' }}
      >
        {/* Top Navbar - Fixed at top */}
        <ErrorBoundary fallback={<div className="h-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-sm">TopNavbar Error</p></div>}>
          <TopNavbar showThemeToggle />
        </ErrorBoundary>

  {/* Content Area with Sidebar - Add top padding for fixed navbar (global var) */}
  <div className="flex flex-1 overflow-hidden content-under-navbar">{/* Uses --navbar-height */}
          {/* Sidebar - Beneath navbar */}
          <ErrorBoundary fallback={<div className="w-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-xs">Sidebar Error</p></div>}>
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </ErrorBoundary>

          {/* Main Content */}
          <main 
            className={`
              flex-1 overflow-auto transition-all duration-300
              ${sidebarOpen ? 'ml-52' : 'ml-16'}
              p-6
            `}
          >
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

        {/* Bottom bar for hub-incharge role */}
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
