"use client";

import React from 'react';
import Link from 'next/link';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

// Module-local simple icons
function TileIcon(props: React.SVGProps<SVGSVGElement> & { children?: any }) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      {props.children}
    </svg>
  );
}

const SettingsIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <TileIcon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 2.27 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.27 2.27A2 2 0 0 1 7.1 2.27l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09c.18.59.6 1.08 1 1.51h.12a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 0 1 21.73 7.1l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.59.18 1.08.6 1.51 1z" />
  </TileIcon>
);

const KeyIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <TileIcon {...p}><path d="M21 2l-2 2m-7 7a5 5 0 1 0 7 7l3-3-4-4-3 3" /></TileIcon>
);

const UsersIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <TileIcon {...p}><path d="M17 21v-2a4 4 0 0 0-3-3.87" /><path d="M9 7a4 4 0 1 0 0 8" /></TileIcon>
);

const ActivityIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <TileIcon {...p}><path d="M22 12h-4l-3 8-4-16-3 8H2" /></TileIcon>
);

const ServerIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <TileIcon {...p}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><path d="M8 21h8" /></TileIcon>
);

const DatabaseIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <TileIcon {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5" /></TileIcon>
);

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
                    Icon={KeyIcon}
                  />
          <Tile
            href="/system/user-management"
            title="User Management"
            description="Create, edit, and manage users."
            Icon={UsersIcon}
          />
          <Tile
            href="/system/roles-users-report"
            title="Modules & Roles"
            description="Map roles to modules and pages."
            Icon={SettingsIcon}
          />
          <Tile
            href="/system/system-health-dashboard"
            title="System Health"
            description="View DB, APIs, and background jobs status."
            Icon={ServerIcon}
          />
          <Tile
            href="/system/audit-logs"
            title="Audit Logs"
            description="Track important system activities."
            Icon={ActivityIcon}
          />
          <Tile
            href="/system/backup-restore"
            title="Backup & Restore"
            description="Manage system backups and restoration."
            Icon={DatabaseIcon}
          />
        </div>
      </div>
    </SuperAdminShell>
  );
}
