'use client';

import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Search,
  Filter,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Play,
  Pause,
  RotateCcw,
  Users,
  ArrowRight,
  Calendar,
  BarChart2,
  Settings
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'review' | 'notification' | 'action';
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completedAt?: string;
}

interface Workflow {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  initiatedBy: string;
  startDate: string;
  dueDate: string;
  currentStep: number;
  totalSteps: number;
  steps: WorkflowStep[];
  documentRef?: string;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockWorkflows: Workflow[] = [
  {
    id: 'WF001',
    name: 'Contract Approval - TechVendor Agreement',
    type: 'Contract Approval',
    status: 'active',
    priority: 'high',
    initiatedBy: 'Sarah Johnson',
    startDate: '2024-01-15',
    dueDate: '2024-01-25',
    currentStep: 2,
    totalSteps: 4,
    documentRef: 'CON-2024-001',
    steps: [
      { id: 'S1', name: 'Initial Review', type: 'review', assignee: 'Legal Team', status: 'completed', completedAt: '2024-01-16' },
      { id: 'S2', name: 'Manager Approval', type: 'approval', assignee: 'Michael Chen', status: 'in_progress' },
      { id: 'S3', name: 'Finance Review', type: 'review', assignee: 'Finance Team', status: 'pending' },
      { id: 'S4', name: 'Final Approval', type: 'approval', assignee: 'CEO', status: 'pending' }
    ]
  },
  {
    id: 'WF002',
    name: 'Policy Update - Data Privacy Policy',
    type: 'Policy Amendment',
    status: 'pending',
    priority: 'medium',
    initiatedBy: 'James Wilson',
    startDate: '2024-01-18',
    dueDate: '2024-02-01',
    currentStep: 1,
    totalSteps: 3,
    documentRef: 'POL-2024-005',
    steps: [
      { id: 'S1', name: 'Compliance Review', type: 'review', assignee: 'Compliance Team', status: 'pending' },
      { id: 'S2', name: 'Legal Approval', type: 'approval', assignee: 'Legal Team', status: 'pending' },
      { id: 'S3', name: 'Executive Sign-off', type: 'approval', assignee: 'Board', status: 'pending' }
    ]
  },
  {
    id: 'WF003',
    name: 'Vendor Onboarding - CloudServices Inc',
    type: 'Vendor Approval',
    status: 'active',
    priority: 'medium',
    initiatedBy: 'Emily Davis',
    startDate: '2024-01-10',
    dueDate: '2024-01-28',
    currentStep: 3,
    totalSteps: 5,
    steps: [
      { id: 'S1', name: 'Documentation Review', type: 'review', assignee: 'Procurement', status: 'completed', completedAt: '2024-01-12' },
      { id: 'S2', name: 'Risk Assessment', type: 'review', assignee: 'Risk Team', status: 'completed', completedAt: '2024-01-15' },
      { id: 'S3', name: 'Compliance Check', type: 'review', assignee: 'Compliance', status: 'in_progress' },
      { id: 'S4', name: 'Contract Review', type: 'review', assignee: 'Legal', status: 'pending' },
      { id: 'S5', name: 'Final Approval', type: 'approval', assignee: 'CPO', status: 'pending' }
    ]
  },
  {
    id: 'WF004',
    name: 'Audit Preparation - Q4 Internal Audit',
    type: 'Audit Process',
    status: 'completed',
    priority: 'high',
    initiatedBy: 'Robert Brown',
    startDate: '2024-01-01',
    dueDate: '2024-01-15',
    currentStep: 4,
    totalSteps: 4,
    steps: [
      { id: 'S1', name: 'Document Collection', type: 'action', assignee: 'All Departments', status: 'completed', completedAt: '2024-01-05' },
      { id: 'S2', name: 'Pre-Audit Review', type: 'review', assignee: 'Audit Team', status: 'completed', completedAt: '2024-01-08' },
      { id: 'S3', name: 'Gap Analysis', type: 'review', assignee: 'Audit Team', status: 'completed', completedAt: '2024-01-12' },
      { id: 'S4', name: 'Report Finalization', type: 'action', assignee: 'Audit Lead', status: 'completed', completedAt: '2024-01-15' }
    ]
  }
];

const stats = {
  active: 8,
  pending: 5,
  completed: 45,
  avgCompletionDays: 7.5
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Workflow['status'] }) {
  const config = {
    active: { label: 'Active', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Play },
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle }
  }[status];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Workflow['priority'] }) {
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

function StepStatusIcon({ status }: { status: WorkflowStep['status'] }) {
  const config = {
    completed: { icon: CheckCircle, className: 'text-green-500' },
    in_progress: { icon: Clock, className: 'text-blue-500' },
    pending: { icon: Clock, className: 'text-gray-400' },
    skipped: { icon: XCircle, className: 'text-gray-400' }
  }[status];

  const Icon = config.icon;
  return <Icon className={`w-5 h-5 ${config.className}`} />;
}

function WorkflowProgress({ workflow }: { workflow: Workflow }) {
  const progress = (workflow.currentStep / workflow.totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Step {workflow.currentStep} of {workflow.totalSteps}
        </span>
        <span className="font-medium text-gray-900 dark:text-white">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${workflow.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function WorkflowDetailModal({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={workflow.status} />
                <PriorityBadge priority={workflow.priority} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{workflow.name}</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">{workflow.type}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Progress */}
          <div className="mb-6">
            <WorkflowProgress workflow={workflow} />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Initiated By</p>
              <p className="font-medium text-gray-900 dark:text-white">{workflow.initiatedBy}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Start Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{workflow.startDate}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{workflow.dueDate}</p>
            </div>
          </div>

          {/* Steps */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Workflow Steps</h3>
          <div className="space-y-3">
            {workflow.steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 border rounded-lg ${
                  step.status === 'in_progress'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-sm font-medium">
                  {index + 1}
                </div>
                <StepStatusIcon status={step.status} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">{step.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Assigned to: {step.assignee}
                    {step.completedAt && ` • Completed: ${step.completedAt}`}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700' :
                  step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {step.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            View Document
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ApprovalWorkflowViewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);

  const filteredWorkflows = useMemo(() => {
    return mockWorkflows.filter(workflow => {
      const matchesSearch =
        workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workflow.initiatedBy.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval Workflows</h1>
            <p className="text-gray-500 dark:text-gray-400">Monitor and manage approval processes</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgCompletionDays}d</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Completion</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Workflows Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedWorkflow(workflow)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={workflow.status} />
                  <PriorityBadge priority={workflow.priority} />
                </div>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <Eye className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{workflow.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{workflow.type}</p>
              
              <WorkflowProgress workflow={workflow} />
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                <span>By: {workflow.initiatedBy}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due: {workflow.dueDate}
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredWorkflows.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <GitBranch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No workflows found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedWorkflow && (
        <WorkflowDetailModal
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
        />
      )}
    </div>
  );
}
