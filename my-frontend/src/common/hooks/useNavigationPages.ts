/**
 * Shared hook for navigation pages with permission checking
 * Used by both DynamicSidebar and Dock components
 */

'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { safeFetch } from '@/lib/safeFetch';
import { useAuth } from '@/common/hooks/useAuth';
import {
  PAGE_REGISTRY,
  type PageMetadata,
} from '@/common/config/page-registry';

// DEBUG: allow slicing the registry during build to isolate problematic pages.
const REGISTRY: PageMetadata[] = (() => {
  try {
    const ds = process.env.DEBUG_REGISTRY_SLICE;
    if (!ds) return PAGE_REGISTRY;
    const half = Math.ceil(PAGE_REGISTRY.length / 2);
    if (ds === '1') return PAGE_REGISTRY.slice(0, half);
    if (ds === '2') return PAGE_REGISTRY.slice(half);
    return PAGE_REGISTRY;
  } catch (e) {
    return PAGE_REGISTRY;
  }
})();

export interface NavigationPage {
  id: string;
  name: string;
  path: string;
  iconKey?: string;
  module: string;
  isActive: boolean;
  order: number;
}

interface UseNavigationPagesResult {
  pages: NavigationPage[];
  isLoading: boolean;
  userAllowedPages: string[];
  isSuperAdmin: boolean;
  isEnterpriseAdmin: boolean;
  user: any;
}

export function useNavigationPages(): UseNavigationPagesResult {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const [userAllowedPages, setUserAllowedPages] = useState<string[]>([]);
  const [superAdminModules, setSuperAdminModules] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // Check if user is Super Admin
  const isSuperAdmin = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'SUPER_ADMIN';
  }, [user?.roleName, user?.role]);

  // Check if user is Enterprise Admin
  const isEnterpriseAdmin = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'ENTERPRISE_ADMIN';
  }, [user?.roleName, user?.role]);

  // Fetch user permissions from database
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchUserPermissions = async () => {
      if (authLoading) return;
      
      if (!user?.id) {
        if (isMounted) setIsLoadingPermissions(false);
        return;
      }

      // Enterprise Admin: Set enterprise modules directly
      if (isEnterpriseAdmin) {
        if (isMounted) {
          setSuperAdminModules(['enterprise-management']);
          setUserAllowedPages([]);
          setIsLoadingPermissions(false);
        }
        return;
      }

      // Super Admin: Fetch assigned modules from backend
      if (isSuperAdmin) {
        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
          const response = await safeFetch(`${baseURL}/api/auth/me/permissions`, {
            credentials: 'include',
            timeoutMs: 8000,
            signal: abortController.signal,
          });

          if (!isMounted) return;
          
          if (response.ok) {
            const result = await response.json();
            const assignedModules = result.user?.permissions?.assignedModules || [];
            const pagePermissions = result.user?.permissions?.pagePermissions || {};
            
            if (isMounted) {
              setSuperAdminModules(assignedModules);
              const allowedPageKeys: string[] = [];
              Object.entries(pagePermissions).forEach(([, pages]) => {
                if (Array.isArray(pages)) {
                  allowedPageKeys.push(...pages);
                }
              });
              setUserAllowedPages(allowedPageKeys);
            }
          } else {
            if (isMounted) setUserAllowedPages([]);
          }
        } catch (error: any) {
          if (error?.name === 'AbortError') return;
          if (isMounted) setUserAllowedPages([]);
        }
        if (isMounted) setIsLoadingPermissions(false);
        return;
      }

      // Regular users: Fetch page permissions from database
      try {
        const response = await safeFetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
          timeoutMs: 8000,
          signal: abortController.signal,
        });

        if (!isMounted) return;

        if (response.ok) {
          const result = await response.json();
          const allowedPages = result.data?.allowedPages || result.allowedPages || [];
          if (isMounted) setUserAllowedPages(allowedPages);
        } else {
          if (isMounted) setUserAllowedPages([]);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        if (isMounted) setUserAllowedPages([]);
      } finally {
        if (isMounted) setIsLoadingPermissions(false);
      }
    };

    fetchUserPermissions();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id, isSuperAdmin, isEnterpriseAdmin, authLoading]);

  // Helper function to check if a page is allowed
  const isPageAllowed = useCallback((page: PageMetadata, allowedPages: string[]): boolean => {
    if (allowedPages.includes(page.id)) return true;
    
    const pathId = page.path.replace(/^\//, '').replace(/\//g, '-');
    if (allowedPages.includes(pathId)) return true;
    
    const lastSegment = page.path.split('/').filter(Boolean).pop();
    if (lastSegment && allowedPages.includes(lastSegment)) return true;
    
    const withoutModulePrefix = page.id.replace(/^(common|admin|super-admin|billing)-/, '');
    if (allowedPages.includes(withoutModulePrefix)) return true;
    
    return false;
  }, []);

  // Compute visible pages with permission filtering
  const pages = useMemo<NavigationPage[]>(() => {
    if (!user) return [];

    const userRole = user.role || user.roleName || '';

    // Filter by status === 'active' AND showInSidebar !== false
    let filteredPages = REGISTRY.filter(p => p.status === 'active' && p.showInSidebar !== false);

    if (isEnterpriseAdmin) {
      filteredPages = filteredPages.filter(p => 
        p.path.startsWith('/enterprise') || p.roles.includes('ENTERPRISE_ADMIN')
      );
    } else if (isSuperAdmin) {
      const corePageIds = ['super-admin-dashboard'];
      filteredPages = filteredPages.filter(p => 
        isPageAllowed(p, userAllowedPages) || 
        corePageIds.includes(p.id) ||
        (p.module === 'super-admin' && p.roles.includes('SUPER_ADMIN')) ||
        p.roles.includes('ALL')
      );
    } else {
      // Regular users: explicitly allowed pages from DB OR common pages
      filteredPages = filteredPages.filter(p => {
        if (p.roles.includes('ALL')) return true;
        if (p.roles.includes(userRole)) return true;
        return isPageAllowed(p, userAllowedPages);
      });
    }

    // Non-enterprise users should not see enterprise pages
    if (!isEnterpriseAdmin) {
      filteredPages = filteredPages.filter(p => !p.path.startsWith('/enterprise'));
    }

    // Sort by explicit order then name
    filteredPages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

    // Map to NavigationPage format
    return filteredPages.map(p => ({
      id: p.id,
      name: p.name,
      path: p.path,
      iconKey: p.iconKey,
      module: p.module,
      isActive: pathname === p.path || (pathname?.startsWith(`${p.path}/`) ?? false),
      order: p.order ?? 999,
    }));
  }, [user, userAllowedPages, isSuperAdmin, isEnterpriseAdmin, pathname, isPageAllowed]);

  return {
    pages,
    isLoading: authLoading || isLoadingPermissions,
    userAllowedPages,
    isSuperAdmin,
    isEnterpriseAdmin,
    user,
  };
}
