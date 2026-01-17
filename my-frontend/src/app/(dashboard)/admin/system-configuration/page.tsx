'use client';

import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Mail, 
  Bell, 
  Shield, 
  Globe, 
  Palette,
  Database,
  Cloud,
  Key,
  Users,
  Building,
  Clock,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Lock,
  FileText
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface SettingSection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

interface Setting {
  id: string;
  name: string;
  description: string;
  type: 'toggle' | 'text' | 'select' | 'number' | 'email';
  value: string | boolean | number;
  options?: { label: string; value: string }[];
  category: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const settingSections: SettingSection[] = [
  { id: 'general', name: 'General', description: 'Basic system configuration', icon: Settings },
  { id: 'company', name: 'Company', description: 'Organization details', icon: Building },
  { id: 'security', name: 'Security', description: 'Security and authentication', icon: Shield },
  { id: 'notifications', name: 'Notifications', description: 'Email and alerts', icon: Bell },
  { id: 'localization', name: 'Localization', description: 'Language and regional settings', icon: Globe },
  { id: 'appearance', name: 'Appearance', description: 'Theme and display', icon: Palette },
  { id: 'integrations', name: 'Integrations', description: 'Third-party connections', icon: Cloud },
  { id: 'backup', name: 'Backup & Data', description: 'Data management', icon: Database },
];

const mockSettings: Setting[] = [
  // General
  { id: 'sys_name', name: 'System Name', description: 'Name displayed in the application', type: 'text', value: 'BISMAN ERP', category: 'general' },
  { id: 'sys_url', name: 'System URL', description: 'Base URL of the application', type: 'text', value: 'https://erp.bisman.com', category: 'general' },
  { id: 'maintenance_mode', name: 'Maintenance Mode', description: 'Enable to show maintenance page', type: 'toggle', value: false, category: 'general' },
  { id: 'debug_mode', name: 'Debug Mode', description: 'Enable detailed error messages', type: 'toggle', value: false, category: 'general' },

  // Company
  { id: 'company_name', name: 'Company Name', description: 'Legal company name', type: 'text', value: 'Bisman Industries Pvt. Ltd.', category: 'company' },
  { id: 'company_email', name: 'Company Email', description: 'Primary contact email', type: 'email', value: 'info@bisman.com', category: 'company' },
  { id: 'company_phone', name: 'Company Phone', description: 'Primary contact number', type: 'text', value: '+91-1234567890', category: 'company' },
  { id: 'tax_id', name: 'Tax ID / GST', description: 'Tax identification number', type: 'text', value: '27AABCU9603R1ZM', category: 'company' },

  // Security
  { id: 'mfa_required', name: 'Require MFA', description: 'Require multi-factor authentication', type: 'toggle', value: true, category: 'security' },
  { id: 'session_timeout', name: 'Session Timeout', description: 'Auto-logout after inactivity (minutes)', type: 'number', value: 30, category: 'security' },
  { id: 'password_min_length', name: 'Min Password Length', description: 'Minimum password length', type: 'number', value: 8, category: 'security' },
  { id: 'password_expiry', name: 'Password Expiry', description: 'Days until password must be changed', type: 'number', value: 90, category: 'security' },
  { id: 'ip_whitelist', name: 'IP Whitelist', description: 'Restrict access to specific IPs', type: 'toggle', value: false, category: 'security' },

  // Notifications
  { id: 'email_notifications', name: 'Email Notifications', description: 'Enable email notifications', type: 'toggle', value: true, category: 'notifications' },
  { id: 'smtp_host', name: 'SMTP Host', description: 'Email server hostname', type: 'text', value: 'smtp.gmail.com', category: 'notifications' },
  { id: 'smtp_port', name: 'SMTP Port', description: 'Email server port', type: 'number', value: 587, category: 'notifications' },
  { id: 'notification_email', name: 'From Email', description: 'Sender email address', type: 'email', value: 'noreply@bisman.com', category: 'notifications' },
  { id: 'slack_integration', name: 'Slack Notifications', description: 'Send alerts to Slack', type: 'toggle', value: false, category: 'notifications' },

  // Localization
  { id: 'default_language', name: 'Default Language', description: 'System default language', type: 'select', value: 'en', options: [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
    { label: 'Spanish', value: 'es' },
    { label: 'French', value: 'fr' },
  ], category: 'localization' },
  { id: 'timezone', name: 'Timezone', description: 'System timezone', type: 'select', value: 'Asia/Kolkata', options: [
    { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
    { label: 'UTC', value: 'UTC' },
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'Europe/London (GMT)', value: 'Europe/London' },
  ], category: 'localization' },
  { id: 'date_format', name: 'Date Format', description: 'Display date format', type: 'select', value: 'DD/MM/YYYY', options: [
    { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
    { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
    { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
  ], category: 'localization' },
  { id: 'currency', name: 'Default Currency', description: 'System currency', type: 'select', value: 'INR', options: [
    { label: 'INR (₹)', value: 'INR' },
    { label: 'USD ($)', value: 'USD' },
    { label: 'EUR (€)', value: 'EUR' },
    { label: 'GBP (£)', value: 'GBP' },
  ], category: 'localization' },

  // Appearance
  { id: 'theme', name: 'Theme', description: 'Application theme', type: 'select', value: 'light', options: [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ], category: 'appearance' },
  { id: 'sidebar_collapsed', name: 'Collapsed Sidebar', description: 'Start with collapsed sidebar', type: 'toggle', value: false, category: 'appearance' },
  { id: 'compact_mode', name: 'Compact Mode', description: 'Reduce padding and spacing', type: 'toggle', value: false, category: 'appearance' },

  // Integrations
  { id: 'api_enabled', name: 'API Access', description: 'Enable external API access', type: 'toggle', value: true, category: 'integrations' },
  { id: 'webhook_enabled', name: 'Webhooks', description: 'Enable webhook notifications', type: 'toggle', value: true, category: 'integrations' },

  // Backup
  { id: 'auto_backup', name: 'Auto Backup', description: 'Enable automatic backups', type: 'toggle', value: true, category: 'backup' },
  { id: 'backup_frequency', name: 'Backup Frequency', description: 'How often to backup', type: 'select', value: 'daily', options: [
    { label: 'Hourly', value: 'hourly' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
  ], category: 'backup' },
  { id: 'backup_retention', name: 'Retention Days', description: 'Days to keep backups', type: 'number', value: 30, category: 'backup' },
];

// ============================================================================
// Sub-Components
// ============================================================================

function SettingInput({ setting, onChange }: { setting: Setting; onChange: (value: any) => void }) {
  switch (setting.type) {
    case 'toggle':
      return (
        <button
          onClick={() => onChange(!setting.value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            setting.value ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              setting.value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      );
    case 'select':
      return (
        <select
          value={String(setting.value)}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white text-sm w-48"
        >
          {setting.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case 'number':
      return (
        <input
          type="number"
          value={Number(setting.value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="px-3 py-2 border rounded-lg text-sm w-32"
        />
      );
    case 'email':
    case 'text':
    default:
      return (
        <input
          type={setting.type === 'email' ? 'email' : 'text'}
          value={String(setting.value)}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm w-64"
        />
      );
  }
}

function SettingRow({ setting, onChange }: { setting: Setting; onChange: (value: any) => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0">
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{setting.name}</h4>
        <p className="text-sm text-gray-500">{setting.description}</p>
      </div>
      <SettingInput setting={setting} onChange={onChange} />
    </div>
  );
}

function SectionCard({ 
  section, 
  isActive, 
  onClick 
}: { 
  section: SettingSection; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const Icon = section.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
        isActive 
          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
      <div className="flex-1">
        <p className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>{section.name}</p>
        <p className="text-xs text-gray-500">{section.description}</p>
      </div>
      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-300'}`} />
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SystemConfigurationPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState(mockSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredSettings = useMemo(() => {
    return settings.filter(s => s.category === activeSection);
  }, [settings, activeSection]);

  const handleSettingChange = (settingId: string, value: any) => {
    setSettings(prev => prev.map(s => 
      s.id === settingId ? { ...s, value } : s
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  const currentSection = settingSections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
            <p className="text-gray-500">Manage system-wide settings and preferences</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-2 text-yellow-600 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Unsaved changes
              </span>
            )}
            <button 
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                hasChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-72 bg-white border-r min-h-[calc(100vh-73px)] p-4">
          <div className="space-y-1">
            {settingSections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              />
            ))}
          </div>

          <div className="mt-8 pt-4 border-t">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">System Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Version</span>
                  <span className="font-medium">2.5.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Environment</span>
                  <span className="font-medium">Production</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="font-medium">Jan 15, 2024</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg border">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                {currentSection && (
                  <>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <currentSection.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{currentSection.name}</h2>
                      <p className="text-sm text-gray-500">{currentSection.description}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="p-6">
              {filteredSettings.map((setting) => (
                <SettingRow
                  key={setting.id}
                  setting={setting}
                  onChange={(value) => handleSettingChange(setting.id, value)}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions for specific sections */}
          {activeSection === 'security' && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <button className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:bg-gray-50">
                <Key className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Reset API Keys</p>
                  <p className="text-sm text-gray-500">Regenerate all API keys</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:bg-gray-50">
                <Users className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Force Logout All</p>
                  <p className="text-sm text-gray-500">Sign out all users</p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 bg-white border rounded-lg hover:bg-gray-50">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Security Audit</p>
                  <p className="text-sm text-gray-500">View security logs</p>
                </div>
              </button>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="mt-6 bg-white border rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Backups</h3>
              <div className="space-y-3">
                {[
                  { date: '2024-01-15 02:00', size: '2.4 GB', status: 'success' },
                  { date: '2024-01-14 02:00', size: '2.3 GB', status: 'success' },
                  { date: '2024-01-13 02:00', size: '2.3 GB', status: 'success' },
                ].map((backup, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium">{backup.date}</p>
                        <p className="text-sm text-gray-500">{backup.size}</p>
                      </div>
                    </div>
                    <button className="text-sm text-blue-600 hover:underline">Download</button>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                Create Manual Backup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
