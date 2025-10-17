import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import GlobalRouteLoader from '@/components/loading/GlobalRouteLoader';
import FloatingBottomNav from '@/components/ui/FloatingBottomNav';
import { useEffect } from 'react';
import { runApiHealthCheckOnce } from '@/utils/apiHealth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BISMAN ERP - Super Admin Dashboard',
  description: 'Comprehensive ERP system with RBAC support',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

function HealthBoot() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_HEALTH === '1' || process.env.NODE_ENV !== 'production') {
      runApiHealthCheckOnce();
    }
  }, []);
  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>
            <PermissionProvider>
              <div className="min-h-screen pb-20 md:pb-0">
                {children}
              </div>
              {/* Global route change loader shown on every page */}
              <GlobalRouteLoader />
              {/* Auth-only floating bottom navigation */}
              <FloatingBottomNav />
              {/* Health check bootstraper */}
              <HealthBoot />
            </PermissionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
