'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
export type DockPosition = 'left' | 'right' | 'bottom';
export type DockSize = 'small' | 'medium' | 'large';

export interface DockModule {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  href: string;
  shortcut?: string;
}

export interface DockPreferences {
  dockPosition: DockPosition;
  dockSize: DockSize;
  magnifyOnHover: boolean;
  magnifyIntensity: number; // 1.2 - 1.8
  autoHide: boolean;
  favoriteModules: string[]; // ordered list of module IDs
}

interface DockContextType {
  preferences: DockPreferences;
  updatePreferences: (updates: Partial<DockPreferences>) => void;
  resetPreferences: () => void;
  isLoading: boolean;
}

// Default preferences
const DEFAULT_PREFERENCES: DockPreferences = {
  dockPosition: 'left',
  dockSize: 'medium',
  magnifyOnHover: true,
  magnifyIntensity: 1.4,
  autoHide: false,
  favoriteModules: ['dashboard', 'money', 'customers', 'delivery', 'team', 'reports', 'settings'],
};

// Default modules available in dock
export const DOCK_MODULES: DockModule[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/admin', shortcut: '⌘+1' },
  { id: 'money', label: 'Money', icon: 'Wallet', href: '/admin/money', shortcut: '⌘+2' },
  { id: 'customers', label: 'Customers', icon: 'Users', href: '/admin/customers', shortcut: '⌘+3' },
  { id: 'delivery', label: 'Delivery', icon: 'Truck', href: '/admin/delivery', shortcut: '⌘+4' },
  { id: 'team', label: 'Team', icon: 'UserCircle', href: '/admin/team', shortcut: '⌘+5' },
  { id: 'reports', label: 'Reports', icon: 'BarChart3', href: '/admin/reports', shortcut: '⌘+6' },
  { id: 'settings', label: 'Settings', icon: 'Settings', href: '/admin/settings', shortcut: '⌘+7' },
  { id: 'help', label: 'Help', icon: 'HelpCircle', href: '/admin/help', shortcut: '⌘+?' },
];

const DockContext = createContext<DockContextType | undefined>(undefined);

const STORAGE_KEY = 'bisman_dock_preferences';

export function DockProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<DockPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load dock preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save dock preferences:', error);
      }
    }
  }, [preferences, isLoading]);

  const updatePreferences = useCallback((updates: Partial<DockPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return (
    <DockContext.Provider value={{ preferences, updatePreferences, resetPreferences, isLoading }}>
      {children}
    </DockContext.Provider>
  );
}

export function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within a DockProvider');
  }
  return context;
}

// Hook to get dock dimensions based on size
export function useDockDimensions(size: DockSize, position: DockPosition) {
  const dimensions = {
    small: { width: 72, height: 72, iconSize: 22, gap: 8 },
    medium: { width: 80, height: 80, iconSize: 28, gap: 10 },
    large: { width: 90, height: 90, iconSize: 34, gap: 12 },
  };

  const dim = dimensions[size];
  
  return {
    ...dim,
    isVertical: position === 'left' || position === 'right',
    padding: position === 'bottom' ? 20 : 12,
  };
}
