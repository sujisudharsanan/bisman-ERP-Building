/**
 * Safety Switches Tab
 * Maintenance mode controls and access restrictions for system protection
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Shield,
  Lock,
  Unlock,
  Users,
  UserX,
  Pause,
  Play,
  X,
} from '@/lib/ssr-safe-icons';
import {
  getMaintenanceStatus,
  setMaintenanceStatus,
  getAccessRestrictions,
  updateAccessRestrictions,
  getTenants,
} from '@/services/fallbackService';
import type { 
  MaintenanceStatus, 
  MaintenanceScope, 
  AccessRestrictions,
  TenantSummary,
} from '@/types/fallback';

// Format date helper
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// Status indicator component
function StatusIndicator({ enabled }: { enabled: boolean }) {
  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
      ${enabled 
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      }
    `}>
      <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
      {enabled ? 'Enabled' : 'Disabled'}
    </div>
  );
}

// Enable maintenance modal
function EnableMaintenanceModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  tenants,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    message: string;
    scope: MaintenanceScope;
    affectedTenantIds?: string[];
    expectedEndTime?: string;
  }) => void;
  loading: boolean;
  tenants: TenantSummary[];
}) {
  const [message, setMessage] = useState('');
  const [scope, setScope] = useState<MaintenanceScope>('all');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [expectedEndTime, setExpectedEndTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMessage('We are currently performing scheduled maintenance. The system will be back online shortly.');
      setScope('all');
      setSelectedTenants([]);
      setExpectedEndTime('');
    }
  }, [isOpen]);

  const handleTenantToggle = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const handleSubmit = () => {
    onConfirm({
      message,
      scope,
      affectedTenantIds: scope === 'selected_tenants' ? selectedTenants : undefined,
      expectedEndTime: expectedEndTime || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Enable Maintenance Mode
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Enabling maintenance mode will show a maintenance message to all affected users and prevent normal system access.
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message to Display
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the message users will see during maintenance..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              disabled={loading}
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scope
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="w-4 h-4 text-blue-600"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  All tenants (system-wide maintenance)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="selected_tenants"
                  checked={scope === 'selected_tenants'}
                  onChange={() => setScope('selected_tenants')}
                  className="w-4 h-4 text-blue-600"
                  disabled={loading}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Selected tenants only
                </span>
              </label>
            </div>
          </div>

          {/* Tenant selection */}
          {scope === 'selected_tenants' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Tenants
              </label>
              {tenants.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  No tenants available. API may not have returned tenant data.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                  {tenants.map((tenant) => (
                    <label
                      key={tenant.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTenants.includes(tenant.id)}
                        onChange={() => handleTenantToggle(tenant.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {tenant.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expected end time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expected End Time (optional)
            </label>
            <input
              type="datetime-local"
              value={expectedEndTime}
              onChange={(e) => setExpectedEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !message.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {loading ? 'Enabling...' : 'Enable Maintenance Mode'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast component
function Toast({ 
  type, 
  message, 
  onClose 
}: { 
  type: 'success' | 'error'; 
  message: string; 
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`
      fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
      ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
    `}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">×</button>
    </div>
  );
}

export default function SafetySwitchesTab() {
  // Maintenance state
  const [maintenanceStatus, setMaintenanceStatusState] = useState<MaintenanceStatus | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [maintenanceActionLoading, setMaintenanceActionLoading] = useState(false);
  const [showEnableModal, setShowEnableModal] = useState(false);

  // Access restrictions state
  const [accessRestrictions, setAccessRestrictionsState] = useState<AccessRestrictions | null>(null);
  const [restrictionsLoading, setRestrictionsLoading] = useState(true);
  const [restrictionsError, setRestrictionsError] = useState<string | null>(null);
  const [restrictionUpdating, setRestrictionUpdating] = useState<string | null>(null);

  // Tenants for selection
  const [tenants, setTenants] = useState<TenantSummary[]>([]);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch maintenance status
  const fetchMaintenanceStatus = useCallback(async () => {
    setMaintenanceLoading(true);
    setMaintenanceError(null);
    try {
      const status = await getMaintenanceStatus();
      setMaintenanceStatusState(status);
    } catch (err) {
      console.error('Failed to fetch maintenance status:', err);
      setMaintenanceError('Failed to load maintenance status. Please try again.');
      setMaintenanceStatusState(null);
    } finally {
      setMaintenanceLoading(false);
    }
  }, []);

  // Fetch access restrictions
  const fetchAccessRestrictions = useCallback(async () => {
    setRestrictionsLoading(true);
    setRestrictionsError(null);
    try {
      const restrictions = await getAccessRestrictions();
      setAccessRestrictionsState(restrictions);
    } catch (err) {
      console.error('Failed to fetch access restrictions:', err);
      setRestrictionsError('Failed to load access restrictions. Please try again.');
      setAccessRestrictionsState(null);
    } finally {
      setRestrictionsLoading(false);
    }
  }, []);

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    try {
      const tenantList = await getTenants();
      setTenants(tenantList);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setTenants([]);
    }
  }, []);

  useEffect(() => {
    fetchMaintenanceStatus();
    fetchAccessRestrictions();
    fetchTenants();
  }, [fetchMaintenanceStatus, fetchAccessRestrictions, fetchTenants]);

  // Enable maintenance mode
  const handleEnableMaintenance = async (data: {
    message: string;
    scope: MaintenanceScope;
    affectedTenantIds?: string[];
    expectedEndTime?: string;
  }) => {
    setMaintenanceActionLoading(true);
    try {
      const result = await setMaintenanceStatus({
        enabled: true,
        scope: data.scope,
        message: data.message,
        expectedEndTime: data.expectedEndTime,
        affectedTenantIds: data.affectedTenantIds,
      });

      if (result.success) {
        setToast({ type: 'success', message: result.message || 'Maintenance mode enabled' });
        setShowEnableModal(false);
        await fetchMaintenanceStatus();
      } else {
        setToast({ type: 'error', message: result.message || 'Failed to enable maintenance mode' });
      }
    } catch (err: any) {
      console.error('Failed to enable maintenance:', err);
      setToast({ type: 'error', message: err?.message || 'Failed to enable maintenance mode' });
    } finally {
      setMaintenanceActionLoading(false);
    }
  };

  // Disable maintenance mode
  const handleDisableMaintenance = async () => {
    setMaintenanceActionLoading(true);
    try {
      const result = await setMaintenanceStatus({ enabled: false });

      if (result.success) {
        setToast({ type: 'success', message: result.message || 'Maintenance mode disabled' });
        await fetchMaintenanceStatus();
      } else {
        setToast({ type: 'error', message: result.message || 'Failed to disable maintenance mode' });
      }
    } catch (err: any) {
      console.error('Failed to disable maintenance:', err);
      setToast({ type: 'error', message: err?.message || 'Failed to disable maintenance mode' });
    } finally {
      setMaintenanceActionLoading(false);
    }
  };

  // Toggle access restriction
  const handleToggleRestriction = async (
    key: 'restrictNewLoginsToAdmins' | 'blockNewDeployments',
    currentValue: boolean
  ) => {
    setRestrictionUpdating(key);
    try {
      const result = await updateAccessRestrictions({ [key]: !currentValue });

      if (result.success) {
        setToast({ type: 'success', message: result.message || 'Restriction updated' });
        await fetchAccessRestrictions();
      } else {
        setToast({ type: 'error', message: result.message || 'Failed to update restriction' });
      }
    } catch (err: any) {
      console.error('Failed to update restriction:', err);
      setToast({ type: 'error', message: err?.message || 'Failed to update restriction' });
    } finally {
      setRestrictionUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section A: Maintenance Mode */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Maintenance Mode
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Protect users while you fix issues by enabling maintenance mode.
            </p>
          </div>
        </div>

        {maintenanceLoading ? (
          <div className="h-32 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
        ) : maintenanceError ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{maintenanceError}</p>
            <button
              onClick={fetchMaintenanceStatus}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        ) : maintenanceStatus ? (
          <div className="space-y-4">
            {/* Current status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-4">
                <StatusIndicator enabled={maintenanceStatus.enabled} />
                {maintenanceStatus.enabled && maintenanceStatus.enabledAt && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Since {formatDate(maintenanceStatus.enabledAt)}
                  </span>
                )}
              </div>
              <button
                onClick={maintenanceStatus.enabled ? handleDisableMaintenance : () => setShowEnableModal(true)}
                disabled={maintenanceActionLoading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  maintenanceStatus.enabled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                {maintenanceActionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {maintenanceStatus.enabled ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    Disable Maintenance Mode
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Enable Maintenance Mode
                  </>
                )}
              </button>
            </div>

            {/* Maintenance details when enabled */}
            {maintenanceStatus.enabled && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div>
                  <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Scope</span>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {maintenanceStatus.scope === 'all' ? 'All tenants' : 'Selected tenants'}
                  </p>
                </div>
                {maintenanceStatus.enabledBy && (
                  <div>
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Enabled By</span>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">{maintenanceStatus.enabledBy}</p>
                  </div>
                )}
                {maintenanceStatus.expectedEndTime && (
                  <div>
                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Expected End</span>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {formatDate(maintenanceStatus.expectedEndTime)}
                    </p>
                  </div>
                )}
                <div className="sm:col-span-2 lg:col-span-3">
                  <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">Message</span>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{maintenanceStatus.message}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              Unable to load maintenance status.
            </p>
          </div>
        )}
      </div>

      {/* Section B: Access Restrictions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <UserX className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Access Restrictions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Limit system access during incident resolution.
            </p>
          </div>
        </div>

        {restrictionsLoading ? (
          <div className="space-y-4">
            <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
            <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded-lg animate-pulse" />
          </div>
        ) : restrictionsError ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{restrictionsError}</p>
            <button
              onClick={fetchAccessRestrictions}
              className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        ) : accessRestrictions ? (
          <div className="space-y-4">
            {/* Restrict new logins */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Restrict New Logins to Admins Only
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Only administrators can log in; regular users will see a temporary access message.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleRestriction('restrictNewLoginsToAdmins', accessRestrictions.restrictNewLoginsToAdmins)}
                disabled={restrictionUpdating === 'restrictNewLoginsToAdmins'}
                className={`
                  relative w-14 h-8 rounded-full transition-colors disabled:opacity-50
                  ${accessRestrictions.restrictNewLoginsToAdmins
                    ? 'bg-red-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}
              >
                {restrictionUpdating === 'restrictNewLoginsToAdmins' ? (
                  <RefreshCw className="w-4 h-4 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
                ) : (
                  <div className={`
                    absolute w-6 h-6 bg-white rounded-full top-1 transition-transform
                    ${accessRestrictions.restrictNewLoginsToAdmins ? 'translate-x-7' : 'translate-x-1'}
                  `} />
                )}
              </button>
            </div>

            {/* Block new deployments */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <Pause className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Block New Deployments During Incident
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Prevent new deployments until the current incident is resolved.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggleRestriction('blockNewDeployments', accessRestrictions.blockNewDeployments)}
                disabled={restrictionUpdating === 'blockNewDeployments'}
                className={`
                  relative w-14 h-8 rounded-full transition-colors disabled:opacity-50
                  ${accessRestrictions.blockNewDeployments
                    ? 'bg-red-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                  }
                `}
              >
                {restrictionUpdating === 'blockNewDeployments' ? (
                  <RefreshCw className="w-4 h-4 text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
                ) : (
                  <div className={`
                    absolute w-6 h-6 bg-white rounded-full top-1 transition-transform
                    ${accessRestrictions.blockNewDeployments ? 'translate-x-7' : 'translate-x-1'}
                  `} />
                )}
              </button>
            </div>

            {/* Last updated info */}
            {accessRestrictions.lastUpdatedAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                Last updated: {formatDate(accessRestrictions.lastUpdatedAt)}
                {accessRestrictions.lastUpdatedBy && ` by ${accessRestrictions.lastUpdatedBy}`}
              </p>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              Unable to load access restrictions.
            </p>
          </div>
        )}
      </div>

      {/* Enable Maintenance Modal */}
      <EnableMaintenanceModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onConfirm={handleEnableMaintenance}
        loading={maintenanceActionLoading}
        tenants={tenants}
      />

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
