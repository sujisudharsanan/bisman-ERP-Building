'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid,
  FiPackage,
  FiSettings,
  FiLogOut,
  FiFileText,
  FiActivity,
  FiUsers,
  FiLayers,
  FiDollarSign,
  FiShield,
  FiZap,
  FiHelpCircle,
  FiBarChart2,
  FiBell,
  FiMonitor,
  FiTrendingUp,
  FiDatabase,
  FiLock,
  FiLoader,
  FiAlertCircle,
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/hooks/useMenu';

// Icon mapping for DB-driven menu
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'LayoutDashboard': FiGrid,
  'Layers': FiLayers,
  'Shield': FiShield,
  'Users': FiUsers,
  'ScrollText': FiFileText,
  'Activity': FiActivity,
  'CreditCard': FiDollarSign,
  'Settings': FiSettings,
  'Monitor': FiMonitor,
  'Package': FiPackage,
  'HelpCircle': FiHelpCircle,
  'Lock': FiLock,
  'TrendingUp': FiTrendingUp,
  'Database': FiDatabase,
  'Bell': FiBell,
  'BarChart3': FiBarChart2,
  'FileText': FiFileText,
  // Fallback
  'default': FiGrid,
};

interface EnterpriseAdminSidebarProps {
  className?: string;
}

export default function EnterpriseAdminSidebar({ className = '' }: EnterpriseAdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  
  // Use DB-driven menu instead of hardcoded items
  const { menu, isLoading, error } = useMenu();
  
  // Flatten pages from all modules for sidebar display
  const navItems = menu.flatMap(module => 
    module.pages.map(page => ({
      id: page.code,
      label: page.name,
      icon: iconMap[page.icon] || iconMap['default'],
      href: page.route,
    }))
  );

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-transparent h-full flex flex-col overflow-hidden ${className}`}>
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <FiLoader className="w-5 h-5 animate-spin mb-2" />
            <span className="text-xs">Loading menu...</span>
          </div>
        )}
        
        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-red-400">
            <FiAlertCircle className="w-5 h-5 mb-2" />
            <span className="text-xs text-center px-2">Unable to load menu</span>
          </div>
        )}
        
        {/* Menu Items */}
        {!isLoading && !error && navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button at Bottom */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
        >
          <FiLogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
