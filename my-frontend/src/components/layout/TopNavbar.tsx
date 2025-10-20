'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/common/hooks/useAuth';
import DarkModeToggle from '../ui/DarkModeToggle';
import LogoutButton from '../ui/LogoutButton';

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
      <div className="w-8 h-8 rounded bg-yellow-400 dark:bg-yellow-500 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-800 shadow-md">
        B
      </div>
    );
  }

  return (
    <Image
      src="/brand/logo.svg"
      alt="BISMAN ERP"
      title="BISMAN ERP"
      width={80}
      height={80}
      className="h-10 w-auto object-contain shrink-0"
      priority
      onError={() => setLogoError(true)}
    />
  );
};

const TopNavbar: React.FC<TopNavbarProps> = ({ showThemeToggle = false }) => {
  const { user } = useAuth();

  return (
  <header className="px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-transparent shadow-sm theme-transition" data-component="top-navbar">
      {/* Left side - Logo and Title */}
      <div className="flex items-center gap-3">
        <HeaderLogo />
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            BISMAN ERP
          </h1>
          {user && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user.roleName || user.role || 'Dashboard'}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-3">
        <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-xs hidden sm:inline">
          Pricing
        </a>
        <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-xs hidden sm:inline">
          About
        </a>
        <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-xs hidden md:inline">
          Language
        </a>
        <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-xs hidden md:inline">
          Conditions
        </a>
        <LogoutButton position="inline" variant="danger" compact />
        {showThemeToggle && <DarkModeToggle />}
      </div>
    </header>
  );
};

export default TopNavbar;
