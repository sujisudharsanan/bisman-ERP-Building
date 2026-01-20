/**
 * useSidebarMenu Hook
 * 
 * Fetches sidebar menu from backend database (/api/menu/sidebar)
 * Falls back to PAGE_REGISTRY if API fails (temporary migration support)
 * 
 * This is the SINGLE SOURCE OF TRUTH for sidebar navigation.
 * All access control is enforced by the backend.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/common/hooks/useAuth';
import { getPageUIMeta, mergeWithUIMeta } from '@/common/config/page-ui-meta';

export interface MenuItem {
  id: string;
  name: string;
  path: string;
  iconKey: string;
  order: number;
  description?: string;
}

export interface MenuModule {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface SidebarMenuData {
  modules: MenuModule[];
  flatItems: MenuItem[];
  totalItems: number;
  menuType: 'admin' | 'user';
  source: 'database' | 'fallback';
}

interface UseSidebarMenuReturn {
  menu: SidebarMenuData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Cache key for sessionStorage
const CACHE_KEY = 'sidebar_menu_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useSidebarMenu(): UseSidebarMenuReturn {
  const { user, loading: authLoading } = useAuth();
  const [menu, setMenu] = useState<SidebarMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to load from cache first
      const cacheKey = `${CACHE_KEY}_${user.id}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          console.log('[useSidebarMenu] Using cached menu');
          setMenu(data);
          setLoading(false);
          return;
        }
      }

      // Fetch from backend API
      const response = await fetch('/api/menu/sidebar', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'API returned error');
      }

      // Merge with UI metadata for icons/descriptions
      const modulesWithMeta = result.modules.map((mod: MenuModule) => ({
        ...mod,
        items: mergeWithUIMeta(mod.items),
      }));

      const menuData: SidebarMenuData = {
        modules: modulesWithMeta,
        flatItems: mergeWithUIMeta(result.flatItems || []),
        totalItems: result.totalItems || 0,
        menuType: result.menuType || 'user',
        source: 'database',
      };

      // Cache the result
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: menuData,
        timestamp: Date.now(),
      }));

      setMenu(menuData);
      console.log('[useSidebarMenu] Loaded menu from database:', menuData.totalItems, 'items');

    } catch (err) {
      console.error('[useSidebarMenu] Failed to fetch menu from API:', err);
      setError(err instanceof Error ? err.message : 'Failed to load menu');
      
      // Fallback to PAGE_REGISTRY (temporary - for migration)
      await loadFallbackMenu();
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fallback: Load from PAGE_REGISTRY (to be removed after migration)
  const loadFallbackMenu = useCallback(async () => {
    console.warn('[useSidebarMenu] Using PAGE_REGISTRY fallback - this should be temporary');
    
    try {
      const { PAGE_REGISTRY, MODULES } = await import('@/common/config/page-registry');
      
      const userRole = (user?.role || user?.roleName || '').toUpperCase();
      const isAdmin = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(userRole);
      
      // Filter pages by admin scope
      let filteredPages = PAGE_REGISTRY.filter(page => {
        if (page.status !== 'active') return false;
        if (page.showInSidebar === false) return false;
        
        if (isAdmin) {
          const prefix = userRole === 'SUPER_ADMIN' ? 'super-admin' : 'enterprise-admin';
          return page.path.includes(prefix) || page.module === 'common';
        }
        
        return true;
      });

      // Group by module
      const moduleMap = new Map<string, MenuItem[]>();
      
      for (const page of filteredPages) {
        const moduleName = page.module || 'common';
        if (!moduleMap.has(moduleName)) {
          moduleMap.set(moduleName, []);
        }
        
        const meta = getPageUIMeta(page.id);
        moduleMap.get(moduleName)!.push({
          id: page.id,
          name: page.name,
          path: page.path,
          iconKey: page.iconKey || meta.iconKey,
          order: page.order || 0,
          description: page.description || meta.description,
        });
      }

      // Convert to modules array
      const modules: MenuModule[] = [];
      for (const [moduleId, items] of moduleMap) {
        const moduleInfo = MODULES[moduleId as keyof typeof MODULES];
        modules.push({
          id: moduleId,
          name: moduleInfo?.name || moduleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          items: items.sort((a, b) => a.order - b.order),
        });
      }

      const menuData: SidebarMenuData = {
        modules,
        flatItems: filteredPages.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          iconKey: p.iconKey || getPageUIMeta(p.id).iconKey,
          order: p.order || 0,
          description: p.description,
        })),
        totalItems: filteredPages.length,
        menuType: isAdmin ? 'admin' : 'user',
        source: 'fallback',
      };

      setMenu(menuData);
      setError('Using fallback menu - database menu unavailable');
      
    } catch (fallbackErr) {
      console.error('[useSidebarMenu] Fallback also failed:', fallbackErr);
      setError('Failed to load any menu');
    }
  }, [user?.role, user?.roleName]);

  // Fetch menu when user changes
  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchMenu();
    } else if (!authLoading && !user?.id) {
      setMenu(null);
      setLoading(false);
    }
  }, [authLoading, user?.id, fetchMenu]);

  // Clear cache on logout
  useEffect(() => {
    if (!user?.id) {
      const keys = Object.keys(sessionStorage).filter(k => k.startsWith(CACHE_KEY));
      keys.forEach(k => sessionStorage.removeItem(k));
    }
  }, [user?.id]);

  return {
    menu,
    loading,
    error,
    refetch: fetchMenu,
  };
}

export default useSidebarMenu;
