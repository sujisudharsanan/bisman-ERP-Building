import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import './tawk-inline.css';
import { AuthProvider } from '../contexts/AuthContext';
import { PermissionProvider } from '../contexts/PermissionContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import GlobalRouteLoader from '@/components/loading/GlobalRouteLoader';
import HealthBoot from '@/components/dev/HealthBoot';
import RenderLogger from '@/components/debug/RenderLogger';
import { ToastProvider } from '@/components/ui/toast';
import ChatGuard from '@/components/ChatGuard';
import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { appConfig } from '@/config/appConfig';
// Helper component to inject a nonce-bearing inline script safely when strict CSP enabled
function NoncedScript({ code }: { code: string }) {
  // Obtain nonce from body attribute (rendered server-side) for client hydration
  const nonce = typeof document !== 'undefined' ? document.body.getAttribute('data-nonce') || undefined : undefined;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: code }} />;
}

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
  // Optional CSP nonce injection (strict mode) - server side only
  const cspStrict = process.env.CSP_STRICT === '1';
  const nonce = cspStrict ? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)) : undefined;
  const debugMinimal = process.env.DEBUG_MINIMAL_LAYOUT === '1';

  // Debug load state for shared components
  try {
    // eslint-disable-next-line no-console
    console.log('Loaded RootLayout deps:', {
      AuthProvider: typeof AuthProvider,
      PermissionProvider: typeof PermissionProvider,
      ThemeProvider: typeof ThemeProvider,
      AppShell: typeof AppShell,
      GlobalRouteLoader: typeof GlobalRouteLoader,
    });
  } catch {}

  if (debugMinimal) {
    // Render minimal layout to isolate provider/AppShell issues during build
    return (
      <html lang="en">
        <body data-nonce={nonce} className={`${inter.className} bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100`}>
          {children}
        </body>
      </html>
    );
  }
  return (
    <html lang="en">
  <body data-nonce={nonce} className={`${inter.className} bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>
            <PermissionProvider>
      <ToastProvider>
              <RenderLogger />
              <div className="min-h-screen pb-20 md:pb-0">
                <AppShell>{children}</AppShell>
                {appConfig.showConfigPanel && (
                  <div className="fixed bottom-4 right-4 z-50 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-xs max-w-xs space-y-1">
                    <div className="font-semibold text-gray-700 dark:text-gray-200">Runtime Config</div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <span className="text-gray-500 dark:text-gray-400">API Base:</span>
                      <span className="truncate" title={appConfig.apiBaseUrl}>{appConfig.apiBaseUrl}</span>
                      <span className="text-gray-500 dark:text-gray-400">Team Slug:</span>
                      <span>{appConfig.demoTeamSlug}</span>
                      <span className="text-gray-500 dark:text-gray-400">Strict CSP:</span>
                      <span>{appConfig.strictCspEnabled ? 'on' : 'off'}</span>
                      <span className="text-gray-500 dark:text-gray-400">Env:</span>
                      <span>{appConfig.isProduction ? 'prod' : 'dev'}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          // eslint-disable-next-line no-alert
                          alert('To hide this panel set NEXT_PUBLIC_SHOW_CONFIG=0');
                        }}
                        className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >Close Hint</button>
                      </div>
                      {/* Example safe inline script usage with nonce */}
                      {appConfig.strictCspEnabled && <NoncedScript code={"console.debug('config-panel-loaded')"} />}
                  </div>
                )}
              </div>
              {/* Global route change loader shown on every page */}
              <GlobalRouteLoader />
              {/* Health check bootstraper (client-only) */}
              <HealthBoot />
              {/* Chat widget guarded: hidden on public routes and when not authenticated */}
              <ChatGuard />
              {/* Single-window chat removed; using existing ChatGuard integration */}
      </ToastProvider>
            </PermissionProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
