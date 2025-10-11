/**
 * Template for Simple Component (no tabs)
 * Use in /components/your-component.tsx
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to /components/your-component.tsx
 * 2. Replace "YourComponent" with your actual component name
 * 3. Update allowed roles in the security check
 * 4. Implement your component content
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function YourComponent() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();

  // CRITICAL: Wait for auth loading before security checks
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // TODO: Update allowed roles for your component
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'];

  // Security check AFTER loading completes
  if (!user?.roleName || !allowedRoles.includes(user.roleName)) {
    router.push('/');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Access denied. Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Your Component Name</h1>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Content Here</h2>
          {/* TODO: Add your component content here */}
          <p>Component content goes here...</p>
        </div>
      </main>
    </div>
  );
}
