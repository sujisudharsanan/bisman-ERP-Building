import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import GlobalRouteLoader from '@/components/loading/GlobalRouteLoader';
import FloatingBottomNav from '@/components/ui/FloatingBottomNav';
import HealthBoot from '@/components/dev/HealthBoot';
import RenderLogger from '@/components/debug/RenderLogger';
import { ToastProvider } from '@/components/ui/toast';
import ChatGuard from '@/components/ChatGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BISMAN ERP - Dashboard',
  description: 'Comprehensive ERP system with RBAC support',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
  <body className={`${inter.className} bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>
            <PermissionProvider>
      <ToastProvider>
              <RenderLogger />
              <div className="min-h-screen pb-20 md:pb-0">
                {children}
              </div>
              {/* Global route change loader shown on every page */}
              <GlobalRouteLoader />
              {/* Auth-only floating bottom navigation */}
              <FloatingBottomNav />
              {/* Health check bootstraper (client-only) */}
              <HealthBoot />
              {/* Chat widget guarded: hidden on public routes and when not authenticated */}
              <ChatGuard />
      </ToastProvider>
            </PermissionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
