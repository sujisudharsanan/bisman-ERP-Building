'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import DarkModeToggle from '../ui/DarkModeToggle';
import LogoutButton from '../ui/LogoutButton';
import { Calendar as CalendarIcon } from 'lucide-react';

interface TopNavbarProps {
  showThemeToggle?: boolean;
}

/**
 * Logo Component - Matches Super Admin style
 */
const HeaderLogo: React.FC = () => {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return (
      <div className="w-6 h-6 rounded bg-yellow-400 dark:bg-yellow-500 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-gray-800 shadow-md">
        B
      </div>
    );
  }

  return (
    <Image
      src="/brand/logo.svg"
      alt="BISMAN ERP"
      title="BISMAN ERP"
      width={56}
      height={56}
      className="h-7 w-auto object-contain shrink-0"
      priority
      onError={() => setLogoError(true)}
    />
  );
};

const TopNavbar: React.FC<TopNavbarProps> = ({ showThemeToggle = false }) => {
  const [currentPageName, setCurrentPageName] = useState<string>('Dashboard');

  // Get current page name from URL
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      
      // Extract page name from URL path
      const segments = path.split('/').filter(Boolean);
      
      if (segments.length === 0) {
        setCurrentPageName('Dashboard');
      } else if (path.includes('/common/user-settings')) {
        setCurrentPageName('User Settings');
      } else if (path.includes('/common/help-support')) {
        setCurrentPageName('Help & Support');
      } else {
        // Convert last segment to readable name (e.g., 'user-management' -> 'User Management')
        const lastSegment = segments[segments.length - 1];
        const readable = lastSegment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setCurrentPageName(readable);
      }
    }
  }, []);

  return (
  <header
    className="fixed top-0 left-0 right-0 z-50 px-3 py-2 flex justify-between items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-transparent shadow-sm theme-transition"
    data-component="top-navbar"
  >
      {/* Left rail aligned with sidebar */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 border-r border-gray-200 dark:border-gray-800"
        style={{ width: 'var(--sidebar-width, 13rem)' }}
      />
      {/* Left side - Logo and Title only */}
      <div className="flex items-center gap-3">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <HeaderLogo />
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              BISMAN ERP
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {currentPageName}
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Calendar is available for every user (independent calendars) */}
        <Link href="/calendar" className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Calendar</span>
        </Link>
        <LogoutButton position="inline" variant="danger" compact />
        {showThemeToggle && <DarkModeToggle />}
      </div>
    </header>
  );
};

export default TopNavbar;
