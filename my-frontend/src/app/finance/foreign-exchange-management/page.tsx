'use client';

import React, { useState } from 'react';
import { Globe, ArrowRightLeft, TrendingUp, TrendingDown, DollarSign, RefreshCw, AlertTriangle, Calendar, Plus, Eye } from 'lucide-react';

interface ExchangeRate {
  currency: string;
  code: string;
  buyRate: number;
  sellRate: number;
  change: number;
  lastUpdated: string;
}

interface ForexTransaction {
  id: string;
  date: string;
  type: 'Buy' | 'Sell';
  currency: string;
  amount: number;
  rate: number;
  inrAmount: number;
  purpose: string;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

export default function ForeignExchangeManagementPage() {
  const [activeTab, setActiveTab] = useState<'rates' | 'transactions' | 'hedging'>('rates');

  const exchangeRates: ExchangeRate[] = [
    { currency: 'US Dollar', code: 'USD', buyRate: 83.25, sellRate: 83.45, change: 0.15, lastUpdated: '2025-01-15 14:30' },
    { currency: 'Euro', code: 'EUR', buyRate: 90.50, sellRate: 90.75, change: -0.22, lastUpdated: '2025-01-15 14:30' },
    { currency: 'British Pound', code: 'GBP', buyRate: 105.20, sellRate: 105.50, change: 0.35, lastUpdated: '2025-01-15 14:30' },
    { currency: 'Japanese Yen', code: 'JPY', buyRate: 0.55, sellRate: 0.56, change: -0.01, lastUpdated: '2025-01-15 14:30' },
    { currency: 'Singapore Dollar', code: 'SGD', buyRate: 61.80, sellRate: 62.05, change: 0.08, lastUpdated: '2025-01-15 14:30' },
    { currency: 'UAE Dirham', code: 'AED', buyRate: 22.65, sellRate: 22.75, change: 0.02, lastUpdated: '2025-01-15 14:30' },
  ];

  const transactions: ForexTransaction[] = [
    { id: 'FX-2025-001', date: '2025-01-15', type: 'Buy', currency: 'USD', amount: 50000, rate: 83.25, inrAmount: 4162500, purpose: 'Import Payment - Raw Materials', status: 'Completed' },
    { id: 'FX-2025-002', date: '2025-01-14', type: 'Sell', currency: 'EUR', amount: 25000, rate: 90.50, inrAmount: 2262500, purpose: 'Export Receivable - Germany', status: 'Completed' },
    { id: 'FX-2025-003', date: '2025-01-14', type: 'Buy', currency: 'GBP', amount: 15000, rate: 105.20, inrAmount: 1578000, purpose: 'Service Payment - UK Vendor', status: 'Pending' },
    { id: 'FX-2025-004', date: '2025-01-13', type: 'Sell', currency: 'USD', amount: 75000, rate: 83.40, inrAmount: 6255000, purpose: 'Export Receivable - USA', status: 'Completed' },
  ];

  const stats = {
    totalBuy: transactions.filter(t => t.type === 'Buy' && t.status === 'Completed').reduce((sum, t) => sum + t.inrAmount, 0),
    totalSell: transactions.filter(t => t.type === 'Sell' && t.status === 'Completed').reduce((sum, t) => sum + t.inrAmount, 0),
    openExposure: 12500000,
    hedgedAmount: 8500000
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    if (currency === 'INR') {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Globe className="w-8 h-8 text-cyan-600" />Foreign Exchange Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage forex transactions and currency exposure</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className="w-4 h-4" />Refresh Rates
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">
            <Plus className="w-4 h-4" />New Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Bought (INR)</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalBuy)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sold (INR)</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalSell)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open Exposure</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.openExposure)}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hedged Amount</p>
              <p className="text-2xl font-bold text-cyan-600">{formatCurrency(stats.hedgedAmount)}</p>
            </div>
            <ArrowRightLeft className="w-8 h-8 text-cyan-600 opacity-50" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['rates', 'transactions', 'hedging'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-cyan-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}>
            {tab === 'rates' ? 'Exchange Rates' : tab === 'transactions' ? 'Transactions' : 'Hedging'}
          </button>
        ))}
      </div>

      {activeTab === 'rates' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Exchange Rates (INR)</h2>
            <p className="text-xs text-gray-500 mt-1">Last updated: {exchangeRates[0].lastUpdated}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {exchangeRates.map((rate) => (
              <div key={rate.code} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{rate.code}</span>
                    <span className="text-sm text-gray-500">{rate.currency}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-sm font-medium ${rate.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {rate.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {rate.change >= 0 ? '+' : ''}{rate.change.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Buy Rate</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">₹{rate.buyRate.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Sell Rate</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">₹{rate.sellRate.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Transaction ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Currency</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">INR Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Purpose</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-cyan-600">{tx.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === 'Buy' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>{tx.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{tx.currency}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">{formatCurrency(tx.amount, tx.currency)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 text-right">₹{tx.rate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">{formatCurrency(tx.inrAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{tx.purpose}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tx.status === 'Completed' ? 'bg-green-100 text-green-700' : tx.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{tx.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hedging' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Forex Hedging Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Exposure Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm text-gray-500">Total Exposure</span><span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(stats.openExposure)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Hedged Amount</span><span className="text-sm font-semibold text-green-600">{formatCurrency(stats.hedgedAmount)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Unhedged Exposure</span><span className="text-sm font-semibold text-red-600">{formatCurrency(stats.openExposure - stats.hedgedAmount)}</span></div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                  <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${(stats.hedgedAmount / stats.openExposure) * 100}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 text-center">{((stats.hedgedAmount / stats.openExposure) * 100).toFixed(1)}% Hedged</p>
              </div>
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Active Forward Contracts</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-gray-600 dark:text-gray-400">USD Forward - Mar 2025</span><span className="font-medium">$50,000 @ 83.50</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span className="text-gray-600 dark:text-gray-400">EUR Forward - Apr 2025</span><span className="font-medium">€30,000 @ 91.00</span></div>
                <div className="flex justify-between py-2"><span className="text-gray-600 dark:text-gray-400">GBP Forward - May 2025</span><span className="font-medium">£20,000 @ 106.00</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
