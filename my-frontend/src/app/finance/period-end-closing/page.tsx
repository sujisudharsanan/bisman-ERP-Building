'use client';

import React, { useState } from 'react';
import { Calendar, Lock, Unlock, CheckCircle, AlertTriangle, Clock, Play, FileText, ArrowRight, Shield, RefreshCw } from 'lucide-react';

interface PeriodTask {
  id: string;
  name: string;
  description: string;
  status: 'Completed' | 'In Progress' | 'Pending' | 'Blocked';
  dueDate: string;
  completedDate?: string;
  assignee: string;
}

interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Open' | 'In Closing' | 'Closed';
  completedTasks: number;
  totalTasks: number;
}

export default function PeriodEndClosingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2025-01');

  const periods: Period[] = [
    { id: '2025-01', name: 'January 2025', startDate: '2025-01-01', endDate: '2025-01-31', status: 'Open', completedTasks: 3, totalTasks: 12 },
    { id: '2024-12', name: 'December 2024', startDate: '2024-12-01', endDate: '2024-12-31', status: 'Closed', completedTasks: 12, totalTasks: 12 },
    { id: '2024-11', name: 'November 2024', startDate: '2024-11-01', endDate: '2024-11-30', status: 'Closed', completedTasks: 12, totalTasks: 12 },
  ];

  const closingTasks: PeriodTask[] = [
    { id: 'T001', name: 'Bank Reconciliation', description: 'Reconcile all bank accounts', status: 'Completed', dueDate: '2025-01-25', completedDate: '2025-01-15', assignee: 'Accountant' },
    { id: 'T002', name: 'Accounts Receivable Review', description: 'Review and age AR balances', status: 'Completed', dueDate: '2025-01-26', completedDate: '2025-01-14', assignee: 'AR Manager' },
    { id: 'T003', name: 'Accounts Payable Review', description: 'Review and age AP balances', status: 'Completed', dueDate: '2025-01-26', completedDate: '2025-01-13', assignee: 'AP Manager' },
    { id: 'T004', name: 'Inventory Valuation', description: 'Update inventory costs and valuation', status: 'In Progress', dueDate: '2025-01-27', assignee: 'Inventory Controller' },
    { id: 'T005', name: 'Fixed Asset Depreciation', description: 'Run monthly depreciation', status: 'In Progress', dueDate: '2025-01-27', assignee: 'Accountant' },
    { id: 'T006', name: 'Accruals and Provisions', description: 'Record month-end accruals', status: 'Pending', dueDate: '2025-01-28', assignee: 'Finance Manager' },
    { id: 'T007', name: 'Inter-Company Reconciliation', description: 'Reconcile inter-company balances', status: 'Pending', dueDate: '2025-01-28', assignee: 'Group Accountant' },
    { id: 'T008', name: 'Revenue Recognition', description: 'Verify revenue recognition', status: 'Pending', dueDate: '2025-01-29', assignee: 'Revenue Accountant' },
    { id: 'T009', name: 'Expense Cutoff', description: 'Ensure proper expense cutoff', status: 'Blocked', dueDate: '2025-01-29', assignee: 'Accountant' },
    { id: 'T010', name: 'Trial Balance Review', description: 'Review and validate trial balance', status: 'Pending', dueDate: '2025-01-30', assignee: 'Finance Manager' },
    { id: 'T011', name: 'Management Reporting', description: 'Prepare management reports', status: 'Pending', dueDate: '2025-01-31', assignee: 'Financial Analyst' },
    { id: 'T012', name: 'Period Lock', description: 'Lock period for further entries', status: 'Pending', dueDate: '2025-01-31', assignee: 'Controller' },
  ];

  const currentPeriod = periods.find(p => p.id === selectedPeriod);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Pending: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      Blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    const icons: Record<string, any> = { Completed: CheckCircle, 'In Progress': RefreshCw, Pending: Clock, Blocked: AlertTriangle };
    const Icon = icons[status];
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}><Icon className="w-3 h-3" />{status}</span>;
  };

  const getPeriodStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Open: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'In Closing': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      Closed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{status === 'Open' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}{status}</span>;
  };

  const stats = {
    completed: closingTasks.filter(t => t.status === 'Completed').length,
    inProgress: closingTasks.filter(t => t.status === 'In Progress').length,
    pending: closingTasks.filter(t => t.status === 'Pending').length,
    blocked: closingTasks.filter(t => t.status === 'Blocked').length
  };

  const progressPercentage = Math.round((stats.completed / closingTasks.length) * 100);

  return (
    <div className="min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Calendar className="w-8 h-8 text-amber-600" />Period End Closing
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage month-end and year-end closing processes</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {currentPeriod?.status === 'Open' && (
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
              <Play className="w-4 h-4" />Start Closing
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Period Status</p>
          <div className="mt-1">{getPeriodStatusBadge(currentPeriod?.status || 'Open')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Blocked</p>
          <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Closing Progress</span>
          <span className="text-sm font-semibold text-amber-600">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div className="bg-amber-600 h-3 rounded-full transition-all" style={{ width: `${progressPercentage}%` }}></div>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{stats.completed} of {closingTasks.length} tasks completed</span>
          <span>Target: {currentPeriod?.endDate}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Closing Checklist - {currentPeriod?.name}</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {closingTasks.map((task, index) => (
            <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">{task.name}</h3>
                  {getStatusBadge(task.status)}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                <p className="text-xs text-gray-400">{task.assignee}</p>
              </div>
              <div className="flex items-center gap-1">
                {task.status === 'Pending' && (
                  <button className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded" title="Start"><Play className="w-4 h-4 text-blue-600" /></button>
                )}
                {task.status === 'In Progress' && (
                  <button className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded" title="Complete"><CheckCircle className="w-4 h-4 text-green-600" /></button>
                )}
                <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Details"><FileText className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
