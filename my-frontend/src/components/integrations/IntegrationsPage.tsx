/**
 * Integrations Page
 * Comprehensive integrations management for BISMAN ERP Admin
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw,
  Plug,
  Link2,
  Webhook,
  History,
  Database,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Loader2
} from 'lucide-react';
import IntegrationCard from './IntegrationCard';
import ConfigDrawer from './ConfigDrawer';
import type { 
  Integration, 
  IntegrationConfig, 
  IntegrationCategory,
  TabType,
  WebhookEvent,
  SyncLog,
  BackupIntegration
} from './types';
import { 
  INTEGRATIONS_DATA, 
  WEBHOOK_EVENTS, 
  SYNC_LOGS, 
  BACKUP_INTEGRATIONS,
  TENANTS,
  CATEGORY_COLORS,
  STATUS_COLORS
} from './data';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Integrations', icon: Plug },
  { id: 'connected', label: 'Connected', icon: Link2 },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'sync-logs', label: 'Sync Logs', icon: History },
  { id: 'backup', label: 'Backup Integrations', icon: Database },
];

const CATEGORIES: IntegrationCategory[] = [
  'Payment',
  'Communication',
  'Accounting',
  'Storage',
  'Automation',
];

export default function IntegrationsPage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | 'all'>('all');
  const [selectedTenant, setSelectedTenant] = useState(TENANTS[0]);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_DATA);
  const [webhookEvents] = useState<WebhookEvent[]>(WEBHOOK_EVENTS);
  const [syncLogs] = useState<SyncLog[]>(SYNC_LOGS);
  const [backupIntegrations] = useState<BackupIntegration[]>(BACKUP_INTEGRATIONS);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter integrations based on tab, search, and category
  const filteredIntegrations = useMemo(() => {
    let filtered = [...integrations];

    // Tab filter
    if (activeTab === 'connected') {
      filtered = filtered.filter(i => i.status === 'Connected' || i.status === 'Action Required');
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query) ||
        i.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(i => i.category === categoryFilter);
    }

    return filtered;
  }, [integrations, activeTab, searchQuery, categoryFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: integrations.length,
    connected: integrations.filter(i => i.status === 'Connected').length,
    actionRequired: integrations.filter(i => i.status === 'Action Required').length,
    notConnected: integrations.filter(i => i.status === 'Not Connected').length,
  }), [integrations]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const handleConnect = useCallback((integration: Integration) => {
    setSelectedIntegration(integration);
    setIsDrawerOpen(true);
  }, []);

  const handleConfigure = useCallback((integration: Integration) => {
    setSelectedIntegration(integration);
    setIsDrawerOpen(true);
  }, []);

  const handleTest = useCallback(async (integration: Integration) => {
    // Simulate test
    console.log('Testing integration:', integration.id);
    // In real app, this would call API
  }, []);

  const handleSave = useCallback((integration: Integration, config: IntegrationConfig) => {
    setIntegrations(prev => prev.map(i => 
      i.id === integration.id 
        ? { 
            ...i, 
            config,
            status: 'Connected',
            connectedAt: new Date(),
            lastTested: {
              success: true,
              timestamp: new Date(),
              message: 'Configuration saved successfully',
            }
          } 
        : i
    ));
    setIsDrawerOpen(false);
  }, []);

  const handleTestConnection = useCallback(async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    // Simulate API test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Random success/failure for demo
    const success = Math.random() > 0.3;
    return {
      success,
      message: success 
        ? 'Connection verified successfully. All endpoints are reachable.' 
        : 'Connection failed: Invalid API key or network timeout.',
    };
  }, []);

  const handleDisconnect = useCallback((integration: Integration) => {
    setIntegrations(prev => prev.map(i => 
      i.id === integration.id 
        ? { 
            ...i, 
            status: 'Not Connected' as const,
            config: undefined,
            connectedAt: undefined,
            lastTested: undefined,
          } 
        : i
    ));
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Integrations
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Connect external services, sync data, and manage automation for this tenant.
          </p>
        </div>

        {/* Tenant Selector */}
        <div className="relative">
          <button
            onClick={() => setShowTenantDropdown(!showTenantDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="max-w-[200px] truncate">{selectedTenant.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>
          
          {showTenantDropdown && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowTenantDropdown(false)} 
              />
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1">
                {TENANTS.map(tenant => (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setShowTenantDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      selectedTenant.id === tenant.id 
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tenant.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Integrations"
          value={stats.total}
          icon={Plug}
          color="blue"
        />
        <StatCard
          label="Connected"
          value={stats.connected}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Action Required"
          value={stats.actionRequired}
          icon={AlertCircle}
          color="yellow"
        />
        <StatCard
          label="Not Connected"
          value={stats.notConnected}
          icon={XCircle}
          color="gray"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {(activeTab === 'all' || activeTab === 'connected') && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as IntegrationCategory | 'all')}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Integration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredIntegrations.map(integration => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={handleConnect}
                onConfigure={handleConfigure}
                onTest={handleTest}
              />
            ))}
          </div>

          {filteredIntegrations.length === 0 && (
            <EmptyState
              icon={Plug}
              title="No integrations found"
              description={searchQuery || categoryFilter !== 'all' 
                ? "Try adjusting your search or filters" 
                : "No integrations available"}
            />
          )}
        </>
      )}

      {activeTab === 'webhooks' && (
        <WebhooksTab events={webhookEvents} />
      )}

      {activeTab === 'sync-logs' && (
        <SyncLogsTab logs={syncLogs} />
      )}

      {activeTab === 'backup' && (
        <BackupTab backups={backupIntegrations} />
      )}

      {/* Configuration Drawer */}
      <ConfigDrawer
        integration={selectedIntegration}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSave}
        onTest={handleTestConnection}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
}

// Sub-components

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType; 
  color: 'blue' | 'green' | 'yellow' | 'gray';
}) {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
    green: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
    gray: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

function WebhooksTab({ events }: { events: WebhookEvent[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recent Webhook Events
        </h3>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View all events
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Integration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Response
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
              {events.map(event => (
                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {event.integrationName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                      {event.eventType}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'success' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : event.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {event.status === 'success' && <CheckCircle className="w-3 h-3" />}
                      {event.status === 'failed' && <XCircle className="w-3 h-3" />}
                      {event.status === 'pending' && <Clock className="w-3 h-3" />}
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(event.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {event.response}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SyncLogsTab({ logs }: { logs: SyncLog[] }) {
  const SyncTypeIcons = {
    inbound: ArrowDownLeft,
    outbound: ArrowUpRight,
    bidirectional: ArrowLeftRight,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Data Sync History
        </h3>
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View full history
        </button>
      </div>

      <div className="space-y-4">
          {logs.map(log => {
          const SyncIcon = SyncTypeIcons[log.syncType];
          
          // Map SyncStatus ('Success' | 'Failed' | 'Partial') to UI variants
          const isSuccess = log.status === 'Success';
          const isFailed = log.status === 'Failed';
          const isPartial = log.status === 'Partial';

          return (
            <div 
              key={log.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    isSuccess 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : isFailed
                      ? 'bg-red-100 dark:bg-red-900/30'
                      : 'bg-yellow-100 dark:bg-yellow-900/30'
                  }`}>
                    <SyncIcon className={`w-5 h-5 ${
                      isSuccess 
                        ? 'text-green-600 dark:text-green-400' 
                        : isFailed
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {log.integrationName}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {log.syncType.charAt(0).toUpperCase() + log.syncType.slice(1)} sync • {log.recordsProcessed} records processed
                      {log.recordsFailed > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {' '}• {log.recordsFailed} failed
                        </span>
                      )}
                    </p>
                    {log.errorMessage && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isSuccess 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : isFailed
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {isSuccess && <CheckCircle className="w-3 h-3" />}
                    {isFailed && <XCircle className="w-3 h-3" />}
                    {isPartial && <AlertCircle className="w-3 h-3" />}
                    {log.status}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTimeAgo(log.startedAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BackupTab({ backups }: { backups: BackupIntegration[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Backup Integrations
        </h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Configure New Backup
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {backups.map(backup => (
          <div 
            key={backup.id}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {backup.provider}
                </h4>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  backup.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : backup.status === 'inactive'
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {backup.status === 'active' && <CheckCircle className="w-3 h-3" />}
                  {backup.status === 'inactive' && <XCircle className="w-3 h-3" />}
                  {backup.status === 'error' && <AlertCircle className="w-3 h-3" />}
                  {backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                </span>
              </div>
              <Database className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total Backups</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{backup.totalBackups}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Storage Used</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{backup.storageUsed}</span>
              </div>
              {backup.lastBackup && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Last Backup</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatTimeAgo(backup.lastBackup)}
                  </span>
                </div>
              )}
              {backup.nextScheduledBackup && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Next Scheduled</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatTimeFromNow(backup.nextScheduledBackup)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex gap-2">
              <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                Configure
              </button>
              {backup.status === 'active' && (
                <button className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                  Backup Now
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function formatTimeFromNow(date: Date): string {
  const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
  
  if (seconds < 60) return 'in less than a minute';
  if (seconds < 3600) return `in ${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `in ${Math.floor(seconds / 3600)} hours`;
  return `in ${Math.floor(seconds / 86400)} days`;
}
