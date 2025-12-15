'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      {/* Apple-style Sidebar */}
      <aside
        className={`
          fixed left-0 
          bg-white dark:bg-[#0f0f1a]
          border-r border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out z-40 
          flex flex-col
          ${isOpen ? 'w-52' : 'w-14'}
        `}
        style={{ 
          top: 'var(--navbar-height)', 
          height: 'calc(100vh - var(--navbar-height))' 
        }}
        aria-label="Main sidebar"
      >
        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <DynamicSidebar collapsed={!isOpen} />
        </div>

        {/* Toggle Button - At bottom of sidebar - Icon only for cleaner look */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f1a]">
          <button
            onClick={onToggle}
            className={`
              group w-full py-3 
              flex items-center justify-center
              text-gray-400 dark:text-gray-500
              hover:bg-gray-50 dark:hover:bg-gray-800/50
              hover:text-gray-600 dark:hover:text-gray-300
              transition-all duration-200 ease-out
            `}
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <ChevronLeft className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
            ) : (
              <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
            )}
          </button>
        </div>
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
