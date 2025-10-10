import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default async function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  // Server-side cookie check to protect the Super Admin area.
  const token = cookies().get('access_token')?.value || cookies().get('token')?.value;
  if (!token) {
    // Redirect to app login route when no token is present.
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Super Admin Layout Container */}
      <div className="w-full">
        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
