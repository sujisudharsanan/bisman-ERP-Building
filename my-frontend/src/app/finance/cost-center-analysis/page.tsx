'use client';

import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  Search,
  Filter,
  Download,
  BarChart3,
  DollarSign,
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CostCenter {
  id: string;
  code: string;
  name: string;
  department: string;
  manager: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

const mockCostCenters: CostCenter[] = [
  { id: '1', code: 'CC-ENG-001', name: 'Engineering - Development', department: 'Engineering', manager: 'John Smith', budget: 5000000, actual: 4800000, variance: 200000, variancePercent: 4 },
  { id: '2', code: 'CC-ENG-002', name: 'Engineering - QA', department: 'Engineering', manager: 'Sarah Lee', budget: 2000000, actual: 2150000, variance: -150000, variancePercent: -7.5 },
  { id: '3', code: 'CC-MKT-001', name: 'Marketing - Digital', department: 'Marketing', manager: 'Mike Johnson', budget: 1500000, actual: 1350000, variance: 150000, variancePercent: 10 },
  { id: '4', code: 'CC-MKT-002', name: 'Marketing - Events', department: 'Marketing', manager: 'Lisa Chen', budget: 800000, actual: 920000, variance: -120000, variancePercent: -15 },
  { id: '5', code: 'CC-OPS-001', name: 'Operations - Warehouse', department: 'Operations', manager: 'Tom Wilson', budget: 3000000, actual: 2850000, variance: 150000, variancePercent: 5 },
  { id: '6', code: 'CC-HR-001', name: 'HR - Recruitment', department: 'HR', manager: 'Emma Davis', budget: 1000000, actual: 950000, variance: 50000, variancePercent: 5 },
  { id: '7', code: 'CC-FIN-001', name: 'Finance - Accounting', department: 'Finance', manager: 'Robert Brown', budget: 800000, actual: 780000, variance: 20000, variancePercent: 2.5 },
];

export default function CostCenterAnalysisPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'variance'>('variance');

  const departments = useMemo(() => {
    return [...new Set(mockCostCenters.map(cc => cc.department))];
  }, []);

  const filteredCostCenters = useMemo(() => {
    return mockCostCenters
      .filter(cc => {
        const matchesSearch = cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             cc.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = departmentFilter === 'all' || cc.department === departmentFilter;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => sortBy === 'variance' ? Math.abs(b.variance) - Math.abs(a.variance) : a.name.localeCompare(b.name));
  }, [searchTerm, departmentFilter, sortBy]);

  const summary = useMemo(() => {
    const totalBudget = mockCostCenters.reduce((sum, cc) => sum + cc.budget, 0);
    const totalActual = mockCostCenters.reduce((sum, cc) => sum + cc.actual, 0);
    const totalVariance = totalBudget - totalActual;
    const underBudget = mockCostCenters.filter(cc => cc.variance > 0).length;
    const overBudget = mockCostCenters.filter(cc => cc.variance < 0).length;
    return { totalBudget, totalActual, totalVariance, underBudget, overBudget };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(amount));
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <PieChart className="w-8 h-8 text-blue-600" />
              Cost Center Analysis
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Analyze and compare cost center performance against budget
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalBudget)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Actual</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalActual)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Variance</p>
          <p className={`text-2xl font-bold mt-1 ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.totalVariance >= 0 ? '+' : '-'}{formatCurrency(summary.totalVariance)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Under Budget</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{summary.underBudget}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Over Budget</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.overBudget}</p>
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
                placeholder="Search cost centers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'variance')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="variance">Sort by Variance</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Cost Centers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Cost Center</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Manager</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Budget</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actual</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Variance</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCostCenters.map((cc) => (
                <tr key={cc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{cc.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{cc.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cc.department}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cc.manager}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">{formatCurrency(cc.budget)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white">{formatCurrency(cc.actual)}</td>
                  <td className="px-6 py-4 text-right">
                    <div>
                      <p className={`text-sm font-medium ${cc.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {cc.variance >= 0 ? '+' : '-'}{formatCurrency(cc.variance)}
                      </p>
                      <p className={`text-xs ${cc.variance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {cc.variance >= 0 ? '+' : ''}{cc.variancePercent}%
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      cc.variance >= 0 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {cc.variance >= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                      {cc.variance >= 0 ? 'Under' : 'Over'}
                    </span>
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
