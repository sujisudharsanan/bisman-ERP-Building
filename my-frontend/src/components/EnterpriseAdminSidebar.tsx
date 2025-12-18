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
      id: 'activity-logs',
      label: 'Activity & Audit',
      icon: FiActivity,
      href: '/enterprise-admin/activity-logs',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: FiSettings,
      href: '/enterprise-admin/settings',
    },
  // New enterprise links (appended without altering existing ones)
  { id: 'super-admins', label: 'Super Admins', icon: FiUsers, href: '/enterprise-admin/super-admins' },
  { id: 'billing', label: 'Billing', icon: FiDollarSign, href: '/enterprise-admin/billing' },
  { id: 'integrations', label: 'Integrations', icon: FiPackage, href: '/enterprise-admin/integrations' },
  { id: 'support', label: 'Support', icon: FiHelpCircle, href: '/enterprise-admin/support' },
  // Monitoring & Observability
  { id: 'monitoring', label: 'System Monitoring', icon: FiMonitor, href: '/enterprise-admin/monitoring' },
  { id: 'live-monitoring', label: '📊 Live Metrics', icon: FiActivity, href: '/enterprise-admin/monitoring/live' },
  { id: 'performance', label: 'Performance Metrics', icon: FiTrendingUp, href: '/enterprise-admin/monitoring/performance' },
  { id: 'database-health', label: 'Database Health', icon: FiDatabase, href: '/enterprise-admin/monitoring/database' },
  // Security Operations Center
  { id: 'security-ops', label: '🛡️ Security Operations', icon: FiShield, href: '/enterprise-admin/security-operations' },
  { id: 'rbac-security', label: '🔐 RBAC Security', icon: FiLock, href: '/enterprise-admin/rbac-security' },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-transparent h-full flex flex-col overflow-hidden ${className}`}>
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {navItems.map((item) => {
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
