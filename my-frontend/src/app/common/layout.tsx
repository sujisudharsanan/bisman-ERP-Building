'use client';

import { useState } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import Sidebar from '@/components/layout/Sidebar';
import TopNavbar from '@/components/layout/TopNavbar';
import { DockProvider } from '@/components/dock';
import ProtectedRoute from '@/components/ProtectedRoute';

// Common layout with sidebar and top navbar
// Protected: Authenticated users with appropriate roles can access
export default function CommonLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_INCHARGE', 'HUB_INCHARGE', 'STORE_INCHARGE']}>
      <ThemeProvider>
        <DockProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
            {/* Top Navigation */}
            <TopNavbar showThemeToggle={true} fixed={true} />
            
            {/* Sidebar with toggle */}
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
            
            {/* Main content */}
            <main 
              className="min-h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-slate-900 transition-all duration-300"
              style={{ marginLeft: sidebarOpen ? '13rem' : '3.5rem', marginTop: '3.5rem' }}
            >
              <div className="p-4 md:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>
        </DockProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
