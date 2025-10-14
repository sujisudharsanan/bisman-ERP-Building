/**
 * Dashboard Header Component
 * Follows International Coding Standards (WCAG 2.1 AA, i18n, semantic HTML)
 * 
 * Requirements:
 * 1. Circular user Avatar linked to /profile route
 * 2. User name from database
 * 3. Role display: "{{role}} - Dashboard"
 * 4. All text wrapped in localization function t()
 * 5. Proper ARIA labels for accessibility
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

/**
 * Localization function (stub until full i18n setup)
 * Replace with actual useTranslation hook when next-i18next is configured
 */
const t = (key: string, options?: Record<string, any>): string => {
  const translations: Record<string, string> = {
    'header.role_dashboard': '{{role}} - Dashboard',
    'header.profile_alt': 'User profile photo',
    'header.go_to_profile': 'Go to profile',
    'common.loading': 'Loading...',
  };

  let text = translations[key] || key;
  
  // Simple variable interpolation
  if (options) {
    Object.keys(options).forEach((optionKey) => {
      text = text.replace(`{{${optionKey}}}`, String(options[optionKey]));
    });
  }
  
  return text;
};

/**
 * Get role display name following i18n standards
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

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, loading } = useUser();

  return (
    <header 
      className="bg-white shadow-sm border-b border-gray-200"
      role="banner"
      aria-label="Main header"
    >
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Menu toggle */}
          <div className="flex items-center">
            {onMenuToggle && (
              <button 
                onClick={onMenuToggle}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Open main menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Right side - User info */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <span 
                className="text-sm text-gray-500"
                role="status"
                aria-live="polite"
              >
                {t('common.loading')}
              </span>
            ) : user ? (
              <Link 
                href="/profile"
                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t('header.go_to_profile')}
              >
                {/* User Avatar - Circular, clickable */}
                <Avatar 
                  className="w-10 h-10"
                  aria-hidden="true"
                >
                  {user.profilePhotoUrl ? (
                    <AvatarImage 
                      src={user.profilePhotoUrl} 
                      alt={t('header.profile_alt')}
                    />
                  ) : (
                    <AvatarFallback className="bg-blue-600 text-white">
                      <User className="w-5 h-5" aria-hidden="true" />
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* User Name and Role */}
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-gray-900">
                    {user.name}
                  </span>
                  <span 
                    className="text-xs text-gray-500"
                    aria-label={`Role: ${getRoleDisplayName(user.role || 'USER')}`}
                  >
                    {t('header.role_dashboard', { 
                      role: getRoleDisplayName(user.role || 'USER') 
                    })}
                  </span>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
