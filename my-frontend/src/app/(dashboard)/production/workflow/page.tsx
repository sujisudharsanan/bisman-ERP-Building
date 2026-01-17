'use client';

import React, { useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  RefreshCw,
  Plus,
  Edit,
  Eye,
  Workflow,
  ArrowRight,
  Circle,
  MoreVertical
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignee: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  dependencies: string[];
}

interface ProductionWorkflow {
  id: string;
  name: string;
  productName: string;
  orderId: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  progress: number;
  currentStep: string;
  steps: WorkflowStep[];
  startDate: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  assignedTeam: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  stepsCount: number;
  avgDuration: string;
  usageCount: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockWorkflows: ProductionWorkflow[] = [
  {
    id: 'WF-001',
    name: 'Standard Assembly Process',
    productName: 'Industrial Valve Assembly',
    orderId: 'ORD-2024-001',
    status: 'active',
    progress: 65,
    currentStep: 'Quality Check',
    steps: [
      { id: 'S1', name: 'Material Preparation', status: 'completed', assignee: 'John Doe', startTime: '09:00', endTime: '10:30', duration: '1h 30m', dependencies: [] },
      { id: 'S2', name: 'Component Assembly', status: 'completed', assignee: 'Jane Smith', startTime: '10:45', endTime: '13:00', duration: '2h 15m', dependencies: ['S1'] },
      { id: 'S3', name: 'Quality Check', status: 'in_progress', assignee: 'Mike Wilson', startTime: '14:00', dependencies: ['S2'] },
      { id: 'S4', name: 'Final Assembly', status: 'pending', assignee: 'Sarah Brown', dependencies: ['S3'] },
      { id: 'S5', name: 'Packaging', status: 'pending', assignee: 'Tom Johnson', dependencies: ['S4'] },
    ],
    startDate: '2024-01-15',
    targetDate: '2024-01-20',
    priority: 'high',
    assignedTeam: 'Assembly Team A'
  },
  {
    id: 'WF-002',
    name: 'Custom Fabrication',
    productName: 'Steel Frame Structure',
    orderId: 'ORD-2024-002',
    status: 'active',
    progress: 40,
    currentStep: 'Welding',
    steps: [
      { id: 'S1', name: 'Design Review', status: 'completed', assignee: 'Design Team', startTime: '08:00', endTime: '09:30', duration: '1h 30m', dependencies: [] },
      { id: 'S2', name: 'Material Cutting', status: 'completed', assignee: 'Cutting Team', startTime: '10:00', endTime: '12:00', duration: '2h', dependencies: ['S1'] },
      { id: 'S3', name: 'Welding', status: 'in_progress', assignee: 'Welding Team', startTime: '13:00', dependencies: ['S2'] },
      { id: 'S4', name: 'Surface Treatment', status: 'pending', assignee: 'Finishing Team', dependencies: ['S3'] },
      { id: 'S5', name: 'Quality Inspection', status: 'pending', assignee: 'QC Team', dependencies: ['S4'] },
    ],
    startDate: '2024-01-14',
    targetDate: '2024-01-22',
    priority: 'medium',
    assignedTeam: 'Fabrication Team B'
  },
  {
    id: 'WF-003',
    name: 'Electronic Assembly',
    productName: 'Control Panel Unit',
    orderId: 'ORD-2024-003',
    status: 'paused',
    progress: 25,
    currentStep: 'PCB Assembly',
    steps: [
      { id: 'S1', name: 'Component Sourcing', status: 'completed', assignee: 'Procurement', startTime: '08:00', endTime: '10:00', duration: '2h', dependencies: [] },
      { id: 'S2', name: 'PCB Assembly', status: 'blocked', assignee: 'Electronics Team', dependencies: ['S1'] },
      { id: 'S3', name: 'Wiring', status: 'pending', assignee: 'Wiring Team', dependencies: ['S2'] },
      { id: 'S4', name: 'Testing', status: 'pending', assignee: 'Test Team', dependencies: ['S3'] },
    ],
    startDate: '2024-01-13',
    targetDate: '2024-01-19',
    priority: 'high',
    assignedTeam: 'Electronics Team C'
  }
];

const mockTemplates: WorkflowTemplate[] = [
  { id: 'T1', name: 'Standard Assembly', description: 'General assembly workflow', stepsCount: 5, avgDuration: '8 hours', usageCount: 45 },
  { id: 'T2', name: 'Custom Fabrication', description: 'Metal fabrication workflow', stepsCount: 6, avgDuration: '16 hours', usageCount: 28 },
  { id: 'T3', name: 'Electronics Assembly', description: 'PCB and electronics', stepsCount: 4, avgDuration: '6 hours', usageCount: 32 },
  { id: 'T4', name: 'Quality Inspection', description: 'QC workflow template', stepsCount: 3, avgDuration: '2 hours', usageCount: 67 },
];

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: ProductionWorkflow['status'] }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
    active: { label: 'Active', className: 'bg-green-100 text-green-700' },
    paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Completed', className: 'bg-blue-100 text-blue-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  }[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ProductionWorkflow['priority'] }) {
  const config = {
    high: { label: 'High', className: 'bg-red-100 text-red-700' },
    medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Low', className: 'bg-green-100 text-green-700' },
  }[priority];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function StepStatusIcon({ status }: { status: WorkflowStep['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'in_progress':
      return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'blocked':
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    default:
      return <Circle className="w-5 h-5 text-gray-300" />;
  }
}

function WorkflowStepVisualization({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border min-w-fit ${
            step.status === 'completed' ? 'bg-green-50 border-green-200' :
            step.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
            step.status === 'blocked' ? 'bg-red-50 border-red-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <StepStatusIcon status={step.status} />
            <span className="text-sm font-medium whitespace-nowrap">{step.name}</span>
          </div>
          {index < steps.length - 1 && (
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function WorkflowCard({ workflow, onView }: { workflow: ProductionWorkflow; onView: () => void }) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
          <p className="text-sm text-gray-500">{workflow.productName}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={workflow.status} />
          <PriorityBadge priority={workflow.priority} />
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{workflow.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${workflow.progress}%` }}
          />
        </div>
      </div>

      <div className="mb-3">
        <WorkflowStepVisualization steps={workflow.steps} />
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {workflow.assignedTeam}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Due: {workflow.targetDate}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {workflow.status === 'active' && (
            <button className="p-1 hover:bg-gray-100 rounded" title="Pause">
              <Pause className="w-4 h-4 text-yellow-600" />
            </button>
          )}
          {workflow.status === 'paused' && (
            <button className="p-1 hover:bg-gray-100 rounded" title="Resume">
              <Play className="w-4 h-4 text-green-600" />
            </button>
          )}
          <button 
            onClick={onView}
            className="p-1 hover:bg-gray-100 rounded" 
            title="View Details"
          >
            <Eye className="w-4 h-4 text-blue-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded" title="More">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkflowDetailModal({ 
  workflow, 
  onClose 
}: { 
  workflow: ProductionWorkflow; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold">{workflow.name}</h2>
              <p className="text-gray-500">{workflow.productName} - {workflow.orderId}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <Square className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Status</p>
              <StatusBadge status={workflow.status} />
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Priority</p>
              <PriorityBadge priority={workflow.priority} />
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Progress</p>
              <p className="font-semibold">{workflow.progress}%</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Target Date</p>
              <p className="font-semibold">{workflow.targetDate}</p>
            </div>
          </div>

          <h3 className="font-semibold mb-4">Workflow Steps</h3>
          <div className="space-y-3">
            {workflow.steps.map((step, index) => (
              <div key={step.id} className={`flex items-center gap-4 p-4 rounded-lg border ${
                step.status === 'completed' ? 'bg-green-50 border-green-200' :
                step.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
                step.status === 'blocked' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border">
                  <span className="text-sm font-medium">{index + 1}</span>
                </div>
                <StepStatusIcon status={step.status} />
                <div className="flex-1">
                  <p className="font-medium">{step.name}</p>
                  <p className="text-sm text-gray-500">Assigned: {step.assignee}</p>
                </div>
                {step.duration && (
                  <span className="text-sm text-gray-500">{step.duration}</span>
                )}
                <span className={`px-2 py-1 rounded text-xs ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700' :
                  step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  step.status === 'blocked' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {step.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Edit Workflow
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: WorkflowTemplate }) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <Workflow className="w-8 h-8 text-blue-600" />
        <span className="text-xs text-gray-500">{template.usageCount} uses</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
      <p className="text-sm text-gray-500 mb-3">{template.description}</p>
      <div className="flex justify-between text-sm text-gray-600">
        <span>{template.stepsCount} steps</span>
        <span>~{template.avgDuration}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProductionWorkflowPage() {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<ProductionWorkflow | null>(null);

  const filteredWorkflows = statusFilter === 'all' 
    ? mockWorkflows 
    : mockWorkflows.filter(w => w.status === statusFilter);

  const stats = {
    active: mockWorkflows.filter(w => w.status === 'active').length,
    paused: mockWorkflows.filter(w => w.status === 'paused').length,
    completed: mockWorkflows.filter(w => w.status === 'completed').length,
    pending: mockWorkflows.filter(w => w.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Workflow</h1>
            <p className="text-gray-500">Manage and monitor production workflows</p>
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
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Pause className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.paused}</p>
                <p className="text-sm text-gray-500">Paused</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'workflows' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Active Workflows
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'templates' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Templates
          </button>
        </div>

        {activeTab === 'workflows' ? (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-6">
              {['all', 'active', 'paused', 'pending', 'completed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    statusFilter === status 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Workflow Cards */}
            <div className="space-y-4">
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard 
                  key={workflow.id} 
                  workflow={workflow}
                  onView={() => setSelectedWorkflow(workflow)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {mockTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
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
