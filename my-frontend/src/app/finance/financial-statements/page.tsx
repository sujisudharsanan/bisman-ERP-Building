'use client';

import React, { useState } from 'react';
import { FileText, Download, Calendar, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart } from 'lucide-react';

export default function FinancialStatementsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Q4-2025');
  const [selectedStatement, setSelectedStatement] = useState('balance-sheet');

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(amount));

  const balanceSheetData = {
    assets: { current: 55500000, fixed: 45000000, total: 100500000 },
    liabilities: { current: 25000000, longTerm: 15000000, total: 40000000 },
    equity: { capital: 50000000, retained: 10500000, total: 60500000 },
  };

  const incomeData = { revenue: 110000000, cogs: 55000000, grossProfit: 55000000, opex: 35000000, netIncome: 15000000 };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />Financial Statements
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">View and export financial statements</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="Q4-2025">Q4 2025</option><option value="Q3-2025">Q3 2025</option><option value="FY-2025">FY 2025</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Download className="w-4 h-4" />Export PDF</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {['balance-sheet', 'income-statement', 'cash-flow'].map((stmt) => (
          <button key={stmt} onClick={() => setSelectedStatement(stmt)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedStatement === stmt ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'}`}>
            {stmt === 'balance-sheet' ? 'Balance Sheet' : stmt === 'income-statement' ? 'Income Statement' : 'Cash Flow'}
          </button>
        ))}
      </div>

      {selectedStatement === 'balance-sheet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assets</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Current Assets</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(balanceSheetData.assets.current)}</span></div>
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Fixed Assets</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(balanceSheetData.assets.fixed)}</span></div>
              <div className="flex justify-between py-2 bg-blue-50 dark:bg-blue-900/20 px-2 rounded"><span className="text-sm font-semibold text-gray-900 dark:text-white">Total Assets</span><span className="text-sm font-bold text-blue-600">{formatCurrency(balanceSheetData.assets.total)}</span></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Liabilities</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Current Liabilities</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(balanceSheetData.liabilities.current)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Long-term Liabilities</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(balanceSheetData.liabilities.longTerm)}</span></div>
                <div className="flex justify-between py-2 bg-red-50 dark:bg-red-900/20 px-2 rounded"><span className="text-sm font-semibold text-gray-900 dark:text-white">Total Liabilities</span><span className="text-sm font-bold text-red-600">{formatCurrency(balanceSheetData.liabilities.total)}</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Equity</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Share Capital</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(balanceSheetData.equity.capital)}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Retained Earnings</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(balanceSheetData.equity.retained)}</span></div>
                <div className="flex justify-between py-2 bg-green-50 dark:bg-green-900/20 px-2 rounded"><span className="text-sm font-semibold text-gray-900 dark:text-white">Total Equity</span><span className="text-sm font-bold text-green-600">{formatCurrency(balanceSheetData.equity.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedStatement === 'income-statement' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Income Statement - {selectedPeriod}</h2>
          <div className="space-y-3 max-w-2xl">
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span><span className="text-sm font-medium text-green-600">{formatCurrency(incomeData.revenue)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Cost of Goods Sold</span><span className="text-sm font-medium text-red-600">({formatCurrency(incomeData.cogs)})</span></div>
            <div className="flex justify-between py-2 border-b-2 border-gray-300 dark:border-gray-600"><span className="text-sm font-semibold text-gray-900 dark:text-white">Gross Profit</span><span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(incomeData.grossProfit)}</span></div>
            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700"><span className="text-sm text-gray-600 dark:text-gray-400">Operating Expenses</span><span className="text-sm font-medium text-red-600">({formatCurrency(incomeData.opex)})</span></div>
            <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-900/20 px-2 rounded mt-2"><span className="text-base font-bold text-gray-900 dark:text-white">Net Income</span><span className="text-base font-bold text-blue-600">{formatCurrency(incomeData.netIncome)}</span></div>
          </div>
        </div>
      )}

      {selectedStatement === 'cash-flow' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statement of Cash Flows - {selectedPeriod}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">View detailed cash flow statement in the dedicated Cash Flow Statement page.</p>
          <a href="/finance/cash-flow-statement" className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium">Go to Cash Flow Statement →</a>
        </div>
      )}
    </div>
  );
}
