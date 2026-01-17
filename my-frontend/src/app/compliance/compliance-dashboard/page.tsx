'use client';

import React, { useState, useMemo } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

// Mock data for compliance metrics
const complianceMetrics = {
  overallScore: 94.2,
  previousScore: 91.8,
  totalPolicies: 48,
  compliantPolicies: 45,
  pendingReview: 12,
  criticalIssues: 2,
  upcomingDeadlines: 5,
  auditsDue: 3
};

const complianceCategories = [
  { name: 'Data Privacy', score: 98, policies: 12, issues: 0, status: 'compliant' },
  { name: 'Financial Regulations', score: 95, policies: 8, issues: 1, status: 'compliant' },
  { name: 'Employment Law', score: 92, policies: 10, issues: 2, status: 'warning' },
  { name: 'Environmental', score: 88, policies: 6, issues: 1, status: 'warning' },
  { name: 'Health & Safety', score: 96, policies: 7, issues: 0, status: 'compliant' },
  { name: 'Industry Standards', score: 94, policies: 5, issues: 0, status: 'compliant' }
];

const recentActivities = [
  { id: 1, action: 'Policy Updated', item: 'Data Retention Policy v2.3', user: 'Sarah Chen', time: '2 hours ago', type: 'update' },
  { id: 2, action: 'Audit Completed', item: 'Q4 Financial Compliance Audit', user: 'Mike Johnson', time: '5 hours ago', type: 'complete' },
  { id: 3, action: 'Issue Raised', item: 'Missing Safety Certification', user: 'System', time: '1 day ago', type: 'issue' },
  { id: 4, action: 'Training Completed', item: 'GDPR Awareness Training', user: '45 employees', time: '2 days ago', type: 'complete' },
  { id: 5, action: 'Review Required', item: 'Vendor Contract Renewal', user: 'Legal Team', time: '3 days ago', type: 'pending' }
];

const upcomingDeadlines = [
  { id: 1, title: 'Annual Safety Audit', dueDate: '2026-01-25', priority: 'high', category: 'Health & Safety' },
  { id: 2, title: 'GDPR Annual Review', dueDate: '2026-02-01', priority: 'high', category: 'Data Privacy' },
  { id: 3, title: 'Tax Filing Deadline', dueDate: '2026-02-15', priority: 'medium', category: 'Financial' },
  { id: 4, title: 'License Renewal', dueDate: '2026-03-01', priority: 'medium', category: 'Industry Standards' },
  { id: 5, title: 'Employee Training Refresh', dueDate: '2026-03-15', priority: 'low', category: 'Employment Law' }
];

const criticalIssues = [
  { id: 1, title: 'Missing Fire Safety Certificate', severity: 'critical', daysPending: 15, assignee: 'Facilities Team' },
  { id: 2, title: 'Outdated Privacy Policy', severity: 'high', daysPending: 7, assignee: 'Legal Team' }
];

export default function ComplianceDashboardPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');

  const scoreChange = complianceMetrics.overallScore - complianceMetrics.previousScore;
  const isImproved = scoreChange > 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-400 bg-green-500/10';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10';
      case 'critical': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'update': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'complete': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'issue': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Shield className="w-8 h-8 text-indigo-500" />
              Compliance Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor compliance status, track policies, and manage regulatory requirements
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Overall Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Overall Compliance Score</span>
            <div className={`flex items-center gap-1 text-sm ${isImproved ? 'text-green-500' : 'text-red-500'}`}>
              {isImproved ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(scoreChange).toFixed(1)}%
            </div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{complianceMetrics.overallScore}%</span>
          </div>
          <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              style={{ width: `${complianceMetrics.overallScore}%` }}
            />
          </div>
        </div>

        {/* Policy Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Policy Compliance</span>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{complianceMetrics.compliantPolicies}</span>
            <span className="text-gray-500 dark:text-gray-400 mb-1">/ {complianceMetrics.totalPolicies}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Policies in compliance</p>
        </div>

        {/* Critical Issues */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Critical Issues</span>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-red-500">{complianceMetrics.criticalIssues}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Require immediate attention</p>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Upcoming Deadlines</span>
            <Calendar className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{complianceMetrics.upcomingDeadlines}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">In the next 30 days</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance by Category */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Compliance by Category
              </h2>
              <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View All</button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {complianceCategories.map((category) => (
                <div key={category.name} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(category.status)}`}>
                          {category.status === 'compliant' ? 'Compliant' : 'Needs Attention'}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{category.score}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${category.score >= 95 ? 'bg-green-500' : category.score >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${category.score}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{category.policies} policies</span>
                      <span>{category.issues} issues</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Critical Issues */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Critical Issues
            </h2>
          </div>
          <div className="p-6">
            {criticalIssues.length > 0 ? (
              <div className="space-y-4">
                {criticalIssues.map((issue) => (
                  <div key={issue.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{issue.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Pending for {issue.daysPending} days • {issue.assignee}
                        </p>
                        <button className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                          Take Action <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No critical issues</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Upcoming Deadlines
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {upcomingDeadlines.map((deadline) => (
              <div key={deadline.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{deadline.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{deadline.category}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(deadline.priority)}`}>
                      {deadline.priority}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{deadline.dueDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.action}</span>: {activity.item}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
