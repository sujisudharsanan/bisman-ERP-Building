'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import ErrorBoundary from '@/components/ErrorBoundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);

  // Listen for task panel open/close events to auto-collapse sidebar
  useEffect(() => {
    const handleTaskOpen = () => {
      setTaskPanelOpen(true);
      setSidebarOpen(false); // Auto-collapse sidebar when task opens
    };
    
    const handleTaskClose = () => {
      setTaskPanelOpen(false);
      // Optionally restore sidebar - uncomment if desired
      // setSidebarOpen(true);
    };

    // Listen for openTaskInChat event
    window.addEventListener('openTaskInChat', handleTaskOpen);
    window.addEventListener('closeTaskPanel', handleTaskClose);
    
    return () => {
      window.removeEventListener('openTaskInChat', handleTaskOpen);
      window.removeEventListener('closeTaskPanel', handleTaskClose);
    };
  }, []);

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
        className="min-h-screen flex flex-col theme-transition"
        style={{ ['--sidebar-width' as any]: sidebarOpen ? '13rem' : '3.5rem' }}
      >
        {/* Top Navbar - Fixed at top */}
        <ErrorBoundary fallback={<div className="h-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-sm">TopNavbar Error</p></div>}>
          <TopNavbar showThemeToggle />
        </ErrorBoundary>

  {/* Content Area with Sidebar - Add top padding for fixed navbar (global var) */}
  <div className="flex flex-1 content-under-navbar">{/* Uses --navbar-height */}
          {/* Sidebar - Beneath navbar */}
          <ErrorBoundary fallback={<div className="w-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center"><p className="text-red-600 text-xs">Sidebar Error</p></div>}>
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </ErrorBoundary>

          {/* Main Content - Sidebar is sticky on md+ (in flex flow), fixed on mobile (needs margin) */}
          <main 
            className={`flex-1 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-52 md:ml-0' : 'ml-16 md:ml-0'}`}
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
      </div>
    </ErrorBoundary>
  );
};

export default DashboardLayout;
