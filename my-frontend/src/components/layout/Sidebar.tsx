'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import BaseSidebar from './BaseSidebar';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const { user, refreshUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const resizeTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Detect mobile viewport with debouncing to prevent flickering
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      // Only update state if the value actually changed
      setIsMobile(prev => prev !== mobile ? mobile : prev);
    };
    
    const debouncedCheckMobile = () => {
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
      resizeTimeout.current = setTimeout(checkMobile, 100);
    };
    
    checkMobile(); // Initial check
    window.addEventListener('resize', debouncedCheckMobile);
    return () => {
      window.removeEventListener('resize', debouncedCheckMobile);
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current);
      }
    };
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
