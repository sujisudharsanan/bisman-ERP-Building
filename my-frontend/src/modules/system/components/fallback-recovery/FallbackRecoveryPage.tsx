/**
 * Fallback & Recovery Page
 * SuperAdmin area for incident management, system recovery, and safety controls
 * 
 * Purpose:
 * - Investigate and understand what went wrong
 * - Put the system into safe mode (maintenance)
 * - Roll back to last stable build
 * - Restore from backup
 * - Run diagnostics and health checks
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import {
  AlertTriangle,
  RefreshCw,
  Activity,
  Shield,
  Database,
  Wrench,
  ToggleLeft,
} from '@/lib/ssr-safe-icons';
import { getEnvironmentInfo } from '@/services/fallbackService';
import type { Environment } from '@/types/fallback';

// Import tab components
import IncidentSummaryTab from './IncidentSummaryTab';
import RecoveryActionsTab from './RecoveryActionsTab';
import BackupsRestoreTab from './BackupsRestoreTab';
import DiagnosticsTab from './DiagnosticsTab';
import SafetySwitchesTab from './SafetySwitchesTab';

// Tab configuration
const TABS = [
  { id: 'incidents', label: 'Incident Summary', icon: AlertTriangle },
  { id: 'recovery', label: 'Recovery Actions', icon: Wrench },
  { id: 'backups', label: 'Backups & Restore', icon: Database },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  { id: 'safety', label: 'Safety Switches', icon: Shield },
] as const;

type TabId = typeof TABS[number]['id'];

// Environment badge component
function EnvironmentBadge({ 
  environment, 
  loading 
}: { 
  environment: Environment | null; 
  loading: boolean 
}) {
  if (loading) {
    return (
      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-full" />
    );
  }

  const getEnvConfig = (env: Environment | null) => {
    switch (env) {
      case 'production':
        return { 
          bg: 'bg-red-100 dark:bg-red-900/30', 
          text: 'text-red-700 dark:text-red-300',
          label: 'Production'
        };
      case 'staging':
        return { 
          bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
          text: 'text-yellow-700 dark:text-yellow-300',
          label: 'Staging'
        };
      case 'uat':
        return { 
          bg: 'bg-blue-100 dark:bg-blue-900/30', 
          text: 'text-blue-700 dark:text-blue-300',
          label: 'UAT'
        };
      case 'development':
        return { 
          bg: 'bg-green-100 dark:bg-green-900/30', 
          text: 'text-green-700 dark:text-green-300',
          label: 'Development'
        };
      default:
        return { 
          bg: 'bg-gray-100 dark:bg-gray-700', 
          text: 'text-gray-700 dark:text-gray-300',
          label: 'Unknown'
        };
    }
  };

  const config = getEnvConfig(environment);

  return (
    <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export default function FallbackRecoveryPage() {
  const { hasAccess } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('incidents');
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [envLoading, setEnvLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch environment info
  const fetchEnvironment = useCallback(async () => {
    try {
      setEnvLoading(true);
      const info = await getEnvironmentInfo();
      setEnvironment(info.environment);
    } catch (error) {
      console.error('Failed to fetch environment info:', error);
      // Default to production if we can't determine
      setEnvironment(null);
    } finally {
      setEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironment();
  }, [fetchEnvironment]);

  // Global refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    fetchEnvironment();
  }, [fetchEnvironment]);

  // Access check
  if (!hasAccess('system-settings')) {
    return (
      <SuperAdminLayout title="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You don&apos;t have permission to access Fallback &amp; Recovery.
            </p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'incidents':
        return (
          <IncidentSummaryTab 
            key={`incidents-${refreshKey}`}
            onNavigateToRecovery={() => setActiveTab('recovery')} 
          />
        );
      case 'recovery':
        return (
          <RecoveryActionsTab 
            key={`recovery-${refreshKey}`}
            onNavigateToDiagnostics={() => setActiveTab('diagnostics')}
          />
        );
      case 'backups':
        return <BackupsRestoreTab key={`backups-${refreshKey}`} />;
      case 'diagnostics':
        return <DiagnosticsTab key={`diagnostics-${refreshKey}`} />;
      case 'safety':
        return <SafetySwitchesTab key={`safety-${refreshKey}`} />;
      default:
        return null;
    }
  };

  return (
    <SuperAdminLayout
      title="Fallback & Recovery"
      description="Investigate failures, roll back to safety, and restore system stability."
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Fallback &amp; Recovery
              </h1>
              <EnvironmentBadge environment={environment} loading={envLoading} />
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Investigate failures, roll back to safety, and restore system stability.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                    ${isActive 
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {renderTabContent()}
        </div>
      </div>
    </SuperAdminLayout>
  );
}
