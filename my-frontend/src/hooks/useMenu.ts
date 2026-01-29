/**
 * ============================================================================
 * BISMAN ERP - useMenu Hook
 * ============================================================================
 * 
 * Single Source of Truth for navigation menus.
 * Fetches menu structure from /api/menu/menu endpoint.
 * 
 * This hook replaces all hardcoded menu configs:
 * - roleLayoutConfig.ts (deprecated)
 * - EnterpriseAdminSidebar.tsx (deprecated)
 * - ROLE_PERMISSIONS (deprecated)
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';

// ============================================================================
// Types
// ============================================================================

export interface MenuPage {
  id: number;
  code: string;
  name: string;
  route: string;
  icon: string;
  sortOrder: number;
  showInSidebar: boolean;
  permissions: {
    canView: boolean;
    canEdit: boolean;
  };
}

export interface MenuModule {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  baseRoute: string;
  colorCode: string;
  layoutGroup: string;
  sortOrder: number;
  pages: MenuPage[];
}

export interface AccessibleRoute {
  route: string;
  code: string;
  canView: boolean;
  canEdit: boolean;
}

export interface MenuData {
  role: string;
  menu: MenuModule[];
  accessibleRoutes: AccessibleRoute[];
  meta: {
    totalModules: number;
    totalPages: number;
    generatedAt: string;
  };
}

export interface UseMenuResult {
  menu: MenuModule[];
  accessibleRoutes: AccessibleRoute[];
  isLoading: boolean;
  error: string | null;
  role: string | null;
  refetch: () => Promise<void>;
  canAccessRoute: (route: string) => boolean;
  canEditRoute: (route: string) => boolean;
  getModuleByCode: (code: string) => MenuModule | undefined;
  getPagesForModule: (moduleCode: string) => MenuPage[];
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchMenu(token: string): Promise<MenuData> {
  // Updated endpoint: /api/menu/menu (menuRoutesSecure mounted at /api/menu)
  const response = await fetch('/api/menu/menu', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch menu: ${response.statusText}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.message || 'Failed to fetch menu');
  }

  // Response format: { success, role, menu, accessibleRoutes, meta }
  // Map to expected format
  return {
    role: json.role,
    menu: json.menu || [],
    accessibleRoutes: json.accessibleRoutes || [],
    meta: json.meta || {
      totalModules: json.menu?.length || 0,
      totalPages: json.effectivePagesCount || 0,
      generatedAt: json.meta?.computedAt || new Date().toISOString()
    }
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useMenu(): UseMenuResult {
  const { user, isAuthenticated } = useAuth();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token from localStorage (set by AuthContext on login)
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken') || localStorage.getItem('token');
  }, []);

  // -------------------------------------------------------------------------
  // Fetch menu data
  // -------------------------------------------------------------------------
  const fetchMenuData = useCallback(async () => {
    const token = getToken();
    if (!token || !isAuthenticated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMenu(token);
      setMenuData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useMenu] Error fetching menu:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isAuthenticated]);

  // -------------------------------------------------------------------------
  // Initial fetch
  // -------------------------------------------------------------------------
  useEffect(() => {
    const token = getToken();
    if (isAuthenticated && token && !menuData && !isLoading) {
      fetchMenuData();
    }
  }, [isAuthenticated, getToken, menuData, isLoading, fetchMenuData]);

  // -------------------------------------------------------------------------
  // Memoized accessors
  // -------------------------------------------------------------------------
  const routeAccessMap = useMemo(() => {
    if (!menuData?.accessibleRoutes) return new Map<string, AccessibleRoute>();
    
    const map = new Map<string, AccessibleRoute>();
    for (const route of menuData.accessibleRoutes) {
      map.set(route.route, route);
    }
    return map;
  }, [menuData?.accessibleRoutes]);

  const moduleMap = useMemo(() => {
    if (!menuData?.menu) return new Map<string, MenuModule>();
    
    const map = new Map<string, MenuModule>();
    for (const module of menuData.menu) {
      map.set(module.code, module);
    }
    return map;
  }, [menuData?.menu]);

  // -------------------------------------------------------------------------
  // Helper functions
  // -------------------------------------------------------------------------
  const canAccessRoute = useCallback((route: string): boolean => {
    const access = routeAccessMap.get(route);
    return access?.canView ?? false;
  }, [routeAccessMap]);

  const canEditRoute = useCallback((route: string): boolean => {
    const access = routeAccessMap.get(route);
    return access?.canEdit ?? false;
  }, [routeAccessMap]);

  const getModuleByCode = useCallback((code: string): MenuModule | undefined => {
    return moduleMap.get(code);
  }, [moduleMap]);

  const getPagesForModule = useCallback((moduleCode: string): MenuPage[] => {
    const module = moduleMap.get(moduleCode);
    return module?.pages ?? [];
  }, [moduleMap]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    menu: menuData?.menu ?? [],
    accessibleRoutes: menuData?.accessibleRoutes ?? [],
    isLoading,
    error,
    role: menuData?.role ?? user?.role ?? null,
    refetch: fetchMenuData,
    canAccessRoute,
    canEditRoute,
    getModuleByCode,
    getPagesForModule,
  };
}

// ============================================================================
// Context Provider (Optional - for avoiding prop drilling)
// ============================================================================

const MenuContext = createContext<UseMenuResult | null>(null);

export function MenuProvider({ children }: { children: ReactNode }) {
  const menuResult = useMenu();
  
  return React.createElement(
    MenuContext.Provider,
    { value: menuResult },
    children
  );
}

export function useMenuContext(): UseMenuResult {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenuContext must be used within a MenuProvider');
  }
  return context;
}

export default useMenu;
