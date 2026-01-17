'use client';

import React, { useState } from 'react';
import { DockSettings } from '@/components/dock';
import { 
  ArrowLeft, 
  Bell, 
  User, 
  Shield, 
  Palette, 
  Globe, 
  Mail,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Save,
  Check
} from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    taskUpdates: true,
    systemAlerts: true,
    reportReady: true,
    weeklyDigest: false
  });

  const [appearance, setAppearance] = useState({
    theme: 'dark',
    compactMode: false,
    animationsEnabled: true
  });

  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-gray-400 text-sm">Customize your dashboard experience</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved!' : 'Save Changes'}</span>
          </button>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Dock Settings */}
          <DockSettings />

          {/* Notifications Section */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <p className="text-sm text-gray-400">Configure how you receive alerts and updates</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-white">Email</span>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, email: !prev.email }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifications.email ? 'bg-indigo-600' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notifications.email ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <span className="text-white">Push</span>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, push: !prev.push }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifications.push ? 'bg-indigo-600' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notifications.push ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <span className="text-white">SMS</span>
                  </div>
                  <button
                    onClick={() => setNotifications(prev => ({ ...prev, sms: !prev.sms }))}
                    className={`w-12 h-6 rounded-full transition-colors ${notifications.sms ? 'bg-indigo-600' : 'bg-gray-600'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${notifications.sms ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Notification Types</h4>
                <div className="space-y-3">
                  {[
                    { key: 'taskUpdates', label: 'Task Updates', desc: 'Get notified when tasks are assigned or updated' },
                    { key: 'systemAlerts', label: 'System Alerts', desc: 'Important system notifications and alerts' },
                    { key: 'reportReady', label: 'Report Ready', desc: 'Notification when reports are generated' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of activities' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-white text-sm">{item.label}</p>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                        className={`w-10 h-5 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-indigo-600' : 'bg-gray-600'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Palette className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Appearance</h3>
                <p className="text-sm text-gray-400">Customize the look and feel</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-3 block">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Monitor }
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => setAppearance(prev => ({ ...prev, theme: theme.value }))}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                        appearance.theme === theme.value 
                          ? 'border-indigo-500 bg-indigo-500/20 text-white' 
                          : 'border-slate-700 bg-slate-900/50 text-gray-400 hover:text-white'
                      }`}
                    >
                      <theme.icon className="w-4 h-4" />
                      <span className="text-sm">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-700">
                <div>
                  <p className="text-white text-sm">Compact Mode</p>
                  <p className="text-gray-500 text-xs">Reduce spacing and padding</p>
                </div>
                <button
                  onClick={() => setAppearance(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                  className={`w-10 h-5 rounded-full transition-colors ${appearance.compactMode ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${appearance.compactMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-700">
                <div>
                  <p className="text-white text-sm">Animations</p>
                  <p className="text-gray-500 text-xs">Enable smooth transitions</p>
                </div>
                <button
                  onClick={() => setAppearance(prev => ({ ...prev, animationsEnabled: !prev.animationsEnabled }))}
                  className={`w-10 h-5 rounded-full transition-colors ${appearance.animationsEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${appearance.animationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Localization Section */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Globe className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Localization</h3>
                <p className="text-sm text-gray-400">Language and regional settings</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Account</h3>
                <p className="text-sm text-gray-400">Manage your account settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Change Password</p>
                  <p className="text-gray-500 text-sm">Update your password regularly for security</p>
                </div>
                <Link href="/settings/security" className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
                  Change
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-gray-500 text-sm">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                  Enable
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Active Sessions</p>
                  <p className="text-gray-500 text-sm">Manage devices where you're logged in</p>
                </div>
                <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
                  View All
                </button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Security & Privacy</h3>
                <p className="text-sm text-gray-400">Control your security preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white text-sm">Session Timeout</p>
                  <p className="text-gray-500 text-xs">Auto-logout after inactivity</p>
                </div>
                <select className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-700">
                <div>
                  <p className="text-white text-sm">Login Notifications</p>
                  <p className="text-gray-500 text-xs">Get alerted on new logins</p>
                </div>
                <button className="w-10 h-5 rounded-full bg-indigo-600">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5" />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-700">
                <div>
                  <p className="text-white text-sm">Activity Logs</p>
                  <p className="text-gray-500 text-xs">Track account activity</p>
                </div>
                <button className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm">
                  View Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
