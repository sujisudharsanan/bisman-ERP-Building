"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LayoutDashboard, User, Bell, Settings, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: JSX.Element;
};

function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  return { theme, toggle };
}

export default function FloatingBottomNav() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  // Hide on auth pages
  if (!isAuthenticated) return null;
  if (pathname?.startsWith('/auth')) return null;

  const items: NavItem[] = [
    { key: 'home', label: 'Home', href: '/', icon: <Home size={20} /> },
    { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { key: 'profile', label: 'Profile', href: '/profile', icon: <User size={20} /> },
    { key: 'notifications', label: 'Alerts', href: '/notifications', icon: <Bell size={20} /> },
    { key: 'settings', label: 'Settings', href: '/settings', icon: <Settings size={20} /> },
  ];

  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      if (y > lastY.current && y > 10) setHidden(true);
      else setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="mx-auto max-w-screen-sm px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur shadow-md py-2 rounded-t-2xl border-t border-gray-100 dark:border-gray-800">
          <div className="flex justify-around items-center">
            {items.map(item => (
              <button
                key={item.key}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center text-[11px] leading-3 px-2 py-1 rounded-md transition-colors ${
                  isActive(item.href)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
                aria-label={item.label}
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </button>
            ))}

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className="text-[11px] leading-3">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
