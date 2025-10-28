'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiUsers, 
  FiSettings, 
  FiDollarSign,
  FiFileText,
  FiBarChart2,
  FiShoppingCart,
  FiPackage,
  FiTruck,
  FiMapPin,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // Optional: restrict by role
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <FiHome className="w-5 h-5" />,
  },
  {
    title: 'Users',
    href: '/users',
    icon: <FiUsers className="w-5 h-5" />,
  },
  {
    title: 'Payments',
    href: '/payment',
    icon: <FiDollarSign className="w-5 h-5" />,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: <FiBarChart2 className="w-5 h-5" />,
  },
  {
    title: 'Inventory',
    href: '/inventory',
    icon: <FiPackage className="w-5 h-5" />,
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: <FiShoppingCart className="w-5 h-5" />,
  },
  {
    title: 'Delivery',
    href: '/delivery',
    icon: <FiTruck className="w-5 h-5" />,
  },
  {
    title: 'Locations',
    href: '/locations',
    icon: <FiMapPin className="w-5 h-5" />,
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: <FiFileText className="w-5 h-5" />,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: <FiSettings className="w-5 h-5" />,
  },
];

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href || pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 
          border-r border-gray-200 dark:border-gray-700 shadow-lg
          transition-all duration-300 ease-in-out z-40
          ${isOpen ? 'w-52' : 'w-16'}
        `}
      >
        {/* Toggle Button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700 rounded-full 
              flex items-center justify-center shadow-md hover:shadow-lg
              transition-all duration-200 hover:scale-110"
            aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <FiChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <FiChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}

        {/* Sidebar Content */}
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${isActive(item.href)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                  ${!isOpen && 'justify-center'}
                `}
                title={!isOpen ? item.title : undefined}
              >
                <span className={isActive(item.href) ? 'text-blue-600 dark:text-blue-400' : ''}>
                  {item.icon}
                </span>
                {isOpen && (
                  <span className="text-sm font-medium">{item.title}</span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              BISMAN ERP v1.0
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
