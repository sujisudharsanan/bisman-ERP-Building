'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    showProfileToTeam: true,
    showActivityStatus: true,
    allowDataExport: true,
    marketingEmails: false,
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Call API to save privacy settings
    setTimeout(() => {
      setSaving(false);
      alert('Privacy settings saved');
    }, 500);
  };

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 mb-6 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settings
        </button>

        <div 
          className="rounded-lg p-8 shadow-lg border"
          style={{ 
            backgroundColor: 'var(--bg-panel)', 
            borderColor: 'var(--border)' 
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 
                className="text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Privacy Settings
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Control your data and visibility
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profile Visibility */}
            <div 
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h3 
                  className="font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Profile Visible to Team
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Allow team members to view your profile information
                </p>
              </div>
              <button
                onClick={() => handleToggle('showProfileToTeam')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.showProfileToTeam ? '' : 'bg-gray-300'}`}
                style={{ backgroundColor: settings.showProfileToTeam ? 'var(--accent)' : undefined }}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showProfileToTeam ? 'left-7' : 'left-1'}`}
                />
              </button>
            </div>

            {/* Activity Status */}
            <div 
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h3 
                  className="font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Show Activity Status
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Let others see when you're online or active
                </p>
              </div>
              <button
                onClick={() => handleToggle('showActivityStatus')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.showActivityStatus ? '' : 'bg-gray-300'}`}
                style={{ backgroundColor: settings.showActivityStatus ? 'var(--accent)' : undefined }}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showActivityStatus ? 'left-7' : 'left-1'}`}
                />
              </button>
            </div>

            {/* Data Export */}
            <div 
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h3 
                  className="font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Allow Data Export
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Enable downloading your personal data
                </p>
              </div>
              <button
                onClick={() => handleToggle('allowDataExport')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.allowDataExport ? '' : 'bg-gray-300'}`}
                style={{ backgroundColor: settings.allowDataExport ? 'var(--accent)' : undefined }}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.allowDataExport ? 'left-7' : 'left-1'}`}
                />
              </button>
            </div>

            {/* Marketing Emails */}
            <div 
              className="flex items-center justify-between p-4 rounded-lg border"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h3 
                  className="font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Marketing Communications
                </h3>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Receive product updates and promotional emails
                </p>
              </div>
              <button
                onClick={() => handleToggle('marketingEmails')}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.marketingEmails ? '' : 'bg-gray-300'}`}
                style={{ backgroundColor: settings.marketingEmails ? 'var(--accent)' : undefined }}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.marketingEmails ? 'left-7' : 'left-1'}`}
                />
              </button>
            </div>
          </div>

          <div 
            className="mt-8 pt-6 border-t flex justify-end"
            style={{ borderColor: 'var(--divider)' }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: 'var(--accent)', 
                color: 'white'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
