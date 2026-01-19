/**
 * ============================================================================
 * BISMAN ERP - DB-Driven Dynamic Sidebar
 * ============================================================================
 * 
 * This component generates the sidebar navigation PURELY from the database.
 * It replaces any hardcoded page-registry.ts dependency for menu generation.
 * 
 * Data Source: /api/modules/menu (menuRoutes.js)
 * 
 * Features:
 *   1. Fetches menu structure from database via API
 *   2. Respects role_page_access for RBAC
 *   3. Respects show_in_sidebar = true only
 *   4. Subscription-gated modules show lock icon
 *   5. Caches menu in sessionStorage for performance
 * 
 * Date: 2025-01-19
 * ============================================================================
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/common/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface MenuPage {
  id: number;
  code: string;
  name: string;
  route: string;
  icon: string | null;
  sortOrder: number;
  showInSidebar: boolean;
  permissions: {
    canView: boolean;
    canEdit: boolean;
  };
}

interface MenuModule {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  baseRoute: string | null;
  colorCode: string | null;
  layoutGroup: string | null;
  sortOrder: number;
  pages: MenuPage[];
}

interface MenuData {
  role: string;
  menu: MenuModule[];
  accessibleRoutes: Array<{
    route: string;
    code: string;
    canView: boolean;
    canEdit: boolean;
  }>;
  meta: {
    totalModules: number;
    totalPages: number;
    generatedAt: string;
  };
}

interface DbDrivenSidebarProps {
  className?: string;
  collapsed?: boolean;
}

// ============================================================================
// Icon Resolver
// ============================================================================

// Runtime icon map - loaded dynamically to avoid SSR issues
type IconComponent = React.ComponentType<{ className?: string }>;
let iconMapCache: Record<string, IconComponent> | null = null;

async function loadIconMap(): Promise<Record<string, IconComponent>> {
  if (iconMapCache) return iconMapCache;
  
  try {
    const mod = await import('lucide-react');
    const map: Record<string, IconComponent> = {};
    
    Object.keys(mod).forEach(key => {
      if (/^[A-Z]/.test(key)) {
        map[key] = (mod as any)[key];
      }
    });
    
    iconMapCache = map;
    return map;
  } catch {
    return {};
  }
}

function getIcon(iconName: string | null, iconMap: Record<string, IconComponent>): IconComponent | null {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}

// ============================================================================
// Cache Configuration
// ============================================================================

const MENU_CACHE_KEY = 'db_menu_v1';
const MENU_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Main Component
// ============================================================================

export default function DbDrivenSidebar({ 
  className = '', 
  collapsed = false 
}: DbDrivenSidebarProps) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [iconMap, setIconMap] = useState<Record<string, IconComponent>>({});
  
  // Module access hook for subscription checking
  const { hasAccess: hasModuleAccess, loading: moduleAccessLoading } = useModuleAccess();
  
  // Load icons on mount
  useEffect(() => {
    loadIconMap().then(setIconMap);
  }, []);
  
  // Fetch menu from database
  const fetchMenu = useCallback(async () => {
    if (!user?.id) {
      setMenuData(null);
      setLoading(false);
      return;
    }
    
    // Try cache first
    const cacheKey = `${MENU_CACHE_KEY}_${user.id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < MENU_CACHE_TTL) {
          console.log('[DbSidebar] Using cached menu');
          setMenuData(data);
          setLoading(false);
          // Continue to background refresh if stale
          if (Date.now() - timestamp > 60 * 1000) {
            // Stale - refresh in background
          } else {
            return;
          }
        }
      }
    } catch {
      // Ignore cache errors
    }
    
    setLoading(true);
    
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseURL}/api/modules/menu`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch menu: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data as MenuData;
        setMenuData(data);
        
        // Cache the result
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now(),
          }));
        } catch {
          // Ignore cache errors
        }
        
        // Auto-expand current module
        const currentModule = data.menu.find(m => 
          m.pages.some(p => pathname && pathname.startsWith(p.route))
        );
        if (currentModule) {
          setExpandedModules(prev => new Set([...prev, currentModule.code]));
        }
      } else {
        throw new Error(result.message || 'Invalid response');
      }
    } catch (err) {
      console.error('[DbSidebar] Error fetching menu:', err);
      setError(err instanceof Error ? err.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [user?.id, pathname]);
  
  // Fetch on mount and user change
  useEffect(() => {
    if (!authLoading) {
      fetchMenu();
    }
  }, [authLoading, fetchMenu]);
  
  // Toggle module expansion
  const toggleModule = useCallback((moduleCode: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleCode)) {
        next.delete(moduleCode);
      } else {
        next.add(moduleCode);
      }
      return next;
    });
  }, []);
  
  // Check if page is active
  const isActive = useCallback((route: string): boolean => {
    if (!pathname) return false;
    if (route === '/') return pathname === '/';
    return pathname === route || pathname.startsWith(route + '/');
  }, [pathname]);
  
  // Filter and process menu based on subscription
  const processedMenu = useMemo(() => {
    if (!menuData) return [];
    
    return menuData.menu.map(module => ({
      ...module,
      isLocked: !hasModuleAccess(module.code.toLowerCase()),
      pages: module.pages.filter(p => p.showInSidebar && p.permissions.canView),
    })).filter(m => m.pages.length > 0 || m.isLocked);
  }, [menuData, hasModuleAccess]);
  
  // Loading state
  if (loading || authLoading || moduleAccessLoading) {
    return (
      <nav className={cn('flex flex-col gap-1 p-2', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-10 bg-muted rounded-md mb-1" />
          </div>
        ))}
      </nav>
    );
  }
  
  // Error state
  if (error) {
    return (
      <nav className={cn('flex flex-col gap-2 p-4', className)}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load menu</span>
        </div>
        <button 
          onClick={fetchMenu}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </nav>
    );
  }
  
  // No menu data
  if (!menuData || processedMenu.length === 0) {
    return (
      <nav className={cn('flex flex-col gap-2 p-4 text-muted-foreground', className)}>
        <span className="text-sm">No menu items available</span>
      </nav>
    );
  }
  
  return (
    <nav className={cn('flex flex-col gap-1 overflow-y-auto', className)}>
      {processedMenu.map(module => {
        const ModuleIcon = getIcon(module.icon, iconMap);
        const isExpanded = expandedModules.has(module.code);
        const hasActiveChild = module.pages.some(p => isActive(p.route));
        
        return (
          <div key={module.code} className="mb-1">
            {/* Module Header */}
            <button
              onClick={() => !module.isLocked && toggleModule(module.code)}
              disabled={module.isLocked}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                hasActiveChild 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                module.isLocked && 'opacity-50 cursor-not-allowed'
              )}
            >
              {ModuleIcon && <ModuleIcon className="h-4 w-4 flex-shrink-0" />}
              
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{module.name}</span>
                  
                  {module.isLocked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    isExpanded 
                      ? <ChevronDown className="h-4 w-4" />
                      : <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </button>
            
            {/* Module Pages */}
            {!collapsed && isExpanded && !module.isLocked && (
              <div className="ml-4 mt-1 flex flex-col gap-0.5">
                {module.pages.map(page => {
                  const PageIcon = getIcon(page.icon, iconMap);
                  const active = isActive(page.route);
                  
                  return (
                    <Link
                      key={page.id}
                      href={page.route}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {PageIcon && <PageIcon className="h-3.5 w-3.5 flex-shrink-0" />}
                      <span className="truncate">{page.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Subscription Upgrade Prompt */}
      {processedMenu.some(m => m.isLocked) && !collapsed && (
        <div className="mt-4 mx-2 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">
            Some modules require a plan upgrade
          </p>
          <Link
            href="/admin/subscription"
            className="text-xs text-primary hover:underline"
          >
            View Plans →
          </Link>
        </div>
      )}
    </nav>
  );
}
