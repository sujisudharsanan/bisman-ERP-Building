'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
// Note: Client layouts cannot export `metadata`. Page-level metadata can be set in individual pages.

export default function EnterpriseAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['ENTERPRISE_ADMIN']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="w-full">
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
