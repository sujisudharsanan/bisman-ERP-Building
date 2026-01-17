'use client';

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Package, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  BarChart2,
  PieChart,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ProductionMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
}

interface ProductionLine {
  id: string;
  name: string;
  efficiency: number;
  outputRate: number;
  targetRate: number;
  quality: number;
  downtime: number;
  status: 'running' | 'idle' | 'maintenance';
}

interface DailyProduction {
  date: string;
  output: number;
  target: number;
  quality: number;
  efficiency: number;
}

interface TopProduct {
  id: string;
  name: string;
  produced: number;
  target: number;
  percentage: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockMetrics: ProductionMetric[] = [
  { id: 'M1', name: 'Overall Equipment Effectiveness (OEE)', value: 85.2, unit: '%', trend: 'up', change: 2.3, target: 90, status: 'warning' },
  { id: 'M2', name: 'Production Output', value: 12450, unit: 'units', trend: 'up', change: 5.1, target: 13000, status: 'good' },
  { id: 'M3', name: 'Quality Rate', value: 98.5, unit: '%', trend: 'stable', change: 0.1, target: 99, status: 'good' },
  { id: 'M4', name: 'Machine Utilization', value: 78.3, unit: '%', trend: 'down', change: -1.2, target: 85, status: 'warning' },
  { id: 'M5', name: 'Downtime', value: 3.5, unit: 'hrs', trend: 'down', change: -0.8, target: 2, status: 'warning' },
  { id: 'M6', name: 'Cycle Time', value: 45, unit: 'sec', trend: 'stable', change: 0, target: 42, status: 'warning' },
];

const mockProductionLines: ProductionLine[] = [
  { id: 'PL1', name: 'Assembly Line A', efficiency: 92, outputRate: 150, targetRate: 160, quality: 99.2, downtime: 0.5, status: 'running' },
  { id: 'PL2', name: 'Assembly Line B', efficiency: 88, outputRate: 140, targetRate: 160, quality: 98.5, downtime: 1.2, status: 'running' },
  { id: 'PL3', name: 'Fabrication Bay 1', efficiency: 85, outputRate: 80, targetRate: 90, quality: 97.8, downtime: 0.8, status: 'running' },
  { id: 'PL4', name: 'Fabrication Bay 2', efficiency: 0, outputRate: 0, targetRate: 90, quality: 0, downtime: 4, status: 'maintenance' },
  { id: 'PL5', name: 'Electronics Lab', efficiency: 78, outputRate: 200, targetRate: 250, quality: 99.5, downtime: 0.3, status: 'running' },
  { id: 'PL6', name: 'Quality Control', efficiency: 95, outputRate: 400, targetRate: 400, quality: 100, downtime: 0, status: 'running' },
];

const mockDailyProduction: DailyProduction[] = [
  { date: '2024-01-09', output: 1150, target: 1200, quality: 98.2, efficiency: 82 },
  { date: '2024-01-10', output: 1280, target: 1200, quality: 98.5, efficiency: 85 },
  { date: '2024-01-11', output: 1190, target: 1200, quality: 98.8, efficiency: 84 },
  { date: '2024-01-12', output: 1320, target: 1200, quality: 99.1, efficiency: 88 },
  { date: '2024-01-13', output: 980, target: 1200, quality: 97.5, efficiency: 72 },
  { date: '2024-01-14', output: 1050, target: 1200, quality: 98.0, efficiency: 78 },
  { date: '2024-01-15', output: 1240, target: 1200, quality: 98.5, efficiency: 86 },
];

const mockTopProducts: TopProduct[] = [
  { id: 'P1', name: 'Industrial Valve Assembly', produced: 2450, target: 2500, percentage: 98 },
  { id: 'P2', name: 'Hydraulic Pump Unit', produced: 1890, target: 2000, percentage: 94.5 },
  { id: 'P3', name: 'Control Panel Module', produced: 3200, target: 3000, percentage: 106.7 },
  { id: 'P4', name: 'Steel Frame Structure', produced: 850, target: 1000, percentage: 85 },
  { id: 'P5', name: 'Sensor Assembly Kit', produced: 4100, target: 4000, percentage: 102.5 },
];

// ============================================================================
// Sub-Components
// ============================================================================

function MetricCard({ metric }: { metric: ProductionMetric }) {
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  }[metric.status];

  const TrendIcon = metric.trend === 'up' ? ArrowUpRight : metric.trend === 'down' ? ArrowDownRight : Activity;
  const trendColor = metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className={`bg-white border rounded-lg p-4 ${statusColors}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm text-gray-600">{metric.name}</p>
        <span className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          {Math.abs(metric.change)}%
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold">{metric.value.toLocaleString()}</p>
          <p className="text-sm text-gray-500">{metric.unit}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Target</p>
          <p className="text-sm font-medium">{metric.target.toLocaleString()} {metric.unit}</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.min(100, (metric.value / metric.target) * 100).toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              metric.status === 'good' ? 'bg-green-500' :
              metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ProductionLineRow({ line }: { line: ProductionLine }) {
  const statusConfig = {
    running: { label: 'Running', className: 'bg-green-100 text-green-700' },
    idle: { label: 'Idle', className: 'bg-gray-100 text-gray-700' },
    maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-700' },
  }[line.status];

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            line.status === 'running' ? 'bg-green-500' :
            line.status === 'idle' ? 'bg-gray-400' : 'bg-yellow-500'
          }`} />
          <span className="font-medium text-gray-900">{line.name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-xs ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                line.efficiency >= 90 ? 'bg-green-500' :
                line.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${line.efficiency}%` }}
            />
          </div>
          <span className="text-sm">{line.efficiency}%</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {line.outputRate}/{line.targetRate} <span className="text-gray-400">units/hr</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm ${line.quality >= 99 ? 'text-green-600' : line.quality >= 97 ? 'text-yellow-600' : 'text-red-600'}`}>
          {line.quality}%
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={line.downtime > 1 ? 'text-red-600' : 'text-gray-600'}>
          {line.downtime} hrs
        </span>
      </td>
    </tr>
  );
}

function ProductionChart({ data }: { data: DailyProduction[] }) {
  const maxOutput = Math.max(...data.map(d => Math.max(d.output, d.target)));

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-900">Daily Production Trend</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            Output
          </span>
          <span className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-300" />
            Target
          </span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-48">
        {data.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex items-end justify-center gap-1 h-40">
              <div 
                className="w-5 bg-blue-500 rounded-t"
                style={{ height: `${(day.output / maxOutput) * 100}%` }}
                title={`Output: ${day.output}`}
              />
              <div 
                className="w-5 bg-gray-200 rounded-t"
                style={{ height: `${(day.target / maxOutput) * 100}%` }}
                title={`Target: ${day.target}`}
              />
            </div>
            <span className="text-xs text-gray-500">{day.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopProductsTable({ products }: { products: TopProduct[] }) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Top Products by Output</h3>
      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={product.id} className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
              {index + 1}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-900">{product.name}</span>
                <span className={`text-sm font-medium ${
                  product.percentage >= 100 ? 'text-green-600' : 
                  product.percentage >= 90 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {product.percentage}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      product.percentage >= 100 ? 'bg-green-500' : 
                      product.percentage >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, product.percentage)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-24 text-right">
                  {product.produced.toLocaleString()}/{product.target.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel() {
  const alerts = [
    { id: 1, type: 'warning', message: 'Fabrication Bay 2 under maintenance - ETA 2 hours', time: '10 min ago' },
    { id: 2, type: 'info', message: 'Assembly Line A reached 150% of hourly target', time: '25 min ago' },
    { id: 3, type: 'warning', message: 'Machine utilization below target (78.3%)', time: '1 hour ago' },
    { id: 4, type: 'success', message: 'Quality inspection passed for batch #2024-0115', time: '2 hours ago' },
  ];

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Recent Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${
            alert.type === 'warning' ? 'bg-yellow-50' :
            alert.type === 'success' ? 'bg-green-50' : 'bg-blue-50'
          }`}>
            {alert.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            ) : alert.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm text-gray-900">{alert.message}</p>
              <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProductionAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const summaryStats = {
    totalOutput: mockDailyProduction.reduce((sum, d) => sum + d.output, 0),
    avgEfficiency: Math.round(mockDailyProduction.reduce((sum, d) => sum + d.efficiency, 0) / mockDailyProduction.length),
    avgQuality: (mockDailyProduction.reduce((sum, d) => sum + d.quality, 0) / mockDailyProduction.length).toFixed(1),
    activeLinesCount: mockProductionLines.filter(l => l.status === 'running').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Analytics</h1>
            <p className="text-gray-500">Real-time production performance insights</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="1d">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
            </select>
            <button 
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${isRefreshing ? 'opacity-50' : ''}`}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-blue-100 text-sm">Total Output</p>
                <p className="text-3xl font-bold">{summaryStats.totalOutput.toLocaleString()}</p>
                <p className="text-blue-100 text-sm">units this week</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-green-100 text-sm">Avg Efficiency</p>
                <p className="text-3xl font-bold">{summaryStats.avgEfficiency}%</p>
                <p className="text-green-100 text-sm">across all lines</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-purple-100 text-sm">Quality Rate</p>
                <p className="text-3xl font-bold">{summaryStats.avgQuality}%</p>
                <p className="text-purple-100 text-sm">first-pass yield</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-orange-100 text-sm">Active Lines</p>
                <p className="text-3xl font-bold">{summaryStats.activeLinesCount}/{mockProductionLines.length}</p>
                <p className="text-orange-100 text-sm">currently running</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {mockMetrics.slice(0, 3).map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {mockMetrics.slice(3).map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ProductionChart data={mockDailyProduction} />
          <TopProductsTable products={mockTopProducts} />
        </div>

        {/* Production Lines Table */}
        <div className="bg-white rounded-lg border mb-6">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Production Line Status</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Output Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Downtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockProductionLines.map((line) => (
                <ProductionLineRow key={line.id} line={line} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        <AlertsPanel />
      </div>
    </div>
  );
}
