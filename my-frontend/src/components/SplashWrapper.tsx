"use client";

import React, { useEffect, useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import { useAuth } from '@/common/hooks/useAuth';
import { usePathname } from 'next/navigation';

interface SplashWrapperProps {
  children: React.ReactNode;
  companyName?: string;
}

const SPLASH_SHOWN_KEY = 'bisman_splash_shown_session';

export default function SplashWrapper({ children, companyName = "BISMAN ERP" }: SplashWrapperProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [showSplash, setShowSplash] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if we should show splash (only after login, when user exists)
  useEffect(() => {
    if (authLoading || !isMounted) return; // Wait for auth to load and mount
    
    // Don't show on auth pages (login, logout, etc.)
    const isAuthPage = pathname?.startsWith('/auth') || pathname?.startsWith('/login') || pathname === '/';
    if (isAuthPage) {
      setShowSplash(false);
      return;
    }

    // Check if already shown this session
    try {
      const alreadyShown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
      if (alreadyShown === 'true') {
        setHasShownThisSession(true);
        setShowSplash(false);
        return;
      }
    } catch (e) {}

    // Show splash only if user is logged in and we haven't shown it yet
    if (user && !hasShownThisSession) {
      setShowSplash(true);
    }
  }, [user, authLoading, pathname, hasShownThisSession, isMounted]);

  const onSplashComplete = () => {
    setShowSplash(false);
    setHasShownThisSession(true);
    // Mark as shown for this session
    try {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
    } catch (e) {}
  };

  // Only show splash after mount to avoid hydration issues
  const shouldShowSplash = isMounted && showSplash;

  // If splash is showing, render splash on top
  if (shouldShowSplash) {
    return (
      <>
        <SplashScreen 
          onComplete={onSplashComplete}
          duration={3000}
        />
        {children}
      </>
    );
  }

  // Just render children directly - no wrapper div
  return <>{children}</>;
}
