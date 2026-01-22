'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, RefreshCw, Menu, Search, X, FileText, Shield, ChevronRight } from 'lucide-react';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useRefreshTrigger } from '@/contexts/RefreshContext';
import { PAGE_REGISTRY } from '@/common/config/page-registry';

const HeaderLogo: React.FC = () => {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return (
      <div className="mr-3 w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        B
      </div>
    );
  }

  return (
    <Image
      src="/brand/logo.svg"
      alt="Company logo"
      title="Company logo"
      width={80}
      height={80}
      className="mr-3 h-10 w-auto object-contain align-middle shrink-0 filter-none invert-0 dark:invert-0"
      priority
      onError={() => setLogoError(true)}
    />
  );
};

interface EnterpriseAdminNavbarProps {
  onMenuToggle?: () => void;
  onRefresh?: () => void;
}

// Get page name from pathname
const getPageName = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || 'dashboard';
  
  const pageNames: Record<string, string> = {
    'dashboard': 'Dashboard',
    'roles': 'Role Management',
    'users': 'User Management',
    'organizations': 'Organizations',
    'billing': 'Billing',
    'audit': 'Audit Logs',
    'reports': 'Reports',
    'settings': 'Settings',
    'support': 'Support',
    'notifications': 'Notifications',
    'integrations': 'Integrations',
    'ai': 'AI Assistant',
    'activity-logs': 'Activity Logs',
  };
  
  return pageNames[lastSegment] || lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
};

// Search result type
type SearchResult = {
  type: 'page' | 'role';
  id: string;
  name: string;
  path?: string;
  module?: string;
  description?: string;
};

export default function EnterpriseAdminNavbar({ onMenuToggle, onRefresh }: EnterpriseAdminNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const pageName = getPageName(pathname || '');
  // Use safe refresh hook that works with or without RefreshProvider
  const { refreshAll: contextRefresh, isRefreshing, registeredCount } = useRefreshTrigger();

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [roles, setRoles] = useState<{ id: number; name: string; display_name?: string; level?: number }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/privileges/roles', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setRoles(data.roles || data || []);
        }
      } catch (e) {
        console.error('Failed to fetch roles for search:', e);
      }
    };
    fetchRoles();
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen]);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search pages from PAGE_REGISTRY
    PAGE_REGISTRY.forEach((page) => {
      if (
        page.name?.toLowerCase().includes(query) ||
        page.path?.toLowerCase().includes(query) ||
        page.module?.toLowerCase().includes(query) ||
        page.description?.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'page',
          id: page.id,
          name: page.name,
          path: page.path,
          module: page.module,
          description: page.description,
        });
      }
    });

    // Search roles
    roles.forEach((role) => {
      const roleName = role.display_name || role.name;
      if (roleName?.toLowerCase().includes(query)) {
        results.push({
          type: 'role',
          id: String(role.id),
          name: roleName,
          description: `Level ${role.level ?? 'N/A'}`,
        });
      }
    });

    // Limit results
    setSearchResults(results.slice(0, 10));
    setSelectedIndex(0);
  }, [searchQuery, roles]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      e.preventDefault();
      handleResultClick(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
  }, [searchResults, selectedIndex]);

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'page' && result.path) {
      router.push(result.path);
    } else if (result.type === 'role') {
      // Navigate to roles page with role selected
      router.push('/enterprise-admin/roles');
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth/login');
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      contextRefresh();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-transparent z-50 shadow-sm" style={{ height: 'var(--navbar-height)' }}>
      <div className="w-full px-3 sm:px-4">
        <div className="flex items-center justify-between" style={{ height: 'var(--navbar-height)' }}>
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <HeaderLogo />
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                BISMAN Corporation
              </h1>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {pageName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Search Bar */}
            <div ref={searchContainerRef} className="relative">
              {!searchOpen ? (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
                  aria-label="Search pages and roles"
                  title="Search pages and roles (Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search...</span>
                  <kbd className="hidden md:inline-flex ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-gray-200 dark:bg-gray-700 rounded">⌘K</kbd>
                </button>
              ) : (
                <div className="flex items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search pages, roles..."
                      className="w-48 sm:w-64 pl-8 pr-8 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                    <button
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Search Results Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className={`w-full px-3 py-2.5 flex items-start gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      } ${index !== searchResults.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded ${
                        result.type === 'page' 
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                          : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                      }`}>
                        {result.type === 'page' ? <FileText className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {result.name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            result.type === 'page' 
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                              : 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                          }`}>
                            {result.type === 'page' ? 'Page' : 'Role'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {result.type === 'page' ? result.path : result.description}
                        </div>
                        {result.module && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            Module: {result.module}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
                <div className="absolute top-full right-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-4 text-center">
                  <div className="text-gray-400 dark:text-gray-500 text-sm">
                    No pages or roles found for &quot;{searchQuery}&quot;
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`bg-blue-600 dark:bg-blue-500 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm ${isRefreshing ? 'opacity-75 cursor-wait' : ''}`}
              aria-label="Refresh data"
              title={registeredCount > 0 ? `Refresh ${registeredCount} data source(s)` : 'Refresh page'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-700 dark:bg-gray-600 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
