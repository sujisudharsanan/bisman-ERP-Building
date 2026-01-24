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

// Inline icons to avoid importing lucide-react at module scope during SSR
function UserIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
    'SUPER_ADMIN': 'Retail Client Management',
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
      className="fixed top-0 left-0 right-0 z-50 bg-panel shadow-sm border-b border-theme"
      role="banner"
      aria-label="Main header"
    >
      <div className="px-2 sm:px-3 lg:px-4">
        <div className="flex justify-between items-center h-8">
          {/* Left side - User info and Menu toggle */}
          <div className="flex items-center space-x-2">
            {loading ? (
              <span 
                className="text-xs text-gray-500"
                role="status"
                aria-live="polite"
              >
                {t('common.loading')}
              </span>
            ) : user ? (
              <Link 
                href="/profile"
                className="flex items-center space-x-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={t('header.go_to_profile')}
              >
                {/* User Avatar - Circular, clickable */}
                <Avatar 
                  className="w-5 h-5 ring-1 ring-blue-500/20"
                  aria-hidden="true"
                >
                  {(() => {
                    const profileUrl = (user as any)?.profile_pic_url || user.profilePhotoUrl;
                    const secureUrl = profileUrl?.replace('/uploads/', '/api/secure-files/');
                    return secureUrl ? (
                    <AvatarImage 
                      src={secureUrl} 
                      alt={t('header.profile_alt')}
                    />
                  ) : (
                      <AvatarFallback className="bg-blue-600 text-white">
                      <UserIcon className="w-3 h-3" aria-hidden="true" />
                    </AvatarFallback>
                  );
                  })()}
                </Avatar>

                {/* User Name and Role */}
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[11px] font-semibold text-gray-900 dark:text-white">
                    {user.name}
                  </span>
                  <span 
                    className="text-[9px] text-gray-500 dark:text-gray-400"
                    aria-label={`Role: ${getRoleDisplayName(user.role || 'USER')}`}
                  >
                    {getRoleDisplayName(user.role || 'USER')}
                  </span>
                </div>
              </Link>
            ) : null}
          </div>

          {/* Right side - menu toggle */}
          <div className="flex items-center space-x-1">
            {onMenuToggle && (
              <button 
                onClick={onMenuToggle}
                className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Open main menu"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                <svg 
                  className="h-4 w-4" 
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
        </div>
      </div>
    </header>
  );
}
