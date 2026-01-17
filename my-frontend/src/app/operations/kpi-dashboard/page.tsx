'use client';

import React, { useState } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Package,
  Truck,
  Factory,
  Gauge,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Timer,
  Award
} from 'lucide-react';

// Mock KPI data
const operationalKPIs = {
  oee: { value: 87.5, target: 90, unit: '%', trend: 2.3, status: 'warning' },
  onTimeDelivery: { value: 94.2, target: 95, unit: '%', trend: 1.5, status: 'warning' },
  defectRate: { value: 1.2, target: 1.5, unit: '%', trend: -0.3, status: 'good' },
  cycleTime: { value: 4.2, target: 4.5, unit: 'hrs', trend: -0.2, status: 'good' },
  throughput: { value: 1250, target: 1200, unit: 'units/day', trend: 5.2, status: 'good' },
  utilization: { value: 78, target: 85, unit: '%', trend: 3.1, status: 'warning' },
  mtbf: { value: 156, target: 150, unit: 'hrs', trend: 8, status: 'good' },
  mttr: { value: 2.4, target: 3, unit: 'hrs', trend: -0.2, status: 'good' }
};

const productionMetrics = [
  { name: 'Units Produced', value: 12500, target: 12000, unit: 'units', change: 8.5 },
  { name: 'Scrap Rate', value: 2.1, target: 2.5, unit: '%', change: -0.4 },
  { name: 'First Pass Yield', value: 96.8, target: 95, unit: '%', change: 1.2 },
  { name: 'Work in Progress', value: 450, target: 400, unit: 'units', change: 12.5 },
  { name: 'Inventory Turnover', value: 4.2, target: 4.0, unit: 'x', change: 0.3 },
  { name: 'Order Fill Rate', value: 98.5, target: 98, unit: '%', change: 0.8 }
];

const departmentPerformance = [
  { dept: 'Assembly', oee: 92, quality: 98.5, delivery: 96, efficiency: 89 },
  { dept: 'Machining', oee: 85, quality: 97.2, delivery: 94, efficiency: 82 },
  { dept: 'Welding', oee: 88, quality: 96.8, delivery: 95, efficiency: 86 },
  { dept: 'Finishing', oee: 90, quality: 99.1, delivery: 97, efficiency: 88 },
  { dept: 'Packaging', oee: 94, quality: 99.5, delivery: 98, efficiency: 91 }
];

const recentAlerts = [
  { id: 1, type: 'warning', message: 'Machine M-102 maintenance due in 24 hours', time: '1h ago' },
  { id: 2, type: 'critical', message: 'Quality deviation detected in Line 3', time: '2h ago' },
  { id: 3, type: 'info', message: 'Production target achieved for Shift A', time: '4h ago' },
  { id: 4, type: 'warning', message: 'Material shortage alert: Component C-245', time: '5h ago' }
];

const weeklyTrend = [
  { day: 'Mon', oee: 85, target: 90 },
  { day: 'Tue', oee: 87, target: 90 },
  { day: 'Wed', oee: 89, target: 90 },
  { day: 'Thu', oee: 86, target: 90 },
  { day: 'Fri', oee: 88, target: 90 },
  { day: 'Sat', oee: 91, target: 90 },
  { day: 'Sun', oee: 87, target: 90 }
];

export default function KPIDashboardPage() {
  const [timeRange, setTimeRange] = useState('today');
  const [selectedShift, setSelectedShift] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 dark:bg-green-900/30';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'critical': return 'bg-red-100 dark:bg-red-900/30';
      default: return 'bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPerformanceColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Target className="w-8 h-8 text-indigo-500" />
              Operations KPI Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time operational performance metrics and insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="all">All Shifts</option>
              <option value="shift-a">Shift A (6AM-2PM)</option>
              <option value="shift-b">Shift B (2PM-10PM)</option>
              <option value="shift-c">Shift C (10PM-6AM)</option>
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* OEE */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">OEE</span>
            <div className={`p-2 rounded-lg ${getStatusBg(operationalKPIs.oee.status)}`}>
              <Gauge className={`w-5 h-5 ${getStatusColor(operationalKPIs.oee.status)}`} />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{operationalKPIs.oee.value}</span>
            <span className="text-gray-500 dark:text-gray-400 mb-1">%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Target: {operationalKPIs.oee.target}%</span>
            <div className={`flex items-center gap-1 ${operationalKPIs.oee.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {operationalKPIs.oee.trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(operationalKPIs.oee.trend)}%
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getPerformanceColor(operationalKPIs.oee.value, operationalKPIs.oee.target)} rounded-full`}
              style={{ width: `${Math.min((operationalKPIs.oee.value / operationalKPIs.oee.target) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* On-Time Delivery */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">On-Time Delivery</span>
            <div className={`p-2 rounded-lg ${getStatusBg(operationalKPIs.onTimeDelivery.status)}`}>
              <Truck className={`w-5 h-5 ${getStatusColor(operationalKPIs.onTimeDelivery.status)}`} />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{operationalKPIs.onTimeDelivery.value}</span>
            <span className="text-gray-500 dark:text-gray-400 mb-1">%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Target: {operationalKPIs.onTimeDelivery.target}%</span>
            <div className="flex items-center gap-1 text-green-500">
              <ArrowUpRight className="w-4 h-4" />
              {operationalKPIs.onTimeDelivery.trend}%
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getPerformanceColor(operationalKPIs.onTimeDelivery.value, operationalKPIs.onTimeDelivery.target)} rounded-full`}
              style={{ width: `${Math.min((operationalKPIs.onTimeDelivery.value / operationalKPIs.onTimeDelivery.target) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Defect Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Defect Rate</span>
            <div className={`p-2 rounded-lg ${getStatusBg(operationalKPIs.defectRate.status)}`}>
              <Award className={`w-5 h-5 ${getStatusColor(operationalKPIs.defectRate.status)}`} />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{operationalKPIs.defectRate.value}</span>
            <span className="text-gray-500 dark:text-gray-400 mb-1">%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Target: &lt;{operationalKPIs.defectRate.target}%</span>
            <div className="flex items-center gap-1 text-green-500">
              <ArrowDownRight className="w-4 h-4" />
              {Math.abs(operationalKPIs.defectRate.trend)}%
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${100 - (operationalKPIs.defectRate.value / operationalKPIs.defectRate.target) * 100}%` }}
            />
          </div>
        </div>

        {/* Throughput */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Throughput</span>
            <div className={`p-2 rounded-lg ${getStatusBg(operationalKPIs.throughput.status)}`}>
              <Zap className={`w-5 h-5 ${getStatusColor(operationalKPIs.throughput.status)}`} />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{operationalKPIs.throughput.value.toLocaleString()}</span>
            <span className="text-gray-500 dark:text-gray-400 mb-1 text-xs">units/day</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Target: {operationalKPIs.throughput.target.toLocaleString()}</span>
            <div className="flex items-center gap-1 text-green-500">
              <ArrowUpRight className="w-4 h-4" />
              {operationalKPIs.throughput.trend}%
            </div>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${Math.min((operationalKPIs.throughput.value / operationalKPIs.throughput.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cycle Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{operationalKPIs.cycleTime.value} hrs</p>
            </div>
            <Timer className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
            <ArrowDownRight className="w-4 h-4" />
            Improved by {Math.abs(operationalKPIs.cycleTime.trend)} hrs
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{operationalKPIs.utilization.value}%</p>
            </div>
            <Factory className="w-8 h-8 text-purple-500" />
          </div>
          <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
            <ArrowUpRight className="w-4 h-4" />
            +{operationalKPIs.utilization.trend}% vs last week
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">MTBF</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{operationalKPIs.mtbf.value} hrs</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
          <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
            <ArrowUpRight className="w-4 h-4" />
            +{operationalKPIs.mtbf.trend} hrs improvement
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">MTTR</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{operationalKPIs.mttr.value} hrs</p>
            </div>
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
          <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
            <ArrowDownRight className="w-4 h-4" />
            Reduced by {Math.abs(operationalKPIs.mttr.trend)} hrs
          </div>
        </div>
      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Department Performance */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Department Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Department</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">OEE</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Quality</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Delivery</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {departmentPerformance.map((dept) => (
                  <tr key={dept.dept} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{dept.dept}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${dept.oee >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {dept.oee}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        {dept.quality}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${dept.delivery >= 95 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {dept.delivery}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${dept.efficiency >= 85 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {dept.efficiency}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Active Alerts
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}>
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{alert.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Production Metrics Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-500" />
            Production Metrics Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          {productionMetrics.map((metric) => (
            <div key={metric.name} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">{metric.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${metric.value >= metric.target ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                  {metric.value >= metric.target ? 'On Target' : 'Below Target'}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value.toLocaleString()}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{metric.unit}</span>
                </div>
                <div className={`flex items-center gap-1 text-sm ${metric.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {metric.change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Target: {metric.target.toLocaleString()} {metric.unit}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
