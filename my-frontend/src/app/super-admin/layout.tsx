'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import WelcomePopup from '@/components/WelcomePopup';
import { RefreshProvider } from '@/contexts/RefreshContext';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN']}>
      <RefreshProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
          <WelcomePopup userName={user?.name || user?.username} />
          {/* Super Admin Layout Container */}
          <div className="w-full">
            {/* Page content */}
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </RefreshProvider>
    </ProtectedRoute>
  );
}
