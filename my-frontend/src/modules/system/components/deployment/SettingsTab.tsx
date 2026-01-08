/**
 * Deployment Center - Settings Tab
 * Deployment configuration settings with save functionality
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DeploymentSettings, Environment } from '@/types/deployment';
import { getDeploymentSettings, updateDeploymentSettings } from '@/services/deploymentService';
import {
  RefreshCw,
  XCircle,
  CheckCircle,
  Save,
} from '@/lib/ssr-safe-icons';

interface SettingsTabProps {
  tenantId: string;
}

// Toggle switch component
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
    </label>
  );
}

// Settings row component
function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex-1 pr-4">
        <div className="font-medium text-gray-900 dark:text-gray-100">{label}</div>
        {description && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsTab({ tenantId }: SettingsTabProps) {
  const [settings, setSettings] = useState<DeploymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Local form state
  const [formData, setFormData] = useState<Partial<DeploymentSettings>>({});

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDeploymentSettings(tenantId);
      setSettings(data);
      setFormData(data);
      setHasChanges(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateField = <K extends keyof DeploymentSettings>(
    field: K,
    value: DeploymentSettings[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateNotification = (
    field: keyof DeploymentSettings['notifications'],
    value: boolean | string
  ) => {
    setFormData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value,
      } as DeploymentSettings['notifications'],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateDeploymentSettings(tenantId, formData);
      showToast('success', 'Settings saved successfully');
      setHasChanges(false);
      await fetchSettings();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setHasChanges(false);
    }
  };

  const environments: Environment[] = ['production', 'staging', 'development', 'uat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to Load Settings</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚙️</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Settings Available</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Deployment settings have not been configured for this tenant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
          toast.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/50 border border-green-300 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/50 border border-red-300 text-red-700 dark:text-red-300'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">General Settings</h3>
        <div className="space-y-1">
          <SettingsRow
            label="Default Environment"
            description="The environment selected by default when deploying"
          >
            <select
              value={formData.defaultEnvironment || 'staging'}
              onChange={(e) => updateField('defaultEnvironment', e.target.value as Environment)}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm min-w-[160px]"
            >
              {(formData.environments || environments).map((env) => (
                <option key={env} value={env}>
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow
            label="Require Backup Before Production"
            description="Force a backup before any production deployment"
          >
            <Toggle
              checked={formData.requireBackupBeforeProduction ?? true}
              onChange={(v) => updateField('requireBackupBeforeProduction', v)}
              disabled={saving}
            />
          </SettingsRow>

          <SettingsRow
            label="Auto-run Health Check After Deployment"
            description="Automatically run health checks after each deployment"
          >
            <Toggle
              checked={formData.autoRunHealthCheckAfterDeployment ?? true}
              onChange={(v) => updateField('autoRunHealthCheckAfterDeployment', v)}
              disabled={saving}
            />
          </SettingsRow>

          <SettingsRow
            label="Max Concurrent Deployments"
            description="Maximum number of simultaneous deployments allowed"
          >
            <input
              type="number"
              min={1}
              max={10}
              value={formData.maxConcurrentDeployments ?? ''}
              onChange={(e) => updateField('maxConcurrentDeployments', e.target.value === '' ? 1 : parseInt(e.target.value))}
              disabled={saving}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm text-center"
            />
          </SettingsRow>

          <SettingsRow
            label="History Retention (Days)"
            description="Number of days to retain deployment history"
          >
            <input
              type="number"
              min={7}
              max={365}
              value={formData.retentionDays ?? ''}
              onChange={(e) => updateField('retentionDays', e.target.value === '' ? 90 : parseInt(e.target.value))}
              disabled={saving}
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm text-center"
            />
          </SettingsRow>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notification Settings</h3>
        <div className="space-y-1">
          <SettingsRow
            label="Email on Successful Deployment"
            description="Send email notification when deployment succeeds"
          >
            <Toggle
              checked={formData.notifications?.emailOnSuccess ?? false}
              onChange={(v) => updateNotification('emailOnSuccess', v)}
              disabled={saving}
            />
          </SettingsRow>

          <SettingsRow
            label="Email on Failed Deployment"
            description="Send email notification when deployment fails"
          >
            <Toggle
              checked={formData.notifications?.emailOnFailure ?? true}
              onChange={(v) => updateNotification('emailOnFailure', v)}
              disabled={saving}
            />
          </SettingsRow>

          <div className="py-4 border-b border-gray-100 dark:border-gray-700">
            <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">
              Slack Webhook URL
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Receive deployment notifications in your Slack channel
            </p>
            <input
              type="url"
              value={formData.notifications?.slackWebhookUrl || ''}
              onChange={(e) => updateNotification('slackWebhookUrl', e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              disabled={saving}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Webhook Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Webhook Integration</h3>
        <div className="py-2">
          <label className="block font-medium text-gray-900 dark:text-gray-100 mb-2">
            Deployment Webhook URL
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Receive POST requests with deployment events (start, success, failure, rollback)
          </p>
          <input
            type="url"
            value={formData.webhookUrl || ''}
            onChange={(e) => updateField('webhookUrl', e.target.value)}
            placeholder="https://your-api.com/webhooks/deployment"
            disabled={saving}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleReset}
          disabled={!hasChanges || saving}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}
