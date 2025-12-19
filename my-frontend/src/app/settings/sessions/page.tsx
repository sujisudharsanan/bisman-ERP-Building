'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    setTimeout(() => {
      setSessions([
        {
          id: '1',
          device: 'MacBook Pro',
          browser: 'Chrome 120',
          location: 'Mumbai, India',
          lastActive: 'Now',
          isCurrent: true,
        },
        {
          id: '2',
          device: 'iPhone 15',
          browser: 'Safari',
          location: 'Mumbai, India',
          lastActive: '2 hours ago',
          isCurrent: false,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to end this session?')) {
      setSessions(sessions.filter(s => s.id !== sessionId));
      // TODO: Call API to revoke session
    }
  };

  const handleRevokeAllOthers = async () => {
    if (confirm('Are you sure you want to end all other sessions?')) {
      setSessions(sessions.filter(s => s.isCurrent));
      // TODO: Call API to revoke all other sessions
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 
                  className="text-2xl font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Active Sessions
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Manage your logged-in devices
                </p>
              </div>
            </div>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeAllOthers}
                className="px-4 py-2 text-sm rounded-lg border transition-colors"
                style={{ 
                  borderColor: 'var(--error, #ef4444)',
                  color: 'var(--error, #ef4444)'
                }}
              >
                End All Other Sessions
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div 
                className="w-8 h-8 border-4 rounded-full animate-spin mx-auto"
                style={{ 
                  borderColor: 'var(--border)', 
                  borderTopColor: 'var(--accent)' 
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: session.isCurrent ? 'var(--bg-secondary)' : 'transparent', 
                    borderColor: 'var(--border)' 
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {session.device}
                        </span>
                        {session.isCurrent && (
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: 'var(--accent)', 
                              color: 'white' 
                            }}
                          >
                            Current
                          </span>
                        )}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {session.browser} • {session.location} • {session.lastActive}
                      </div>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-sm px-3 py-1 rounded border transition-colors"
                      style={{ 
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      End Session
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
