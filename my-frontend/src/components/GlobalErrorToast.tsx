/**
 * ============================================================================
 * GLOBAL ERROR TOAST COMPONENT
 * ============================================================================
 * 
 * Displays error notifications globally
 * Automatically shows for all API errors unless suppressed
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { onGlobalError } from '@/lib/globalErrorHandler';
import { getErrorMessage, getErrorType, type APIErrorResponse } from '@/lib/errorCodes';

interface ToastProps {
  error: APIErrorResponse;
  onClose: () => void;
}

function ErrorToast({ error, onClose }: ToastProps) {
  const errorType = getErrorType(error.httpStatus);
  const userMessage = getErrorMessage(error.errorCode);
  
  // Auto-dismiss after 8 seconds (or 15 for rate limits)
  const dismissTime = error.errorCode === 'LOGIN_LIMIT_REACHED' ? 15000 : 8000;
  
  useEffect(() => {
    const timer = setTimeout(onClose, dismissTime);
    return () => clearTimeout(timer);
  }, [dismissTime, onClose]);
  
  // Color schemes based on error type
  const colors = {
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: 'text-red-500 dark:text-red-400',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: 'text-yellow-500 dark:text-yellow-400',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: 'text-blue-500 dark:text-blue-400',
    },
  };
  
  const theme = colors[errorType];
  
  // Icons based on error type
  const icons = {
    error: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };
  
  return (
    <div
      className={`
        ${theme.bg} ${theme.border} ${theme.text}
        border rounded-lg shadow-lg p-4 mb-3
        animate-slide-in-right
        max-w-md w-full
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${theme.icon}`}>
          {icons[errorType]}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Error Code */}
          <p className="text-sm font-semibold mb-1">
            {error.errorCode.replace(/_/g, ' ')}
          </p>
          
          {/* User Message */}
          <p className="text-sm">
            {userMessage}
          </p>
          
          {/* Retry Information */}
          {error.retryAfter && (
            <p className="text-xs mt-2 opacity-75">
              Please try again after {error.retryAfterFormatted || `${error.retryAfter} seconds`}
            </p>
          )}
          
          {/* Technical Details (Development Only) */}
          {process.env.NODE_ENV !== 'production' && error.message && (
            <details className="mt-2 text-xs opacity-60">
              <summary className="cursor-pointer hover:opacity-100">
                Technical Details
              </summary>
              <p className="mt-1 font-mono">
                {error.message}
              </p>
            </details>
          )}
        </div>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`
            flex-shrink-0 ${theme.text}
            hover:opacity-75 transition-opacity
          `}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function GlobalErrorToast() {
  const [errors, setErrors] = useState<Array<{ id: number; error: APIErrorResponse }>>([]);
  let nextId = 0;
  
  const addError = useCallback((error: APIErrorResponse) => {
    const id = nextId++;
    setErrors(prev => [...prev, { id, error }]);
  }, []);
  
  const removeError = useCallback((id: number) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  }, []);
  
  useEffect(() => {
    const unsubscribe = onGlobalError(addError);
    return unsubscribe;
  }, [addError]);
  
  if (errors.length === 0) {
    return null;
  }
  
  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-end">
        {errors.map(({ id, error }) => (
          <ErrorToast
            key={id}
            error={error}
            onClose={() => removeError(id)}
          />
        ))}
      </div>
    </div>
  );
}
