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
}

// Runtime icon map loaded client-side (lucide-react). We avoid SSR import.
type IconComponent = React.ComponentType<any> | undefined;

export default function DynamicSidebar({ className = '' }: DynamicSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [userAllowedPages, setUserAllowedPages] = useState<string[]>([]);
  const [superAdminModules, setSuperAdminModules] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [iconMap, setIconMap] = useState<Record<string, IconComponent>>({});

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

  // Check if user is Super Admin
  const isSuperAdmin = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return hasFullAdmin(roleName);
  }, [user?.roleName, user?.role]);

  // Fetch user permissions from database
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user?.id) {
        setIsLoadingPermissions(false);
        return;
      }

      // Enterprise Admin: Set enterprise modules directly
      if (user.role === 'ENTERPRISE_ADMIN' || user?.roleName === 'ENTERPRISE_ADMIN') {
        console.log('[Sidebar] Enterprise Admin detected - setting enterprise modules');
        setSuperAdminModules(['enterprise-management']);
        setUserAllowedPages([]); // Enterprise admin doesn't use page-level permissions
        setIsLoadingPermissions(false);
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
            timeoutMs: 8000,
          });

          if (response.ok) {
            const result = await response.json();
            console.log('[Sidebar] Super Admin permissions:', result);
            
            const assignedModules = result.user?.permissions?.assignedModules || [];
            setSuperAdminModules(assignedModules);
            
            // Grant all pages from assigned modules
            const allPageKeys = REGISTRY
              .filter(page => assignedModules.includes(page.module))
              .map(page => page.id);
            
            console.log('[Sidebar] Assigned modules:', assignedModules);
            console.log('[Sidebar] Allowed pages:', allPageKeys.length);
            setUserAllowedPages(allPageKeys);
          } else {
            console.error('[Sidebar] Failed to fetch Super Admin permissions:', response.status);
            // Fallback: grant all access if API fails
            const allPageKeys = PAGE_REGISTRY.map(page => page.id);
            setUserAllowedPages(allPageKeys);
          }
        } catch (error) {
          console.error('[Sidebar] Error fetching Super Admin permissions:', error);
          // Fallback: grant all access if API fails
          const allPageKeys = PAGE_REGISTRY.map(page => page.id);
          setUserAllowedPages(allPageKeys);
        }
        setIsLoadingPermissions(false);
        return;
      }

      // Regular users: Fetch page permissions from database
      try {
        // Use relative URL to leverage Next.js API proxy
        const response = await safeFetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
          timeoutMs: 8000,
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[Sidebar] User permissions from DB:', result);
          
          // Backend returns: { success: true, data: { userId, allowedPages } }
          const allowedPages = result.data?.allowedPages || result.allowedPages || [];
          console.log('[Sidebar] Extracted allowed pages:', allowedPages);
          setUserAllowedPages(allowedPages);
        } else {
          console.error('[Sidebar] Failed to fetch permissions:', response.status);
          setUserAllowedPages([]);
        }
      } catch (error) {
        console.error('[Sidebar] Error fetching permissions:', error);
        setUserAllowedPages([]);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchUserPermissions();
  }, [user?.id, isSuperAdmin]);

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

  // Compute a FLAT list of visible pages (no module headers), per requirements
  const visiblePages = useMemo<PageMetadata[]>(() => {
    if (!user) return [];

    const isEnterprise = user.role === 'ENTERPRISE_ADMIN' || user.roleName === 'ENTERPRISE_ADMIN';

  let pages = REGISTRY.filter(p => p.status === 'active');

    if (isEnterprise) {
      // Enterprise Admin: enterprise-specific pages only
      pages = pages.filter(p => p.path.startsWith('/enterprise') || p.roles.includes('ENTERPRISE_ADMIN'));
    } else if (isSuperAdmin) {
      // Super Admin: System Administration pages + Common pages
      pages = pages.filter(p => p.module === 'system' || p.module === 'common');
    } else {
      // Regular users: only explicitly allowed pages from DB + Common pages (available to all)
      pages = pages.filter(p => userAllowedPages.includes(p.id) || p.module === 'common');
    }

    // Non-enterprise users should not see enterprise pages
    if (!isEnterprise) {
      pages = pages.filter(p => !p.path.startsWith('/enterprise'));
    }

    // Sort by explicit order then name
    pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
    return pages;
  }, [user, userAllowedPages, isSuperAdmin]);

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
  const isActivePath = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  // Determine user's primary dashboard path by role
  const dashboardPath = useMemo(() => {
  const role = String(user?.roleName || user?.role || '').toUpperCase();
  if (hasFullAdmin(role)) return '/admin';
    if (role === 'ENTERPRISE_ADMIN') return '/enterprise-admin/dashboard';
    if (role === 'ADMIN') return '/admin/dashboard';
    if (role === 'STAFF') return '/hub-incharge';
    return '/manager';
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

  // Render individual page link
  const renderPageLink = (page: PageMetadata) => {
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

  const linkClasses = `
      flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors
      ${isActive
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
        : isDisabled
        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }
    `;

    const content = (
      <>
  {/* Render icon safely; fallback to Circle if missing or invalid */}
  {(() => {
  // @ts-ignore guarded icon is always renderable
  return <Icon className="w-4 h-4 flex-shrink-0" />;
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

  // Check if current page is a dashboard
  const isDashboardPage = pathname === '/hub-incharge' || 
                          pathname === '/super-admin' || 
                          pathname === '/admin/dashboard' || 
                          pathname === '/manager' ||
                          pathname === '/enterprise-admin/dashboard' ||
                          pathname === '/admin' ||
                          pathname === '/enterprise-admin';

  return (
    <div className={`py-4 ${className}`}>
      {/* User Profile Section - Only show on non-dashboard pages */}
      {user && !isDashboardPage && (
        <div className="px-2 mb-4">
          <div 
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => router.push('/common/about-me')}
            title="View profile"
          >
            {/* Profile Picture */}
            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden relative">
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
      
      {/* Loading State */}
      {isLoadingPermissions && (
        <div className="px-3 py-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading your permissions...
          </p>
        </div>
      )}

      {/* Flat page list (no module headers) */}
      {!isLoadingPermissions && (
        <div className="space-y-1 px-2">
          {/* Dashboard shortcut as first item */}
          <Link
            href={dashboardPath}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActivePath(dashboardPath)
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title="Dashboard"
          >
            <span className="flex-1 truncate">Dashboard</span>
          </Link>
          {visiblePages.map(page => renderPageLink(page))}
        </div>
      )}

      {/* Empty State */}
  {!isLoadingPermissions && visiblePages.length === 0 && (
        <div className="px-3 py-8 text-center">
          <Circle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No pages available
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Contact your administrator for access
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-6 px-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <Circle className="w-2 h-2 text-green-500 dark:text-green-400 fill-current" />
          <span>All systems operational</span>
        </div>
        {user && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Logged in as <span className="font-medium text-gray-700 dark:text-gray-300">{user.roleName || user.role}</span>
          </div>
        )}
        {!isLoadingPermissions && userAllowedPages.length > 0 && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {userAllowedPages.length} permission{userAllowedPages.length !== 1 ? 's' : ''} granted
          </div>
        )}
      </div>
    </div>
  );
}
