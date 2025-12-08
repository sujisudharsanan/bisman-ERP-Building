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

  // Check if we should show splash (only after login, when user exists)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
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
  }, [user, authLoading, pathname, hasShownThisSession]);

  const onSplashComplete = () => {
    setShowSplash(false);
    setHasShownThisSession(true);
    // Mark as shown for this session
    try {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
    } catch (e) {}
  };

  // Don't block rendering while auth is loading
  if (authLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {showSplash && (
        <SplashScreen 
          companyName={companyName}
          subline="Designed for you"
          onComplete={onSplashComplete}
          duration={1700}
        />
      )}
      {/* Always render children but they appear after splash fades */}
      <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
        {children}
      </div>
    </>
  );
}
