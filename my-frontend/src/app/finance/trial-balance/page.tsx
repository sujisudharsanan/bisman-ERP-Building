'use client';

import React, { useState, useMemo } from 'react';
import { Scale, Download, Calendar, Search, ChevronDown, ChevronRight, Filter } from 'lucide-react';

interface AccountBalance {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  debit: number;
  credit: number;
  children?: AccountBalance[];
  expanded?: boolean;
}

export default function TrialBalancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2025-01');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set(['1000', '2000', '3000']));

  const accounts: AccountBalance[] = [
    { code: '1000', name: 'Assets', type: 'Asset', debit: 100500000, credit: 0, children: [
      { code: '1100', name: 'Current Assets', type: 'Asset', debit: 55500000, credit: 0, children: [
        { code: '1101', name: 'Cash and Bank', type: 'Asset', debit: 25000000, credit: 0 },
        { code: '1102', name: 'Accounts Receivable', type: 'Asset', debit: 18500000, credit: 0 },
        { code: '1103', name: 'Inventory', type: 'Asset', debit: 12000000, credit: 0 },
      ]},
      { code: '1200', name: 'Fixed Assets', type: 'Asset', debit: 45000000, credit: 0, children: [
        { code: '1201', name: 'Property, Plant & Equipment', type: 'Asset', debit: 50000000, credit: 0 },
        { code: '1202', name: 'Accumulated Depreciation', type: 'Asset', debit: 0, credit: 5000000 },
      ]},
    ]},
    { code: '2000', name: 'Liabilities', type: 'Liability', debit: 0, credit: 40000000, children: [
      { code: '2100', name: 'Current Liabilities', type: 'Liability', debit: 0, credit: 25000000, children: [
        { code: '2101', name: 'Accounts Payable', type: 'Liability', debit: 0, credit: 15000000 },
        { code: '2102', name: 'Salaries Payable', type: 'Liability', debit: 0, credit: 5000000 },
        { code: '2103', name: 'Taxes Payable', type: 'Liability', debit: 0, credit: 5000000 },
      ]},
      { code: '2200', name: 'Long-term Liabilities', type: 'Liability', debit: 0, credit: 15000000 },
    ]},
    { code: '3000', name: 'Equity', type: 'Equity', debit: 0, credit: 60500000, children: [
      { code: '3001', name: 'Share Capital', type: 'Equity', debit: 0, credit: 50000000 },
      { code: '3002', name: 'Retained Earnings', type: 'Equity', debit: 0, credit: 10500000 },
    ]},
    { code: '4000', name: 'Revenue', type: 'Revenue', debit: 0, credit: 110000000, children: [
      { code: '4001', name: 'Sales Revenue', type: 'Revenue', debit: 0, credit: 100000000 },
      { code: '4002', name: 'Service Revenue', type: 'Revenue', debit: 0, credit: 8000000 },
      { code: '4003', name: 'Other Income', type: 'Revenue', debit: 0, credit: 2000000 },
    ]},
    { code: '5000', name: 'Expenses', type: 'Expense', debit: 110000000, credit: 0, children: [
      { code: '5001', name: 'Cost of Goods Sold', type: 'Expense', debit: 55000000, credit: 0 },
      { code: '5002', name: 'Salary Expense', type: 'Expense', debit: 30000000, credit: 0 },
      { code: '5003', name: 'Rent Expense', type: 'Expense', debit: 12000000, credit: 0 },
      { code: '5004', name: 'Utilities Expense', type: 'Expense', debit: 5000000, credit: 0 },
      { code: '5005', name: 'Depreciation Expense', type: 'Expense', debit: 5000000, credit: 0 },
      { code: '5006', name: 'Other Expenses', type: 'Expense', debit: 3000000, credit: 0 },
    ]},
  ];

  const formatCurrency = (amount: number) => amount === 0 ? '-' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const toggleExpand = (code: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedAccounts(newExpanded);
  };

  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    accounts.forEach(acc => {
      totalDebit += acc.debit;
      totalCredit += acc.credit;
    });
    return { debit: totalDebit, credit: totalCredit, balanced: totalDebit === totalCredit };
  }, []);

  const renderAccount = (account: AccountBalance, level: number = 0) => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedAccounts.has(account.code);
    const matchesSearch = !searchQuery || account.name.toLowerCase().includes(searchQuery.toLowerCase()) || account.code.includes(searchQuery);

    if (!matchesSearch && !hasChildren) return null;

    return (
      <React.Fragment key={account.code}>
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <td className="px-4 py-3" style={{ paddingLeft: `${level * 24 + 16}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren ? (
                <button onClick={() => toggleExpand(account.code)} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>
              ) : <span className="w-5" />}
              <span className="text-sm font-mono text-gray-500">{account.code}</span>
            </div>
          </td>
          <td className="px-4 py-3">
            <span className={`text-sm ${level === 0 ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{account.name}</span>
          </td>
          <td className="px-4 py-3 text-right">
            <span className={`text-sm ${account.debit > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400'}`}>{formatCurrency(account.debit)}</span>
          </td>
          <td className="px-4 py-3 text-right">
            <span className={`text-sm ${account.credit > 0 ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400'}`}>{formatCurrency(account.credit)}</span>
          </td>
        </tr>
        {hasChildren && isExpanded && account.children!.map(child => renderAccount(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Scale className="w-8 h-8 text-teal-600" />Trial Balance
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Summary of all general ledger account balances</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            <option value="2025-01">January 2025</option>
            <option value="2024-12">December 2024</option>
            <option value="2024-11">November 2024</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
            <Download className="w-4 h-4" />Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Debits</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.debit)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Credits</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.credit)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Balance Status</p>
          <p className={`text-2xl font-bold ${totals.balanced ? 'text-green-600' : 'text-red-600'}`}>{totals.balanced ? '✓ Balanced' : '✗ Unbalanced'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search accounts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
          </div>
          <button onClick={() => setExpandedAccounts(new Set(accounts.map(a => a.code)))} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Expand All</button>
          <button onClick={() => setExpandedAccounts(new Set())} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Collapse All</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Account Name</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-40">Debit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-40">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map(account => renderAccount(account))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">{formatCurrency(totals.debit)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{formatCurrency(totals.credit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
