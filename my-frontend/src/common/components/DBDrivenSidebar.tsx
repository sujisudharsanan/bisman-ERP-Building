/**
 * DB-Driven Sidebar Navigation (V2)
 * 
 * Fetches navigation structure from backend database (/api/menu/sidebar)
 * All RBAC logic is enforced by backend - frontend only renders
 * Falls back to legacy PAGE_REGISTRY-based rendering if API fails
 * 
 * This replaces the legacy DynamicSidebar for DB-first navigation.
 */

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Circle } from 'lucide-react';
import { safeComponent } from '@/lib/safeComponent';
import { useAuth } from '@/common/hooks/useAuth';
import { getRoleDisplayName } from '@/utils/roleDisplay';
import { useSidebarMenu, type MenuItem, type MenuModule } from '@/hooks/useSidebarMenu';
import { getPageIcon } from '@/common/config/page-ui-meta';

interface DBDrivenSidebarProps {
  className?: string;
  collapsed?: boolean;
}

// Runtime icon map loaded client-side (lucide-react)
type IconComponent = React.ComponentType<any> | undefined;

export default function DBDrivenSidebar({ className = '', collapsed = false }: DBDrivenSidebarProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { menu, loading: menuLoading, error: menuError, refetch } = useSidebarMenu();
  
  // Icon map for lucide-react icons
  const [iconMap, setIconMap] = useState<Record<string, IconComponent>>({});
  
  // Magnification effect state (macOS Dock style)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Load lucide-react icons once on client
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return;
      try {
        const mod = await import('lucide-react');
        if (!mounted) return;
        const map: Record<string, IconComponent> = {};
        Object.keys(mod).forEach(k => {
          if (/^[A-Z]/.test(k)) {
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

  // Check if current path matches
  const isActivePath = (path: string) => {
    const dashboardPaths = ['/super-admin', '/admin', '/enterprise-admin', '/dashboard'];
    const isDashboardPath = dashboardPaths.includes(path);
    
    if (isDashboardPath) {
      return pathname === path;
    }
    
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

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

  // Flatten menu items for rendering
  const visiblePages = useMemo(() => {
    if (!menu) return [];
    return menu.flatItems;
  }, [menu]);

  // Render individual page link with magnification effect
  const renderPageLink = (item: MenuItem, index: number) => {
    const isActive = isActivePath(item.path);

    // Resolve icon using iconKey string
    let Icon: any = undefined;
    if (item.iconKey) {
      const key = item.iconKey;
      Icon = iconMap[key] || iconMap[key.replace(/[-_](\w)/g, (_: any, c: string) => c.toUpperCase())] || undefined;
    }
    // Fallback to page-ui-meta icon
    if (!Icon && item.id) {
      const metaIcon = getPageIcon(item.id);
      Icon = iconMap[metaIcon] || undefined;
    }
    // Final fallback
    Icon = safeComponent(Icon || Circle, item.iconKey || item.id, 'DBDrivenSidebar');

    // Calculate magnification scale (macOS Dock style)
    const getMagnificationStyle = () => {
      if (!collapsed || hoveredIndex === null) return {};
      
      const distance = Math.abs(index - hoveredIndex);
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
          {item.name}
          <span className="absolute left-0 top-1/2 -translate-x-[6px] -translate-y-1/2 
            w-3 h-3 bg-gray-900 dark:bg-white rotate-45 rounded-sm" />
        </span>
      );

      return (
        <Link 
          key={item.id} 
          href={item.path} 
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
        : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-800/50 hover:text-gray-900 dark:hover:text-white hover:translate-x-1 hover:shadow-sm'
      }
    `;

    return (
      <Link key={item.id} href={item.path} className={linkClasses} title={item.description}>
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${!isActive ? 'group-hover:scale-110 group-hover:rotate-6' : ''}`} />
        <span className="flex-1 truncate">{item.name}</span>
      </Link>
    );
  };

  // Determine if we should hide profile
  const userRole = (user?.role || user?.roleName || '').toString().toUpperCase().replace(/\s+/g, '_');
  const isAdminUser = ['SUPER_ADMIN', 'ADMIN', 'ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'].includes(userRole);
  const hideProfileInSidebar = pathname === '/common/about-me' || !isAdminUser;

  const isLoading = authLoading || menuLoading;

  return (
    <div className={`py-3 ${className}`}>
      {/* Admin Profile Section */}
      {!collapsed && user && !hideProfileInSidebar && (
        <div className="px-2 mb-3">
          <div 
            className="flex items-center gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => router.push('/common/about-me')}
            title="View profile"
          >
            {/* Profile Picture */}
            <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden relative">
              {profilePicUrl ? (
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
                {getRoleDisplayName(user?.roleName || user?.role)}
              </p>
            </div>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700 mt-2"></div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className={`${collapsed ? 'px-1 py-4' : 'px-3 py-8'} text-center`}>
          <div className={`animate-spin ${collapsed ? 'w-6 h-6' : 'w-8 h-8'} border-4 border-blue-600 border-t-transparent rounded-full mx-auto ${collapsed ? '' : 'mb-3'}`} />
          {!collapsed && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading menu...
            </p>
          )}
        </div>
      )}

      {/* Fallback Warning (dev mode only) */}
      {!isLoading && menu?.source === 'fallback' && process.env.NODE_ENV === 'development' && (
        <div className="px-2 py-1 mb-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs rounded">
          ⚠️ Using fallback menu
        </div>
      )}

      {/* Page list */}
      {!isLoading && (
        <div 
          className={`${collapsed ? 'space-y-1 py-2' : 'space-y-0.5 px-1.5'}`}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {visiblePages.map((item, index) => renderPageLink(item, index))}
        </div>
      )}

      {/* Empty State */}
      {!collapsed && !isLoading && visiblePages.length === 0 && (
        <div className="px-2 py-6 text-center">
          <Circle className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No pages available
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            {menuError || 'Contact your administrator'}
          </p>
          <button 
            onClick={refetch}
            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Footer Info */}
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
