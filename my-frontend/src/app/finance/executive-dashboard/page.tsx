'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  LineChart,
  Calendar,
  Download,
  RefreshCw,
  Target,
  Briefcase,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  Activity,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Mock data for executive metrics
const financialMetrics = {
  revenue: { current: 12500000, previous: 11200000, target: 13000000 },
  grossProfit: { current: 4875000, previous: 4350000, margin: 39 },
  netIncome: { current: 1875000, previous: 1650000, margin: 15 },
  operatingExpenses: { current: 2450000, previous: 2300000 },
  cashFlow: { current: 2150000, previous: 1890000 },
  ebitda: { current: 2800000, previous: 2500000, margin: 22.4 }
};

const revenueBySegment = [
  { segment: 'Enterprise', revenue: 5500000, percentage: 44, growth: 15 },
  { segment: 'SMB', revenue: 3750000, percentage: 30, growth: 8 },
  { segment: 'Retail', revenue: 2000000, percentage: 16, growth: 12 },
  { segment: 'Government', revenue: 1250000, percentage: 10, growth: 5 }
];

const expenseBreakdown = [
  { category: 'Personnel', amount: 1225000, percentage: 50, color: 'bg-blue-500' },
  { category: 'Operations', amount: 490000, percentage: 20, color: 'bg-green-500' },
  { category: 'Marketing', amount: 367500, percentage: 15, color: 'bg-purple-500' },
  { category: 'Technology', amount: 245000, percentage: 10, color: 'bg-orange-500' },
  { category: 'Other', amount: 122500, percentage: 5, color: 'bg-gray-500' }
];

const monthlyTrend = [
  { month: 'Aug', revenue: 9800000, profit: 1420000 },
  { month: 'Sep', revenue: 10200000, profit: 1520000 },
  { month: 'Oct', revenue: 10800000, profit: 1650000 },
  { month: 'Nov', revenue: 11200000, profit: 1720000 },
  { month: 'Dec', revenue: 11800000, profit: 1800000 },
  { month: 'Jan', revenue: 12500000, profit: 1875000 }
];

const keyPerformanceIndicators = [
  { name: 'Revenue Growth YoY', value: '24.5%', target: '20%', status: 'above', icon: TrendingUp },
  { name: 'Gross Margin', value: '39%', target: '38%', status: 'above', icon: Target },
  { name: 'Customer Acquisition Cost', value: '$1,250', target: '$1,400', status: 'above', icon: Users },
  { name: 'Customer Lifetime Value', value: '$45,000', target: '$40,000', status: 'above', icon: DollarSign },
  { name: 'Operating Margin', value: '15%', target: '16%', status: 'below', icon: Activity },
  { name: 'Working Capital Ratio', value: '1.8', target: '1.5', status: 'above', icon: Wallet }
];

const alerts = [
  { id: 1, type: 'warning', message: 'Q1 marketing budget 85% utilized', time: '2 hours ago' },
  { id: 2, type: 'info', message: 'Board meeting scheduled for Jan 25', time: '1 day ago' },
  { id: 3, type: 'success', message: 'Revenue target achieved for January', time: '2 days ago' }
];

export default function ExecutiveDashboardPage() {
  const [timeRange, setTimeRange] = useState('mtd');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const calculateChange = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-indigo-500" />
              Executive Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Financial overview and key business metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="mtd">Month to Date</option>
              <option value="qtd">Quarter to Date</option>
              <option value="ytd">Year to Date</option>
              <option value="ly">Last Year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <span className="text-indigo-100 text-sm font-medium">Total Revenue</span>
            <DollarSign className="w-6 h-6 text-indigo-200" />
          </div>
          <div className="text-4xl font-bold mb-2">{formatCurrency(financialMetrics.revenue.current)}</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm">{calculateChange(financialMetrics.revenue.current, financialMetrics.revenue.previous)}% vs last period</span>
            </div>
            <div className="text-xs text-indigo-200">Target: {formatCurrency(financialMetrics.revenue.target)}</div>
          </div>
          <div className="mt-4 h-2 bg-indigo-400/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full"
              style={{ width: `${(financialMetrics.revenue.current / financialMetrics.revenue.target) * 100}%` }}
            />
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Gross Profit</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {formatCurrency(financialMetrics.grossProfit.current)}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-500">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm">{calculateChange(financialMetrics.grossProfit.current, financialMetrics.grossProfit.previous)}%</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Margin: {financialMetrics.grossProfit.margin}%</span>
          </div>
        </div>

        {/* Net Income */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Net Income</span>
            <Wallet className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {formatCurrency(financialMetrics.netIncome.current)}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-500">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm">{calculateChange(financialMetrics.netIncome.current, financialMetrics.netIncome.previous)}%</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Margin: {financialMetrics.netIncome.margin}%</span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Operating Expenses</span>
            <CreditCard className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(financialMetrics.operatingExpenses.current)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
            <ArrowUpRight className="w-4 h-4" />
            <span>{calculateChange(financialMetrics.operatingExpenses.current, financialMetrics.operatingExpenses.previous)}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">Cash Flow</span>
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(financialMetrics.cashFlow.current)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-green-500 text-sm">
            <ArrowUpRight className="w-4 h-4" />
            <span>{calculateChange(financialMetrics.cashFlow.current, financialMetrics.cashFlow.previous)}%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm">EBITDA</span>
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(financialMetrics.ebitda.current)}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              <span>{calculateChange(financialMetrics.ebitda.current, financialMetrics.ebitda.previous)}%</span>
            </div>
            <span className="text-sm text-gray-500">Margin: {financialMetrics.ebitda.margin}%</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Segment */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-500" />
            Revenue by Segment
          </h2>
          <div className="space-y-4">
            {revenueBySegment.map((segment) => (
              <div key={segment.segment} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-600 dark:text-gray-400">{segment.segment}</div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-end pr-2"
                      style={{ width: `${segment.percentage}%` }}
                    >
                      <span className="text-xs font-medium text-white">{segment.percentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(segment.revenue)}</div>
                  <div className="text-xs text-green-500">+{segment.growth}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Expense Breakdown
          </h2>
          <div className="space-y-4">
            {expenseBreakdown.map((expense) => (
              <div key={expense.category} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-600 dark:text-gray-400">{expense.category}</div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <div 
                      className={`h-full ${expense.color} flex items-center justify-end pr-2`}
                      style={{ width: `${expense.percentage}%` }}
                    >
                      <span className="text-xs font-medium text-white">{expense.percentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-right font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPIs */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" />
              Key Performance Indicators
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {keyPerformanceIndicators.map((kpi) => (
              <div key={kpi.name} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`w-4 h-4 ${kpi.status === 'above' ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{kpi.name}</span>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">Target: {kpi.target}</span>
                  <span className={`text-xs ${kpi.status === 'above' ? 'text-green-500' : 'text-red-500'}`}>
                    {kpi.status === 'above' ? '✓ Above' : '↓ Below'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Alerts & Notifications
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{alert.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{alert.time}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button className="w-full text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              View All Alerts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
