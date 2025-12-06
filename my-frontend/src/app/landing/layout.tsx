"use client";

import { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setTheme, theme } = useTheme();

  // Force light mode for landing page
  useEffect(() => {
    // Store original theme
    const originalTheme = theme;
    
    // Force light mode
    setTheme('light');
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.style.backgroundColor = 'white';
    document.body.style.color = '#1f2937';
    
    // Cleanup on unmount - restore original theme
    return () => {
      if (originalTheme === 'dark') {
        setTheme('dark');
      }
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  return <>{children}</>;
}
