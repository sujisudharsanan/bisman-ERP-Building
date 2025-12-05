/**
 * Real-Time Report Context
 * Provides Socket.IO connection for live ERP data updates across the application
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Types
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
}

export interface ReportAlert {
  reportType: ReportType;
  alert: {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: string;
}

interface ReportContextValue {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;
  
  // Subscription management
  subscribe: (reportType: ReportType, filters?: Record<string, any>) => void;
  unsubscribe: (reportType: ReportType) => void;
  refresh: (reportType: ReportType) => void;
  subscribeToKPIs: (kpiIds: string[]) => void;
  
  // Data access
  reportData: Record<ReportType, any>;
  kpiData: Record<string, any>;
  lastUpdate: Record<ReportType, string>;
  subscriptions: ReportType[];
  
  // Event listeners
  onReportUpdate: (reportType: ReportType, callback: (data: any) => void) => () => void;
  onAlert: (callback: (alert: ReportAlert) => void) => () => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

// Custom hook to use the report context
export function useReportContext() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReportContext must be used within a ReportProvider');
  }
  return context;
}

// Hook for subscribing to a specific report type
export function useReport<T = any>(reportType: ReportType, filters?: Record<string, any>) {
  const { subscribe, unsubscribe, reportData, lastUpdate, connected, refresh } = useReportContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected) {
      subscribe(reportType, filters);
      setLoading(true);
    }

    return () => {
      if (connected) {
        unsubscribe(reportType);
      }
    };
  }, [connected, reportType, subscribe, unsubscribe]);

  // Update local state when report data changes
  useEffect(() => {
    if (reportData[reportType]) {
      setData(reportData[reportType]);
      setLoading(false);
    }
  }, [reportData, reportType]);

  const refreshData = useCallback(() => {
    if (connected) {
      refresh(reportType);
      setLoading(true);
    }
  }, [connected, refresh, reportType]);

  return {
    data,
    loading,
    lastUpdate: lastUpdate[reportType],
    refresh: refreshData,
    connected
  };
}

// Hook for KPIs
export function useKPI(kpiId: string) {
  const { subscribeToKPIs, kpiData, connected } = useReportContext();
  const [value, setValue] = useState<any>(null);

  useEffect(() => {
    if (connected) {
      subscribeToKPIs([kpiId]);
    }
  }, [connected, kpiId, subscribeToKPIs]);

  useEffect(() => {
    if (kpiData[kpiId]) {
      setValue(kpiData[kpiId]);
    }
  }, [kpiData, kpiId]);

  return value;
}

// Provider component
interface ReportProviderProps {
  children: ReactNode;
}

export function ReportProvider({ children }: ReportProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<ReportType[]>([]);
  const [reportData, setReportData] = useState<Record<ReportType, any>>({} as Record<ReportType, any>);
  const [kpiData, setKpiData] = useState<Record<string, any>>({});
  const [lastUpdate, setLastUpdate] = useState<Record<ReportType, string>>({} as Record<ReportType, string>);
  
  // Callbacks for specific report types
  const reportCallbacks = useRef<Map<ReportType, Set<(data: any) => void>>>(new Map());
  const alertCallbacks = useRef<Set<(alert: ReportAlert) => void>>(new Set());

  // Initialize socket connection
  useEffect(() => {
    // Get auth token
    const getToken = () => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem('accessToken') || 
             document.cookie.split(';').find(c => c.trim().startsWith('accessToken='))?.split('=')[1];
    };

    const token = getToken();
    if (!token) {
      console.log('[ReportContext] No auth token, skipping socket connection');
      return;
    }

    setConnecting(true);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.NEXT_PUBLIC_BACKEND_URL || 
                       'http://localhost:3001';

    console.log('[ReportContext] Connecting to:', `${backendUrl}/reports`);

    const newSocket = io(`${backendUrl}/reports`, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    // Event handlers
    newSocket.on('connect', () => {
      console.log('[ReportContext] ✅ Connected');
      setConnected(true);
      setConnecting(false);
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[ReportContext] Disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[ReportContext] Connection error:', err.message);
      setConnecting(false);
      setError(err.message);
    });

    // Report data received
    newSocket.on('report:data', (data: ReportData) => {
      console.log('[ReportContext] Data received:', data.reportType);
      
      setReportData(prev => ({
        ...prev,
        [data.reportType]: data.data
      }));
      
      setLastUpdate(prev => ({
        ...prev,
        [data.reportType]: data.timestamp
      }));

      // Notify type-specific callbacks
      const callbacks = reportCallbacks.current.get(data.reportType);
      if (callbacks) {
        callbacks.forEach(cb => {
          try {
            cb(data.data);
          } catch (e) {
            console.error('[ReportContext] Callback error:', e);
          }
        });
      }
    });

    // Subscription confirmations
    newSocket.on('report:subscribed', ({ reportType }) => {
      setSubscriptions(prev => 
        prev.includes(reportType) ? prev : [...prev, reportType]
      );
    });

    newSocket.on('report:unsubscribed', ({ reportType }) => {
      setSubscriptions(prev => prev.filter(r => r !== reportType));
    });

    // Alerts
    newSocket.on('report:alert', (alert: ReportAlert) => {
      alertCallbacks.current.forEach(cb => {
        try {
          cb(alert);
        } catch (e) {
          console.error('[ReportContext] Alert callback error:', e);
        }
      });
    });

    // KPI data
    newSocket.on('kpi:data', (data) => {
      setKpiData(prev => ({
        ...prev,
        ...data.kpis
      }));
    });

    newSocket.on('kpi:update', (data) => {
      setKpiData(prev => ({
        ...prev,
        [data.kpiId]: data
      }));
    });

    // Errors
    newSocket.on('report:error', (err) => {
      console.error('[ReportContext] Error:', err);
      setError(err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Methods
  const subscribe = useCallback((reportType: ReportType, filters?: Record<string, any>) => {
    if (socket && connected) {
      socket.emit('report:subscribe', { reportType, filters });
    }
  }, [socket, connected]);

  const unsubscribe = useCallback((reportType: ReportType) => {
    if (socket && connected) {
      socket.emit('report:unsubscribe', { reportType });
    }
  }, [socket, connected]);

  const refresh = useCallback((reportType: ReportType) => {
    if (socket && connected) {
      socket.emit('report:refresh', { reportType });
    }
  }, [socket, connected]);

  const subscribeToKPIs = useCallback((kpiIds: string[]) => {
    if (socket && connected) {
      socket.emit('kpi:subscribe', { kpiIds });
    }
  }, [socket, connected]);

  const onReportUpdate = useCallback((reportType: ReportType, callback: (data: any) => void) => {
    if (!reportCallbacks.current.has(reportType)) {
      reportCallbacks.current.set(reportType, new Set());
    }
    reportCallbacks.current.get(reportType)!.add(callback);

    return () => {
      reportCallbacks.current.get(reportType)?.delete(callback);
    };
  }, []);

  const onAlert = useCallback((callback: (alert: ReportAlert) => void) => {
    alertCallbacks.current.add(callback);
    return () => {
      alertCallbacks.current.delete(callback);
    };
  }, []);

  const value: ReportContextValue = {
    connected,
    connecting,
    error,
    subscribe,
    unsubscribe,
    refresh,
    subscribeToKPIs,
    reportData,
    kpiData,
    lastUpdate,
    subscriptions,
    onReportUpdate,
    onAlert
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
}

export default ReportContext;
