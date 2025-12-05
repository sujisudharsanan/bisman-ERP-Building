'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Menu } from 'lucide-react';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useRefreshTrigger } from '@/contexts/RefreshContext';

const HeaderLogo: React.FC = () => {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return (
      <div className="mr-3 w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        B
      </div>
    );
  }

  return (
    <Image
      src="/brand/logo.svg"
      alt="Company logo"
      title="Company logo"
      width={80}
      height={80}
      className="mr-3 h-10 w-auto object-contain align-middle shrink-0 filter-none invert-0 dark:invert-0"
      priority
      onError={() => setLogoError(true)}
    />
  );
};

interface EnterpriseAdminNavbarProps {
  onMenuToggle?: () => void;
  onRefresh?: () => void;
}

// Get page name from pathname
const getPageName = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'dashboard';
  
  const pageNames: Record<string, string> = {
    'dashboard': 'Dashboard',
    'modules': 'Module Management',
    'users': 'User Management',
    'organizations': 'Organizations',
    'billing': 'Billing',
    'audit': 'Audit Logs',
    'reports': 'Reports',
    'settings': 'Settings',
    'support': 'Support',
    'notifications': 'Notifications',
    'integrations': 'Integrations',
    'ai': 'AI Assistant',
    'logs': 'System Logs',
  };
  
  return pageNames[lastSegment] || lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
};

export default function EnterpriseAdminNavbar({ onMenuToggle, onRefresh }: EnterpriseAdminNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const pageName = getPageName(pathname || '');
  // Use safe refresh hook that works with or without RefreshProvider
  const { refreshAll: contextRefresh, isRefreshing, registeredCount } = useRefreshTrigger();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      contextRefresh();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-transparent z-50 shadow-sm" style={{ height: 'var(--navbar-height)' }}>
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between" style={{ height: 'var(--navbar-height)' }}>
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <HeaderLogo />
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                Enterprise Admin
              </h1>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {pageName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`bg-blue-600 dark:bg-blue-500 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm ${isRefreshing ? 'opacity-75 cursor-wait' : ''}`}
              aria-label="Refresh data"
              title={registeredCount > 0 ? `Refresh ${registeredCount} data source(s)` : 'Refresh page'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-700 dark:bg-gray-600 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
