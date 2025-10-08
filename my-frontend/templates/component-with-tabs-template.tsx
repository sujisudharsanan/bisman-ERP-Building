/**
 * Template for Component with Tabs (use in /components/your-component.tsx)
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to /components/your-component.tsx
 * 2. Replace "YourComponent" with your actual component name
 * 3. Update TabName type with your actual tab names
 * 4. Update allowed roles in the security check
 * 5. Implement your tab content components
 * 6. Update tab navigation UI
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// TODO: Define your tab names
type TabName = 'dashboard' | 'settings' | 'reports';

export default function YourComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, loading: authLoading } = useAuth();
  
  // Initialize tab from URL or default to first tab
  const [activeTab, setActiveTab] = useState<TabName>(
    (searchParams.get('tab') as TabName) || 'dashboard'
  );

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

  // Handle tab change and update URL
  const handleTabChange = (tab: TabName) => {
    setActiveTab(tab);
    // Update URL to preserve tab on refresh (scroll: false prevents page jump)
    router.replace(`${window.location.pathname}?tab=${tab}`, { scroll: false });
  };

  // Sync state when URL changes (browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab') as TabName;
    if (urlTab && urlTab !== activeTab && ['dashboard', 'settings', 'reports'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

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

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {/* TODO: Update tabs with your actual tab names */}
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleTabChange('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => handleTabChange('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reports
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Dashboard Content</h2>
            {/* TODO: Add your dashboard content here */}
            <p>Your dashboard content goes here...</p>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Settings Content</h2>
            {/* TODO: Add your settings content here */}
            <p>Your settings content goes here...</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Reports Content</h2>
            {/* TODO: Add your reports content here */}
            <p>Your reports content goes here...</p>
          </div>
        )}
      </main>
    </div>
  );
}
