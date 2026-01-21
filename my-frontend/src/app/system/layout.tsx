'use client';

import React, { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePopup from '@/components/WelcomePopup';
import { RefreshProvider } from '@/contexts/RefreshContext';
import Sidebar from '@/components/layout/Sidebar';
import TopNavbar from '@/components/layout/TopNavbar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DockProvider } from '@/components/dock';

/**
 * System Layout - Protected route for Admin, Super Admin and Enterprise Admin
 * Contains system-level management pages like user management, permissions, etc.
 */
export default function SystemLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sidebar widths matching BaseSidebar: w-52 (208px) expanded, w-16 (64px) collapsed
  const sidebarWidth = sidebarOpen ? '208px' : '64px';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN', 'HR', 'HR_MANAGER']}>
      <ThemeProvider>
        <DockProvider>
          <RefreshProvider>
            <WelcomePopup userName={user?.name || user?.username} />
            
            {/* Fixed Top Navigation */}
            <TopNavbar showThemeToggle={true} fixed={true} />
            
            {/* Fixed Sidebar - positioned below navbar */}
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            
            {/* Main content area - fixed positioning */}
            <main 
              className="bg-gray-50 dark:bg-slate-900 transition-all duration-300"
              style={{ 
                position: 'fixed',
                top: 'var(--navbar-height, 52px)',
                left: sidebarWidth,
                right: 0,
                bottom: 0,
                overflow: 'auto'
              }}
            >
              <div className="p-4 w-full">
                {children}
              </div>
            </main>
          </RefreshProvider>
        </DockProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
