'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Building2,
  Target,
  Activity
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface FinancialMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  change: number;
  changeType: 'increase' | 'decrease';
  currency: string;
  period: string;
}

interface PendingApproval {
  id: string;
  type: string;
  description: string;
  amount: number;
  requestedBy: string;
  date: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface BudgetItem {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const metrics: FinancialMetric[] = [
  {
    id: 'M1',
    name: 'Total Revenue',
    value: 2845000,
    previousValue: 2650000,
    change: 7.4,
    changeType: 'increase',
    currency: 'USD',
    period: 'This Month'
  },
  {
    id: 'M2',
    name: 'Total Expenses',
    value: 1890000,
    previousValue: 2100000,
    change: 10.0,
    changeType: 'decrease',
    currency: 'USD',
    period: 'This Month'
  },
  {
    id: 'M3',
    name: 'Net Profit',
    value: 955000,
    previousValue: 550000,
    change: 73.6,
    changeType: 'increase',
    currency: 'USD',
    period: 'This Month'
  },
  {
    id: 'M4',
    name: 'Cash Flow',
    value: 1250000,
    previousValue: 1100000,
    change: 13.6,
    changeType: 'increase',
    currency: 'USD',
    period: 'This Month'
  }
];

const pendingApprovals: PendingApproval[] = [
  { id: 'PA001', type: 'Payment Request', description: 'Vendor payment - IT Services', amount: 45000, requestedBy: 'John Smith', date: '2024-01-20', priority: 'high' },
  { id: 'PA002', type: 'Journal Entry', description: 'Q4 Accruals adjustment', amount: 128000, requestedBy: 'Sarah Connor', date: '2024-01-19', priority: 'medium' },
  { id: 'PA003', type: 'Budget Transfer', description: 'Marketing to R&D transfer', amount: 75000, requestedBy: 'Mike Johnson', date: '2024-01-18', priority: 'low' },
  { id: 'PA004', type: 'Invoice Approval', description: 'Capital equipment purchase', amount: 250000, requestedBy: 'Lisa Chen', date: '2024-01-20', priority: 'critical' },
  { id: 'PA005', type: 'Expense Report', description: 'Executive travel expenses', amount: 12500, requestedBy: 'David Brown', date: '2024-01-17', priority: 'medium' }
];

const budgetItems: BudgetItem[] = [
  { category: 'Operations', allocated: 500000, spent: 425000, remaining: 75000, percentUsed: 85 },
  { category: 'Marketing', allocated: 300000, spent: 180000, remaining: 120000, percentUsed: 60 },
  { category: 'R&D', allocated: 400000, spent: 380000, remaining: 20000, percentUsed: 95 },
  { category: 'HR', allocated: 200000, spent: 165000, remaining: 35000, percentUsed: 82.5 },
  { category: 'IT', allocated: 350000, spent: 290000, remaining: 60000, percentUsed: 82.9 }
];

const stats = {
  accountsReceivable: 1250000,
  accountsPayable: 890000,
  pendingApprovals: 12,
  overdueInvoices: 5
};

// ============================================================================
// Sub-Components
// ============================================================================

function PriorityBadge({ priority }: { priority: PendingApproval['priority'] }) {
  const config = {
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }[priority];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {priority}
    </span>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// ============================================================================
// Main Component
// ============================================================================

export default function FinanceControllerPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Controller Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Financial overview and management controls</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {metrics.map((metric) => (
            <div key={metric.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{metric.name}</p>
                <span className={`flex items-center gap-1 text-xs font-medium ${
                  metric.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {metric.changeType === 'increase' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {metric.change}%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(metric.value)}</p>
              <p className="text-xs text-gray-400 mt-1">{metric.period}</p>
            </div>
          ))}
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats.accountsReceivable)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Accounts Receivable</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(stats.accountsPayable)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Accounts Payable</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.pendingApprovals}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Approvals</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.overdueInvoices}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overdue Invoices</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Approvals</h2>
              <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{item.type}</span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>By {item.requestedBy}</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Overview</h2>
              <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline flex items-center gap-1">
                Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {budgetItems.map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.category}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(item.spent)} / {formatCurrency(item.allocated)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        item.percentUsed > 90 ? 'bg-red-500' : item.percentUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{item.percentUsed.toFixed(1)}% used • {formatCurrency(item.remaining)} remaining</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-5 gap-4">
          {[
            { icon: FileText, label: 'Journal Entries', color: 'blue' },
            { icon: CreditCard, label: 'Payment Requests', color: 'green' },
            { icon: Wallet, label: 'Budget Management', color: 'purple' },
            { icon: BarChart3, label: 'Financial Reports', color: 'orange' },
            { icon: Building2, label: 'Cost Centers', color: 'teal' }
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col items-center gap-2"
              >
                <div className={`p-3 bg-${action.color}-100 dark:bg-${action.color}-900/30 rounded-lg`}>
                  <Icon className={`w-6 h-6 text-${action.color}-600 dark:text-${action.color}-400`} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
