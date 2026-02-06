"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Calendar, Bell, User, Settings, ChevronDown, Menu } from 'lucide-react';

// Dynamic imports to prevent SSR issues with theme/auth hooks
const DarkModeToggle = dynamic(() => import('../ui/DarkModeToggle'), { ssr: false });
const LogoutButton = dynamic(() => import('../ui/LogoutButton'), { ssr: false });
import { useAuth } from '@/hooks/useAuth';


interface TopNavbarProps {
  showThemeToggle?: boolean;
  fixed?: boolean;
  onMenuToggle?: () => void;
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

/**
 * User Profile Dropdown
 */
const UserProfileDropdown: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const profilePicUrl = user?.profile_pic_url
    ? (user.profile_pic_url.startsWith('/uploads/')
        ? user.profile_pic_url.replace('/uploads/', '/api/secure-files/')
        : user.profile_pic_url)
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="User menu"
      >
        {/* Profile Picture */}
        <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
          {profilePicUrl ? (
            <Image
              src={profilePicUrl}
              alt="Profile"
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-white">{getInitials(user?.name)}</span>
          )}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
          {user?.name || 'User'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <button
            onClick={() => { router.push('/common/about-me'); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <User className="w-4 h-4" />
            My Profile
          </button>
          <button
            onClick={() => { router.push('/common/user-settings'); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="w-4 h-4" />
            User Settings
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <div className="px-3 py-2">
            <LogoutButton position="inline" variant="danger" compact />
          </div>
        </div>
      )}
    </div>
  );
};

const TopNavbar: React.FC<TopNavbarProps> = ({ showThemeToggle = false, fixed = true, onMenuToggle }) => {
  const [currentPageName, setCurrentPageName] = useState<string>('Dashboard');

  // Get current page name from URL
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      
      // Extract page name from URL path
      const segments = path.split('/').filter(Boolean);
      
      if (segments.length === 0) {
        setCurrentPageName('Dashboard');
      } else if (path.includes('/billing')) {
        setCurrentPageName('Billing & Subscription');
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
    className={`${fixed ? 'fixed top-0 left-0 right-0 z-50' : 'relative'} px-3 py-2 flex justify-between items-center bg-white dark:bg-[#0f1520] border-b border-gray-200 dark:border-transparent shadow-sm theme-transition`}
    style={{ height: 'var(--navbar-height)' }}
    data-component="top-navbar"
  >
      {/* Left side - Menu toggle and Logo */}
      <div className="flex items-center gap-2">
        {/* Hamburger Menu - Only visible on mobile (< lg) */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle sidebar menu"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <HeaderLogo />
          <div>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-200">
              BISMAN ERP
            </h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-300">
              {currentPageName}
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Calendar - Global Access */}
        <Link
          href="/common/calendar"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Calendar"
        >
          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>

        {/* Notifications - Global Access */}
        <button
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {/* Notification badge - show when there are unread notifications */}
          {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
        </button>

        {/* Theme Toggle */}
        {showThemeToggle && <DarkModeToggle />}

        {/* User Profile Dropdown */}
        <UserProfileDropdown />
      </div>
    </header>
  );
};

export default TopNavbar;
