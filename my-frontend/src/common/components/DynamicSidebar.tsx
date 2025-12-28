/**
 * Dynamic Sidebar Navigation
 * Automatically generates navigation from page registry based on user permissions from database
 */

"use client";

import React, { useMemo, useEffect, useState } from 'react';
import { hasFullAdmin } from '../../constants/roles';
import { safeFetch } from '@/lib/safeFetch';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Circle, AlertCircle } from 'lucide-react';
import { safeComponent } from '@/lib/safeComponent';
import { useAuth } from '@/common/hooks/useAuth';
import { getRoleDisplayName } from '@/utils/roleDisplay';
import {
  PAGE_REGISTRY,
  type PageMetadata,
} from '@/common/config/page-registry';

// DEBUG: allow slicing the registry during build to isolate problematic pages.
// Set DEBUG_REGISTRY_SLICE=1 to use the first half, =2 to use the second half.
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

interface DynamicSidebarProps {
  className?: string;
  collapsed?: boolean;
}

// Runtime icon map loaded client-side (lucide-react). We avoid SSR import.
type IconComponent = React.ComponentType<any> | undefined;

export default function DynamicSidebar({ className = '', collapsed = false }: DynamicSidebarProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [userAllowedPages, setUserAllowedPages] = useState<string[]>([]);
  const [superAdminModules, setSuperAdminModules] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [iconMap, setIconMap] = useState<Record<string, IconComponent>>({});
  
  // Magnification effect state (macOS Dock style)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // Cache permissions in sessionStorage for faster subsequent loads
  // Version 2: Added to invalidate old cache with incorrect ADMIN permissions for Client Management
  const cacheKey = user?.id ? `sidebar_perms_v2_${user.id}` : null;
  
  // Clear old cache keys on mount
  useEffect(() => {
    if (user?.id && typeof localStorage !== 'undefined') {
      // Remove old cache key format
      try {
        localStorage.removeItem(`sidebar_perms_${user.id}`);
      } catch (e) {}
    }
  }, [user?.id]);

  // Load lucide-react icons once on client to resolve registry icon keys (strings)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return; // safety
      try {
        const mod = await import('lucide-react');
        if (!mounted) return;
        // Build a map of all exports that look like icon components (capitalized)
        const map: Record<string, IconComponent> = {};
        Object.keys(mod).forEach(k => {
          // Basic heuristic: exported key starts with uppercase letter
          if (/^[A-Z]/.test(k)) {
            // @ts-ignore dynamic access
            map[k] = (mod as any)[k];
          }
        });
        setIconMap(map);
      } catch (e) {
        // Silently ignore; fallback icons will be used
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Check if user is Super Admin (only SUPER_ADMIN, not ADMIN which is tenant-level)
  const isSuperAdmin = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'SUPER_ADMIN';
  }, [user?.roleName, user?.role]);

  // Fetch user permissions from database
  useEffect(() => {
    // Create abort controller for cleanup
    const abortController = new AbortController();
    let isMounted = true;

    const fetchUserPermissions = async () => {
      // Wait for auth to complete loading before checking user
      if (authLoading) {
        return; // Don't do anything while auth is loading
      }
      
      if (!user?.id) {
        if (isMounted) setIsLoadingPermissions(false);
        // Don't redirect from sidebar - let the page handle auth redirects
        return;
      }

      // Try to load from localStorage cache first for instant display (persists across logout)
      if (cacheKey && typeof localStorage !== 'undefined') {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const { pages, modules, timestamp } = JSON.parse(cached);
            // Cache valid for 24 hours (persists across sessions for faster login)
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
              console.log('[Sidebar] Using localStorage cached permissions (instant load)');
              if (isMounted) {
                setUserAllowedPages(pages || []);
                setSuperAdminModules(modules || []);
                setIsLoadingPermissions(false);
              }
              
              // Background refresh if cache is older than 5 minutes (stale-while-revalidate pattern)
              if (Date.now() - timestamp > 5 * 60 * 1000) {
                console.log('[Sidebar] Cache stale, refreshing in background...');
                // Continue to fetch fresh data in background (don't return)
              } else {
                return; // Cache is fresh, skip API call
              }
            }
          }
        } catch (e) {
          // Ignore cache errors
        }
      }

      // Enterprise Admin: Set enterprise modules directly
      if (user.role === 'ENTERPRISE_ADMIN' || user?.roleName === 'ENTERPRISE_ADMIN') {
        console.log('[Sidebar] Enterprise Admin detected - setting enterprise modules');
        if (isMounted) {
          setSuperAdminModules(['enterprise-management']);
          setUserAllowedPages([]); // Enterprise admin doesn't use page-level permissions
          setIsLoadingPermissions(false);
          // Cache it in localStorage (persists across logout)
          if (cacheKey) {
            try {
              localStorage.setItem(cacheKey, JSON.stringify({
                pages: [],
                modules: ['enterprise-management'],
                timestamp: Date.now()
              }));
            } catch (e) {}
          }
        }
        return;
      }

      // Super Admin: Fetch assigned modules from backend
      if (isSuperAdmin) {
        console.log('[Sidebar] Super Admin detected - fetching assigned modules');
        try {
          // Use relative URL when NEXT_PUBLIC_API_URL is not set (same-origin in Railway)
          const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
          const response = await safeFetch(`${baseURL}/api/auth/me/permissions`, {
            credentials: 'include',
            timeoutMs: 3000, // Reduced timeout for faster failure
            signal: abortController.signal,
          });

          if (!isMounted) return;
          
          if (response.ok) {
            const result = await response.json();
            console.log('[Sidebar] Super Admin permissions:', result);
            
            const assignedModules = result.user?.permissions?.assignedModules || [];
            const pagePermissions = result.user?.permissions?.pagePermissions || {};
            if (isMounted) {
              setSuperAdminModules(assignedModules);
            
              // Use specific page permissions from Enterprise Admin assignment
              // Only grant pages that are explicitly assigned, not all pages from modules
              const allowedPageKeys: string[] = [];
              Object.entries(pagePermissions).forEach(([moduleName, pages]) => {
                if (Array.isArray(pages)) {
                  allowedPageKeys.push(...pages);
                }
              });
            
              console.log('[Sidebar] Assigned modules:', assignedModules);
              console.log('[Sidebar] Page permissions by module:', pagePermissions);
              console.log('[Sidebar] Allowed pages:', allowedPageKeys.length, allowedPageKeys);
              setUserAllowedPages(allowedPageKeys);
              
              // Cache the result in localStorage (persists across logout)
              if (cacheKey) {
                try {
                  localStorage.setItem(cacheKey, JSON.stringify({
                    pages: allowedPageKeys,
                    modules: assignedModules,
                    timestamp: Date.now()
                  }));
                } catch (e) {}
              }
            }
          } else {
            console.error('[Sidebar] Failed to fetch Super Admin permissions:', response.status);
            // Security: DO NOT grant access if API fails - show empty sidebar
            if (isMounted) setUserAllowedPages([]);
          }
        } catch (error: any) {
          // Ignore abort errors - they're expected during cleanup
          if (error?.name === 'AbortError') return;
          console.error('[Sidebar] Error fetching Super Admin permissions:', error);
          // Security: DO NOT grant access if API fails - show empty sidebar
          if (isMounted) setUserAllowedPages([]);
        }
        if (isMounted) setIsLoadingPermissions(false);
        return;
      }

      // Regular users: Fetch page permissions from database
      try {
        // Use relative URL to leverage Next.js API proxy
        const response = await safeFetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
          timeoutMs: 3000, // Reduced timeout for faster failure
          signal: abortController.signal,
        });

        if (!isMounted) return;

        if (response.ok) {
          const result = await response.json();
          console.log('[Sidebar] User permissions from DB:', result);
          
          // Backend returns: { success: true, data: { userId, allowedPages } }
          const allowedPages = result.data?.allowedPages || result.allowedPages || [];
          console.log('[Sidebar] Extracted allowed pages:', allowedPages);
          if (isMounted) {
            setUserAllowedPages(allowedPages);
            // Cache the result in localStorage (persists across logout for faster next login)
            if (cacheKey) {
              try {
                localStorage.setItem(cacheKey, JSON.stringify({
                  pages: allowedPages,
                  modules: [],
                  timestamp: Date.now()
                }));
              } catch (e) {}
            }
          }
        } else {
          console.error('[Sidebar] Failed to fetch permissions:', response.status);
          if (isMounted) setUserAllowedPages([]);
        }
      } catch (error: any) {
        // Ignore abort errors - they're expected during cleanup
        if (error?.name === 'AbortError') return;
        console.error('[Sidebar] Error fetching permissions:', error);
        if (isMounted) setUserAllowedPages([]);
      } finally {
        if (isMounted) setIsLoadingPermissions(false);
      }
    };

    fetchUserPermissions();
    
    // Cleanup function to abort fetch and prevent state updates
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.id, user?.role, user?.roleName, isSuperAdmin, authLoading, cacheKey]);

  // Get user permissions based on database permissions
  const userPermissions = useMemo(() => {
    if (!user) return [];
    
    const perms = new Set<string>();
    
    // All authenticated users automatically get 'authenticated' permission
    // This allows access to common module pages
    perms.add('authenticated');
    
    // Match allowed pages from database with PAGE_REGISTRY
  REGISTRY.forEach(page => {
      // Check if this page key is in user's allowed pages
      if (userAllowedPages.includes(page.id)) {
        // Add all permissions from this page
        page.permissions.forEach(perm => perms.add(perm));
      }
    });
    
    console.log('[Sidebar] Allowed pages:', userAllowedPages.length);
    console.log('[Sidebar] Final permissions:', Array.from(perms));
    console.log('[Sidebar] Is Super Admin:', isSuperAdmin);
    return Array.from(perms);
  }, [user, userAllowedPages, isSuperAdmin]);

  // Redirect to access denied page if user has no permissions (except Super Admin)
  // Note: Users with only 'authenticated' permission (common pages) should NOT be redirected
  useEffect(() => {
    if (!isLoadingPermissions && userPermissions.length === 0 && user?.id && !isSuperAdmin) {
      // Only redirect if not already on access-denied page
      if (!pathname?.includes('access-denied') && !pathname?.includes('auth')) {
        // Use replace to avoid showing content before redirect
        router.replace('/access-denied');
      }
    }
  }, [isLoadingPermissions, userPermissions, user?.id, pathname, router, isSuperAdmin]);

  // Helper function to check if a page is allowed based on various matching strategies
  const isPageAllowed = (page: PageMetadata, allowedPages: string[]): boolean => {
    // Direct ID match
    if (allowedPages.includes(page.id)) return true;
    
    // Derive ID from path: /admin/dashboard -> admin-dashboard
    const pathId = page.path.replace(/^\//, '').replace(/\//g, '-');
    if (allowedPages.includes(pathId)) return true;
    
    // Also check just the last segment: /admin/dashboard -> dashboard
    const lastSegment = page.path.split('/').filter(Boolean).pop();
    if (lastSegment && allowedPages.includes(lastSegment)) return true;
    
    // Check without module prefix: common-help-center -> help-center
    const withoutModulePrefix = page.id.replace(/^(common|admin|super-admin|billing)-/, '');
    if (allowedPages.includes(withoutModulePrefix)) return true;
    
    return false;
  };

  // Compute a FLAT list of visible pages (no module headers), per requirements
  const visiblePages = useMemo<PageMetadata[]>(() => {
    if (!user) return [];

    const isEnterprise = user.role === 'ENTERPRISE_ADMIN' || user.roleName === 'ENTERPRISE_ADMIN';
    const userRole = user.role || user.roleName || '';

  // Filter by status === 'active' AND showInSidebar !== false
  let pages = REGISTRY.filter(p => p.status === 'active' && p.showInSidebar !== false);

    if (isEnterprise) {
      // Enterprise Admin: enterprise-specific pages only
      pages = pages.filter(p => p.path.startsWith('/enterprise') || p.roles.includes('ENTERPRISE_ADMIN'));
    } else if (isSuperAdmin) {
      // Super Admin: Pages explicitly assigned by Enterprise Admin
      // PLUS core essential pages that should always be visible
      const corePageIds = [
        'super-admin-dashboard', // Dashboard must always show
      ];
      pages = pages.filter(p => 
        isPageAllowed(p, userAllowedPages) || 
        corePageIds.includes(p.id) ||
        (p.module === 'super-admin' && p.roles.includes('SUPER_ADMIN')) ||
        // Always show pages with roles: ['ALL'] (common pages for all authenticated users)
        p.roles.includes('ALL')
      );
      console.log('[Sidebar] Super Admin allowed pages:', userAllowedPages);
    } else {
      // Regular users: Permission model
      // Show pages that are:
      // 1. Explicitly allowed in DB (userAllowedPages from rbac_user_permissions)
      // 2. OR common pages with roles: ['ALL'] that everyone can see
      // 3. OR pages that match the user's role (e.g., ADMIN can see pages with roles: ['ADMIN'])
      pages = pages.filter(p => {
        // Always include pages with roles: ['ALL'] (common pages for all authenticated users)
        // These are non-privileged pages like help center, profile, etc.
        if (p.roles.includes('ALL')) return true;
        
        // Check if page's roles include the user's role
        // This allows Admin users to see pages with roles: ['ADMIN']
        const normalizedUserRole = userRole.toUpperCase().replace(/\s+/g, '_');
        if (p.roles.some(role => role.toUpperCase().replace(/\s+/g, '_') === normalizedUserRole)) return true;
        
        // Check if page is explicitly allowed in DB
        // This is the secondary access control - Super Admin grants specific pages
        return isPageAllowed(p, userAllowedPages);
      });
      
      // Debug: Log what we're matching (show more items for debugging)
      console.log('[Sidebar] Visible pages for user:', pages.map(p => p.id));
      console.log('[Sidebar] DB allowed pages:', userAllowedPages);
      console.log('[Sidebar] Total visible pages count:', pages.length);
    }

    // Non-enterprise users should not see enterprise pages
    if (!isEnterprise) {
      pages = pages.filter(p => !p.path.startsWith('/enterprise'));
    }

    // Non-super-admin users should not see /super-admin/* pages
    // But /system/* pages can be accessed by users whose role is in the page's roles list
    if (!isSuperAdmin && !isEnterprise) {
      pages = pages.filter(p => {
        // Always block /super-admin/* pages for non-super-admin users
        if (p.path.startsWith('/super-admin')) return false;
        
        // For /system/* pages, allow if user's role is in the page's roles
        if (p.path.startsWith('/system')) {
          const normalizedUserRole = userRole.toUpperCase().replace(/\s+/g, '_');
          return p.roles.some(role => role.toUpperCase().replace(/\s+/g, '_') === normalizedUserRole) ||
                 p.roles.includes('ALL') ||
                 isPageAllowed(p, userAllowedPages);
        }
        
        return true;
      });
    }

    // Sort by explicit order then name
    pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    
    // Deduplicate pages by id AND by name (prevent duplicate entries in sidebar)
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const uniquePages = pages.filter(p => {
      if (seenIds.has(p.id)) return false;
      // Also deduplicate by name - if same name appears twice, keep only the first
      if (seenNames.has(p.name)) return false;
      seenIds.add(p.id);
      seenNames.add(p.name);
      return true;
    });
    
    return uniquePages;
  }, [user, userAllowedPages, isSuperAdmin, superAdminModules]);

  // Remove toggle function - modules will always be expanded
  // const toggleModule = (moduleId: string) => {
  //   setExpandedModules(prev => {
  //     const next = new Set(prev);
  //     if (next.has(moduleId)) {
  //       next.delete(moduleId);
  //     } else {
  //       next.add(moduleId);
  //     }
  //     return next;
  //   });
  // };

  // Check if current path matches
  // Special handling for dashboard paths to prevent them from matching child routes
  const isActivePath = (path: string) => {
    // Dashboard paths should only match exactly, not as prefix
    const dashboardPaths = ['/super-admin', '/admin', '/enterprise-admin', '/dashboard'];
    const isDashboardPath = dashboardPaths.includes(path);
    
    if (isDashboardPath) {
      // Dashboard only highlights on exact match
      return pathname === path;
    }
    
    // For other paths, match exactly or as prefix
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  // Determine user's primary dashboard path by role
  const dashboardPath = useMemo(() => {
    const role = String(user?.roleName || user?.role || '').toUpperCase();
    
    // Super Admin / Admin roles
    if (hasFullAdmin(role)) return '/admin';
    if (role === 'ENTERPRISE_ADMIN') return '/enterprise-admin/dashboard';
    if (role === 'ADMIN') return '/admin';
    
    // Role-specific dashboards
    const rolePathMap: Record<string, string> = {
      'CFO': '/cfo-dashboard',
      'FINANCE_CONTROLLER': '/finance-controller',
      'TREASURY': '/treasury',
      'ACCOUNTS': '/accounts',
      'ACCOUNTS_PAYABLE': '/accounts-payable',
      'OPERATIONS_MANAGER': '/operations-manager',
      'STORE_INCHARGE': '/store-incharge',
      'HUB_INCHARGE': '/hub-incharge',
      'STAFF': '/staff',
      'BANKER': '/banker',
      'COMPLIANCE': '/compliance-officer',
      'COMPLIANCE_OFFICER': '/compliance-officer',
      'LEGAL': '/legal',
      'IT_ADMIN': '/it-admin',
      'PROCUREMENT_OFFICER': '/procurement-officer',
    };
    
    return rolePathMap[role] || '/dashboard';
  }, [user?.roleName, user?.role]);

  // Get module color classes
  const getModuleColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
      green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
      purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
      orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
      red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    };
    return colorMap[color] || colorMap.blue;
  };

  // Render page status badge
  const renderStatusBadge = (page: PageMetadata) => {
    if (page.status === 'coming-soon') {
      return (
        <span className="ml-auto flex items-center space-x-1 text-xs text-gray-400 dark:text-gray-500">
          {/* Fallback Alert icon for SSR-safe rendering */}
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Soon</span>
        </span>
      );
    }
    if (page.status === 'disabled') {
      return (
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
          Disabled
        </span>
      );
    }
    if (page.badge) {
      return (
        <span className="ml-auto px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded">
          {page.badge}
        </span>
      );
    }
    return null;
  };

  // Render individual page link with magnification effect
  const renderPageLink = (page: PageMetadata, index: number) => {
    const isActive = isActivePath(page.path);
    const isDisabled = page.status === 'disabled' || page.status === 'coming-soon';

    // Resolve icon using iconKey string from registry (lucide component name)
    let Icon: any = undefined;
    if (page.iconKey) {
      const key = page.iconKey;
      Icon = iconMap[key] || iconMap[key.replace(/[-_](\w)/g, (_: any, c: string) => c.toUpperCase())] || undefined;
    }
    // Guard icon component
    Icon = safeComponent(Icon || Circle, page.iconKey || page.id, 'DynamicSidebar');

    // Calculate magnification scale based on distance from hovered item (macOS Dock style)
    const getMagnificationStyle = () => {
      if (!collapsed || hoveredIndex === null) return {};
      
      const distance = Math.abs(index - hoveredIndex);
      
      // Scale factors: hovered = 1.35, adjacent = 1.15, two away = 1.05
      let scale = 1;
      if (distance === 0) scale = 1.35;
      else if (distance === 1) scale = 1.15;
      else if (distance === 2) scale = 1.05;
      
      return {
        transform: `scale(${scale})`,
        zIndex: distance === 0 ? 10 : 5 - distance,
      };
    };

    // Collapsed mode - icon only with magnification effect
    if (collapsed) {
      const baseClasses = `
        group relative flex items-center justify-center w-11 h-11 mx-auto rounded-2xl 
        transition-all duration-200 ease-out cursor-pointer origin-center
        ${isActive
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
          : isDisabled
          ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
          : 'text-gray-500 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-600 hover:text-white hover:shadow-xl hover:shadow-blue-500/25'
        }
      `;

      const tooltipElement = (
        <span className="
          absolute left-full ml-4 px-3 py-2 
          bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-100
          text-white dark:text-gray-900 
          text-xs font-semibold rounded-xl 
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          pointer-events-none
          transition-all duration-300 ease-out
          whitespace-nowrap z-50
          shadow-2xl shadow-black/20
          -translate-x-2 group-hover:translate-x-0
          backdrop-blur-sm
        ">
          {page.name}
          <span className="absolute left-0 top-1/2 -translate-x-[6px] -translate-y-1/2 
            w-3 h-3 bg-gray-900 dark:bg-white rotate-45 rounded-sm" />
        </span>
      );

      if (isDisabled) {
        return (
          <div 
            key={page.id} 
            className={baseClasses}
            style={getMagnificationStyle()}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <Icon className="w-5 h-5" />
            {tooltipElement}
          </div>
        );
      }

      return (
        <Link 
          key={page.id} 
          href={page.path} 
          className={baseClasses}
          style={getMagnificationStyle()}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <Icon className="w-5 h-5 transition-transform duration-200" />
          {tooltipElement}
        </Link>
      );
    }

    // Expanded mode - full link with enhanced hover effects
    const linkClasses = `
      group flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs 
      transition-all duration-200 ease-out
      ${isActive
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-md shadow-blue-500/20'
        : isDisabled
        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-800/50 hover:text-gray-900 dark:hover:text-white hover:translate-x-1 hover:shadow-sm'
      }
    `;

    const content = (
      <>
        {/* Render icon safely; fallback to Circle if missing or invalid */}
        {(() => {
          // @ts-ignore guarded icon is always renderable
          return <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${!isActive && !isDisabled ? 'group-hover:scale-110 group-hover:rotate-6' : ''}`} />;
        })()}
        <span className="flex-1 truncate">{page.name}</span>
        {renderStatusBadge(page)}
      </>
    );

    if (isDisabled) {
      return (
        <div key={page.id} className={linkClasses} title={page.description}>
          {content}
        </div>
      );
    }

    return (
      <Link key={page.id} href={page.path} className={linkClasses} title={page.description}>
        {content}
      </Link>
    );
  };

  // Module rendering removed per requirement: no module names, flat page list

  // Get profile picture URL
  const getProfilePicUrl = () => {
    if (!user) return null;
    const rawUrl = (user as any)?.profile_pic_url || (user as any)?.profilePicUrl || (user as any)?.avatarUrl;
    if (!rawUrl) return null;
    if (rawUrl.startsWith('/api/')) return rawUrl;
    if (rawUrl.startsWith('/uploads/')) {
      return rawUrl.replace('/uploads/', '/api/secure-files/');
    }
    return rawUrl;
  };

  const profilePicUrl = getProfilePicUrl();

  // Check if current page is a dashboard or user settings - hide profile on these pages
  const hideProfileInSidebar = pathname === '/hub-incharge' || 
                          pathname === '/super-admin' || 
                          pathname === '/admin' || 
                          pathname === '/enterprise-admin/dashboard' ||
                          pathname === '/admin' ||
                          pathname === '/enterprise-admin' ||
                          pathname === '/cfo-dashboard' ||
                          pathname === '/dashboard' ||
                          pathname === '/common/about-me' ||
                          pathname?.startsWith('/user-settings') ||
                          pathname?.startsWith('/common/user-settings');

  // Check if user has access to about-me page
  const hasAboutMeAccess = useMemo(() => {
    // Enterprise Admin always has access
    const isEnterprise = user?.role === 'ENTERPRISE_ADMIN' || user?.roleName === 'ENTERPRISE_ADMIN';
    if (isEnterprise) return true;
    // Check if about-me page is in allowed pages
    return userAllowedPages.includes('about-me') || userAllowedPages.includes('common-about-me');
  }, [user?.role, user?.roleName, userAllowedPages]);

  return (
    <div className={`py-3 ${className}`}>
      {/* User Profile Section - Only show if user has access to about-me page and not collapsed */}
      {!collapsed && user && !hideProfileInSidebar && hasAboutMeAccess && (
        <div className="px-2 mb-3">
          <div 
            className="flex items-center gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => router.push('/common/about-me')}
            title="View profile"
          >
            {/* Profile Picture */}
            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden relative">
              {profilePicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={profilePicUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const fallbackName = String(user?.name || user?.username || user?.email || 'User');
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName)}&background=random`;
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {(user?.name || user?.username || user?.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user?.username 
                  ? user.username.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                  : user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.roleName?.replace(/_/g, ' ') || user?.role?.replace(/_/g, ' ') || 'User'}
              </p>
            </div>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 mt-2"></div>
        </div>
      )}

      {/* Loading State - show while auth is loading OR permissions are loading */}
      {(authLoading || isLoadingPermissions) && (
        <div className={`${collapsed ? 'px-1 py-4' : 'px-3 py-8'} text-center`}>
          <div className={`animate-spin ${collapsed ? 'w-6 h-6' : 'w-8 h-8'} border-4 border-blue-600 border-t-transparent rounded-full mx-auto ${collapsed ? '' : 'mb-3'}`} />
          {!collapsed && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading your permissions...
            </p>
          )}
        </div>
      )}

      {/* Flat page list (no module headers) */}
      {!authLoading && !isLoadingPermissions && (
        <div 
          className={`${collapsed ? 'space-y-1 py-2' : 'space-y-0.5 px-1.5'}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Dashboard is now part of visiblePages - no hardcoded shortcut */}
          {/* Only show pages that user has explicit permission for */}
          {visiblePages.map((page, index) => renderPageLink(page, index))}
        </div>
      )}

      {/* Empty State - only show when fully loaded and no pages (hide when collapsed) */}
      {!collapsed && !authLoading && !isLoadingPermissions && visiblePages.length === 0 && (
        <div className="px-2 py-6 text-center">
          <Circle className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No pages available
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            Contact your administrator
          </p>
        </div>
      )}

      {/* Footer Info - Professional System Status */}
      {!collapsed && (
        <div className="mt-4 px-3 pt-3 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Systems operational</span>
            </div>
          </div>
          {user && (
            <div className="mt-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-[11px] text-gray-600 dark:text-gray-300 font-medium capitalize">
                {getRoleDisplayName(user.roleName || user.role)}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Collapsed Mode: System Status Indicator */}
      {collapsed && (
        <div className="mt-4 flex justify-center">
          <div 
            className="w-2 h-2 rounded-full bg-green-500" 
            title="Systems operational"
          />
        </div>
      )}
    </div>
  );
}
