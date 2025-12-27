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
                className="min-h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-slate-900 transition-all duration-300 overflow-x-hidden"
                style={{ 
                  marginLeft: sidebarOpen ? '13rem' : '3.5rem', 
                  marginTop: '3.5rem',
                  width: sidebarOpen ? 'calc(100% - 13rem)' : 'calc(100% - 3.5rem)'
                }}
              >
                <div className="p-3 sm:p-4 lg:p-4 w-full max-w-full overflow-x-hidden">
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
