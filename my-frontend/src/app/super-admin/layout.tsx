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

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ENTERPRISE_ADMIN']}>
      <ThemeProvider>
        <DockProvider>
          <RefreshProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
              <WelcomePopup userName={user?.name || user?.username} />
              
              {/* Top Navigation */}
              <TopNavbar showThemeToggle={true} fixed={true} />
              
              {/* Sidebar with toggle */}
              <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
              
              {/* Main content */}
              <main 
                className="bg-gray-50 dark:bg-slate-900 transition-all duration-300 overflow-x-hidden"
                style={{ 
                  marginLeft: sidebarOpen ? '13rem' : '4rem', 
                  marginTop: 'var(--navbar-height, 52px)',
                  minHeight: 'calc(100vh - var(--navbar-height, 52px))',
                  width: sidebarOpen ? 'calc(100% - 13rem)' : 'calc(100% - 4rem)'
                }}
              >
                <div className="p-4 w-full max-w-full overflow-x-hidden">
                  {children}
                </div>
              </main>
            </div>
          </RefreshProvider>
        </DockProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
