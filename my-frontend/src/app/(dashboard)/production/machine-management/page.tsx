'use client';

import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Wrench,
  Plus,
  Search,
  Filter,
  Download,
  BarChart2,
  Activity,
  Zap,
  Calendar,
  Users,
  MoreVertical
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface Machine {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string;
  status: 'running' | 'idle' | 'maintenance' | 'breakdown';
  efficiency: number;
  uptime: number;
  lastMaintenance: string;
  nextMaintenance: string;
  operator: string;
  currentJob?: string;
  outputRate: number;
  targetRate: number;
}

interface MaintenanceLog {
  id: string;
  machineId: string;
  machineName: string;
  type: 'preventive' | 'corrective' | 'predictive';
  description: string;
  technician: string;
  date: string;
  duration: string;
  cost: number;
  status: 'completed' | 'scheduled' | 'in_progress';
}

// ============================================================================
// Mock Data
// ============================================================================

const mockMachines: Machine[] = [
  {
    id: 'M001',
    name: 'CNC Milling Machine',
    code: 'CNC-001',
    type: 'CNC Machine',
    location: 'Bay A',
    status: 'running',
    efficiency: 92,
    uptime: 98.5,
    lastMaintenance: '2024-01-10',
    nextMaintenance: '2024-02-10',
    operator: 'John Smith',
    currentJob: 'ORD-2024-001',
    outputRate: 45,
    targetRate: 50
  },
  {
    id: 'M002',
    name: 'Hydraulic Press',
    code: 'HYD-002',
    type: 'Press Machine',
    location: 'Bay B',
    status: 'running',
    efficiency: 88,
    uptime: 95.2,
    lastMaintenance: '2024-01-05',
    nextMaintenance: '2024-02-05',
    operator: 'Mike Johnson',
    currentJob: 'ORD-2024-002',
    outputRate: 120,
    targetRate: 150
  },
  {
    id: 'M003',
    name: 'Laser Cutter',
    code: 'LAS-001',
    type: 'Cutting Machine',
    location: 'Bay A',
    status: 'idle',
    efficiency: 0,
    uptime: 92.0,
    lastMaintenance: '2024-01-08',
    nextMaintenance: '2024-02-08',
    operator: 'Sarah Williams',
    outputRate: 0,
    targetRate: 200
  },
  {
    id: 'M004',
    name: 'Welding Robot',
    code: 'WLD-001',
    type: 'Welding Machine',
    location: 'Bay C',
    status: 'maintenance',
    efficiency: 0,
    uptime: 85.5,
    lastMaintenance: '2024-01-14',
    nextMaintenance: '2024-02-14',
    operator: 'Tom Brown',
    outputRate: 0,
    targetRate: 80
  },
  {
    id: 'M005',
    name: 'Assembly Line Robot',
    code: 'ASM-001',
    type: 'Assembly Robot',
    location: 'Bay D',
    status: 'running',
    efficiency: 95,
    uptime: 99.1,
    lastMaintenance: '2024-01-12',
    nextMaintenance: '2024-02-12',
    operator: 'Auto System',
    currentJob: 'ORD-2024-003',
    outputRate: 300,
    targetRate: 320
  },
  {
    id: 'M006',
    name: 'Surface Grinder',
    code: 'GRD-001',
    type: 'Grinding Machine',
    location: 'Bay B',
    status: 'breakdown',
    efficiency: 0,
    uptime: 78.2,
    lastMaintenance: '2024-01-03',
    nextMaintenance: '2024-02-03',
    operator: 'Emily Davis',
    outputRate: 0,
    targetRate: 60
  }
];

const mockMaintenanceLogs: MaintenanceLog[] = [
  { id: 'ML001', machineId: 'M001', machineName: 'CNC Milling Machine', type: 'preventive', description: 'Regular oil change and calibration', technician: 'Tech Team A', date: '2024-01-10', duration: '2 hours', cost: 500, status: 'completed' },
  { id: 'ML002', machineId: 'M004', machineName: 'Welding Robot', type: 'corrective', description: 'Electrode replacement', technician: 'Tech Team B', date: '2024-01-14', duration: '4 hours', cost: 1200, status: 'in_progress' },
  { id: 'ML003', machineId: 'M006', machineName: 'Surface Grinder', type: 'corrective', description: 'Motor overhaul - unexpected breakdown', technician: 'Tech Team A', date: '2024-01-15', duration: 'Ongoing', cost: 2500, status: 'in_progress' },
  { id: 'ML004', machineId: 'M002', machineName: 'Hydraulic Press', type: 'preventive', description: 'Hydraulic fluid replacement', technician: 'Tech Team C', date: '2024-02-05', duration: '3 hours', cost: 800, status: 'scheduled' },
  { id: 'ML005', machineId: 'M005', machineName: 'Assembly Line Robot', type: 'predictive', description: 'Sensor calibration - AI predicted wear', technician: 'Tech Team B', date: '2024-02-12', duration: '1 hour', cost: 300, status: 'scheduled' },
];

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: Machine['status'] }) {
  const config = {
    running: { label: 'Running', className: 'bg-green-100 text-green-700', icon: Play },
    idle: { label: 'Idle', className: 'bg-gray-100 text-gray-700', icon: Pause },
    maintenance: { label: 'Maintenance', className: 'bg-yellow-100 text-yellow-700', icon: Wrench },
    breakdown: { label: 'Breakdown', className: 'bg-red-100 text-red-700', icon: AlertTriangle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function EfficiencyGauge({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-12 h-12 text-sm' : 'w-20 h-20 text-lg';
  const strokeWidth = size === 'sm' ? 4 : 6;
  const radius = size === 'sm' ? 20 : 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color = value >= 90 ? '#22c55e' : value >= 70 ? '#eab308' : '#ef4444';

  return (
    <div className={`relative ${sizeClasses} flex items-center justify-center`}>
      <svg className="transform -rotate-90" viewBox={size === 'sm' ? '0 0 48 48' : '0 0 80 80'}>
        <circle
          cx={size === 'sm' ? 24 : 40}
          cy={size === 'sm' ? 24 : 40}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size === 'sm' ? 24 : 40}
          cy={size === 'sm' ? 24 : 40}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-bold">{value}%</span>
    </div>
  );
}

function MachineCard({ machine, onClick }: { machine: Machine; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${
        machine.status === 'breakdown' ? 'border-red-300 bg-red-50' :
        machine.status === 'maintenance' ? 'border-yellow-300 bg-yellow-50' :
        'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{machine.name}</h3>
          <p className="text-sm text-gray-500">{machine.code}</p>
        </div>
        <StatusBadge status={machine.status} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500">Efficiency</p>
          <EfficiencyGauge value={machine.efficiency} size="sm" />
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Output Rate</p>
          <p className="text-lg font-semibold">{machine.outputRate}/{machine.targetRate}</p>
          <p className="text-xs text-gray-400">units/hr</p>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Location:</span>
          <span className="font-medium">{machine.location}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Operator:</span>
          <span className="font-medium">{machine.operator}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Uptime:</span>
          <span className={`font-medium ${machine.uptime >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
            {machine.uptime}%
          </span>
        </div>
      </div>

      {machine.currentJob && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500">Current Job</p>
          <p className="text-sm font-medium text-blue-600">{machine.currentJob}</p>
        </div>
      )}
    </div>
  );
}

function MaintenanceTable({ logs }: { logs: MaintenanceLog[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.machineName}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  log.type === 'preventive' ? 'bg-green-100 text-green-700' :
                  log.type === 'corrective' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {log.type}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{log.description}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{log.technician}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{log.date}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{log.duration}</td>
              <td className="px-4 py-3 text-sm text-gray-600">${log.cost.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
                  log.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                  log.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {log.status.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MachineDetailModal({ machine, onClose }: { machine: Machine; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">{machine.name}</h2>
            <p className="text-gray-500">{machine.code} • {machine.type}</p>
          </div>
          <StatusBadge status={machine.status} />
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Efficiency</p>
              <EfficiencyGauge value={machine.efficiency} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Uptime</p>
              <div className="text-3xl font-bold text-gray-900">{machine.uptime}%</div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Output Rate</p>
              <div className="text-3xl font-bold text-gray-900">
                {machine.outputRate}<span className="text-sm text-gray-400">/{machine.targetRate}</span>
              </div>
              <p className="text-xs text-gray-400">units/hr</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Machine Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span>{machine.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Operator:</span>
                  <span>{machine.operator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Job:</span>
                  <span className="text-blue-600">{machine.currentJob || 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Maintenance Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Maintenance:</span>
                  <span>{machine.lastMaintenance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Next Maintenance:</span>
                  <span className="text-orange-600">{machine.nextMaintenance}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-6">
            <div className="text-center text-gray-500">
              <BarChart2 className="w-12 h-12 mx-auto mb-2" />
              <p>Performance Trend Chart</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
            Close
          </button>
          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
            Schedule Maintenance
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MachineManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'machines' | 'maintenance'>('machines');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const filteredMachines = useMemo(() => {
    return mockMachines.filter(machine => {
      const matchesSearch = machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           machine.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || machine.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = {
    total: mockMachines.length,
    running: mockMachines.filter(m => m.status === 'running').length,
    idle: mockMachines.filter(m => m.status === 'idle').length,
    maintenance: mockMachines.filter(m => m.status === 'maintenance').length,
    breakdown: mockMachines.filter(m => m.status === 'breakdown').length,
    avgEfficiency: Math.round(mockMachines.filter(m => m.status === 'running').reduce((sum, m) => sum + m.efficiency, 0) / mockMachines.filter(m => m.status === 'running').length),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Machine Management</h1>
            <p className="text-gray-500">Monitor and manage production machinery</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Machine
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Machines</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.running}</p>
                <p className="text-sm text-gray-500">Running</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Pause className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.idle}</p>
                <p className="text-sm text-gray-500">Idle</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Wrench className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.maintenance}</p>
                <p className="text-sm text-gray-500">Maintenance</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.breakdown}</p>
                <p className="text-sm text-gray-500">Breakdown</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgEfficiency}%</p>
                <p className="text-sm text-gray-500">Avg Efficiency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('machines')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'machines' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Machines
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'maintenance' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            Maintenance Log
          </button>
        </div>

        {activeTab === 'machines' ? (
          <>
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search machines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="running">Running</option>
                <option value="idle">Idle</option>
                <option value="maintenance">Maintenance</option>
                <option value="breakdown">Breakdown</option>
              </select>
            </div>

            {/* Machine Grid */}
            <div className="grid grid-cols-3 gap-4">
              {filteredMachines.map((machine) => (
                <MachineCard 
                  key={machine.id} 
                  machine={machine}
                  onClick={() => setSelectedMachine(machine)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg border">
            <MaintenanceTable logs={mockMaintenanceLogs} />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedMachine && (
        <MachineDetailModal 
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </div>
  );
}
