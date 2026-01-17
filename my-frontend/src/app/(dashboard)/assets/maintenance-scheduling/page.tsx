'use client';

import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  User,
  Truck,
  DollarSign,
  FileText,
  Download,
  Play,
  Pause,
  XCircle,
  BarChart2,
  Timer
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface MaintenanceTask {
  id: string;
  taskNumber: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  asset: {
    id: string;
    name: string;
    location: string;
  };
  description: string;
  assignedTo: string;
  scheduledDate: string;
  dueDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours?: number;
  parts: { name: string; quantity: number; cost: number }[];
  laborCost: number;
  totalCost: number;
  notes?: string;
  createdAt: string;
}

interface MaintenanceStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
  avgCompletionTime: number;
  mtbf: number;
  totalCost: number;
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTasks: MaintenanceTask[] = [
  {
    id: 'MT001',
    taskNumber: 'MNT-2024-00156',
    type: 'preventive',
    priority: 'medium',
    status: 'scheduled',
    asset: { id: 'AST001', name: 'CNC Machine - Unit 1', location: 'Production Floor A' },
    description: 'Quarterly maintenance - lubrication, belt inspection, calibration',
    assignedTo: 'Rajesh Kumar',
    scheduledDate: '2024-01-20',
    dueDate: '2024-01-20',
    estimatedHours: 4,
    parts: [
      { name: 'Lubricant Oil', quantity: 2, cost: 1500 },
      { name: 'V-Belt Set', quantity: 1, cost: 3500 }
    ],
    laborCost: 2000,
    totalCost: 7000,
    createdAt: '2024-01-10'
  },
  {
    id: 'MT002',
    taskNumber: 'MNT-2024-00155',
    type: 'corrective',
    priority: 'high',
    status: 'in_progress',
    asset: { id: 'AST002', name: 'Hydraulic Press #3', location: 'Assembly Line B' },
    description: 'Hydraulic leak repair - seal replacement required',
    assignedTo: 'Amit Singh',
    scheduledDate: '2024-01-16',
    dueDate: '2024-01-17',
    estimatedHours: 6,
    parts: [
      { name: 'Hydraulic Seal Kit', quantity: 1, cost: 8500 },
      { name: 'O-Rings Set', quantity: 2, cost: 500 }
    ],
    laborCost: 3000,
    totalCost: 12000,
    createdAt: '2024-01-15'
  },
  {
    id: 'MT003',
    taskNumber: 'MNT-2024-00154',
    type: 'emergency',
    priority: 'critical',
    status: 'completed',
    asset: { id: 'AST003', name: 'Conveyor System', location: 'Warehouse' },
    description: 'Motor failure - complete motor replacement',
    assignedTo: 'Priya Sharma',
    scheduledDate: '2024-01-14',
    dueDate: '2024-01-14',
    completedDate: '2024-01-14',
    estimatedHours: 8,
    actualHours: 10,
    parts: [
      { name: '5HP Motor', quantity: 1, cost: 45000 },
      { name: 'Motor Mount', quantity: 1, cost: 2500 }
    ],
    laborCost: 5000,
    totalCost: 52500,
    notes: 'Emergency replacement completed. Root cause: bearing failure due to overload.',
    createdAt: '2024-01-14'
  },
  {
    id: 'MT004',
    taskNumber: 'MNT-2024-00153',
    type: 'predictive',
    priority: 'low',
    status: 'scheduled',
    asset: { id: 'AST004', name: 'Air Compressor Unit', location: 'Utility Room' },
    description: 'Vibration analysis indicates bearing wear - schedule replacement',
    assignedTo: 'Vikram Patel',
    scheduledDate: '2024-01-25',
    dueDate: '2024-01-30',
    estimatedHours: 3,
    parts: [
      { name: 'Ball Bearing Set', quantity: 2, cost: 4500 }
    ],
    laborCost: 1500,
    totalCost: 6000,
    createdAt: '2024-01-12'
  },
  {
    id: 'MT005',
    taskNumber: 'MNT-2024-00150',
    type: 'preventive',
    priority: 'medium',
    status: 'on_hold',
    asset: { id: 'AST005', name: 'Packaging Machine', location: 'Packing Area' },
    description: 'Annual service - full inspection and parts replacement',
    assignedTo: 'Suresh Menon',
    scheduledDate: '2024-01-18',
    dueDate: '2024-01-20',
    estimatedHours: 8,
    parts: [],
    laborCost: 4000,
    totalCost: 4000,
    notes: 'Waiting for spare parts delivery',
    createdAt: '2024-01-08'
  }
];

const mockStats: MaintenanceStats = {
  total: 156,
  scheduled: 25,
  inProgress: 12,
  completed: 110,
  overdue: 5,
  avgCompletionTime: 4.5,
  mtbf: 720,
  totalCost: 850000
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: MaintenanceTask['status'] }) {
  const config = {
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700', icon: Calendar },
    in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700', icon: Play },
    on_hold: { label: 'On Hold', className: 'bg-orange-100 text-orange-700', icon: Pause },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700', icon: XCircle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: MaintenanceTask['priority'] }) {
  const config = {
    low: { label: 'Low', className: 'bg-gray-100 text-gray-600' },
    medium: { label: 'Medium', className: 'bg-blue-100 text-blue-600' },
    high: { label: 'High', className: 'bg-orange-100 text-orange-600' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-600' },
  }[priority];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: MaintenanceTask['type'] }) {
  const config = {
    preventive: { label: 'Preventive', className: 'bg-green-100 text-green-700' },
    corrective: { label: 'Corrective', className: 'bg-yellow-100 text-yellow-700' },
    predictive: { label: 'Predictive', className: 'bg-purple-100 text-purple-700' },
    emergency: { label: 'Emergency', className: 'bg-red-100 text-red-700' },
  }[type];

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function TaskDetailModal({ task, onClose }: { task: MaintenanceTask; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold">{task.taskNumber}</h2>
                <TypeBadge type={task.type} />
                <PriorityBadge priority={task.priority} />
              </div>
              <StatusBadge status={task.status} />
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Asset Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Asset Information
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Name:</span> {task.asset.name}</p>
                <p><span className="text-gray-500">Location:</span> {task.asset.location}</p>
                <p><span className="text-gray-500">Asset ID:</span> {task.asset.id}</p>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Schedule
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Scheduled:</span> {task.scheduledDate}</p>
                <p><span className="text-gray-500">Due:</span> {task.dueDate}</p>
                {task.completedDate && (
                  <p><span className="text-gray-500">Completed:</span> {task.completedDate}</p>
                )}
                <p><span className="text-gray-500">Assigned To:</span> {task.assignedTo}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{task.description}</p>
          </div>

          {/* Time & Cost */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <Timer className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{task.estimatedHours}h</p>
              <p className="text-xs text-gray-500">Estimated</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <Timer className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{task.actualHours || '-'}h</p>
              <p className="text-xs text-gray-500">Actual</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <DollarSign className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{formatCurrency(task.laborCost)}</p>
              <p className="text-xs text-gray-500">Labor Cost</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <DollarSign className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-xl font-bold">{formatCurrency(task.totalCost)}</p>
              <p className="text-xs text-gray-500">Total Cost</p>
            </div>
          </div>

          {/* Parts */}
          {task.parts.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Parts Required</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Part Name</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {task.parts.map((part, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm">{part.name}</td>
                        <td className="px-4 py-2 text-sm text-right">{part.quantity}</td>
                        <td className="px-4 py-2 text-sm text-right">{formatCurrency(part.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{task.notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            {task.status === 'scheduled' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Play className="w-4 h-4" />
                Start Task
              </button>
            )}
            {task.status === 'in_progress' && (
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                <CheckCircle className="w-4 h-4" />
                Mark Complete
              </button>
            )}
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-100">
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
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

export default function MaintenanceSchedulingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  const filteredTasks = useMemo(() => {
    return mockTasks.filter(task => {
      const matchesSearch =
        task.taskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesType = typeFilter === 'all' || task.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, statusFilter, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Maintenance Scheduling</h1>
            <p className="text-gray-500">Plan and track equipment maintenance</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Schedule Maintenance
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-8 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <Wrench className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{mockStats.total}</p>
            <p className="text-xs text-gray-500">Total Tasks</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <Calendar className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-2xl font-bold">{mockStats.scheduled}</p>
            <p className="text-xs text-gray-500">Scheduled</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <Play className="w-5 h-5 text-yellow-600 mb-2" />
            <p className="text-2xl font-bold">{mockStats.inProgress}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-2xl font-bold">{mockStats.completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <AlertTriangle className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-2xl font-bold">{mockStats.overdue}</p>
            <p className="text-xs text-gray-500">Overdue</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <Timer className="w-5 h-5 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{mockStats.avgCompletionTime}h</p>
            <p className="text-xs text-gray-500">Avg Time</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <BarChart2 className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-2xl font-bold">{mockStats.mtbf}h</p>
            <p className="text-xs text-gray-500">MTBF</p>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <DollarSign className="w-5 h-5 text-orange-600 mb-2" />
            <p className="text-2xl font-bold">₹{(mockStats.totalCost / 100000).toFixed(1)}L</p>
            <p className="text-xs text-gray-500">Total Cost</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="preventive">Preventive</option>
            <option value="corrective">Corrective</option>
            <option value="predictive">Predictive</option>
            <option value="emergency">Emergency</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Tasks Table */}
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-medium text-blue-600">{task.taskNumber}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium">{task.asset.name}</p>
                    <p className="text-xs text-gray-500">{task.asset.location}</p>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={task.type} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3 text-sm">{task.dueDate}</td>
                  <td className="px-4 py-3 text-sm">{task.assignedTo}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="More">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
