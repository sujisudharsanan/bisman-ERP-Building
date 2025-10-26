'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/common/hooks/useAuth';
import DarkModeToggle from '../ui/DarkModeToggle';
import LogoutButton from '../ui/LogoutButton';
import { User } from 'lucide-react';

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

  /**
   * Get role display name
   */
  const getRoleDisplayName = (role: string): string => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'MANAGER': 'Manager',
      'STAFF': 'Staff',
      'USER': 'User',
      'HUB_INCHARGE': 'Hub Incharge',
      'STORE_INCHARGE': 'Store Incharge',
    };
    
    return roleMap[role] || role;
  };

  return (
  <header className="px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-transparent shadow-sm theme-transition" data-component="top-navbar">
      {/* Left side - User Photo, Name, Role and Logo */}
      <div className="flex items-center gap-4">
        {/* User Info Section */}
        {user ? (
          <Link 
            href="/profile"
            className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors"
          >
            {/* User Avatar */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center ring-2 ring-blue-500/20">
              {/* TODO: Add profilePhotoUrl to User interface when available */}
              <User className="w-5 h-5 text-white" />
            </div>
            
            {/* User Name and Role */}
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {user.name || user.username || 'User'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {getRoleDisplayName(user.role || user.roleName || 'USER')}
              </span>
            </div>
          </Link>
        ) : null}

        {/* Divider */}
        {user && (
          <div className="h-10 w-px bg-gray-200 dark:bg-gray-700"></div>
        )}
        
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <HeaderLogo />
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              BISMAN ERP
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Dashboard
            </p>
          </div>
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
