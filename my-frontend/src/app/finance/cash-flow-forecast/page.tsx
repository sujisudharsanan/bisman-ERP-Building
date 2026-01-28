'use client';

import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  DollarSign
} from 'lucide-react';

interface CashFlowItem {
  id: string;
  date: string;
  category: string;
  type: 'inflow' | 'outflow';
  amount: number;
  description: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

const mockForecastData: CashFlowItem[] = [
  { id: '1', date: '2026-01-20', category: 'Revenue', type: 'inflow', amount: 5000000, description: 'Customer Collections - Batch 1', source: 'AR Aging', confidence: 'high' },
  { id: '2', date: '2026-01-22', category: 'Revenue', type: 'inflow', amount: 3500000, description: 'Customer Collections - Batch 2', source: 'AR Aging', confidence: 'medium' },
  { id: '3', date: '2026-01-25', category: 'Payroll', type: 'outflow', amount: 8000000, description: 'Monthly Salary Disbursement', source: 'HR System', confidence: 'high' },
  { id: '4', date: '2026-01-28', category: 'Vendors', type: 'outflow', amount: 2500000, description: 'Vendor Payments Due', source: 'AP Aging', confidence: 'high' },
  { id: '5', date: '2026-01-30', category: 'Tax', type: 'outflow', amount: 1500000, description: 'GST Payment', source: 'Tax Calendar', confidence: 'high' },
  { id: '6', date: '2026-02-05', category: 'Revenue', type: 'inflow', amount: 4200000, description: 'Expected Collections', source: 'Sales Forecast', confidence: 'medium' },
  { id: '7', date: '2026-02-10', category: 'Investment', type: 'inflow', amount: 500000, description: 'Interest Income', source: 'Treasury', confidence: 'high' },
];

export default function CashFlowForecastPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredData = useMemo(() => {
    if (filterType === 'all') return mockForecastData;
    return mockForecastData.filter(item => item.type === filterType);
  }, [filterType]);

  const summary = useMemo(() => {
    const inflows = mockForecastData.filter(i => i.type === 'inflow').reduce((sum, i) => sum + i.amount, 0);
    const outflows = mockForecastData.filter(i => i.type === 'outflow').reduce((sum, i) => sum + i.amount, 0);
    const netCashFlow = inflows - outflows;
    const openingBalance = 15000000;
    const projectedBalance = openingBalance + netCashFlow;
    return { inflows, outflows, netCashFlow, openingBalance, projectedBalance };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getConfidenceBadge = (confidence: string) => {
    const styles = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[confidence as keyof typeof styles]}`}>
        {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Wallet className="w-8 h-8 text-blue-600" />
              Cash Flow Forecast
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Project future cash positions and identify potential shortfalls
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="7">Next 7 Days</option>
              <option value="30">Next 30 Days</option>
              <option value="60">Next 60 Days</option>
              <option value="90">Next 90 Days</option>
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Opening Balance</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.openingBalance)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-green-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Expected Inflows</p>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.inflows)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4 text-red-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Expected Outflows</p>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.outflows)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Cash Flow</p>
          <p className={`text-2xl font-bold mt-1 ${summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p className="text-sm text-blue-100">Projected Balance</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(summary.projectedBalance)}</p>
        </div>
      </div>

      {/* Alert */}
      {summary.projectedBalance < 5000000 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-300">Low Cash Warning</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">Projected balance may fall below minimum threshold. Consider accelerating collections or arranging credit facility.</p>
          </div>
        </div>
      )}

      {/* Forecast Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cash Flow Details</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded text-sm ${filterType === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('inflow')}
              className={`px-3 py-1 rounded text-sm ${filterType === 'inflow' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Inflows
            </button>
            <button 
              onClick={() => setFilterType('outflow')}
              className={`px-3 py-1 rounded text-sm ${filterType === 'outflow' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Outflows
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Source</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                    {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{item.source}</td>
                  <td className={`px-6 py-4 text-sm text-right font-medium ${item.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'inflow' ? '+' : '-'}{formatCurrency(item.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">{getConfidenceBadge(item.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
