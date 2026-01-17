'use client';

import React, { useState, useMemo } from 'react';
import {
  Scale,
  Search,
  Filter,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  Download,
  Building2,
  Users,
  Briefcase,
  ChevronRight,
  BarChart2,
  Shield,
  FileCheck
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Task {
  id: string;
  title: string;
  module: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

interface ComplianceMetric {
  label: string;
  value: number;
  change: number;
  icon: React.ElementType;
  color: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const stats = {
  pendingApprovals: 12,
  activeContracts: 89,
  complianceScore: 94,
  upcomingAudits: 3,
  openRisks: 7,
  documentsToReview: 15
};

const upcomingTasks: Task[] = [
  { id: 'T001', title: 'Review Q4 Compliance Report', module: 'Compliance', dueDate: '2024-01-22', priority: 'high', status: 'pending' },
  { id: 'T002', title: 'Contract Renewal - TechVendor', module: 'Contracts', dueDate: '2024-01-25', priority: 'high', status: 'in_progress' },
  { id: 'T003', title: 'Risk Assessment Update', module: 'Risk', dueDate: '2024-01-28', priority: 'medium', status: 'pending' },
  { id: 'T004', title: 'Policy Document Update', module: 'Policy', dueDate: '2024-02-01', priority: 'medium', status: 'pending' },
  { id: 'T005', title: 'Internal Audit Preparation', module: 'Audit', dueDate: '2024-02-05', priority: 'high', status: 'pending' }
];

const recentActivity = [
  { id: 'A001', action: 'Approved contract renewal', user: 'Sarah Johnson', time: '2 hours ago', module: 'Contracts' },
  { id: 'A002', action: 'Updated risk assessment', user: 'Michael Chen', time: '4 hours ago', module: 'Risk' },
  { id: 'A003', action: 'Completed compliance checklist', user: 'Emily Davis', time: 'Yesterday', module: 'Compliance' },
  { id: 'A004', action: 'Filed regulatory report', user: 'James Wilson', time: 'Yesterday', module: 'Regulatory' },
  { id: 'A005', action: 'Reviewed NDA agreement', user: 'Anna Lee', time: '2 days ago', module: 'Contracts' }
];

const complianceMetrics: ComplianceMetric[] = [
  { label: 'Document Compliance', value: 96, change: 2, icon: FileCheck, color: 'green' },
  { label: 'Policy Adherence', value: 92, change: -1, icon: Shield, color: 'blue' },
  { label: 'Training Completion', value: 88, change: 5, icon: Users, color: 'purple' },
  { label: 'Audit Readiness', value: 91, change: 3, icon: Scale, color: 'orange' }
];

// ============================================================================
// Sub-Components
// ============================================================================

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const config = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }[priority];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${config}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: Task['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function QuickAccessCard({ title, description, href, icon: Icon, count }: {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  count?: number;
}) {
  return (
    <a
      href={href}
      className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        {count !== undefined && (
          <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium">
            {count}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      <div className="mt-3 flex items-center text-sm text-blue-600 dark:text-blue-400">
        View <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </a>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ComplianceOfficerDashboard() {
  const [dateRange, setDateRange] = useState('7d');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Officer Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Overview of compliance, contracts, and regulatory matters</p>
          </div>
          <div className="flex gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last Quarter</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApprovals}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approvals</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeContracts}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Contracts</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.complianceScore}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Compliance Score</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Scale className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.upcomingAudits}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Audits</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.openRisks}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Open Risks</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <FileCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.documentsToReview}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">To Review</p>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {complianceMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <Icon className={`w-5 h-5 text-${metric.color}-600 dark:text-${metric.color}-400`} />
                  <span className={`text-xs font-medium ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change >= 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}%</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{metric.label}</p>
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`bg-${metric.color}-600 h-2 rounded-full`}
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Upcoming Tasks */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Upcoming Tasks</h3>
              <a href="/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</a>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{task.module}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {task.dueDate}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-4">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.action}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{activity.user}</span>
                    <span className="text-xs text-gray-400">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Access</h3>
        <div className="grid grid-cols-4 gap-4">
          <QuickAccessCard
            title="Contract Management"
            description="Manage all business contracts"
            href="/compliance/contract-management"
            icon={FileText}
            count={stats.activeContracts}
          />
          <QuickAccessCard
            title="Risk Management"
            description="View and assess risks"
            href="/compliance/risk-management"
            icon={AlertTriangle}
            count={stats.openRisks}
          />
          <QuickAccessCard
            title="Audit Trail"
            description="Review audit logs"
            href="/compliance/audit-trail"
            icon={Scale}
          />
          <QuickAccessCard
            title="Document Management"
            description="Access compliance documents"
            href="/compliance/document-management"
            icon={FileCheck}
            count={stats.documentsToReview}
          />
        </div>
      </div>
    </div>
  );
}
