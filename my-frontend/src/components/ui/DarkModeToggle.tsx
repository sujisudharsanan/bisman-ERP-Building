'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';

interface DarkModeToggleProps {
  floating?: boolean; // if true, position center-right of viewport
}

export default function DarkModeToggle({ floating = false }: DarkModeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Check localStorage and system preference
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
    setIsDark(shouldBeDark);
    
    // Apply theme to document
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for system changes if user hasn't explicitly chosen
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const explicit = localStorage.getItem('theme');
      if (!explicit) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
          setIsDark(true);
        } else {
          document.documentElement.classList.remove('dark');
          setIsDark(false);
        }
      }
    };
    media.addEventListener('change', handleSystemChange);
    return () => media.removeEventListener('change', handleSystemChange);
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

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // Update localStorage
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    
    // Update document class
    if (newTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

  // Also set a data attribute for potential CSS hooks
  document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-gray-800/50 text-gray-400">
        <div className="w-5 h-5" />
      </button>
    );
  }

  if (hidden) return null;

  const baseClasses = "p-2 rounded-lg bg-gray-800/70 hover:bg-gray-700/70 text-gray-300 hover:text-white shadow-lg backdrop-blur-sm border border-gray-700/40 transition-all duration-200";
  const floatClasses = floating ? "fixed top-1/2 -translate-y-1/2 right-4 z-40" : "";
  return (
    <button
      ref={btnRef}
      data-theme-toggle="true"
      onClick={toggleTheme}
      className={`${baseClasses} ${floatClasses}`.trim()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={20} className="text-yellow-400" />
      ) : (
        <Moon size={20} className="text-indigo-400" />
      )}
    </button>
  );
}
