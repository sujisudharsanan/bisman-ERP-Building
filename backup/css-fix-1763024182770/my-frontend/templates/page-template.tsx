/**
 * Template for Page Component (use in /app/your-route/page.tsx)
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to /app/your-route/page.tsx
 * 2. Replace "YourPage" with your actual page name
 * 3. Replace "YourComponent" with your actual component name
 * 4. Update allowed roles in the role check
 * 5. Update the import path for your component
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
// TODO: Import your component here
// import YourComponent from '@/components/YourComponent';

export default function YourPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // CRITICAL: Wait for auth to complete before checking
    if (loading) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // TODO: Update allowed roles for your page
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'];
    
    // Role-based access control
    if (!user.roleName || !allowedRoles.includes(user.roleName)) {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, router]);

  // Show loading state while auth is checking
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user || !user.roleName) {
    return null;
  }

  // TODO: Replace with your actual component
  return (
    <div>
      <h1>Your Page Component Goes Here</h1>
      {/* <YourComponent /> */}
    </div>
  );
}
