'use client';

import React from 'react';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Super Admin Layout Container */}
      <div className="w-full">
        {/* Super Admin Badge */}
        <div className="bg-red-600 text-white px-4 py-2 text-center font-semibold">
          🔐 Super Administrator Access
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
