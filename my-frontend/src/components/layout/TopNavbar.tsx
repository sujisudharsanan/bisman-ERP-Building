'use client';

import React from 'react';
import DarkModeToggle from '../ui/DarkModeToggle';
import LogoutButton from '../ui/LogoutButton';

interface TopNavbarProps {
  showThemeToggle?: boolean;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ showThemeToggle = false }) => {
  return (
    <header className="p-3 flex justify-between items-center bg-gray-900 border-b border-gray-800" data-component="top-navbar">
      <div>
        <span className="text-gray-400 text-xs">Tasks &gt; Today</span>
        <h1 className="text-lg font-bold">Task Management</h1>
      </div>
  <div className="flex items-center space-x-3">
  {showThemeToggle && <DarkModeToggle />}
    <a href="#" className="text-gray-300 hover:text-white text-sm">Pricing</a>
        <a href="#" className="text-gray-300 hover:text-white text-sm">About</a>
        <a href="#" className="text-gray-300 hover:text-white text-sm">Language</a>
  <a href="#" className="text-gray-300 hover:text-white text-sm">Conditions</a>
        <LogoutButton position="inline" variant="default" />
      </div>
    </header>
  );
};

export default TopNavbar;
