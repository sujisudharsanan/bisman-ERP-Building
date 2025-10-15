'use client';

import React from 'react';
import DarkModeToggle from '../ui/DarkModeToggle';
import LogoutButton from '../ui/LogoutButton';

interface TopNavbarProps {
  showThemeToggle?: boolean;
}

const TopNavbar: React.FC<TopNavbarProps> = ({ showThemeToggle = false }) => {
  return (
  <header className="p-2 flex justify-between items-center bg-panel border-b border-theme theme-transition" data-component="top-navbar">
      <div>
        <span className="text-muted text-[11px]">Tasks &gt; Today</span>
    <h1 className="text-sm font-semibold leading-tight text-theme">Task Management</h1>
      </div>
      <div className="flex items-center space-x-3">
        <a href="#" className="text-muted hover:text-theme text-xs">Pricing</a>
        <a href="#" className="text-muted hover:text-theme text-xs">About</a>
        <a href="#" className="text-muted hover:text-theme text-xs">Language</a>
        <a href="#" className="text-muted hover:text-theme text-xs">Conditions</a>
  <LogoutButton position="inline" variant="danger" compact />
        {showThemeToggle && <DarkModeToggle />}
      </div>
    </header>
  );
};

export default TopNavbar;
