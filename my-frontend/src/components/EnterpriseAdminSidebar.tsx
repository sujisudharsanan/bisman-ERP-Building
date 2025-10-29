'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid,
  FiPackage,
  FiSettings,
  FiLogOut,
  FiCpu,
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
} from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface EnterpriseAdminSidebarProps {
  className?: string;
}

export default function EnterpriseAdminSidebar({ className = '' }: EnterpriseAdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: FiGrid,
      href: '/enterprise-admin/dashboard',
    },
    {
      id: 'modules',
      label: 'Module Management',
      icon: FiPackage,
      href: '/enterprise-admin/modules',
    },
    {
      id: 'ai-handling',
      label: 'AI Handling',
      icon: FiCpu,
      href: '/enterprise-admin/ai-handling',
    },
    {
      id: 'activity-logs',
      label: 'Activity Logs',
      icon: FiActivity,
      href: '/enterprise-admin/activity-logs',
    },
    {
      id: 'logs',
      label: 'System Logs',
      icon: FiFileText,
      href: '/enterprise-admin/logs',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: FiSettings,
      href: '/enterprise-admin/settings',
    },
  // New enterprise links (appended without altering existing ones)
  { id: 'super-admins', label: 'Super Admins', icon: FiUsers, href: '/enterprise-admin/super-admins' },
  { id: 'organizations', label: 'Organizations', icon: FiLayers, href: '/enterprise-admin/organizations' },
  { id: 'users', label: 'Users', icon: FiZap, href: '/enterprise-admin/users' },
  { id: 'billing', label: 'Billing', icon: FiDollarSign, href: '/enterprise-admin/billing' },
  { id: 'audit', label: 'Audit & Security', icon: FiShield, href: '/enterprise-admin/audit' },
  { id: 'integrations', label: 'Integrations', icon: FiPackage, href: '/enterprise-admin/integrations' },
  { id: 'support', label: 'Support', icon: FiHelpCircle, href: '/enterprise-admin/support' },
  { id: 'reports', label: 'Reports', icon: FiBarChart2, href: '/enterprise-admin/reports' },
  { id: 'notifications', label: 'Notifications', icon: FiBell, href: '/enterprise-admin/notifications' },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-transparent h-full flex flex-col ${className}`}>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button at Bottom */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
        >
          <FiLogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
