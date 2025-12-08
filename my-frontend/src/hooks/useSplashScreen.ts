"use client";

import { useState, useEffect, useCallback } from 'react';

const SPLASH_SHOWN_KEY = 'bisman_splash_shown_session';

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if splash was shown in this browser session (not persistent across logout)
    if (typeof window !== 'undefined') {
      try {
        // Use sessionStorage so splash shows on every new login/session
        const splashShown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
        
        if (splashShown === 'true') {
          // Already shown this session, skip
          setShowSplash(false);
          setIsLoading(false);
          return;
        }
        
        // Show splash for new session (every login)
        setShowSplash(true);
        setIsLoading(false);
      } catch (e) {
        // On error, don't show splash
        setShowSplash(false);
        setIsLoading(false);
      }
    }
  }, []);

  const onSplashComplete = useCallback(() => {
    setShowSplash(false);
    // Mark splash as shown for this session only
    try {
      sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  const resetSplash = useCallback(() => {
    // Utility to reset splash for testing
    try {
      sessionStorage.removeItem(SPLASH_SHOWN_KEY);
    } catch (e) {}
  }, []);

  return {
    showSplash,
    isLoading,
    onSplashComplete,
    resetSplash
  };
}
