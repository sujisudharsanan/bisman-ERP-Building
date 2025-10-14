'use client';

import React from 'react';
import DarkModeToggle from '../ui/DarkModeToggle';
import LogoutButton from '../ui/LogoutButton';

const TopNavbar: React.FC = () => {
  return (
    <header className="p-4 flex justify-between items-center bg-gray-900 border-b border-gray-800">
      <div>
        <span className="text-gray-400">Tasks &gt; Today</span>
        <h1 className="text-2xl font-bold">Task Management</h1>
      </div>
      <div className="flex items-center space-x-4">
        <a href="#" className="text-gray-300 hover:text-white">Pricing</a>
        <a href="#" className="text-gray-300 hover:text-white">About</a>
        <a href="#" className="text-gray-300 hover:text-white">Language</a>
        <a href="#" className="text-gray-300 hover:text-white">Conditions</a>
        <DarkModeToggle />
        <LogoutButton position="inline" variant="default" />
      </div>
    </header>
  );
};

export default TopNavbar;
