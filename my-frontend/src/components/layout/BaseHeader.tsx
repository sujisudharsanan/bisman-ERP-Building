'use client';

import React from 'react';
import { Menu, X } from 'lucide-react';
import DarkModeToggle from '../ui/DarkModeToggle';
import LogoutButton from '../ui/LogoutButton';
import Image from 'next/image';

interface BaseHeaderProps {
  user: any;
  onToggleSidebar: () => void;
  isMobile: boolean;
}

const BaseHeader: React.FC<BaseHeaderProps> = ({ user, onToggleSidebar, isMobile }) => {
  return (
    <header 
      className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-lg"
      data-component="base-header"
    >
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left: Mobile Menu + Breadcrumb */}
        <div className="flex items-center gap-4">
          {isMobile && (
            <button
              onClick={onToggleSidebar}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} className="text-gray-300" />
            </button>
          )}
          
          <div className="hidden md:block">
            <span className="text-gray-400 text-sm">Dashboard &gt; {user?.roleName || 'Home'}</span>
            <h1 className="text-xl lg:text-2xl font-bold text-white">BISMAN ERP</h1>
          </div>

          {/* Mobile: Just show title */}
          <div className="md:hidden">
            <h1 className="text-lg font-bold text-white">BISMAN ERP</h1>
          </div>
        </div>

        {/* Center: User Info (Desktop) */}
        <div className="hidden lg:flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-lg">
              {/* Profile Image */}
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt={user.name || user.email}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
              </div>

              {/* User Details */}
              <div className="text-left">
                <p className="text-sm font-semibold text-white">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-400">
                  {user.roleName || 'User'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Desktop: Show all nav links */}
          <nav className="hidden lg:flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="/reports" className="text-sm text-gray-300 hover:text-white transition-colors">
              Reports
            </a>
            <a href="/settings" className="text-sm text-gray-300 hover:text-white transition-colors">
              Settings
            </a>
          </nav>

          {/* Dark Mode Toggle */}
          <DarkModeToggle />

          {/* Logout Button */}
          <LogoutButton position="inline" variant="default" />
        </div>
      </div>

      {/* Mobile: User Info Bar */}
      {isMobile && user && (
        <div className="md:hidden px-4 py-2 bg-gray-800/30 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {user.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name || user.email}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-xs">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-gray-400">
                {user.roleName || 'User'}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default BaseHeader;
