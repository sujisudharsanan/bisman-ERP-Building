'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Filter,
  PieChart,
  DollarSign,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BudgetItem {
  id: string;
  department: string;
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercent: number;
  forecast: number;
}

interface ForecastData {
  month: string;
  projected: number;
  actual: number;
  budget: number;
}

const mockBudgetData: BudgetItem[] = [
  { id: '1', department: 'Engineering', category: 'Salaries', budgeted: 5000000, actual: 4850000, variance: 150000, variancePercent: 3, forecast: 5200000 },
  { id: '2', department: 'Engineering', category: 'Infrastructure', budgeted: 2000000, actual: 2350000, variance: -350000, variancePercent: -17.5, forecast: 2500000 },
  { id: '3', department: 'Marketing', category: 'Campaigns', budgeted: 1500000, actual: 1200000, variance: 300000, variancePercent: 20, forecast: 1400000 },
  { id: '4', department: 'Marketing', category: 'Events', budgeted: 500000, actual: 480000, variance: 20000, variancePercent: 4, forecast: 550000 },
  { id: '5', department: 'Operations', category: 'Maintenance', budgeted: 800000, actual: 920000, variance: -120000, variancePercent: -15, forecast: 950000 },
  { id: '6', department: 'HR', category: 'Training', budgeted: 400000, actual: 350000, variance: 50000, variancePercent: 12.5, forecast: 420000 },
  { id: '7', department: 'Finance', category: 'Software', budgeted: 300000, actual: 280000, variance: 20000, variancePercent: 6.7, forecast: 310000 },
];

const forecastData: ForecastData[] = [
  { month: 'Jan', projected: 8500000, actual: 8200000, budget: 8000000 },
  { month: 'Feb', projected: 8800000, actual: 8500000, budget: 8200000 },
  { month: 'Mar', projected: 9200000, actual: 9100000, budget: 8500000 },
  { month: 'Apr', projected: 9500000, actual: 0, budget: 8800000 },
  { month: 'May', projected: 9800000, actual: 0, budget: 9000000 },
  { month: 'Jun', projected: 10200000, actual: 0, budget: 9200000 },
];

export default function BudgetingForecastingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('Q1');
  const [expandedDepartments, setExpandedDepartments] = useState<string[]>(['Engineering']);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const summary = useMemo(() => {
    const totalBudget = mockBudgetData.reduce((sum, item) => sum + item.budgeted, 0);
    const totalActual = mockBudgetData.reduce((sum, item) => sum + item.actual, 0);
    const totalVariance = totalBudget - totalActual;
    const totalForecast = mockBudgetData.reduce((sum, item) => sum + item.forecast, 0);
    return { totalBudget, totalActual, totalVariance, totalForecast };
  }, []);

  const departmentData = useMemo(() => {
    const grouped: { [key: string]: BudgetItem[] } = {};
    mockBudgetData.forEach(item => {
      if (!grouped[item.department]) {
        grouped[item.department] = [];
      }
      grouped[item.department].push(item);
    });
    return grouped;
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const toggleDepartment = (dept: string) => {
    setExpandedDepartments(prev => 
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              Budgeting & Forecasting
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Plan, track, and forecast financial performance across departments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="Q1">Q1 2026</option>
              <option value="Q2">Q2 2026</option>
              <option value="Q3">Q3 2026</option>
              <option value="Q4">Q4 2026</option>
              <option value="FY">Full Year 2026</option>
            </select>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalBudget)}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Actual Spend</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalActual)}</p>
              <p className="text-xs text-gray-500 mt-1">{((summary.totalActual / summary.totalBudget) * 100).toFixed(1)}% of budget</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Variance</p>
              <p className={`text-2xl font-bold mt-1 ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.totalVariance >= 0 ? '+' : ''}{formatCurrency(summary.totalVariance)}
              </p>
              <p className={`text-xs mt-1 ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.totalVariance >= 0 ? 'Under budget' : 'Over budget'}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${summary.totalVariance >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {summary.totalVariance >= 0 ? <TrendingDown className="w-6 h-6 text-green-600" /> : <TrendingUp className="w-6 h-6 text-red-600" />}
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Year-End Forecast</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalForecast)}</p>
              <p className="text-xs text-orange-600 mt-1">+5% vs budget</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget by Department */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Budget by Department</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Table
              </button>
              <button 
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 rounded text-sm ${viewMode === 'chart' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
              >
                Chart
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.entries(departmentData).map(([department, items]) => {
              const deptTotal = items.reduce((sum, item) => sum + item.budgeted, 0);
              const deptActual = items.reduce((sum, item) => sum + item.actual, 0);
              const deptVariance = deptTotal - deptActual;
              const isExpanded = expandedDepartments.includes(department);
              
              return (
                <div key={department}>
                  <button
                    onClick={() => toggleDepartment(department)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      <span className="font-medium text-gray-900 dark:text-white">{department}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">({items.length} categories)</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400">Budget</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(deptTotal)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 dark:text-gray-400">Actual</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(deptActual)}</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-gray-500 dark:text-gray-400">Variance</p>
                        <p className={`font-medium ${deptVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {deptVariance >= 0 ? '+' : ''}{formatCurrency(deptVariance)}
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-3">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                            <th className="text-left py-2 font-medium">Category</th>
                            <th className="text-right py-2 font-medium">Budget</th>
                            <th className="text-right py-2 font-medium">Actual</th>
                            <th className="text-right py-2 font-medium">Variance</th>
                            <th className="text-right py-2 font-medium">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(item => (
                            <tr key={item.id} className="text-sm">
                              <td className="py-2 text-gray-900 dark:text-white">{item.category}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.budgeted)}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.actual)}</td>
                              <td className={`py-2 text-right font-medium ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.variance >= 0 ? '+' : ''}{formatCurrency(item.variance)}
                              </td>
                              <td className={`py-2 text-right ${item.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.variancePercent >= 0 ? '+' : ''}{item.variancePercent}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Forecast Chart */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Forecast</h2>
            <div className="space-y-4">
              {forecastData.map((data, index) => (
                <div key={data.month}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{data.month}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(data.projected)}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${data.actual > 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${(data.projected / 12000000) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Budget Alerts
            </h2>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Engineering Infrastructure</p>
                <p className="text-xs text-red-600 dark:text-red-400">17.5% over budget</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Operations Maintenance</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">15% over budget</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Q2 forecast exceeds plan</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Review recommended</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
