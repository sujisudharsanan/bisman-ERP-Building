'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { tryRefresh } from '@/lib/api/axios';

type User = {
  id?: number;
  email?: string;
  name?: string;
  roleName?: string;
} | null;

type AuthContextValue = {
  user: User;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    // on mount, if token exists try to fetch current user
    const tryLoad = async () => {
      try {
        // Cookie-based auth: attempt to fetch current user; server reads cookie
        const res = await api.get('/api/me');
        setUser(res.data.user || null);
      } catch {
        // If 401, attempt refresh once and retry
        try {
          const refreshed = await tryRefresh();
          if (refreshed) {
            const r2 = await api.get('/api/me');
            setUser(r2.data.user || null);
            return;
          }
        } catch (e) {
          // ignore
        }
        // Auth check failed - reset user state
        setUser(null);
      }
    };
    tryLoad();
  }, []);

  async function login(email: string, password: string) {
    // Server will set HttpOnly cookie on successful login
    await api.post('/api/login', { email, password });
    const me = await api.get('/api/me');
    const user = me.data.user || null;
    setUser(user);

    // Role-based redirect
    if (user?.roleName === 'STAFF') {
      // Staff users go directly to Hub Incharge dashboard
      window.location.href = '/hub-incharge';
    } else {
      // Admin and Manager go to main dashboard
      window.location.href = '/dashboard';
    }
  }

  async function logout() {
    setUser(null);
    try {
      await api.post('/api/logout');
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
