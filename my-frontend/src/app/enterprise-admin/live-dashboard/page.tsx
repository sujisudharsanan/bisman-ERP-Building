'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ConnectionIndicator,
  LiveKPICard,
  LiveDataTable,
  LiveActivityFeed,
  LiveStatsRow,
  LiveAlertBanner,
  RevenueWidget,
  OrdersWidget,
  InventoryWidget,
  PerformanceWidget,
} from '@/components/realtime/LiveDashboard';
import { useReport, useKPI } from '@/contexts/ReportContext';

export default function LiveDashboardPage() {
  const { connectionStatus, error } = useReport();
  
  // KPI subscriptions
  const { value: totalRevenue, loading: revenueLoading } = useKPI('total_revenue');
  const { value: orderCount, loading: ordersLoading } = useKPI('order_count');
  const { value: stockValue, loading: stockLoading } = useKPI('stock_value');
  const { value: pendingOrders, loading: pendingLoading } = useKPI('pending_orders');

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
          <ConnectionIndicator status={connectionStatus} showLabel />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </motion.div>

      {/* KPI Cards Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <LiveKPICard
          title="Total Revenue"
          kpiKey="total_revenue"
          format="currency"
          icon="revenue"
          trend={{ direction: 'up', value: 12.5 }}
          colorScheme="blue"
        />
        <LiveKPICard
          title="Orders Today"
          kpiKey="order_count"
          format="number"
          icon="orders"
          trend={{ direction: 'up', value: 8.3 }}
          colorScheme="green"
        />
        <LiveKPICard
          title="Stock Value"
          kpiKey="stock_value"
          format="currency"
          icon="inventory"
          colorScheme="purple"
        />
        <LiveKPICard
          title="Pending Orders"
          kpiKey="pending_orders"
          format="number"
          icon="pending"
          trend={{ direction: 'down', value: 3.2 }}
          colorScheme="amber"
        />
      </motion.div>

      {/* Live Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <LiveStatsRow
          stats={[
            { label: 'Active Users', kpiKey: 'active_users', format: 'number', icon: 'users' },
            { label: 'Conversion Rate', kpiKey: 'conversion_rate', format: 'percent', icon: 'chart' },
            { label: 'Avg Order Value', kpiKey: 'avg_order_value', format: 'currency', icon: 'orders' },
            { label: 'Customer Satisfaction', kpiKey: 'satisfaction_score', format: 'percent', icon: 'heart' },
          ]}
        />
      </motion.div>

      {/* Alert Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <LiveAlertBanner />
      </motion.div>

      {/* Prebuilt Widgets Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
      >
        <RevenueWidget />
        <OrdersWidget />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
      >
        <InventoryWidget />
        <PerformanceWidget />
      </motion.div>

      {/* Live Data Tables and Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Recent Orders Table */}
        <div className="lg:col-span-2">
          <LiveDataTable
            title="Recent Orders"
            reportType="orders-live"
            columns={[
              { key: 'id', header: 'Order ID', width: '100px' },
              { key: 'customer', header: 'Customer', width: '200px' },
              { key: 'amount', header: 'Amount', width: '120px', align: 'right' as const },
              { key: 'status', header: 'Status', width: '100px' },
              { key: 'time', header: 'Time', width: '120px' },
            ]}
            pageSize={10}
            autoRefresh={true}
            refreshInterval={30000}
          />
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <LiveActivityFeed
            title="Recent Activity"
            maxItems={15}
            reportType="activity-feed"
            showTimestamps
          />
        </div>
      </motion.div>

      {/* Low Stock Items Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-6"
      >
        <LiveDataTable
          title="Low Stock Items"
          reportType="stock-levels"
          columns={[
            { key: 'sku', header: 'SKU', width: '120px' },
            { key: 'name', header: 'Product Name', width: '250px' },
            { key: 'currentStock', header: 'Current Stock', width: '120px', align: 'right' as const },
            { key: 'reorderLevel', header: 'Reorder Level', width: '120px', align: 'right' as const },
            { key: 'supplier', header: 'Supplier', width: '200px' },
            { key: 'lastOrdered', header: 'Last Ordered', width: '120px' },
          ]}
          emptyMessage="All stock levels are healthy"
          pageSize={5}
          autoRefresh={true}
          refreshInterval={60000}
        />
      </motion.div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
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
