'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import BaseHeader from './BaseHeader';
import BaseSidebar from './BaseSidebar';
import BaseFooter from './BaseFooter';
import { roleLayoutConfig } from '../../config/roleLayoutConfig';
import { useLayoutAudit } from '../../hooks/useLayoutAudit';

interface BaseLayoutProps {
  children: React.ReactNode;
  /**
   * Show header (default: true)
   */
  showHeader?: boolean;
  /**
   * Show sidebar (default: true)
   */
  showSidebar?: boolean;
  /**
   * Show footer (default: true)
   */
  showFooter?: boolean;
  /**
   * Page identifier for audit tracking
   */
  pageId?: string;
  /**
   * Custom className for main content area
   */
  contentClassName?: string;
  /**
   * Enable layout audit on mount (default: process.env.NODE_ENV === 'development')
   */
  enableAudit?: boolean;
}

/**
 * BaseLayout - Unified layout wrapper for all ERP pages
 * 
 * Features:
 * - Role-based component visibility
 * - Responsive mobile/tablet/desktop layouts
 * - Integrated header, sidebar, and footer
 * - Layout audit system
 * - Dark mode support
 * - Accessibility compliant
 * 
 * @example
 * ```tsx
 * <BaseLayout pageId="dashboard">
 *   <YourPageContent />
 * </BaseLayout>
 * ```
 */
const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  showHeader = true,
  showSidebar = true,
  showFooter = true,
  pageId = 'unknown',
  contentClassName = '',
  enableAudit = process.env.NODE_ENV === 'development',
}) => {
  const { user, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Layout audit hook
  const { auditResult, runAudit } = useLayoutAudit({
    verbose: enableAudit,
  });

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Run layout audit on mount and when user role changes
  useEffect(() => {
    if (enableAudit && user && !loading) {
      runAudit();
    }
  }, [enableAudit, user, loading, runAudit]);

  // Get role-specific layout config
  const layoutConfig = user?.roleName 
    ? roleLayoutConfig[user.roleName] || roleLayoutConfig.DEFAULT
    : roleLayoutConfig.DEFAULT;

  // Override visibility based on role config
  const shouldShowHeader = showHeader && layoutConfig.showHeader !== false;
  const shouldShowSidebar = showSidebar && layoutConfig.showSidebar !== false;
  const shouldShowFooter = showFooter && layoutConfig.showFooter !== false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Layout Audit Panel (Development Only) */}
      {enableAudit && auditResult && process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-bold text-sm">Layout Audit: {pageId}</h3>
              <button
                onClick={runAudit}
                className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
              >
                Re-run
              </button>
            </div>
            <div className="space-y-1 text-xs">
              {auditResult.findings.slice(0, 10).map((finding, idx) => (
                <div key={idx} className={`flex items-start gap-2 ${finding.status === 'pass' ? 'text-green-400' : 'text-yellow-400'}`}>
                  <span>{finding.status === 'pass' ? '✅' : '⚠️'}</span>
                  <span className="flex-1">
                    <span className="font-semibold">{finding.check}:</span> {finding.message}
                  </span>
                </div>
              ))}
              {auditResult.findings.length > 10 && (
                <div className="text-gray-500 text-center pt-2">
                  ... and {auditResult.findings.length - 10} more checks
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Score: {((auditResult.passed / auditResult.totalChecks) * 100).toFixed(1)}%</span>
                <span>{auditResult.passed}/{auditResult.totalChecks} passed</span>
              </div>
              <div className="flex gap-4 mt-1">
                <span className="text-red-400">🔴 {auditResult.errors.length} errors</span>
                <span className="text-yellow-400">⚠️ {auditResult.warnings.length} warnings</span>
                <span className="text-green-400">ℹ️ {auditResult.infos.length} info</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Container */}
      <div 
        className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex flex-col"
        data-layout-version="1.0.0"
        data-page-id={pageId}
        data-user-role={user?.roleName || 'guest'}
      >
        {/* Header */}
        {shouldShowHeader && (
          <BaseHeader
            user={user}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            isMobile={isMobile}
          />
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {shouldShowSidebar && (
            <BaseSidebar
              user={user}
              collapsed={sidebarCollapsed}
              onCollapse={setSidebarCollapsed}
              isMobile={isMobile}
            />
          )}

          {/* Main Content */}
          <main
            className={`
              flex-1 overflow-auto
              ${shouldShowSidebar && !sidebarCollapsed ? 'ml-0' : ''}
              ${contentClassName}
            `}
            role="main"
            aria-label="Main content"
          >
            <div className="p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>

        {/* Footer */}
        {shouldShowFooter && (
          <BaseFooter user={user} />
        )}
      </div>
    </>
  );
};

export default BaseLayout;
