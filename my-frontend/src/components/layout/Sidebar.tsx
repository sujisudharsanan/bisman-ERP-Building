'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import BaseSidebar from './BaseSidebar';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const { user, refreshUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Refresh user data when profile picture changes
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('[Sidebar] Profile picture updated, refreshing user data...');
      refreshUser();
    };

    // Listen for profile picture update events
    window.addEventListener('profilePictureUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfileUpdate);
    };
  }, [refreshUser]);
  
  // Use DB-driven BaseSidebar (Single Source of Truth)
  return (
    <BaseSidebar
      user={user}
      collapsed={!isOpen}
      onCollapse={(collapsed) => onToggle?.()}
      isMobile={isMobile}
    />
  );
}
