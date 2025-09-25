"use client"
import React, { createContext, useContext, useState, ReactNode } from 'react'
import GlobalSnackbar from './Snackbar'

type Toast = { id: string; message: string; severity?: 'info' | 'success' | 'warning' | 'error' }

type Context = {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

const NotificationsContext = createContext<Context | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  function push(t: Omit<Toast, 'id'>) {
    const id = Math.random().toString(36).slice(2)
    setToasts((s) => [...s, { id, ...t }])
  }

  function remove(id: string) {
    setToasts((s) => s.filter((t) => t.id !== id))
  }

  return (
    <NotificationsContext.Provider value={{ toasts, push, remove }}>
      {children}
      <GlobalSnackbar toasts={toasts} onClose={remove} />
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
