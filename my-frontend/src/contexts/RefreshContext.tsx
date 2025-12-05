'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface RefreshContextType {
  // Register a refresh function from a page/component
  registerRefresh: (key: string, refreshFn: () => Promise<void> | void) => void;
  // Unregister when component unmounts
  unregisterRefresh: (key: string) => void;
  // Trigger all registered refresh functions
  refreshAll: () => Promise<void>;
  // Check if currently refreshing
  isRefreshing: boolean;
  // Last refresh timestamp
  lastRefresh: Date | null;
  // Number of registered refresh handlers
  registeredCount: number;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const refreshHandlers = useRef<Map<string, () => Promise<void> | void>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [registeredCount, setRegisteredCount] = useState(0);

  const registerRefresh = useCallback((key: string, refreshFn: () => Promise<void> | void) => {
    refreshHandlers.current.set(key, refreshFn);
    setRegisteredCount(refreshHandlers.current.size);
  }, []);

  const unregisterRefresh = useCallback((key: string) => {
    refreshHandlers.current.delete(key);
    setRegisteredCount(refreshHandlers.current.size);
  }, []);

  const refreshAll = useCallback(async () => {
    if (isRefreshing) return;
    
    const handlers = Array.from(refreshHandlers.current.values());
    
    if (handlers.length === 0) {
      // No handlers registered, fall back to page reload
      console.log('[RefreshContext] No refresh handlers registered, using page reload');
      window.location.reload();
      return;
    }

    setIsRefreshing(true);
    console.log(`[RefreshContext] Refreshing ${handlers.length} registered handlers`);

    try {
      // Execute all refresh handlers in parallel
      await Promise.all(
        handlers.map(async (handler) => {
          try {
            await handler();
          } catch (error) {
            console.error('[RefreshContext] Handler error:', error);
          }
        })
      );
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);

  return (
    <RefreshContext.Provider
      value={{
        registerRefresh,
        unregisterRefresh,
        refreshAll,
        isRefreshing,
        lastRefresh,
        registeredCount,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefreshContext() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefreshContext must be used within a RefreshProvider');
  }
  return context;
}

/**
 * Safe version that returns null if not in provider (for optional integration)
 */
export function useRefreshContextSafe() {
  return useContext(RefreshContext);
}

/**
 * Hook for pages/components to register their refresh logic
 * Safe to use even without RefreshProvider (will silently skip registration)
 * 
 * @example
 * ```tsx
 * function MyDashboard() {
 *   const { data, refetch } = useQuery(...);
 *   
 *   // Register this component's refresh function
 *   usePageRefresh('dashboard-data', refetch);
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function usePageRefresh(key: string, refreshFn: () => Promise<void> | void) {
  const context = useRefreshContextSafe();

  useEffect(() => {
    if (!context) return; // Not wrapped in RefreshProvider, skip
    context.registerRefresh(key, refreshFn);
    return () => context.unregisterRefresh(key);
  }, [key, refreshFn, context]);
}

/**
 * Hook for getting the refresh trigger function (for refresh buttons)
 * Safe to use even without RefreshProvider - returns fallback values
 */
export function useRefreshTrigger() {
  const context = useRefreshContextSafe();
  
  if (!context) {
    // Not wrapped in RefreshProvider, return fallback that does page reload
    return {
      refreshAll: async () => { window.location.reload(); },
      isRefreshing: false,
      lastRefresh: null,
      registeredCount: 0,
    };
  }
  
  return {
    refreshAll: context.refreshAll,
    isRefreshing: context.isRefreshing,
    lastRefresh: context.lastRefresh,
    registeredCount: context.registeredCount,
  };
}
