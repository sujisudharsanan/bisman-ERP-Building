/**
 * Real-Time Report Socket Hook
 * Subscribe to live ERP data updates via Socket.IO
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Report types available for subscription
export type ReportType = 
  | 'revenue'
  | 'expenses'
  | 'cashflow'
  | 'profit-loss'
  | 'sales-live'
  | 'orders'
  | 'invoices'
  | 'stock-levels'
  | 'low-stock'
  | 'inventory-movement'
  | 'attendance'
  | 'leave-requests'
  | 'active-users'
  | 'system-health'
  | 'dashboard-kpi'
  | 'hub-metrics'
  | 'tenant-usage';

export interface ReportData<T = any> {
  reportType: ReportType;
  data: T;
  timestamp: string;
  filters?: Record<string, any>;
  source?: 'interval' | 'broadcast';
}

export interface ReportAlert {
  reportType: ReportType;
  alert: {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    data?: any;
  };
  timestamp: string;
}

export interface KPIData {
  kpis: Record<string, {
    value: number;
    change: string;
    trend: 'up' | 'down' | 'stable';
    updatedAt: string;
  }>;
  timestamp: string;
}

export interface UseReportSocketOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface UseReportSocketReturn {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Subscription methods
  subscribe: (reportType: ReportType, filters?: Record<string, any>) => void;
  unsubscribe: (reportType: ReportType) => void;
  refresh: (reportType: ReportType, filters?: Record<string, any>) => void;
  
  // KPI subscription
  subscribeToKPIs: (kpiIds: string[]) => void;
  
  // Data getters
  getReportData: <T = any>(reportType: ReportType) => T | null;
  getKPIValue: (kpiId: string) => any | null;
  
  // Event listeners
  onReportData: (callback: (data: ReportData) => void) => () => void;
  onAlert: (callback: (alert: ReportAlert) => void) => () => void;
  onKPIUpdate: (callback: (data: KPIData) => void) => () => void;
  
  // State
  subscriptions: Set<ReportType>;
  lastUpdate: Record<ReportType, string>;
}

export function useReportSocket(options: UseReportSocketOptions = {}): UseReportSocketReturn {
  const {
    autoConnect = true,
    reconnectionAttempts = 10,
    reconnectionDelay = 1000
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Set<ReportType>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Record<ReportType, string>>({} as Record<ReportType, string>);
  
  // Store report data
  const reportDataRef = useRef<Record<ReportType, any>>({} as Record<ReportType, any>);
  const kpiDataRef = useRef<Record<string, any>>({});
  
  // Event callbacks
  const reportCallbacksRef = useRef<Set<(data: ReportData) => void>>(new Set());
  const alertCallbacksRef = useRef<Set<(alert: ReportAlert) => void>>(new Set());
  const kpiCallbacksRef = useRef<Set<(data: KPIData) => void>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    // Get auth token
    const token = typeof window !== 'undefined' 
      ? (localStorage.getItem('accessToken') || document.cookie.split(';').find(c => c.trim().startsWith('accessToken='))?.split('=')[1])
      : null;

    if (!token) {
      console.log('[ReportSocket] No auth token found, skipping connection');
      return;
    }

    setConnecting(true);
    setError(null);

    // Determine backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       'http://localhost:3001';

    console.log('[ReportSocket] Connecting to:', `${backendUrl}/reports`);

    // Create socket connection to /reports namespace
    const newSocket = io(`${backendUrl}/reports`, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('[ReportSocket] ✅ Connected');
      setConnected(true);
      setConnecting(false);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[ReportSocket] Disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[ReportSocket] Connection error:', err.message);
      setConnecting(false);
      setError(err.message);
    });

    // Report data handler
    newSocket.on('report:data', (data: ReportData) => {
      console.log('[ReportSocket] Received data for:', data.reportType);
      
      reportDataRef.current[data.reportType] = data.data;
      setLastUpdate(prev => ({
        ...prev,
        [data.reportType]: data.timestamp
      }));
      
      // Notify all callbacks
      reportCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error('[ReportSocket] Callback error:', e);
        }
      });
    });

    // Subscription confirmation
    newSocket.on('report:subscribed', (data) => {
      console.log('[ReportSocket] Subscribed to:', data.reportType);
      setSubscriptions(prev => new Set([...prev, data.reportType]));
    });

    newSocket.on('report:unsubscribed', (data) => {
      console.log('[ReportSocket] Unsubscribed from:', data.reportType);
      setSubscriptions(prev => {
        const next = new Set(prev);
        next.delete(data.reportType);
        return next;
      });
    });

    // Alert handler
    newSocket.on('report:alert', (alert: ReportAlert) => {
      console.log('[ReportSocket] Alert received:', alert);
      
      alertCallbacksRef.current.forEach(callback => {
        try {
          callback(alert);
        } catch (e) {
          console.error('[ReportSocket] Alert callback error:', e);
        }
      });
    });

    // KPI update handler
    newSocket.on('kpi:data', (data: KPIData) => {
      console.log('[ReportSocket] KPI data received');
      
      Object.assign(kpiDataRef.current, data.kpis);
      
      kpiCallbacksRef.current.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error('[ReportSocket] KPI callback error:', e);
        }
      });
    });

    newSocket.on('kpi:update', (data) => {
      console.log('[ReportSocket] KPI update:', data.kpiId);
      kpiDataRef.current[data.kpiId] = data;
    });

    // Error handler
    newSocket.on('report:error', (error) => {
      console.error('[ReportSocket] Error:', error);
      setError(error.message);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('[ReportSocket] Disconnecting...');
      newSocket.disconnect();
    };
  }, [autoConnect, reconnectionAttempts, reconnectionDelay]);

  // Subscribe to a report
  const subscribe = useCallback((reportType: ReportType, filters?: Record<string, any>) => {
    if (socket && connected) {
      socket.emit('report:subscribe', { reportType, filters });
    } else {
      console.warn('[ReportSocket] Cannot subscribe, not connected');
    }
  }, [socket, connected]);

  // Unsubscribe from a report
  const unsubscribe = useCallback((reportType: ReportType) => {
    if (socket && connected) {
      socket.emit('report:unsubscribe', { reportType });
    }
  }, [socket, connected]);

  // Request immediate refresh
  const refresh = useCallback((reportType: ReportType, filters?: Record<string, any>) => {
    if (socket && connected) {
      socket.emit('report:refresh', { reportType, filters });
    }
  }, [socket, connected]);

  // Subscribe to KPIs
  const subscribeToKPIs = useCallback((kpiIds: string[]) => {
    if (socket && connected) {
      socket.emit('kpi:subscribe', { kpiIds });
    }
  }, [socket, connected]);

  // Get cached report data
  const getReportData = useCallback(<T = any>(reportType: ReportType): T | null => {
    return reportDataRef.current[reportType] || null;
  }, []);

  // Get cached KPI value
  const getKPIValue = useCallback((kpiId: string) => {
    return kpiDataRef.current[kpiId] || null;
  }, []);

  // Register report data callback
  const onReportData = useCallback((callback: (data: ReportData) => void) => {
    reportCallbacksRef.current.add(callback);
    return () => {
      reportCallbacksRef.current.delete(callback);
    };
  }, []);

  // Register alert callback
  const onAlert = useCallback((callback: (alert: ReportAlert) => void) => {
    alertCallbacksRef.current.add(callback);
    return () => {
      alertCallbacksRef.current.delete(callback);
    };
  }, []);

  // Register KPI callback
  const onKPIUpdate = useCallback((callback: (data: KPIData) => void) => {
    kpiCallbacksRef.current.add(callback);
    return () => {
      kpiCallbacksRef.current.delete(callback);
    };
  }, []);

  return {
    socket,
    connected,
    connecting,
    error,
    subscribe,
    unsubscribe,
    refresh,
    subscribeToKPIs,
    getReportData,
    getKPIValue,
    onReportData,
    onAlert,
    onKPIUpdate,
    subscriptions,
    lastUpdate
  };
}

export default useReportSocket;
