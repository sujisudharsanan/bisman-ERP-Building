'use client';

import React from 'react';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen: _isOpen, onToggle: _onToggle }: SidebarProps) {
  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Navigation</h2>
        <p className="text-sm text-gray-600">Sidebar component placeholder</p>
      </div>
    </div>
  );
}
