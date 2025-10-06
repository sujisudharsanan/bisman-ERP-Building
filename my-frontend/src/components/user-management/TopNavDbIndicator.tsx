'use client';

import React, { useState, useEffect } from 'react';
import { Database, Wifi, WifiOff, Activity } from 'lucide-react';

interface DatabaseStatus {
  connected: boolean;
  responseTime?: number;
  lastChecked: Date;
  activeConnections?: number;
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
      // Mock API call - replace with actual health check endpoint
      const response = await fetch('/api/health/database', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      setDbStatus({
        connected: response.ok && data.status === 'healthy',
        responseTime,
        lastChecked: new Date(),
        activeConnections: data.activeConnections
      });
    } catch (error) {
      setDbStatus({
        connected: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date()
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
    return dbStatus.connected ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking...';
    if (dbStatus.connected) {
      return `Connected${dbStatus.responseTime ? ` (${dbStatus.responseTime}ms)` : ''}`;
    }
    return 'Disconnected';
  };

  const StatusIcon = () => {
    if (isLoading) return <Activity className="h-4 w-4 animate-spin" />;
    if (dbStatus.connected) return <Database className="h-4 w-4" />;
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
