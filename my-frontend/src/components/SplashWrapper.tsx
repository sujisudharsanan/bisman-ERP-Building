"use client";

import React, { useEffect, useState, useRef } from 'react';
import SplashScreen from '@/components/SplashScreen';
import { useAuth } from '@/common/hooks/useAuth';
import { usePathname } from 'next/navigation';

interface SplashWrapperProps {
  children: React.ReactNode;
  companyName?: string;
}

const SPLASH_SHOWN_KEY = 'bisman_splash_shown_session';
const CLIENT_BRANDING_KEY = 'bisman_client_branding';
const MIN_SPLASH_DURATION = 2000; // Minimum 2 seconds for branding

interface ClientBranding {
  logo?: string;
  name?: string;
  primaryColor?: string;
}

// Check if splash was already shown (called before component renders)
const wasAlreadyShown = () => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SPLASH_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
};

// Get saved client branding from localStorage
const getSavedClientBranding = (): ClientBranding | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(CLIENT_BRANDING_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Save client branding to localStorage for future splash screens
const saveClientBranding = (branding: ClientBranding) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLIENT_BRANDING_KEY, JSON.stringify(branding));
  } catch {}
};

export default function SplashWrapper({ children, companyName = "BISMAN ERP" }: SplashWrapperProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  // Start with splash showing to prevent flash (unless already shown this session)
  const [showSplash, setShowSplash] = useState(() => !wasAlreadyShown());
  const [shouldHideSplash, setShouldHideSplash] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(() => wasAlreadyShown());
  const [isMounted, setIsMounted] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [clientBranding, setClientBranding] = useState<ClientBranding | null>(null);
  const splashStartTime = useRef<number | null>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mark component as mounted and load saved branding
  useEffect(() => {
    setIsMounted(true);
    // Load saved client branding from localStorage
    const savedBranding = getSavedClientBranding();
    if (savedBranding) {
      setClientBranding(savedBranding);
    }
    
    // Emergency timeout - force close splash after 5 seconds no matter what
    // This prevents infinite splash if auth hangs
    emergencyTimeoutRef.current = setTimeout(() => {
      if (showSplash) {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('SplashWrapper: Emergency timeout - closing splash');
        }
        setShowSplash(false);
        setShouldHideSplash(true);
        setHasShownThisSession(true);
        try {
          sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
        } catch {}
      }
    }, 5000);
    
    return () => {
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
      }
    };
  }, []);

  // Save client branding when user is loaded
  useEffect(() => {
    if (user && !authLoading) {
      // Extract client branding from user data (use type assertion for extended properties)
      const userData = user as Record<string, unknown>;
      const branding: ClientBranding = {
        logo: (userData.clientLogo || userData.profile_pic_url || userData.logo) as string | undefined,
        name: (userData.clientName || userData.companyName || userData.tenant_name || userData.name) as string | undefined,
        primaryColor: (userData.primaryColor || userData.themeColor) as string | undefined,
      };
      // Only save if we have at least a logo or name
      if (branding.logo || branding.name) {
        setClientBranding(branding);
        saveClientBranding(branding);
      }
    }
  }, [user, authLoading]);

  // Start minimum duration timer when splash starts showing
  useEffect(() => {
    if (showSplash && !splashStartTime.current) {
      splashStartTime.current = Date.now();
      const timer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, MIN_SPLASH_DURATION);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Complete splash when both animation is done AND minimum time has elapsed AND auth is loaded
  useEffect(() => {
    if (animationComplete && minTimeElapsed && !authLoading) {
      completeSplash();
    }
  }, [animationComplete, minTimeElapsed, authLoading]);

  // Check if we should show splash (only after login, when user exists)
  useEffect(() => {
    if (!isMounted) return; // Wait for mount
    
    // Don't show on auth pages, landing page, or public pages - hide immediately
    const isAuthPage = pathname?.startsWith('/auth') || pathname?.startsWith('/login') || pathname === '/';
    const isLandingPage = pathname?.startsWith('/landing');
    if (isAuthPage || isLandingPage) {
      setShowSplash(false);
      setShouldHideSplash(true);
      return;
    }

    // Check if already shown this session
    if (hasShownThisSession) {
      setShowSplash(false);
      setShouldHideSplash(true);
      return;
    }

    // If auth is still loading, keep showing splash (prevents flash)
    if (authLoading) {
      return;
    }

    // If no user (not logged in), hide splash
    if (!user) {
      setShowSplash(false);
      setShouldHideSplash(true);
      return;
    }

    // User is logged in, show splash
    setShowSplash(true);
  }, [user, authLoading, pathname, hasShownThisSession, isMounted]);

  const completeSplash = () => {
    setShowSplash(false);
    setHasShownThisSession(true);
    setAnimationComplete(false);
    setMinTimeElapsed(false);
    splashStartTime.current = null;
    // Mark as shown for this session
    try {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
    } catch (e) {}
  };

  const onSplashAnimationComplete = () => {
    // Animation finished, mark it
    setAnimationComplete(true);
  };

  // Show splash while determining state (prevents flash)
  const isDeciding = isMounted && !shouldHideSplash && !hasShownThisSession && authLoading;
  const shouldShowSplash = isMounted && showSplash && !hasShownThisSession;

  // If still deciding or splash is showing, render splash on top (hide children)
  if (isDeciding || shouldShowSplash) {
    return (
      <>
        <SplashScreen 
          onComplete={onSplashAnimationComplete}
          duration={2500}
          clientLogo={clientBranding?.logo}
          clientName={clientBranding?.name}
        />
        {/* Render children hidden to allow them to load in background */}
        <div style={{ display: 'none' }}>{children}</div>
      </>
    );
  }

  // Just render children directly - no wrapper div
  return <>{children}</>;
}
