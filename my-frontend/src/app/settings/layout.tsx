'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Settings Layout - Protected route for all authenticated users
 * Users can only access their own settings
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
}
