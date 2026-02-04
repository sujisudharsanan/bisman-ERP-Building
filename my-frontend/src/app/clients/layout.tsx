'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Clients Layout - Uses dynamic RBAC
 * Access is controlled by database role assignments, not hardcoded roles.
 */
export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
