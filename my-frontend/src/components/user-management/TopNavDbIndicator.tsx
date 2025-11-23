'use client';

import React, { useState, useEffect } from 'react';

interface DatabaseStatus {
  connected: boolean;
  responseTime?: number;
  lastChecked: Date;
  activeConnections?: number;
  reason?: 'NOT_CONFIGURED' | 'ERROR' | 'FORBIDDEN' | 'UNAUTHORIZED' | 'UNKNOWN';
}

export function TopNavDbIndicator() {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({
    connected: false,
    lastChecked: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [icons, setIcons] = useState<{ Database?: any; Wifi?: any; WifiOff?: any; Activity?: any }>({});

  const checkDatabaseStatus = async () => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Call public DB health route; fall back to Nest variant if not found
      let response = await fetch('/api/health/database', {
        method: 'GET',
        credentials: 'include', // send auth cookies
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 404) {
        response = await fetch('/api/health/db', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const responseTime = Date.now() - startTime;
  const json = await response.json().catch(() => ({} as any));

      // The backend returns { success, data: { connected, response_time, active_connections, reason? } }.
      // If calling Nest /api/health/db, it returns { ok: boolean }.
      if (response.ok) {
        const isNest = json && typeof json.ok === 'boolean' && !json.data;
        const connected = isNest ? Boolean(json.ok) : Boolean(json?.data?.connected);
        const activeConnections = isNest ? undefined : json?.data?.active_connections;
        const respTime = typeof (isNest ? undefined : json?.data?.response_time) === 'number' 
          ? json.data.response_time 
          : responseTime;
        const reason = isNest ? undefined : (json?.data?.reason as DatabaseStatus['reason'] | undefined);

        setDbStatus({
          connected,
          responseTime: respTime,
          lastChecked: new Date(),
          activeConnections,
          reason: connected ? undefined : reason || 'UNKNOWN',
        });
      } else {
        // Map common auth statuses
        const reason: DatabaseStatus['reason'] = response.status === 401
          ? 'UNAUTHORIZED'
          : response.status === 403
            ? 'FORBIDDEN'
            : 'ERROR';
        setDbStatus({
          connected: false,
          responseTime: Date.now() - startTime,
          lastChecked: new Date(),
          reason,
        });
      }
    } catch (error) {
      setDbStatus({
        connected: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        reason: 'ERROR',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkDatabaseStatus();
    
    // Set up periodic checks every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return;
      try {
        const mod = await import('lucide-react');
        if (!mounted) return;
        setIcons({ Database: mod.Database, Wifi: mod.Wifi, WifiOff: mod.WifiOff, Activity: mod.Activity });
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-500';
    if (dbStatus.connected) return 'text-green-500';
    if (dbStatus.reason === 'UNAUTHORIZED' || dbStatus.reason === 'FORBIDDEN') return 'text-amber-600';
    if (dbStatus.reason === 'NOT_CONFIGURED') return 'text-gray-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking...';
    if (dbStatus.connected) {
      return `Connected${dbStatus.responseTime ? ` (${dbStatus.responseTime}ms)` : ''}`;
    }
    switch (dbStatus.reason) {
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return 'No Access';
      case 'NOT_CONFIGURED':
        return 'Not configured';
      case 'ERROR':
      case 'UNKNOWN':
      default:
        return 'Disconnected';
    }
  };

  const StatusIcon = () => {
    if (isLoading)
      return icons.Activity ? (
        <icons.Activity className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" strokeOpacity="0.2"/><path d="M22 12a10 10 0 0 0-10-10" strokeWidth="2"/></svg>
      );
    if (dbStatus.connected)
      return icons.Database ? (
        <icons.Database className="h-4 w-4" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth="2"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5" strokeWidth="2"/></svg>
      );
    if (dbStatus.reason === 'UNAUTHORIZED' || dbStatus.reason === 'FORBIDDEN')
      return icons.Wifi ? (
        <icons.Wifi className="h-4 w-4" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 8c4-4 8-6 10-6s6 2 10 6" strokeWidth="2"/><path d="M5 11a10 10 0 0 1 14 0" strokeWidth="2"/><circle cx="12" cy="17" r="1" strokeWidth="2"/></svg>
      );
    return icons.WifiOff ? (
      <icons.WifiOff className="h-4 w-4" />
    ) : (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 8c4-4 8-6 10-6s6 2 10 6" strokeWidth="2" strokeOpacity="0.4"/><path d="M5 11a10 10 0 0 1 14 0" strokeWidth="2" strokeOpacity="0.4"/><line x1="2" y1="22" x2="22" y2="2" strokeWidth="2"/></svg>
    );
  };

  return (
    <div className="flex items-center space-x-2 px-2 sm:px-3 py-1.5 bg-panel text-theme rounded-lg border border-theme">
      <div className={`${getStatusColor()} flex items-center justify-center w-5 h-5 rounded`} title={getStatusText()}> 
        {/* Icon colored by status for quick glance */}
        <StatusIcon />
      </div>
      {/* Hide text on small screens, show on sm and above */}
      <span className="hidden sm:inline text-sm font-medium text-theme">
        {getStatusText()}
      </span>
      {dbStatus.activeConnections !== undefined && dbStatus.connected && (
        <span className="hidden md:inline text-xs text-muted">
          ({dbStatus.activeConnections} active)
        </span>
      )}
      <button
        onClick={checkDatabaseStatus}
        disabled={isLoading}
        className="hidden sm:inline text-xs text-muted hover:text-theme disabled:opacity-50"
        title="Refresh status"
      >
        Refresh
      </button>
    </div>
  );
}
