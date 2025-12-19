'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ThemeSelector from '@/components/ThemeSelector';

export default function UserSettingsPage() {
  const router = useRouter();
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
      } else if (response.status === 401) {
        // Not authenticated, redirect to login
        router.push('/auth/login');
        return;
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // If no user after loading, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

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

            {/* Trust & Security Section */}
            <div 
              className="border-b pb-6"
              style={{ borderColor: 'var(--divider)' }}
            >
              <h2 
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Trust & Security
              </h2>
              <p 
                className="text-sm mb-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                Manage your account security, privacy settings, and trusted devices.
              </p>
              <div className="grid gap-3">
                <button
                  onClick={() => router.push('/settings/security')}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-80"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Password & Authentication</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push('/settings/sessions')}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-80"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Active Sessions & Devices</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => router.push('/settings/privacy')}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-80"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Privacy Settings</span>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Create New User Section - Only visible for users with user-management permission */}
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ENTERPRISE_ADMIN' || user?.role === 'HR' || user?.role === 'HR_MANAGER') && (
              <div>
                <h2 
                  className="text-xl font-semibold mb-4"
                  style={{ color: 'var(--text-primary)' }}
                >
                  User Management
                </h2>
                <p 
                  className="text-sm mb-4"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Create and manage user accounts for your organization.
                </p>
                <div className="grid gap-3">
                  <button
                    onClick={() => router.push('/hr/user-creation')}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{ 
                      backgroundColor: 'var(--accent)', 
                      borderColor: 'var(--accent)',
                      color: 'white'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span className="font-medium">Create New User</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => router.push('/super-admin/system/user-management')}
                    className="flex items-center justify-between px-4 py-3 rounded-lg border transition-colors hover:bg-opacity-80"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Manage All Users</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
