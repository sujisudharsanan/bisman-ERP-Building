'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAuth } from '@/hooks/useAuth';

// Dynamic import to prevent SSR issues with permission-based sidebar
const DynamicSidebar = dynamic(() => import('@/common/components/DynamicSidebar'), { ssr: false });

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const { refreshUser } = useAuth();
  
  // Refresh user data when profile picture changes
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('[Sidebar] Profile picture updated, refreshing user data...');
      refreshUser();
    };

    // Listen for profile picture update events
    window.addEventListener('profilePictureUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
    };
  }, [refreshUser]);
  
  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 bg-white dark:bg-[#0c111b]
          border-r border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-none
          transition-all duration-300 ease-in-out z-40
          ${isOpen ? 'w-52' : 'w-16'}
        `}
        style={{ top: 'var(--navbar-height)', height: 'calc(100vh - var(--navbar-height))' }}
        aria-label="Main sidebar"
      >
        {/* Toggle Button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700 rounded-full 
              flex items-center justify-center shadow-md hover:shadow-lg
              transition-all duration-200 hover:scale-110"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <FiChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <FiChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}

        {/* Sidebar Content - Use DynamicSidebar component */}
        {isOpen && (
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            <DynamicSidebar />
          </div>
        )}

        {/* Sidebar Footer */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0c111b]">
            <div className="text-xs text-gray-400 dark:text-gray-300 text-center">
              BISMAN ERP v1.0
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
