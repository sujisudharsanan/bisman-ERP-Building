'use client';

import React, { useState, useEffect } from 'react';
import { themes, applyTheme, loadThemePreference, saveThemePreference, getThemeById, type Theme } from '@/config/themes';

interface ThemeSelectorProps {
  onThemeChange?: (themeId: string) => void;
  variant?: 'dropdown' | 'grid';
}

export default function ThemeSelector({ onThemeChange, variant = 'dropdown' }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<string>(loadThemePreference());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const theme = getThemeById(currentTheme);
    if (theme) {
      applyTheme(theme);
    }
  }, []);

  const handleThemeChange = async (themeId: string) => {
    const theme = getThemeById(themeId);
    if (theme) {
      setCurrentTheme(themeId);
      applyTheme(theme);
      saveThemePreference(themeId);
      
      try {
        console.log('[ThemeSelector] Saving theme to database:', themeId);
        const response = await fetch('/api/user/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ theme: themeId })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('[ThemeSelector] Theme saved successfully:', data);
        } else {
          const error = await response.json();
          console.warn('[ThemeSelector] Failed to save to database (still saved locally):', error);
        }
      } catch (error) {
        console.error('[ThemeSelector] Network error saving theme preference:', error);
      }
      
      if (onThemeChange) {
        onThemeChange(themeId);
      }
      
      setIsOpen(false);
    }
  };

  if (variant === 'grid') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Theme
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                currentTheme === theme.id
                  ? 'ring-2 ring-offset-2'
                  : 'hover:border-opacity-50'
              }`}
              style={{
                backgroundColor: theme.bgPanel,
                borderColor: currentTheme === theme.id ? theme.accent : theme.border,
                // @ts-ignore - Ring color is set via CSS variable
                '--tw-ring-color': theme.accent,
              } as React.CSSProperties}
            >
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 h-8">
                  <div
                    className="flex-1 rounded"
                    style={{ backgroundColor: theme.userBubble }}
                  />
                  <div
                    className="flex-1 rounded"
                    style={{ backgroundColor: theme.assistantBubble }}
                  />
                </div>
                <div className="flex gap-1 h-4">
                  <div
                    className="w-8 rounded"
                    style={{ backgroundColor: theme.accent }}
                  />
                  <div
                    className="flex-1 rounded"
                    style={{ backgroundColor: theme.border }}
                  />
                </div>
              </div>
              <p
                className="mt-3 text-sm font-medium text-center"
                style={{ color: theme.textPrimary }}
              >
                {theme.name}
              </p>
              {currentTheme === theme.id && (
                <div
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: theme.accent, color: theme.bgMain }}
                >
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)'
        }}
      >
        <div className="flex gap-1">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'var(--user-bubble)' }}
          />
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'var(--assistant-bubble)' }}
          />
        </div>
        <span className="text-sm font-medium">
          {getThemeById(currentTheme)?.name || 'Select Theme'}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute top-full mt-2 w-72 rounded-lg shadow-xl border z-50 overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="max-h-96 overflow-y-auto">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: currentTheme === theme.id ? theme.bgSecondary : 'transparent',
                    color: theme.textPrimary
                  }}
                >
                  <div className="flex gap-1">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: theme.userBubble }}
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: theme.assistantBubble }}
                    />
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium">
                    {theme.name}
                  </span>
                  {currentTheme === theme.id && (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      style={{ color: theme.accent }}
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
