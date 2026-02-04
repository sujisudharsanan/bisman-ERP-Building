'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Billing Layout - Uses dynamic RBAC
 * Access is controlled by database role assignments, not hardcoded roles.
 */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
