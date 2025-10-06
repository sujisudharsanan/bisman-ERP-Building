'use client';

import React from 'react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button 
              onClick={onMenuToggle}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Open main menu</span>
              ☰
            </button>
            <h1 className="ml-4 text-lg font-semibold">Header</h1>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">Header placeholder</span>
          </div>
        </div>
      </div>
    </header>
  );
}
