'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSaving(false);
    }
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 
                className="text-2xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Password & Authentication
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Update your password and security settings
              </p>
            </div>
          </div>

          {message && (
            <div 
              className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}
            >
              <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label 
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label 
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label 
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{ 
                backgroundColor: 'var(--accent)', 
                color: 'white'
              }}
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div 
            className="mt-8 pt-6 border-t"
            style={{ borderColor: 'var(--divider)' }}
          >
            <h3 
              className="font-semibold mb-3"
              style={{ color: 'var(--text-primary)' }}
            >
              Two-Factor Authentication
            </h3>
            <p 
              className="text-sm mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
            <button
              className="px-4 py-2 rounded-lg border transition-colors"
              style={{ 
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              Enable 2FA (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
