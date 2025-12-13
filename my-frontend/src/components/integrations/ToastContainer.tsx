/**
 * Toast Container Component
 * Displays toast notifications for async action feedback
 */

'use client';

import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast, ToastType } from './types';

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastIcons: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const ToastColors: Record<ToastType, string> = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50 text-red-800 dark:text-red-200',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-200',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-800 dark:text-blue-200',
};

const ToastIconColors: Record<ToastType, string> = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const ToastTitles: Record<ToastType, string> = {
  success: 'Success!',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
};

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md pointer-events-none">
      {toasts.map(toast => {
        const Icon = ToastIcons[toast.type];
        
        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl 
              backdrop-blur-sm animate-slide-in-right
              ${ToastColors[toast.type]}
            `}
            role="alert"
          >
            {/* Icon Container */}
            <div className={`flex-shrink-0 p-1 rounded-full ${
              toast.type === 'success' ? 'bg-green-100 dark:bg-green-800/30' :
              toast.type === 'error' ? 'bg-red-100 dark:bg-red-800/30' :
              toast.type === 'warning' ? 'bg-amber-100 dark:bg-amber-800/30' :
              'bg-blue-100 dark:bg-blue-800/30'
            }`}>
              <Icon className={`w-5 h-5 ${ToastIconColors[toast.type]}`} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-0.5">{ToastTitles[toast.type]}</p>
              <p className="text-sm opacity-90">{toast.message}</p>
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => onRemove(toast.id)}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors -mt-1 -mr-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 opacity-60 hover:opacity-100 transition-opacity" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
