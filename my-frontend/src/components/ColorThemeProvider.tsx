'use client';

import React, { useEffect, useState } from 'react';
import { initializeTheme, applyTheme, getThemeById } from '@/config/themes';

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        console.log('[ColorThemeProvider] Loading user theme preference...');
        const response = await fetch('/api/user/preferences', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[ColorThemeProvider] Loaded theme from database:', data.theme);
          const colorTheme = getThemeById(data.theme);
          if (colorTheme) {
            applyTheme(colorTheme);
          } else {
            initializeTheme();
          }
        } else {
          console.log('[ColorThemeProvider] No saved theme or not authenticated, using localStorage/default');
          initializeTheme();
        }
      } catch (error) {
        console.log('[ColorThemeProvider] Failed to load theme, using localStorage/default:', error);
        initializeTheme();
      } finally {
        setIsInitialized(true);
      }
    };

    loadUserTheme();
  }, []);

  // Always render children, apply theme in background
  return <>{children}</>;
}
