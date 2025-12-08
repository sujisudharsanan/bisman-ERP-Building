'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Billing Layout - Protected route for authenticated users with billing access
 * Super Admin, Enterprise Admin, Admin, and Owner roles can access billing
 */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'OWNER']}>
      {children}
    </ProtectedRoute>
  );
}
