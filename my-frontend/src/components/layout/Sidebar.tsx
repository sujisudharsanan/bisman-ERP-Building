'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import BaseSidebar from './BaseSidebar';

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const { user, refreshUser } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const mediaQueryRef = useRef<MediaQueryList | null>(null);
  
  // Use matchMedia for more stable mobile detection (no flickering)
  useEffect(() => {
    // Create media query for mobile breakpoint (matches Tailwind's lg: 1024px)
    mediaQueryRef.current = window.matchMedia('(max-width: 1023px)');
    
    // Handler for media query changes
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    
    // Initial check
    handleMediaChange(mediaQueryRef.current);
    
    // Listen for changes (use addListener for older browser support)
    if (mediaQueryRef.current.addEventListener) {
      mediaQueryRef.current.addEventListener('change', handleMediaChange);
    } else {
      // Fallback for older browsers
      mediaQueryRef.current.addListener(handleMediaChange);
    }
    
    return () => {
      if (mediaQueryRef.current) {
        if (mediaQueryRef.current.removeEventListener) {
          mediaQueryRef.current.removeEventListener('change', handleMediaChange);
        } else {
          mediaQueryRef.current.removeListener(handleMediaChange);
        }
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
