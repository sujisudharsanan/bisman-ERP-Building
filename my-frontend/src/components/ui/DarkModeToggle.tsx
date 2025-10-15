'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface DarkModeToggleProps {
  floating?: boolean; // if true, position center-right of viewport
}

export default function DarkModeToggle({ floating = false }: DarkModeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Avoid hydration mismatch — ThemeProvider manages the real theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure only one toggle renders globally (singleton)
  useEffect(() => {
    if (!mounted) return;
    const existing = Array.from(document.querySelectorAll('[data-theme-toggle="true"]')) as HTMLElement[];
    if (existing.length > 0 && existing[0] !== btnRef.current) {
      // Keep first toggle (likely navbar) and hide later duplicates
      if (existing.some(el => el === btnRef.current)) return;
      setHidden(true);
    }
  }, [mounted]);

  const toggleThemeHandler = () => {
    try { toggleTheme(); } catch (err) { console.error('Toggle theme failed', err); }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-panel text-theme">
        <div className="w-5 h-5" />
      </button>
    );
  }

  if (hidden) return null;

  const baseClasses = "p-2 rounded-lg bg-panel text-theme hover:opacity-90 shadow-lg backdrop-blur-sm border border-theme theme-transition";
  const floatClasses = floating ? "fixed top-1/2 -translate-y-1/2 right-4 z-40" : "";
  return (
    <button
      ref={btnRef}
      data-theme-toggle="true"
  onClick={toggleThemeHandler}
      className={`${baseClasses} ${floatClasses}`.trim()}
  aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
  title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
  {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-400" />}
    </button>
  );
}
