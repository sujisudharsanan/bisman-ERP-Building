/**
 * Authentication Context
 * Manages user authentication state and login/logout functionality
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { API_BASE } from '@/config/api';

// Common module pages that are always accessible without assignment
const COMMON_MODULE_PATHS = [
  '/common/about-me',
  '/common/change-password',
  '/common/security-settings',
  '/common/notifications',
  '/common/messages',
  '/common/help-center',
  '/common/documentation',
  '/common/user-settings',
  '/chat', // Chat is accessible to all
];

interface User {
  id?: number;
  username?: string;
  email?: string;
  roleName?: string;
  role?: string; // Added for compatibility
  name?: string;
  profile_pic_url?: string; // Profile picture URL
  assignedModules?: (number | string)[]; // Module IDs or names assigned to user
  pagePermissions?: Record<string, string[]>; // { moduleId: [pageIds] }
  userType?: string; // USER, SUPER_ADMIN, ENTERPRISE_ADMIN
  productType?: string; // BUSINESS_ERP, PUMP_MANAGEMENT
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  // Access control methods
  hasModuleAccess: (moduleIdOrName: number | string) => boolean;
  hasPageAccess: (pagePath: string) => boolean;
  isCommonPage: (pagePath: string) => boolean;
}


const AuthContext = createContext<AuthContextType | null>(null);

export { AuthContext };

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      // Use same-origin proxy for auth to ensure cookies match
      const response = await fetch(`/api/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        
        // Ensure role/roleName exists, provide fallback
        if (!userData.role && !userData.roleName) {
          console.warn('⚠️ Role missing from /api/me response — assigning fallback role: MANAGER');
          userData.role = 'MANAGER';
          userData.roleName = 'MANAGER';
        } else if (!userData.roleName) {
          userData.roleName = userData.role;
        } else if (!userData.role) {
          userData.role = userData.roleName;
        }
        
        console.log('✅ User authenticated with role:', userData.roleName || userData.role);
        setUser(userData);
      } else {
        console.log('⚠️ /api/me failed with status:', response.status);
        setUser(null);
      }
    } catch (err) {
      // Auth check failed - reset user state
      console.error('❌ Auth check error:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    try {
      console.log('🔐 [LOGIN] Attempting login for:', email);
      // Same-origin proxy for login
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔐 [LOGIN] Response status:', response.status);
      
      if (response.ok) {
        const loginData = await response.json();
        console.log('🔐 [LOGIN] Response data:', loginData);
        
        // Small delay to ensure cookies are set by the browser
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Ensure cookies are persisted by validating with /api/me.
        // Try a quick whoami, and if needed, refresh then whoami again.
        const probeMe = async () => {
          console.log('🔐 [LOGIN] Probing /api/me...');
          const me1 = await fetch(`/api/me`, { 
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('🔐 [LOGIN] /api/me first attempt status:', me1.status);
          if (me1.ok) {
            const data = await me1.json();
            console.log('🔐 [LOGIN] /api/me data:', data);
            return data;
          }
          // Attempt refresh once
          console.log('🔐 [LOGIN] First /api/me failed, attempting token refresh...');
          await fetch(`/api/token/refresh`, { 
            method: 'POST', 
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }).catch(() => {});
          const me2 = await fetch(`/api/me`, { 
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          console.log('🔐 [LOGIN] /api/me second attempt status:', me2.status);
          if (me2.ok) {
            const data = await me2.json();
            console.log('🔐 [LOGIN] /api/me second attempt data:', data);
            return data;
          }
          return null;
        };
        const who = await probeMe();
        console.log('🔐 [LOGIN] Final probe result:', who);
        if (who && who.user) {
          const userData = who.user;
          
          // Ensure role/roleName exists, provide fallback
          if (!userData.role && !userData.roleName) {
            console.warn('⚠️ Role missing after login — assigning fallback role: MANAGER');
            userData.role = 'MANAGER';
            userData.roleName = 'MANAGER';
          } else if (!userData.roleName) {
            userData.roleName = userData.role;
          } else if (!userData.role) {
            userData.role = userData.roleName;
          }
          
          console.log('✅ [LOGIN] Login successful - User authenticated with role:', userData.roleName || userData.role);
          setUser(userData);
          setLoading(false);
          return userData;
        }
        console.warn('⚠️ [LOGIN] Probe failed - who is null or missing user');
        // Fallback to parsing login body if /api/me probe fails for any reason
        try {
          const data = await response.clone().json();
          const userFromBody = data.user
            ? data.user
            : {
                id: data.id,
                username: data.username || (data.email ? data.email.split('@')[0] : undefined),
                email: data.email,
                roleName: data.role || data.roleName,
                name: data.name,
              };
          setUser(userFromBody || null);
          setLoading(false);
          return userFromBody || null;
        } catch {
          setLoading(false);
          return null;
        }
      } else {
        // Login failed - error handled by caller
        setLoading(false);
        return null;
      }
    } catch {
      // Network or other error during login
      setLoading(false);
      return null;
    }
  };

  const logout = async (): Promise<void> => {
    try {
  // Same-origin proxy for logout
  await fetch(`/api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // Logout error - proceed with client cleanup
    } finally {
      // Clear client-side authentication state
      try {
        // Clear all cookies for the current path
        if (typeof document !== 'undefined' && document.cookie) {
          document.cookie.split(';').forEach(c => {
            const name = c.split('=')[0].trim();
            // Expire cookie for root path
            document.cookie = `${name}=; expires=${new Date(0).toUTCString()}; path=/`;
            // Also try with SameSite and Secure variants (best-effort)
            document.cookie = `${name}=; expires=${new Date(0).toUTCString()}; path=/; SameSite=Lax`;
          });
        }
      } catch (e) {
        // document may not be available during SSR
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // ignore storage errors
      }

      // Reset any external auth state (zustand store)
      try {
        const { resetAuthStore } = await import('../store/useAuth');
        try { resetAuthStore && resetAuthStore(); } catch (e) { /* ignore */ }
      } catch (e) {
        // ignore if module can't be imported during SSR
      }

      // Clear local React state
      setUser(null);

      // Force full reload to clear React routing caches and service workers
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
  };

  const refreshUser = async (): Promise<void> => {
    await checkAuth();
  };

  // Set mounted state first
  useEffect(() => {
    setMounted(true);
  }, []);

  // Then check auth after mounted
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    // Fire and also set a safety timeout to prevent infinite loading when API is unreachable
    const timeout = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 4000);
    checkAuth().finally(() => {
      clearTimeout(timeout);
    });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [checkAuth, mounted]);

  // Check if a path is a common module page (always accessible)
  const isCommonPage = useCallback((pagePath: string): boolean => {
    const normalizedPath = pagePath.toLowerCase().replace(/\/$/, '');
    return COMMON_MODULE_PATHS.some(commonPath => 
      normalizedPath === commonPath.toLowerCase() || 
      normalizedPath.startsWith(commonPath.toLowerCase() + '/')
    );
  }, []);

  // Check if user has access to a specific module
  const hasModuleAccess = useCallback((moduleIdOrName: number | string): boolean => {
    if (!user) return false;
    
    // Enterprise Admin has access to all modules
    if (user.role === 'ENTERPRISE_ADMIN' || user.userType === 'ENTERPRISE_ADMIN') {
      return true;
    }
    
    // Common module (id=1 or name='common') is always accessible
    if (moduleIdOrName === 1 || moduleIdOrName === 'common') {
      return true;
    }
    
    const assignedModules = user.assignedModules || [];
    
    // Check by ID or name
    if (typeof moduleIdOrName === 'number') {
      return assignedModules.some(m => Number(m) === moduleIdOrName);
    }
    
    const nameLower = String(moduleIdOrName).toLowerCase();
    return assignedModules.some(m => String(m).toLowerCase() === nameLower);
  }, [user]);

  // Check if user has access to a specific page
  const hasPageAccess = useCallback((pagePath: string): boolean => {
    if (!user) return false;
    
    // Enterprise Admin has access to all pages
    if (user.role === 'ENTERPRISE_ADMIN' || user.userType === 'ENTERPRISE_ADMIN') {
      return true;
    }
    
    // Common pages are always accessible
    if (isCommonPage(pagePath)) {
      return true;
    }
    
    // Check page permissions
    const pagePermissions = user.pagePermissions || {};
    const normalizedPath = pagePath.toLowerCase().replace(/^\//, '');
    
    // Check if the page is in any of the assigned modules' page permissions
    for (const moduleId of Object.keys(pagePermissions)) {
      const pages = pagePermissions[moduleId] || [];
      if (pages.some(p => {
        const normalizedP = String(p).toLowerCase().replace(/^\//, '');
        return normalizedP === normalizedPath || normalizedPath.startsWith(normalizedP + '/');
      })) {
        return true;
      }
    }
    
    return false;
  }, [user, isCommonPage]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user && !loading,
    hasModuleAccess,
    hasPageAccess,
    isCommonPage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  // During server-side rendering there is no React context/provider available.
  // Return a safe fallback to avoid throwing during prerender.
  if (typeof window === 'undefined') {
    return {
      user: null,
      loading: false,
      login: async () => null,
      logout: async () => {},
      refreshUser: async () => {},
      isAuthenticated: false,
      hasModuleAccess: () => false,
      hasPageAccess: () => false,
      isCommonPage: () => false,
    } as AuthContextType;
  }

  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
