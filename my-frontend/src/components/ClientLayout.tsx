"use client";

import { usePathname } from 'next/navigation';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { SocketProvider } from '../contexts/SocketContext';
import { ReportProvider } from '../contexts/ReportContext';
import { ColorThemeProvider } from '@/components/ColorThemeProvider';
import GlobalRouteLoader from '@/components/loading/GlobalRouteLoader';
import HealthBoot from '@/components/dev/HealthBoot';
import RenderLogger from '@/components/debug/RenderLogger';
import { ToastProvider } from '@/components/ui/toast';
import ChatGuard from '@/modules/chat/components/ChatGuard';
import GlobalErrorToast from '@/components/GlobalErrorToast';
import AppShell from '@/components/layout/AppShell';
import SplashWrapper from '@/components/SplashWrapper';
import { appConfig } from '@/config/appConfig';

// Create a stable QueryClient instance outside the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Public routes that should use minimal layout (no app providers)
const PUBLIC_ROUTES = ['/', '/landing', '/auth', '/login', '/signup', '/onboarding', '/get-started'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if current route is a public route
  const isPublicRoute = pathname === '/' || PUBLIC_ROUTES.some(route => route !== '/' && pathname?.startsWith(route));
  
  // For public routes, render children directly without heavy providers
  if (isPublicRoute) {
    return <>{children}</>;
  }
  
  // For app routes, use full providers
  return (
    <QueryClientProvider client={queryClient}>
      <ColorThemeProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <ReportProvider>
                <PermissionProvider>
                  <ToastProvider>
                    <RenderLogger />
                    <SplashWrapper companyName="BISMAN ERP">
                      <div className="min-h-screen pb-20 md:pb-0">
                        <AppShell>{children}</AppShell>
                        {appConfig.showConfigPanel && (
                        <div className="fixed bottom-4 right-4 z-50 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-xs max-w-xs space-y-1">
                          <div className="font-semibold text-gray-700 dark:text-gray-200">Runtime Config</div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <span className="text-gray-500 dark:text-gray-400">API Base:</span>
                            <span className="truncate" title={appConfig.apiBaseUrl}>{appConfig.apiBaseUrl}</span>
                            <span className="text-gray-500 dark:text-gray-400">Strict CSP:</span>
                            <span>{appConfig.strictCspEnabled ? 'on' : 'off'}</span>
                            <span className="text-gray-500 dark:text-gray-400">Env:</span>
                            <span>{appConfig.isProduction ? 'prod' : 'dev'}</span>
                          </div>
                        </div>
                      )}
                      </div>
                    </SplashWrapper>
                    <GlobalRouteLoader />
                    <GlobalErrorToast />
                    <HealthBoot />
                    <ChatGuard />
                  </ToastProvider>
                </PermissionProvider>
              </ReportProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </ColorThemeProvider>
    </QueryClientProvider>
  );
}
