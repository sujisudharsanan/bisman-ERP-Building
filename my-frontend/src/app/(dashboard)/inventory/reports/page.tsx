'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  DollarSign,
  Box,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  RefreshCw,
  PieChart,
  Target,
  Truck
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface InventoryMetric {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  status: 'good' | 'warning' | 'critical';
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface TopItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  value: number;
  turnover: number;
}

interface StockAging {
  range: string;
  count: number;
  value: number;
  percentage: number;
}

interface MonthlyTrend {
  month: string;
  inbound: number;
  outbound: number;
  stockLevel: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockMetrics: InventoryMetric[] = [
  { id: 'M1', name: 'Total Stock Value', value: '$2,450,000', trend: 'up', change: 5.2, status: 'good' },
  { id: 'M2', name: 'Total Items', value: 12450, unit: 'units', trend: 'stable', change: 0.8, status: 'good' },
  { id: 'M3', name: 'Stock Turnover', value: 4.2, trend: 'up', change: 8.5, status: 'good' },
  { id: 'M4', name: 'Out of Stock Items', value: 23, unit: 'items', trend: 'down', change: -15.2, status: 'good' },
  { id: 'M5', name: 'Overstock Items', value: 45, unit: 'items', trend: 'up', change: 12.0, status: 'warning' },
  { id: 'M6', name: 'Avg Days in Stock', value: 32, unit: 'days', trend: 'down', change: -5.0, status: 'good' },
];

const mockCategoryData: CategoryData[] = [
  { name: 'Electronics', value: 850000, percentage: 34.7, color: '#3B82F6' },
  { name: 'Mechanical Parts', value: 620000, percentage: 25.3, color: '#10B981' },
  { name: 'Raw Materials', value: 450000, percentage: 18.4, color: '#F59E0B' },
  { name: 'Finished Goods', value: 350000, percentage: 14.3, color: '#6366F1' },
  { name: 'Consumables', value: 180000, percentage: 7.3, color: '#EF4444' },
];

const mockTopItems: TopItem[] = [
  { id: 'I1', name: 'Industrial Valve Assembly', sku: 'IVA-001', quantity: 1250, value: 125000, turnover: 6.5 },
  { id: 'I2', name: 'Control Panel Module', sku: 'CPM-002', quantity: 890, value: 98000, turnover: 5.8 },
  { id: 'I3', name: 'Sensor Array Kit', sku: 'SAK-003', quantity: 2100, value: 84000, turnover: 7.2 },
  { id: 'I4', name: 'Hydraulic Pump Unit', sku: 'HPU-004', quantity: 450, value: 72000, turnover: 4.5 },
  { id: 'I5', name: 'Steel Frame Structure', sku: 'SFS-005', quantity: 320, value: 64000, turnover: 3.8 },
];

const mockStockAging: StockAging[] = [
  { range: '0-30 days', count: 4500, value: 1200000, percentage: 48.9 },
  { range: '31-60 days', count: 3200, value: 650000, percentage: 26.5 },
  { range: '61-90 days', count: 1800, value: 380000, percentage: 15.5 },
  { range: '91-180 days', count: 750, value: 150000, percentage: 6.1 },
  { range: '180+ days', count: 200, value: 70000, percentage: 2.9 },
];

const mockMonthlyTrend: MonthlyTrend[] = [
  { month: 'Aug', inbound: 45000, outbound: 42000, stockLevel: 31000 },
  { month: 'Sep', inbound: 52000, outbound: 48000, stockLevel: 35000 },
  { month: 'Oct', inbound: 48000, outbound: 51000, stockLevel: 32000 },
  { month: 'Nov', inbound: 55000, outbound: 49000, stockLevel: 38000 },
  { month: 'Dec', inbound: 62000, outbound: 58000, stockLevel: 42000 },
  { month: 'Jan', inbound: 58000, outbound: 55000, stockLevel: 45000 },
];

// ============================================================================
// Sub-Components
// ============================================================================

function MetricCard({ metric }: { metric: InventoryMetric }) {
  const TrendIcon = metric.trend === 'up' ? ArrowUpRight : metric.trend === 'down' ? ArrowDownRight : TrendingUp;
  const trendColorClass = 
    metric.status === 'good' ? 'text-green-600' : 
    metric.status === 'warning' ? 'text-yellow-600' : 'text-red-600';
  
  const bgClass = 
    metric.status === 'good' ? 'bg-green-50 border-green-200' : 
    metric.status === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className={`bg-white rounded-lg border p-4 ${bgClass}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm text-gray-600">{metric.name}</p>
        <span className={`flex items-center gap-1 text-sm ${trendColorClass}`}>
          <TrendIcon className="w-4 h-4" />
          {Math.abs(metric.change)}%
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
        {metric.unit && <span className="text-sm font-normal text-gray-500 ml-1">{metric.unit}</span>}
      </p>
    </div>
  );
}

function CategoryPieChart({ data }: { data: CategoryData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercentage = 0;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Stock Value by Category</h3>
      <div className="flex items-center gap-8">
        {/* Pie Chart (simplified representation) */}
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {data.map((item, index) => {
              const startAngle = cumulativePercentage * 3.6;
              cumulativePercentage += item.percentage;
              const endAngle = cumulativePercentage * 3.6;
              const largeArcFlag = item.percentage > 50 ? 1 : 0;
              
              const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
              const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

              return (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="20"
                  strokeDasharray={`${item.percentage * 2.51} 251.2`}
                  strokeDashoffset={`${-cumulativePercentage * 2.51 + item.percentage * 2.51}`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl font-bold">${(total / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-700">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">${(item.value / 1000).toFixed(0)}K</span>
                <span className="text-xs text-gray-500 ml-2">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: MonthlyTrend[] }) {
  const maxValue = Math.max(...data.flatMap(d => [d.inbound, d.outbound, d.stockLevel]));

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Inventory Movement Trend</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" /> Inbound
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" /> Outbound
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" /> Stock Level
          </span>
        </div>
      </div>
      <div className="h-48 flex items-end gap-4">
        {data.map((month, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end justify-center gap-1">
              <div 
                className="w-4 bg-green-500 rounded-t"
                style={{ height: `${(month.inbound / maxValue) * 100}%` }}
                title={`Inbound: ${month.inbound}`}
              />
              <div 
                className="w-4 bg-red-500 rounded-t"
                style={{ height: `${(month.outbound / maxValue) * 100}%` }}
                title={`Outbound: ${month.outbound}`}
              />
              <div 
                className="w-4 bg-blue-500 rounded-t"
                style={{ height: `${(month.stockLevel / maxValue) * 100}%` }}
                title={`Stock: ${month.stockLevel}`}
              />
            </div>
            <span className="text-xs text-gray-500">{month.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopItemsTable({ items }: { items: TopItem[] }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Top Items by Value</h3>
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase">
            <th className="pb-3">Item</th>
            <th className="pb-3">Quantity</th>
            <th className="pb-3">Value</th>
            <th className="pb-3">Turnover</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.sku}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 text-sm">{item.quantity.toLocaleString()}</td>
              <td className="py-3 text-sm font-medium">${item.value.toLocaleString()}</td>
              <td className="py-3">
                <span className={`text-sm font-medium ${
                  item.turnover >= 5 ? 'text-green-600' : 
                  item.turnover >= 3 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {item.turnover}x
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockAgingChart({ data }: { data: StockAging[] }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Stock Aging Analysis</h3>
      <div className="space-y-4">
        {data.map((range) => (
          <div key={range.range}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700">{range.range}</span>
              <span className="font-medium">{range.count.toLocaleString()} items (${(range.value / 1000).toFixed(0)}K)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
                  range.range === '0-30 days' ? 'bg-green-500' :
                  range.range === '31-60 days' ? 'bg-blue-500' :
                  range.range === '61-90 days' ? 'bg-yellow-500' :
                  range.range === '91-180 days' ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${range.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel() {
  const alerts = [
    { id: 1, type: 'critical', title: 'Low Stock Alert', message: '15 items below reorder point', time: '5 min ago' },
    { id: 2, type: 'warning', title: 'Slow Moving Items', message: '23 items with no movement in 60+ days', time: '1 hour ago' },
    { id: 3, type: 'info', title: 'Stock Received', message: 'PO-2024-0125 received with 450 units', time: '2 hours ago' },
    { id: 4, type: 'warning', title: 'Overstock Alert', message: '8 items exceeding max stock level', time: '3 hours ago' },
  ];

  const typeConfig = {
    critical: { icon: AlertTriangle, className: 'bg-red-50 text-red-600' },
    warning: { icon: AlertTriangle, className: 'bg-yellow-50 text-yellow-600' },
    info: { icon: Package, className: 'bg-blue-50 text-blue-600' },
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Inventory Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert) => {
          const config = typeConfig[alert.type as keyof typeof typeConfig];
          const Icon = config.icon;
          return (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${config.className}`}>
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-sm opacity-80">{alert.message}</p>
                <p className="text-xs opacity-60 mt-1">{alert.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function InventoryReportsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>
            <p className="text-gray-500">Comprehensive inventory analytics and insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
              <option value="365d">Last Year</option>
            </select>
            <button 
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${isRefreshing ? 'opacity-50' : ''}`}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {mockMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <CategoryPieChart data={mockCategoryData} />
          <TrendChart data={mockMonthlyTrend} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <TopItemsTable items={mockTopItems} />
          <StockAgingChart data={mockStockAging} />
        </div>

        {/* Alerts */}
        <AlertsPanel />
      </div>
    </div>
  );
}
