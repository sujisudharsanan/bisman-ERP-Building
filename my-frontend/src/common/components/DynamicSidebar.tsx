/**
 * Dynamic Sidebar Navigation
 * Automatically generates navigation from page registry based on user permissions from database
 */

'use client';

import React, { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Circle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/common/hooks/useAuth';
import {
  PAGE_REGISTRY,
  MODULES,
  getNavigationStructure,
  type PageMetadata,
  type ModuleMetadata,
} from '@/common/config/page-registry';

interface DynamicSidebarProps {
  className?: string;
}

export default function DynamicSidebar({ className = '' }: DynamicSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [userAllowedPages, setUserAllowedPages] = useState<string[]>([]);
  const [superAdminModules, setSuperAdminModules] = useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  // Check if user is Super Admin
  const isSuperAdmin = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'SUPER_ADMIN' || roleName === 'SUPER ADMIN' || roleName === 'SUPERADMIN';
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
          const response = await fetch(`${baseURL}/api/auth/me/permissions`, {
            credentials: 'include',
          });

          if (response.ok) {
            const result = await response.json();
            console.log('[Sidebar] Super Admin permissions:', result);
            
            const assignedModules = result.user?.permissions?.assignedModules || [];
            setSuperAdminModules(assignedModules);
            
            // Grant all pages from assigned modules
            const allPageKeys = PAGE_REGISTRY
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
        const response = await fetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
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
    PAGE_REGISTRY.forEach(page => {
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

  // Get navigation structure based on user's allowed pages (from database)
  // Filter by page IDs, not by permissions, to show only explicitly granted pages
  const navigation = useMemo(() => {
    if (!user) return {};
    
    // ENTERPRISE_ADMIN: Only enterprise-level pages
    if (user.role === 'ENTERPRISE_ADMIN' || user.roleName === 'ENTERPRISE_ADMIN') {
      console.log('[Sidebar] Enterprise Admin detected - showing enterprise pages only');
      const grouped: Record<string, PageMetadata[]> = {};
      
      Object.keys(MODULES).forEach(moduleId => {
        grouped[moduleId] = PAGE_REGISTRY
          .filter(page => {
            // Only show pages that are:
            // 1. For enterprise-level access (enterprise-management module, etc.)
            // 2. OR common pages (accessible to all roles)
            const isEnterprisePage = page.path.startsWith('/enterprise') || 
                                      page.roles.includes('ENTERPRISE_ADMIN');
            const isCommonPage = page.permissions.includes('authenticated') || 
                                 page.module === 'common';
            return (isEnterprisePage || isCommonPage) && page.module === moduleId;
          })
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      });
      
      console.log('[Sidebar] Enterprise Admin modules:', Object.keys(grouped).filter(k => grouped[k].length > 0));
      return grouped;
    }
    
    // SUPER_ADMIN: Only assigned business modules + common pages (NO enterprise pages)
    if (isSuperAdmin) {
      const grouped: Record<string, PageMetadata[]> = {};
      
      // Filter modules based on assigned modules
      Object.keys(MODULES).forEach(moduleId => {
        // Only include modules in assignedModules OR common module
        if (superAdminModules.includes(moduleId) || moduleId === 'common') {
          grouped[moduleId] = PAGE_REGISTRY
            .filter(page => {
              // Explicitly EXCLUDE enterprise-level pages
              // Explicitly EXCLUDE enterprise-level pages
              const isEnterprisePage = page.path.startsWith('/enterprise') || 
                                        page.roles.includes('ENTERPRISE_ADMIN');
              // Include if it's a business page or common page, but NOT enterprise page
              const isCommonPage = page.permissions.includes('authenticated') || 
                                   page.module === 'common';
              const isAssignedModule = page.module === moduleId;
              
              return !isEnterprisePage && (isCommonPage || isAssignedModule);
            })
            .filter(page => page.module === moduleId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        }
      });
      
      console.log('[Sidebar] Super Admin filtered modules:', Object.keys(grouped).filter(k => grouped[k].length > 0));
      return grouped;
    }
    
    // For regular users, filter by allowed page IDs from database
    const grouped: Record<string, PageMetadata[]> = {};
    
    Object.keys(MODULES).forEach(moduleId => {
      grouped[moduleId] = PAGE_REGISTRY
        .filter(page => {
          // Exclude enterprise pages for regular users
          const isEnterprisePage = page.path.startsWith('/enterprise');
          return !isEnterprisePage && (
            userAllowedPages.includes(page.id) || 
            page.permissions.includes('authenticated')
          );
        })
        .filter(page => page.module === moduleId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    
    return grouped;
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
  const isActivePath = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

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
          <AlertCircle className="w-3 h-3" />
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
    const Icon = page.icon;

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
        <Icon className="w-4 h-4 flex-shrink-0" />
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

  // Render module section
  const renderModule = (moduleId: string, module: ModuleMetadata, pages: PageMetadata[]) => {
    if (pages.length === 0) return null;

    // Always expanded - no toggle state needed
    const ModuleIcon = module.icon;
    const hasActiveChild = pages.some(page => isActivePath(page.path));

    return (
      <div key={moduleId} className="mb-2">
        {/* Module Header - Not clickable, just displays the module name */}
        <div
          className={`
            w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
            ${hasActiveChild
              ? getModuleColorClass(module.color)
              : 'text-gray-900 dark:text-gray-100'
            }
          `}
        >
          <ModuleIcon className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left truncate">{module.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{pages.length}</span>
        </div>

        {/* Module Pages - Always visible */}
        <div className="ml-3 mt-1 space-y-1 pl-4 border-l border-gray-200 dark:border-gray-700">
          {pages.map(page => renderPageLink(page))}
        </div>
      </div>
    );
  };

  return (
    <div className={`py-4 ${className}`}>
      {/* Sidebar Header */}
      <div className="px-3 mb-4">
        <Link 
          href="/super-admin"
          className="block group cursor-pointer"
        >
          <h2 className="text-base font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 uppercase tracking-wider transition-colors">
            Dashboard
          </h2>
        </Link>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          {isLoadingPermissions ? 'Loading permissions...' : `${Object.values(navigation).flat().length} pages available`}
        </p>
      </div>

      {/* Loading State */}
      {isLoadingPermissions && (
        <div className="px-3 py-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading your permissions...
          </p>
        </div>
      )}

      {/* Module Navigation */}
      {!isLoadingPermissions && (
        <div className="space-y-1 px-2">
          {Object.entries(MODULES)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([moduleId, module]) => renderModule(moduleId, module, navigation[moduleId] || []))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingPermissions && Object.values(navigation).flat().length === 0 && (
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
