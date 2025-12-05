'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ConnectionIndicator,
  LiveAlertBanner,
  RevenueWidget,
  OrdersWidget,
  InventoryWidget,
  PerformanceWidget,
  ActiveUsersWidget,
} from '@/components/realtime/LiveDashboard';
import { useReportContext } from '@/contexts/ReportContext';

export default function LiveDashboardPage() {
  const { connected, connecting, error } = useReportContext();
  
  const connectionStatus = connecting ? 'connecting' : connected ? 'connected' : 'disconnected';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Live Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time business metrics and analytics
            </p>
          </div>
          <ConnectionIndicator showLabel />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </motion.div>

      {/* Alert Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <LiveAlertBanner />
      </motion.div>

      {/* KPI Widgets Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"
      >
        <RevenueWidget />
        <OrdersWidget />
        <InventoryWidget />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
      >
        <ActiveUsersWidget />
        <PerformanceWidget />
      </motion.div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 text-center text-gray-500 dark:text-gray-400 text-sm"
      >
        <p>Data refreshes automatically via WebSocket connection</p>
        <p className="mt-1">
          Status: <span className={
            connectionStatus === 'connected' ? 'text-green-500' :
            connectionStatus === 'connecting' ? 'text-yellow-500' :
            'text-red-500'
          }>
            {connectionStatus}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
