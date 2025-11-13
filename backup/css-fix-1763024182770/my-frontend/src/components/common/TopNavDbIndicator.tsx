'use client';

import React, { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle } from 'lucide-react';
import type { DatabaseStatus } from '@/types/user-management';

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
  const getStatusColor = () => {
    return 'bg-panel border border-theme text-theme';
  };

  const getStatusDotStyle = () => {
    if (status.connected) return { background: '#10B981' }; // green-500
    return { background: '#EF4444' }; // red-500
  };

  const getStatusIcon = () => {
    if (status.connected) {
      return <CheckCircle className="w-3 h-3 text-theme" />;
    }
    return <AlertCircle className="w-3 h-3 text-theme" />;
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
        <Database className="w-3 h-3 text-theme" />
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
