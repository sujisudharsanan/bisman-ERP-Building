'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import DynamicSidebar from '@/common/components/DynamicSidebar';
import { useAuth } from '@/common/hooks/useAuth';

/**
 * Main Dashboard Sidebar - Uses DynamicSidebar for role-based navigation
 * Now fully dynamic and responsive with mobile support
 */
const DashboardSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  // Mobile sidebar toggle
  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800 text-white shadow-lg"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-52 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-transparent
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col overflow-hidden
        `}
      >
        {/* Sidebar Header */}
  <div className="p-4 border-b border-gray-200 dark:border-transparent">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                BISMAN ERP
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dashboard</p>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close Menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto pt-2">
          <DynamicSidebar />
        </div>

        {/* Sidebar Footer */}
  <div className="p-4 border-t border-gray-200 dark:border-transparent">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            v1.0.0 • {new Date().getFullYear()}
          </div>
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
