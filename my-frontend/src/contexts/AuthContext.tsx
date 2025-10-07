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
      const baseURL =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
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
      const baseURL =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        // Normalize different backend response shapes. Some endpoints return { user: {...} }
        // others return a flat { email, role, ... } shape.
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
      const baseURL =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
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
        document.cookie.split(';').forEach(c => {
          document.cookie = c
            .replace(/^ +/, '')
            .replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
        });
      } catch (e) {
        // document may not be available during SSR
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // ignore storage errors
      }

      setUser(null);
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
