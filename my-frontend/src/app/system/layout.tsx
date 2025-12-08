'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * System Layout - Protected route for Super Admin and Enterprise Admin only
 * Contains system-level management pages like user management, permissions, etc.
 */
export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ENTERPRISE_ADMIN']}>
      {children}
    </ProtectedRoute>
  );
}
