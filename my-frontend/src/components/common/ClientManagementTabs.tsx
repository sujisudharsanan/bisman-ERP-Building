'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Inline icons
function Icon(props: React.SVGProps<SVGSVGElement> & { children?: React.ReactNode }) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      {props.children}
    </svg>
  );
}

const UsersIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

const KeyIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </Icon>
);

const GridIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </Icon>
);

const tabs = [
  { id: 'clients', label: 'Clients', icon: UsersIcon, href: '/system/user-management' },
  { id: 'permissions', label: 'Permission Manager', icon: KeyIcon, href: '/system/permission-manager' },
  { id: 'modules', label: 'Modules & Roles', icon: GridIcon, href: '/system/roles-users-report' },
];

interface ClientManagementTabsProps {
  hideHeader?: boolean;
}

export default function ClientManagementTabs({ hideHeader = false }: ClientManagementTabsProps) {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname?.includes('/permission-manager')) return 'permissions';
    if (pathname?.includes('/roles-users-report')) return 'modules';
    return 'clients';
  };

  const activeTab = getActiveTab();

  return (
    <div className="mb-3">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                `}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
