'use client';

import React from 'react';
import Link from 'next/link';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';
import { Settings, Key, Users, Activity, Server, Database } from 'lucide-react';

// Simple tile component
function Tile({ href, title, description, Icon }: { href: string; title: string; description: string; Icon: React.ComponentType<any> }) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 group-hover:bg-blue-100/80 dark:group-hover:bg-blue-900/30">
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{description}</div>
        </div>
      </div>
    </Link>
  );
}

export default function SystemSettingsPage() {
  return (
    <SuperAdminShell title="System Settings">
      <div className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure system-wide options and access tools for administration. Choose an option below.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Tile
            href="/system/permission-manager"
            title="Permission Manager"
            description="Manage page-level permissions and access."
            Icon={Key}
          />
          <Tile
            href="/system/user-management"
            title="User Management"
            description="Create, edit, and manage users."
            Icon={Users}
          />
          <Tile
            href="/system/roles-users-report"
            title="Modules & Roles"
            description="Map roles to modules and pages."
            Icon={Settings}
          />
          <Tile
            href="/system/system-health-dashboard"
            title="System Health"
            description="View DB, APIs, and background jobs status."
            Icon={Server}
          />
          <Tile
            href="/system/audit-logs"
            title="Audit Logs"
            description="Track important system activities."
            Icon={Activity}
          />
          <Tile
            href="/system/backup-restore"
            title="Backup & Restore"
            description="Manage system backups and restoration."
            Icon={Database}
          />
        </div>
      </div>
    </SuperAdminShell>
  );
}
