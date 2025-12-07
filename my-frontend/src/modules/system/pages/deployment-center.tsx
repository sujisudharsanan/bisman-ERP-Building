/**
 * Deployment Center - Main Page
 * Production-ready deployment management for BISMAN ERP SuperAdmin
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import {
  RefreshCw,
  AlertCircle,
  Settings,
  Clock,
  BarChart3,
} from '@/lib/ssr-safe-icons';

// Tab components
import OverviewTab from '@/modules/system/components/deployment/OverviewTab';
import PipelinesTab from '@/modules/system/components/deployment/PipelinesTab';
import HistoryTab from '@/modules/system/components/deployment/HistoryTab';
import RollbackTab from '@/modules/system/components/deployment/RollbackTab';
import SettingsTab from '@/modules/system/components/deployment/SettingsTab';

type TabId = 'overview' | 'pipelines' | 'history' | 'rollback' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'pipelines', label: 'Pipelines', icon: RefreshCw },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'rollback', label: 'Rollback', icon: AlertCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Environment badge component
function EnvironmentBadge({ environment }: { environment: string }) {
  const config = {
    production: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
    staging: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
    development: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
    uat: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  }[environment.toLowerCase()] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
      {environment.toUpperCase()}
    </span>
  );
}

export default function DeploymentCenter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasAccess, loading: authLoading, isAuthenticated } = useAuth();

  // Get current tab from URL or default to overview
  const currentTabParam = searchParams?.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    currentTabParam && tabs.some((t) => t.id === currentTabParam) ? currentTabParam : 'overview'
  );

  // Tenant ID - in a real app, this would come from context or route params
  const [tenantId, setTenantId] = useState<string>('current');
  
  // Environment - would come from API in production
  const [environment, setEnvironment] = useState<string>('staging');
  
  // Key to force tab refresh
  const [refreshKey, setRefreshKey] = useState(0);

  // Update URL when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      router.replace(url.pathname + url.search, { scroll: false });
    } catch {
      // Ignore URL update errors
    }
  };

  // Sync tab from URL on mount
  useEffect(() => {
    if (currentTabParam && tabs.some((t) => t.id === currentTabParam)) {
      setActiveTab(currentTabParam);
    }
  }, [currentTabParam]);

  // Handle successful deploy/rollback - refresh tabs
  const handleDeploymentChange = () => {
    setRefreshKey((k) => k + 1);
  };

  // Access check
  if (!authLoading && hasAccess && !hasAccess('system-settings')) {
    return (
      <SuperAdminLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              You don't have permission to access the Deployment Center. Please contact your administrator.
            </p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab
            key={`overview-${refreshKey}`}
            tenantId={tenantId}
            onDeploySuccess={handleDeploymentChange}
          />
        );
      case 'pipelines':
        return <PipelinesTab key={`pipelines-${refreshKey}`} tenantId={tenantId} />;
      case 'history':
        return <HistoryTab key={`history-${refreshKey}`} tenantId={tenantId} />;
      case 'rollback':
        return (
          <RollbackTab
            key={`rollback-${refreshKey}`}
            tenantId={tenantId}
            onRollbackSuccess={handleDeploymentChange}
          />
        );
      case 'settings':
        return <SettingsTab key={`settings-${refreshKey}`} tenantId={tenantId} />;
      default:
        return null;
    }
  };

  return (
    <SuperAdminLayout
      title="Deployment Center"
      description="Manage builds, backups, and post-deployment health for all environments"
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Deployment Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage builds, backups, and post-deployment health for all environments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <EnvironmentBadge environment={environment} />
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                      ${
                        isActive
                          ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">{renderTabContent()}</div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
