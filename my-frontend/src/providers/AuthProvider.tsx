"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '@/lib/api/axios'

type User = { id?: number; email?: string; name?: string; roleName?: string } | null

type AuthContextValue = {
  user: User
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null)

  useEffect(() => {
    // on mount, if token exists try to fetch current user
    const tryLoad = async () => {
      try {
  // Cookie-based auth: attempt to fetch current user; server reads cookie
  const res = await api.get('/api/me')
  setUser(res.data.user || null)
      } catch (e) {
        setUser(null)
      }
    }
    tryLoad()
  }, [])

  async function login(email: string, password: string) {
  // Server will set HttpOnly cookie on successful login
  await api.post('/api/login', { email, password })
  const me = await api.get('/api/me')
  setUser(me.data.user || null)
  }

  async function logout() {
    try { localStorage.removeItem('token') } catch (e) {}
    setUser(null)
    // optionally call backend logout endpoint if exists
    try { await api.post('/api/logout') } catch (_) {}
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
