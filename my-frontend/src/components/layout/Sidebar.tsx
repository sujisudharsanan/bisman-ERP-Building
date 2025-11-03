'use client';

import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import DynamicSidebar from '@/common/components/DynamicSidebar';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 
          border-r border-gray-200 dark:border-gray-700 shadow-lg
          transition-all duration-300 ease-in-out z-40
          ${isOpen ? 'w-52' : 'w-16'}
        `}
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

        {/* Sidebar Content */}
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <nav className="p-2">
            {/* Role-based, flat page list (no module headers) */}
            <DynamicSidebar />
          </nav>
        </div>

        {/* Sidebar Footer */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
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
