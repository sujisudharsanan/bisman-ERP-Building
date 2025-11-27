'use client';

import React, { useState, useEffect } from 'react';
import ThemeSelector from '@/components/ThemeSelector';

export default function UserSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-main)' }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ 
              borderColor: 'var(--border)', 
              borderTopColor: 'var(--accent)' 
            }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      <div className="max-w-4xl mx-auto">
        <div 
          className="rounded-lg p-8 shadow-lg border"
          style={{ 
            backgroundColor: 'var(--bg-panel)', 
            borderColor: 'var(--border)' 
          }}
        >
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            User Settings
          </h1>
          <p 
            className="mb-8"
            style={{ color: 'var(--text-secondary)' }}
          >
            Customize your BISMAN ERP experience
          </p>

          <div className="space-y-8">
            {/* Profile Section */}
            <div 
              className="border-b pb-6"
              style={{ borderColor: 'var(--divider)' }}
            >
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Profile Information
              </h2>
              <div className="grid gap-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Username
                  </label>
                  <div 
                    className="px-4 py-2 rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {user?.username || 'N/A'}
                  </div>
                </div>
                <div>
                  <label 
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Email
                  </label>
                  <div 
                    className="px-4 py-2 rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {user?.email || 'N/A'}
                  </div>
                </div>
                <div>
                  <label 
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Role
                  </label>
                  <div 
                    className="px-4 py-2 rounded-lg border inline-block"
                    style={{ 
                      backgroundColor: 'var(--accent)', 
                      borderColor: 'var(--accent)',
                      color: 'white'
                    }}
                  >
                    {user?.role || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Section */}
            <div 
              className="border-b pb-6"
              style={{ borderColor: 'var(--divider)' }}
            >
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Appearance
              </h2>
              <ThemeSelector variant="grid" />
            </div>

            {/* Notifications Section */}
            <div>
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Notifications
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>
                    Email notifications
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>
                    Task reminders
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>
                    System updates
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
