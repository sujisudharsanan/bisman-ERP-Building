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

interface User {
  id?: number;
  username?: string;
  email?: string;
  roleName?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}


const AuthContext = createContext<AuthContextType | null>(null);

export { AuthContext };

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const baseURL = API_BASE;
      const response = await fetch(`${baseURL}/api/me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      // Auth check failed - reset user state
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const baseURL = API_BASE;
      const response = await fetch(`${baseURL}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        // Ensure cookies are persisted by validating with /api/me.
        // Try a quick whoami, and if needed, refresh then whoami again.
        const probeMe = async () => {
          const me1 = await fetch(`${baseURL}/api/me`, { credentials: 'include' });
          if (me1.ok) return me1.json();
          // Attempt refresh once
          await fetch(`${baseURL}/api/token/refresh`, { method: 'POST', credentials: 'include' }).catch(() => {});
          const me2 = await fetch(`${baseURL}/api/me`, { credentials: 'include' });
          if (me2.ok) return me2.json();
          return null;
        };
        const who = await probeMe();
        if (who && who.user) {
          setUser(who.user);
          return who.user;
        }
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
          return userFromBody || null;
        } catch {
          return null;
        }
      } else {
        // Login failed - error handled by caller
        return null;
      }
    } catch {
      // Network or other error during login
      return null;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const baseURL = API_BASE;
      await fetch(`${baseURL}/api/logout`, {
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

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
  isAuthenticated: !!user && !loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
