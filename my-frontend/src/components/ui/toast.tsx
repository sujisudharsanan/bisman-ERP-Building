'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type Toast = { id: string; title?: string; description?: string; variant?: 'default'|'success'|'destructive' };

const ToastContext = createContext<{ toast: (t: Omit<Toast, 'id'>) => void }|null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setItems(prev => [...prev, { id, ...t }]);
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3000);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Simple toaster */}
      <div className="fixed bottom-4 right-4 space-y-2 z-[60]">
        {items.map(i => (
          <div key={i.id} className={`px-4 py-3 rounded-md shadow text-sm bg-white dark:bg-slate-800 border ${i.variant==='destructive' ? 'border-red-400 text-red-700 dark:text-red-300' : i.variant==='success' ? 'border-green-400 text-green-700 dark:text-green-300' : 'border-slate-300 text-slate-800 dark:text-slate-200'}`}>
            {i.title && <div className="font-semibold">{i.title}</div>}
            {i.description && <div className="text-xs opacity-80">{i.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Return a no-op toast on server to avoid prerender exceptions.
    return { toast: () => {} };
  }
  return ctx;
}
