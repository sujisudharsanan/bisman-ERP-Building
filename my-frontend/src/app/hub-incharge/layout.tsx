'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

// Hub Incharge layout - Protected for operational staff roles
// STAFF, HUB_INCHARGE, and higher roles (ADMIN, SUPER_ADMIN, ENTERPRISE_ADMIN) can access
export default function HubInchargeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['STAFF', 'HUB_INCHARGE', 'ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}
