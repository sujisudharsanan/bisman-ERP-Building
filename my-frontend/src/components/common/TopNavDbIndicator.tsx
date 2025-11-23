'use client';

import React, { useState, useEffect } from 'react';
import type { DatabaseStatus } from '@/types/user-management';

// Client-only loader for lucide-react icons to avoid SSR-time imports
const useLucideIcons = () => {
  const [icons, setIcons] = useState<Record<string, any>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('lucide-react');
        if (!mounted) return;
        setIcons({ Database: mod.Database, AlertCircle: mod.AlertCircle, CheckCircle: mod.CheckCircle });
      } catch (e) {
        // ignore — fallbacks used
      }
    })();
    return () => { mounted = false; };
  }, []);
  return icons;
};

interface TopNavDbIndicatorProps {
  className?: string;
}

export function TopNavDbIndicator({ className = '' }: TopNavDbIndicatorProps) {
  const [status, setStatus] = useState<DatabaseStatus>({
    connected: false,
    last_check: new Date().toISOString(),
  });
  const [retryCount, setRetryCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const checkDatabaseStatus = async () => {
    try {
      // Prefer public health endpoint; fall back to Nest variant
      let response = await fetch('/api/health/database', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 404) {
        // Older backend variant
        response = await fetch('/api/health/db', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      }

  if (response.ok) {
        const json = await response.json();
        const data = json?.data || {};
        setStatus({
          connected: Boolean(data.connected),
          latency_ms: typeof data.response_time === 'number' ? data.response_time : undefined,
          last_check: new Date().toISOString(),
        });
        setRetryCount(0);
      } else {
        // 401/403 indicate auth/role issues; 500 likely DB error; show disconnected
        setStatus({ connected: false, last_check: new Date().toISOString() });
        setRetryCount(prev => prev + 1);
      }
    } catch (error) {
      setStatus({
        connected: false,
        last_check: new Date().toISOString(),
      });
      setRetryCount(prev => prev + 1);
    }
  };

  useEffect(() => {
    // Initial check
    checkDatabaseStatus();

    // Set up polling with exponential backoff
    const getPollingInterval = () => {
      if (status.connected) {
        return 10000; // 10 seconds when connected
      }
      // Exponential backoff: 10s, 20s, 40s, max 60s
      return Math.min(10000 * Math.pow(2, retryCount), 60000);
    };

    const interval = setInterval(checkDatabaseStatus, getPollingInterval());

    return () => clearInterval(interval);
  }, [status.connected, retryCount]);

  // For theme-awareness: use panel background and theme text, render a small colored status dot
  const getStatusColor = () => 'bg-panel border border-theme text-theme';
  const getStatusDotStyle = () => ({ background: status.connected ? '#10B981' : '#EF4444' });

  const icons = useLucideIcons();
  const getStatusIcon = () => {
    if (status.connected) {
      return icons.CheckCircle ? <icons.CheckCircle className="w-3 h-3 text-theme" /> : (
        <svg className="w-3 h-3 text-theme" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
      );
    }
    return icons.AlertCircle ? <icons.AlertCircle className="w-3 h-3 text-theme" /> : (
      <svg className="w-3 h-3 text-theme" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
    );
  };

  const getTooltipText = () => {
    if (status.connected) {
      const latency = status.latency_ms ? ` (${status.latency_ms}ms)` : '';
      return `Database Connected${latency}`;
    }
    // If DB not configured in backend env, show clearer hint
    return 'Database Disconnected';
  };

  const formatLastCheck = () => {
    const date = new Date(status.last_check);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) {
      return `${diffSecs}s ago`;
    }
    if (diffSecs < 3600) {
      return `${Math.floor(diffSecs / 60)}m ago`;
    }
    return date.toLocaleTimeString();
  };

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Database indicator */}
      <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
        {icons.Database ? (
          // Use client-loaded icon when available
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - icons is a runtime-loaded module
          <icons.Database className="w-3 h-3 text-theme" />
        ) : (
          // Fallback inline SVG for server-rendered builds
          <svg className="w-3 h-3 text-theme" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <ellipse cx="12" cy="5" rx="7" ry="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 5v7c0 1.1 3.13 2 7 2s7-.9 7-2V5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 12v5c0 1.1 3.13 2 7 2s7-.9 7-2v-5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <span className="w-2 h-2 rounded-full" style={getStatusDotStyle()} aria-hidden />
        <span className="hidden sm:inline">DB</span>
      </div>

      {/* Tooltip */}
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-panel text-theme text-xs rounded-lg shadow-lg z-50 whitespace-nowrap border border-theme">
          <div className="font-medium">{getTooltipText()}</div>
          <div className="text-muted">Last check: {formatLastCheck()}</div>
          {!status.connected && retryCount > 0 && (
            <div className="text-red-300">Retrying... ({retryCount})</div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute bottom-full right-3 w-2 h-2 bg-panel transform rotate-45 border-t border-l border-theme" />
        </div>
      )}
    </div>
  );
}

export default TopNavDbIndicator;
