'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Clients Layout - Protected route for Super Admin and Enterprise Admin only
 * Contains client management pages
 */
export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ENTERPRISE_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}
