'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
}

export default function CompanyDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');

  const metrics: MetricCard[] = [
    { title: 'Total Revenue', value: '₹12.5 Cr', change: 15.2, changeLabel: 'vs last month', icon: <DollarSign className="w-6 h-6" />, color: 'blue' },
    { title: 'Net Profit', value: '₹2.8 Cr', change: 8.5, changeLabel: 'vs last month', icon: <TrendingUp className="w-6 h-6" />, color: 'green' },
    { title: 'Total Expenses', value: '₹9.7 Cr', change: -3.2, changeLabel: 'vs last month', icon: <TrendingDown className="w-6 h-6" />, color: 'red' },
    { title: 'Cash Balance', value: '₹5.2 Cr', change: 12.1, changeLabel: 'vs last month', icon: <Building2 className="w-6 h-6" />, color: 'purple' },
  ];

  const recentTransactions = [
    { id: 1, description: 'Payment from ABC Corp', amount: 1500000, type: 'credit', date: '2026-01-15' },
    { id: 2, description: 'Vendor Payment - XYZ Supplies', amount: -850000, type: 'debit', date: '2026-01-14' },
    { id: 3, description: 'Salary Disbursement', amount: -2500000, type: 'debit', date: '2026-01-10' },
    { id: 4, description: 'Payment from DEF Ltd', amount: 2200000, type: 'credit', date: '2026-01-08' },
    { id: 5, description: 'Office Rent', amount: -350000, type: 'debit', date: '2026-01-05' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(amount));
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string; text: string }> = {
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', icon: 'text-blue-600', text: 'text-blue-600' },
      green: { bg: 'bg-green-100 dark:bg-green-900/30', icon: 'text-green-600', text: 'text-green-600' },
      red: { bg: 'bg-red-100 dark:bg-red-900/30', icon: 'text-red-600', text: 'text-red-600' },
      purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', icon: 'text-purple-600', text: 'text-purple-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              Company Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Financial overview and key performance indicators
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const colorClasses = getColorClasses(metric.color);
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses.bg}`}>
                  <span className={colorClasses.icon}>{metric.icon}</span>
                </div>
                <div className={`flex items-center gap-1 text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(metric.change)}%
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{metric.value}</p>
              <p className="text-xs text-gray-400 mt-1">{metric.changeLabel}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Trend</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Revenue chart visualization</p>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Breakdown</h2>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {[
              { label: 'Salaries', value: 45, color: 'bg-blue-500' },
              { label: 'Operations', value: 25, color: 'bg-green-500' },
              { label: 'Marketing', value: 15, color: 'bg-purple-500' },
              { label: 'Infrastructure', value: 10, color: 'bg-orange-500' },
              { label: 'Others', value: 5, color: 'bg-gray-500' },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="py-3 text-sm text-gray-900 dark:text-white">{tx.description}</td>
                    <td className="py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className={`py-3 text-sm text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : '-'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
