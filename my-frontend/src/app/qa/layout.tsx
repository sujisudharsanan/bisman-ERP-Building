'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bug, 
  LayoutDashboard, 
  ClipboardList, 
  AlertTriangle,
  LogOut,
  Home
} from 'lucide-react';

const navItems = [
  { href: '/qa', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/qa/test-tasks', label: 'Test Tasks', icon: ClipboardList },
  { href: '/qa/issues', label: 'Issues', icon: AlertTriangle },
];

export default function QALayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if current page is login - don't show nav on login page
  const isLoginPage = pathname === '/qa/login';

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                  <Bug className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  QA Testing
                </span>
              </div>
              
              {/* Separator */}
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />
              
              {/* Navigation Links */}
              <nav className="hidden sm:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact 
                    ? pathname === item.href 
                    : pathname?.startsWith(item.href);
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                        ${isActive 
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Back to ERP</span>
              </Link>
              <Link
                href="/qa/login"
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden border-t border-gray-200 dark:border-gray-700">
          <nav className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? pathname === item.href 
                : pathname?.startsWith(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors
                    ${isActive 
                      ? 'text-violet-700 dark:text-violet-300' 
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        BISMAN QA Testing Portal • Standalone Mode
      </footer>
    </div>
  );
}
