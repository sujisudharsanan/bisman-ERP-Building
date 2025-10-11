"use client";

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuth';
import { useAuth } from '@/hooks/useAuth';

interface LogoutButtonProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'danger';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'inline';
  hideOnLogin?: boolean;
}

export default function LogoutButton({
  className = '',
  variant = 'default',
  position = 'inline',
  hideOnLogin = true,
}: LogoutButtonProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const router = useRouter();
  const pathname = usePathname();
  const logoutStore = useAuthStore(state => state.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Call useAuth unconditionally - wrap the entire component logic in error handling if needed
  let authContext = null;
  try {
    authContext = useAuth();
  } catch (e) {
    // Context not available in this render tree, but we still called the hook
    authContext = null;
  }
  
  const logoutCtx = authContext?.logout || null;

  // Hide on login/register or any auth public routes if hideOnLogin is true
  if (hideOnLogin && pathname) {
    const publicRoutes = ['/login', '/register', '/auth/login', '/auth/register'];
    if (publicRoutes.includes(pathname) || pathname.startsWith('/auth/')) {
      return null;
    }
  }

  // Only show if user is authenticated (optional)
  // if (!user) return null

  const handleLogout = async () => {
    try {
      // Try central context logout first, fall back to zustand store logout
      if (logoutCtx) {
        try { await logoutCtx(); } catch (e) { /* ignore */ }
      } else if (logoutStore) {
        try { await Promise.resolve(logoutStore && logoutStore()); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }

    // Best-effort client cleanup
    try {
      // Call backend logout endpoint directly (non-blocking)
      fetch('/api/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    } catch (e) {
      /* ignore */
    }

    try {
      // Clear cookies for path=/
      document.cookie.split(';').forEach(c => {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date(0).toUTCString() + ';path=/');
      });
    } catch (e) {
      // SSR guard
    }

    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      // ignore
    }

    // Close mobile menu if open
    setMobileOpen(false);

    // Redirect via full reload to avoid React hook-order mismatch during client-side navigation
    try {
      window.location.href = '/login';
    } catch (e) {
      // Fallback to router
      router.push('/login');
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'minimal':
        return 'text-gray-600 hover:text-gray-800 text-sm underline';
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-medium text-sm';
      default:
        return 'bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md font-medium text-sm';
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50 md:block';
      case 'top-left':
        return 'fixed top-4 left-4 z-50';
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Desktop / md+ button (fixed) */}
      <button
        onClick={handleLogout}
        className={`${getVariantStyles()} ${getPositionStyles()} ${className} hidden md:inline-flex transition-colors duration-200`}
        aria-label="Logout"
        title="Logout from the application"
      >
        {variant === 'minimal' ? 'Logout' : '🚪 Logout'}
      </button>

      {/* Mobile: show a small menu button that toggles the logout action */}
      <div className={`fixed top-4 right-4 z-50 md:hidden ${className}`}> 
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="p-2 bg-white/90 rounded-md shadow-lg"
          aria-label="Open menu"
          title="Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clipRule="evenodd" />
          </svg>
        </button>

        {mobileOpen && (
          <div className="mt-2 bg-white rounded-md shadow-lg p-2 w-40">
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
