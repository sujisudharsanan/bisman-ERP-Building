'use client';

import { useState } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import Sidebar from '@/components/layout/Sidebar';
import TopNavbar from '@/components/layout/TopNavbar';
import { DockProvider } from '@/components/dock';
import ProtectedRoute from '@/components/ProtectedRoute';

// Admin layout with sidebar and top navbar
// Protected: Only ADMIN, SUPER_ADMIN, and ENTERPRISE_ADMIN can access
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sidebar widths matching BaseSidebar: w-52 (208px) expanded, w-16 (64px) collapsed
  const sidebarWidth = sidebarOpen ? '208px' : '64px';

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN']}>
      <ThemeProvider>
        <DockProvider>
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
        </DockProvider>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
