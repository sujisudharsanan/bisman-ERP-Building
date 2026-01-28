'use client';

import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Download,
  Edit2,
  Trash2,
  Eye,
  ChevronRight,
  FolderTree,
  DollarSign,
  TrendingUp
} from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subType: string;
  balance: number;
  currency: string;
  isActive: boolean;
  level: number;
  parentId: string | null;
  hasChildren: boolean;
}

const mockAccounts: Account[] = [
  // Assets
  { id: '1', code: '1000', name: 'Assets', type: 'Asset', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 0, parentId: null, hasChildren: true },
  { id: '2', code: '1100', name: 'Current Assets', type: 'Asset', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 1, parentId: '1', hasChildren: true },
  { id: '3', code: '1110', name: 'Cash and Cash Equivalents', type: 'Asset', subType: 'Cash', balance: 25000000, currency: 'INR', isActive: true, level: 2, parentId: '2', hasChildren: false },
  { id: '4', code: '1120', name: 'Accounts Receivable', type: 'Asset', subType: 'Receivable', balance: 18500000, currency: 'INR', isActive: true, level: 2, parentId: '2', hasChildren: false },
  { id: '5', code: '1130', name: 'Inventory', type: 'Asset', subType: 'Inventory', balance: 12000000, currency: 'INR', isActive: true, level: 2, parentId: '2', hasChildren: false },
  { id: '6', code: '1200', name: 'Fixed Assets', type: 'Asset', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 1, parentId: '1', hasChildren: true },
  { id: '7', code: '1210', name: 'Property, Plant & Equipment', type: 'Asset', subType: 'Fixed Asset', balance: 45000000, currency: 'INR', isActive: true, level: 2, parentId: '6', hasChildren: false },
  
  // Liabilities
  { id: '8', code: '2000', name: 'Liabilities', type: 'Liability', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 0, parentId: null, hasChildren: true },
  { id: '9', code: '2100', name: 'Current Liabilities', type: 'Liability', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 1, parentId: '8', hasChildren: true },
  { id: '10', code: '2110', name: 'Accounts Payable', type: 'Liability', subType: 'Payable', balance: 15000000, currency: 'INR', isActive: true, level: 2, parentId: '9', hasChildren: false },
  { id: '11', code: '2120', name: 'Short-term Loans', type: 'Liability', subType: 'Loan', balance: 10000000, currency: 'INR', isActive: true, level: 2, parentId: '9', hasChildren: false },
  
  // Equity
  { id: '12', code: '3000', name: 'Equity', type: 'Equity', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 0, parentId: null, hasChildren: true },
  { id: '13', code: '3100', name: 'Share Capital', type: 'Equity', subType: 'Capital', balance: 50000000, currency: 'INR', isActive: true, level: 1, parentId: '12', hasChildren: false },
  { id: '14', code: '3200', name: 'Retained Earnings', type: 'Equity', subType: 'Earnings', balance: 25500000, currency: 'INR', isActive: true, level: 1, parentId: '12', hasChildren: false },
  
  // Revenue
  { id: '15', code: '4000', name: 'Revenue', type: 'Revenue', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 0, parentId: null, hasChildren: true },
  { id: '16', code: '4100', name: 'Sales Revenue', type: 'Revenue', subType: 'Sales', balance: 85000000, currency: 'INR', isActive: true, level: 1, parentId: '15', hasChildren: false },
  { id: '17', code: '4200', name: 'Service Revenue', type: 'Revenue', subType: 'Service', balance: 25000000, currency: 'INR', isActive: true, level: 1, parentId: '15', hasChildren: false },
  
  // Expenses
  { id: '18', code: '5000', name: 'Expenses', type: 'Expense', subType: 'Header', balance: 0, currency: 'INR', isActive: true, level: 0, parentId: null, hasChildren: true },
  { id: '19', code: '5100', name: 'Cost of Goods Sold', type: 'Expense', subType: 'COGS', balance: 55000000, currency: 'INR', isActive: true, level: 1, parentId: '18', hasChildren: false },
  { id: '20', code: '5200', name: 'Operating Expenses', type: 'Expense', subType: 'Operating', balance: 18000000, currency: 'INR', isActive: true, level: 1, parentId: '18', hasChildren: false },
];

export default function ChartOfAccountsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>(['1', '2', '8', '9']);
  const [showInactive, setShowInactive] = useState(false);

  const filteredAccounts = useMemo(() => {
    return mockAccounts.filter(account => {
      const matchesSearch = account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           account.code.includes(searchTerm);
      const matchesType = typeFilter === 'all' || account.type === typeFilter;
      const matchesActive = showInactive || account.isActive;
      return matchesSearch && matchesType && matchesActive;
    });
  }, [searchTerm, typeFilter, showInactive]);

  const summary = useMemo(() => {
    const assets = mockAccounts.filter(a => a.type === 'Asset' && !a.hasChildren).reduce((sum, a) => sum + a.balance, 0);
    const liabilities = mockAccounts.filter(a => a.type === 'Liability' && !a.hasChildren).reduce((sum, a) => sum + a.balance, 0);
    const equity = mockAccounts.filter(a => a.type === 'Equity' && !a.hasChildren).reduce((sum, a) => sum + a.balance, 0);
    const revenue = mockAccounts.filter(a => a.type === 'Revenue' && !a.hasChildren).reduce((sum, a) => sum + a.balance, 0);
    const expenses = mockAccounts.filter(a => a.type === 'Expense' && !a.hasChildren).reduce((sum, a) => sum + a.balance, 0);
    return { assets, liabilities, equity, revenue, expenses, totalAccounts: mockAccounts.length };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getTypeColor = (type: string) => {
    const colors = {
      Asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      Liability: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      Equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      Revenue: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      Expense: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const toggleExpand = (id: string) => {
    setExpandedAccounts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Chart of Accounts
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your organization's account structure and hierarchy
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Assets</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(summary.assets)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Liabilities</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(summary.liabilities)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Equity</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{formatCurrency(summary.equity)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Net Revenue</p>
          <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(summary.revenue - summary.expenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Accounts</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{summary.totalAccounts}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expenses</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Show inactive
          </label>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Account Name</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Sub-Type</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Balance</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-3">
                    <span className="font-mono text-sm text-gray-900 dark:text-white">{account.code}</span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${account.level * 20}px` }}>
                      {account.hasChildren && (
                        <button 
                          onClick={() => toggleExpand(account.id)}
                          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        >
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedAccounts.includes(account.id) ? 'rotate-90' : ''}`} />
                        </button>
                      )}
                      {!account.hasChildren && <span className="w-5" />}
                      <span className={`text-sm ${account.hasChildren ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {account.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(account.type)}`}>
                      {account.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-400">{account.subType}</td>
                  <td className="px-6 py-3 text-right">
                    {!account.hasChildren && account.balance > 0 && (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(account.balance)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${account.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
