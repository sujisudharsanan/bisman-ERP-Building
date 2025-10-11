'use client';

import React, { useState, useEffect } from 'react';
import { Database, Wifi, WifiOff, Activity } from 'lucide-react';

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
    if (isLoading) return <Activity className="h-4 w-4 animate-spin" />;
    if (dbStatus.connected) return <Database className="h-4 w-4" />;
    if (dbStatus.reason === 'UNAUTHORIZED' || dbStatus.reason === 'FORBIDDEN') return <Wifi className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-lg">
      <StatusIcon />
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </span>
      {dbStatus.activeConnections !== undefined && dbStatus.connected && (
        <span className="text-xs text-gray-500">
          ({dbStatus.activeConnections} active)
        </span>
      )}
      <button
        onClick={checkDatabaseStatus}
        disabled={isLoading}
        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
        title="Refresh status"
      >
        Refresh
      </button>
    </div>
  );
}
