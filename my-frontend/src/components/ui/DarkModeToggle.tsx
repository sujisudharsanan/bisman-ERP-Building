'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      style={{
        backgroundColor: isDark ? '#3b82f6' : '#e5e7eb'
      }}
      aria-label="Toggle dark mode"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Sliding circle */}
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 flex items-center justify-center"
        style={{
          transform: isDark ? 'translateX(22px)' : 'translateX(2px)'
        }}
      >
        {/* Icon inside the circle */}
        {isDark ? (
          <Moon className="h-3 w-3 text-blue-500" />
        ) : (
          <Sun className="h-3 w-3 text-yellow-500" />
        )}
      </span>
    </button>
  );
}
