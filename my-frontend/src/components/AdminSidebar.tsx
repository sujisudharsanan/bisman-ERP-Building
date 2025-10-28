'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { PERMISSIONS, can, type SessionUser } from '@/lib/permissions';
import * as React from 'react';

const ITEMS = [
  { title: 'Dashboard', href: '/dashboard', permission: null },
  { title: 'Organizations', href: '/organizations', permission: PERMISSIONS.ORGANIZATION_READ },
  { title: 'Users & Roles', href: '/users', permission: PERMISSIONS.USER_MANAGE },
  { title: 'Modules', href: '/modules', permission: PERMISSIONS.MODULE_TOGGLE },
  { title: 'Billing', href: '/billing', permission: PERMISSIONS.BILLING_VIEW },
  { title: 'System Settings', href: '/settings', permission: PERMISSIONS.SETTINGS_MANAGE },
  { title: 'Audit & Security', href: '/audit', permission: PERMISSIONS.AUDIT_VIEW },
  { title: 'Integrations', href: '/integrations', permission: null },
  { title: 'Support', href: '/support', permission: null },
  { title: 'AI & Automation', href: '/ai', permission: null },
  { title: 'Reports', href: '/reports', permission: PERMISSIONS.BILLING_VIEW },
  { title: 'Developer Console', href: '/developer', permission: PERMISSIONS.APIKEY_MANAGE },
  { title: 'Notifications', href: '/notifications', permission: null },
  // Enterprise Admin section
  { title: '—', href: '#', permission: null },
  { title: 'Enterprise Dashboard', href: '/enterprise/dashboard', permission: PERMISSIONS.ENTERPRISE_DASHBOARD_VIEW },
  { title: 'Super Admins', href: '/enterprise/super-admins', permission: PERMISSIONS.ENTERPRISE_SUPERADMINS_MANAGE },
  { title: 'Enterprise Orgs', href: '/enterprise/organizations', permission: PERMISSIONS.ENTERPRISE_ORGANIZATIONS_READ },
  { title: 'Enterprise Modules', href: '/enterprise/modules', permission: PERMISSIONS.ENTERPRISE_MODULES_MANAGE },
  { title: 'Enterprise Billing', href: '/enterprise/billing', permission: PERMISSIONS.ENTERPRISE_BILLING_VIEW },
  { title: 'Enterprise Audit', href: '/enterprise/audit', permission: PERMISSIONS.ENTERPRISE_AUDIT_VIEW },
  { title: 'Enterprise Integrations', href: '/enterprise/integrations', permission: PERMISSIONS.ENTERPRISE_INTEGRATIONS_MANAGE },
  { title: 'Enterprise Support', href: '/enterprise/support', permission: PERMISSIONS.ENTERPRISE_SUPPORT_VIEW },
  { title: 'Enterprise AI', href: '/enterprise/ai', permission: PERMISSIONS.ENTERPRISE_AI_MANAGE },
  { title: 'Enterprise Reports', href: '/enterprise/reports', permission: PERMISSIONS.ENTERPRISE_REPORTS_VIEW },
  { title: 'Enterprise Settings', href: '/enterprise/settings', permission: PERMISSIONS.ENTERPRISE_SETTINGS_MANAGE },
  { title: 'Enterprise Notifications', href: '/enterprise/notifications', permission: PERMISSIONS.ENTERPRISE_NOTIFICATIONS_MANAGE },
];

export default function AdminSidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  return (
    <aside className="w-52 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 min-h-screen p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold">Admin</span>
        <button className="text-sm px-2 py-1 border rounded" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
      <nav className="space-y-1">
  {ITEMS.filter((it) => !it.permission || can(user as any, it.permission)).map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`block px-3 py-2 rounded ${pathname?.startsWith(it.href) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            {it.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
