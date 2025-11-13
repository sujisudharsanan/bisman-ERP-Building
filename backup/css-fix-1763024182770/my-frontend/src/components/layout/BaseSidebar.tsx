'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  LayoutDashboard,
  Users,
  Settings,
  BarChart2,
  FileText,
  ShoppingCart,
  Wallet,
  MessageSquare,
  Calendar,
  CheckSquare,
  Globe,
  Shield,
  Database,
  X,
} from 'lucide-react';
import { roleLayoutConfig } from '../../config/roleLayoutConfig';

interface BaseSidebarProps {
  user: any;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobile: boolean;
}

// Icon mapping
import type { LucideProps } from 'lucide-react';
const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Home,
  LayoutDashboard,
  Users,
  Settings,
  BarChart2,
  FileText,
  ShoppingCart,
  Wallet,
  MessageSquare,
  Calendar,
  CheckSquare,
  Globe,
  Shield,
  Database,
};

interface MenuItem {
  id: string;
  icon: keyof typeof iconMap;
  href: string;
  label: string;
  badge?: string | number;
}

const BaseSidebar: React.FC<BaseSidebarProps> = ({ user, collapsed, onCollapse, isMobile }) => {
  const pathname = usePathname();

  // Get role-specific menu items
  const layoutConfig = user?.roleName
    ? roleLayoutConfig[user.roleName] || roleLayoutConfig.DEFAULT
    : roleLayoutConfig.DEFAULT;

  const menuItems: MenuItem[] = layoutConfig.menuItems || [];

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      onCollapse(true);
    }
  }, [pathname, isMobile, onCollapse]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && !collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => onCollapse(true)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen z-50
          bg-gray-900/95 backdrop-blur-sm border-r border-gray-800
          transition-all duration-300 ease-in-out
          ${collapsed && !isMobile ? 'w-16' : 'w-52'}
          ${isMobile && collapsed ? '-translate-x-full' : 'translate-x-0'}
          flex flex-col
        `}
        data-component="base-sidebar"
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <span className="font-bold text-white">BISMAN</span>
            </div>
          )}
          
          {isMobile && (
            <button
              onClick={() => onCollapse(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} className="text-white" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item: MenuItem) => {
            const Icon = iconMap[item.icon] || Home;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-lg
                  transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-500/20 border border-indigo-500/50 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }
                  ${collapsed && !isMobile ? 'justify-center' : ''}
                `}
                title={item.label}
              >
                <Icon size={20} className={isActive ? 'text-indigo-400' : ''} />
                {(!collapsed || isMobile) && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
                {(!collapsed || isMobile) && item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800">
          {(!collapsed || isMobile) && user && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Role: <span className="text-gray-400">{user.roleName}</span></p>
              <p>Version: <span className="text-gray-400">1.0.0</span></p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default BaseSidebar;
