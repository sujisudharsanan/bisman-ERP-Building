/**
 * Integration Configuration Drawer
 * Right-side drawer for configuring integration settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Trash2
} from 'lucide-react';
import type { Integration, IntegrationConfig, EnvironmentType } from './types';

interface ConfigDrawerProps {
  integration: Integration | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (integration: Integration, config: IntegrationConfig) => void;
  onTest: (integration: Integration) => Promise<{ success: boolean; message: string }>;
  onDisconnect: (integration: Integration) => void;
}

export default function ConfigDrawer({
  integration,
  isOpen,
  onClose,
  onSave,
  onTest,
  onDisconnect,
}: ConfigDrawerProps) {
  const [config, setConfig] = useState<IntegrationConfig>({});
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    if (integration?.config) {
      setConfig({ ...integration.config });
    } else {
      setConfig({
        keyId: '',
        keySecret: '',
        webhookUrl: `https://api.bismanerp.com/webhooks/${integration?.id || 'integration'}/tenant`,
        environment: 'Production' as EnvironmentType,
        autoSync: false,
      });
    }
    setTestResult(null);
    setShowSecret(false);
    setShowDisconnectConfirm(false);
  }, [integration]);

  const handleCopyWebhook = () => {
    if (config.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestConnection = async () => {
    if (!integration) return;
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTest(integration);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection failed: Network error or timeout.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!integration) return;
    setIsSaving(true);
    
    try {
      await onSave(integration, config);
      // Brief delay to show save state
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    if (!integration) return;
    onDisconnect(integration);
    setShowDisconnectConfirm(false);
    onClose();
  };

  if (!isOpen || !integration) return null;

  const isConnected = integration.status === 'Connected';
  const needsAction = integration.status === 'Action Required';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {integration.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getCategorySettingsLabel(integration.category)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Action Required Alert */}
          {needsAction && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Action Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {integration.lastTested?.message || 'Please re-authenticate or update your credentials.'}
                </p>
              </div>
            </div>
          )}

          {/* Key ID Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Key ID / API Key
            </label>
            <input
              type="text"
              value={config.keyId || ''}
              onChange={(e) => setConfig({ ...config, keyId: e.target.value })}
              placeholder={getKeyIdPlaceholder(integration.id)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {getKeyIdHelpText(integration.id)}
            </p>
          </div>

          {/* Key Secret Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Key Secret / API Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={config.keySecret || ''}
                onChange={(e) => setConfig({ ...config, keySecret: e.target.value })}
                placeholder="Enter your API secret"
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Webhook URL Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Webhook URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.webhookUrl || ''}
                readOnly
                className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 cursor-default"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Configure this URL in your {integration.name} dashboard to receive webhooks.
            </p>
          </div>

          {/* Environment Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Environment
            </label>
            <div className="flex gap-3">
              {(['Production', 'Sandbox'] as EnvironmentType[]).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setConfig({ ...config, environment: env })}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    config.environment === env
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-Sync Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable auto-sync
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Automatically sync data when changes are detected
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, autoSync: !config.autoSync })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                config.autoSync ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  config.autoSync ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`flex items-start gap-3 p-4 rounded-lg ${
              testResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  testResult.success 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                </p>
                <p className={`text-sm mt-1 ${
                  testResult.success 
                    ? 'text-green-700 dark:text-green-300' 
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Last Tested Info */}
          {integration.lastTested && !testResult && (
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              {integration.lastTested.success ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              Last test: {formatTimeAgo(integration.lastTested.timestamp)} — {integration.lastTested.success ? 'Success' : 'Failed'}
            </div>
          )}

          {/* Documentation Link */}
          <a
            href={getDocumentationUrl(integration.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View {integration.name} documentation
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </button>
          </div>

          {/* Disconnect Link */}
          {(isConnected || needsAction) && (
            <>
              {showDisconnectConfirm ? (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Are you sure you want to disconnect?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="w-full text-center text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Disconnect Integration
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function getCategorySettingsLabel(category: string): string {
  const labels: Record<string, string> = {
    Payment: 'Payment Gateway Settings',
    Communication: 'Messaging Integration Settings',
    Accounting: 'Accounting Sync Settings',
    Storage: 'Cloud Storage Settings',
    Automation: 'Automation Settings',
  };
  return labels[category] || 'Integration Settings';
}

function getKeyIdPlaceholder(integrationId: string): string {
  const placeholders: Record<string, string> = {
    razorpay: 'rzp_live_8dX1Example123',
    stripe: 'sk_live_xxxxxxxxxxxxx',
    'twilio-sms': 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    'whatsapp-cloud': 'EAAG...',
    sendgrid: 'SG.xxxxxxxxxxxxxxxxxxxx',
    'amazon-s3': 'AKIAIOSFODNN7EXAMPLE',
    'google-drive': 'client_id@project.iam.gserviceaccount.com',
    tally: 'TALLY-xxxxx',
    quickbooks: 'QB-REALM-xxxxx',
    zapier: 'zap_xxxxxxxxxxxxxxxx',
  };
  return placeholders[integrationId] || 'Enter your API key';
}

function getKeyIdHelpText(integrationId: string): string {
  const helpTexts: Record<string, string> = {
    razorpay: 'Find this in your Razorpay Dashboard → Settings → API Keys',
    stripe: 'Get your API keys from Stripe Dashboard → Developers → API keys',
    'twilio-sms': 'Your Account SID from the Twilio Console',
    'whatsapp-cloud': 'Access token from Meta Business Suite',
    sendgrid: 'Create an API key in SendGrid Settings → API Keys',
    'amazon-s3': 'Your AWS Access Key ID from IAM Console',
    'google-drive': 'Service account email from Google Cloud Console',
    tally: 'Connector license key from Tally.ERP 9',
    quickbooks: 'Your Realm ID from QuickBooks Developer Portal',
    zapier: 'Your webhook key from Zapier',
  };
  return helpTexts[integrationId] || 'Enter the API key or identifier for this integration';
}

function getDocumentationUrl(integrationId: string): string {
  const docs: Record<string, string> = {
    razorpay: 'https://razorpay.com/docs/',
    stripe: 'https://stripe.com/docs',
    'twilio-sms': 'https://www.twilio.com/docs',
    'whatsapp-cloud': 'https://developers.facebook.com/docs/whatsapp/',
    sendgrid: 'https://docs.sendgrid.com/',
    'amazon-s3': 'https://docs.aws.amazon.com/s3/',
    'google-drive': 'https://developers.google.com/drive/',
    tally: 'https://tallysolutions.com/',
    quickbooks: 'https://developer.intuit.com/',
    zapier: 'https://zapier.com/developer/',
  };
  return docs[integrationId] || '#';
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
