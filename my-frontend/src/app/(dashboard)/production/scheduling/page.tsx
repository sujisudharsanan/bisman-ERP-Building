'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Filter,
  Download,
  Settings,
  GripVertical
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ScheduledTask {
  id: string;
  orderId: string;
  productName: string;
  quantity: number;
  workCenter: string;
  assignedTeam: string;
  startTime: string;
  endTime: string;
  duration: number; // hours
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  date: string;
  dependencies: string[];
  notes?: string;
}

interface WorkCenter {
  id: string;
  name: string;
  capacity: number;
  utilization: number;
  status: 'available' | 'busy' | 'maintenance';
}

// ============================================================================
// Mock Data
// ============================================================================

const mockTasks: ScheduledTask[] = [
  {
    id: 'SCH-001',
    orderId: 'ORD-2024-001',
    productName: 'Industrial Valve Assembly',
    quantity: 50,
    workCenter: 'Assembly Line A',
    assignedTeam: 'Team Alpha',
    startTime: '08:00',
    endTime: '12:00',
    duration: 4,
    status: 'in_progress',
    priority: 'high',
    date: '2024-01-15',
    dependencies: [],
  },
  {
    id: 'SCH-002',
    orderId: 'ORD-2024-002',
    productName: 'Steel Frame Structure',
    quantity: 20,
    workCenter: 'Fabrication Bay 1',
    assignedTeam: 'Team Beta',
    startTime: '09:00',
    endTime: '17:00',
    duration: 8,
    status: 'scheduled',
    priority: 'medium',
    date: '2024-01-15',
    dependencies: ['SCH-001'],
  },
  {
    id: 'SCH-003',
    orderId: 'ORD-2024-003',
    productName: 'Control Panel Unit',
    quantity: 30,
    workCenter: 'Electronics Lab',
    assignedTeam: 'Team Gamma',
    startTime: '10:00',
    endTime: '15:00',
    duration: 5,
    status: 'delayed',
    priority: 'high',
    date: '2024-01-15',
    dependencies: [],
    notes: 'Waiting for components'
  },
  {
    id: 'SCH-004',
    orderId: 'ORD-2024-004',
    productName: 'Hydraulic Pump',
    quantity: 15,
    workCenter: 'Assembly Line B',
    assignedTeam: 'Team Delta',
    startTime: '13:00',
    endTime: '18:00',
    duration: 5,
    status: 'scheduled',
    priority: 'low',
    date: '2024-01-15',
    dependencies: ['SCH-001'],
  },
  {
    id: 'SCH-005',
    orderId: 'ORD-2024-005',
    productName: 'Sensor Module',
    quantity: 100,
    workCenter: 'Electronics Lab',
    assignedTeam: 'Team Gamma',
    startTime: '08:00',
    endTime: '11:00',
    duration: 3,
    status: 'completed',
    priority: 'medium',
    date: '2024-01-14',
    dependencies: [],
  },
];

const mockWorkCenters: WorkCenter[] = [
  { id: 'WC1', name: 'Assembly Line A', capacity: 100, utilization: 85, status: 'busy' },
  { id: 'WC2', name: 'Assembly Line B', capacity: 100, utilization: 60, status: 'available' },
  { id: 'WC3', name: 'Fabrication Bay 1', capacity: 50, utilization: 90, status: 'busy' },
  { id: 'WC4', name: 'Fabrication Bay 2', capacity: 50, utilization: 0, status: 'maintenance' },
  { id: 'WC5', name: 'Electronics Lab', capacity: 80, utilization: 75, status: 'busy' },
  { id: 'WC6', name: 'Quality Control', capacity: 40, utilization: 45, status: 'available' },
];

const timeSlots = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 7; // 7 AM to 6 PM
  return `${hour.toString().padStart(2, '0')}:00`;
});

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: ScheduledTask['status'] }) {
  const config = {
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', className: 'bg-green-100 text-green-700' },
    completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700' },
    delayed: { label: 'Delayed', className: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
  }[status];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: ScheduledTask['priority'] }) {
  const colors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }[priority];

  return (
    <div className={`w-1.5 h-full ${colors} rounded-l absolute left-0 top-0`} />
  );
}

function TaskCard({ task }: { task: ScheduledTask }) {
  return (
    <div className={`relative bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
      task.status === 'delayed' ? 'border-red-300' : 'border-gray-200'
    }`}>
      <PriorityIndicator priority={task.priority} />
      <div className="pl-2">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium text-sm text-gray-900 truncate">{task.productName}</h4>
            <p className="text-xs text-gray-500">{task.orderId}</p>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.startTime} - {task.endTime}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3 h-3" />
            {task.quantity} units
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <Users className="w-3 h-3" />
          <span>{task.assignedTeam}</span>
        </div>
        {task.notes && (
          <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            {task.notes}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkCenterRow({ workCenter, tasks }: { workCenter: WorkCenter; tasks: ScheduledTask[] }) {
  const statusColors = {
    available: 'bg-green-100 text-green-700',
    busy: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-orange-100 text-orange-700',
  }[workCenter.status];

  return (
    <div className="flex border-b last:border-b-0">
      {/* Work Center Info */}
      <div className="w-48 flex-shrink-0 p-3 border-r bg-gray-50">
        <h4 className="font-medium text-sm text-gray-900">{workCenter.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={`px-2 py-0.5 rounded text-xs ${statusColors}`}>
            {workCenter.status}
          </span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Utilization</span>
            <span>{workCenter.utilization}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${
                workCenter.utilization > 80 ? 'bg-red-500' :
                workCenter.utilization > 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${workCenter.utilization}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex relative">
        {timeSlots.map((slot) => (
          <div key={slot} className="flex-1 border-r border-gray-100 min-w-[80px]" />
        ))}
        
        {/* Task Blocks */}
        {tasks.map((task) => {
          const startHour = parseInt(task.startTime.split(':')[0]);
          const endHour = parseInt(task.endTime.split(':')[0]);
          const left = ((startHour - 7) / 12) * 100;
          const width = ((endHour - startHour) / 12) * 100;

          return (
            <div
              key={task.id}
              className={`absolute top-2 bottom-2 rounded-md px-2 py-1 overflow-hidden cursor-pointer transition-all hover:z-10 hover:shadow-lg ${
                task.status === 'in_progress' ? 'bg-green-200 border-green-400' :
                task.status === 'delayed' ? 'bg-red-200 border-red-400' :
                task.status === 'completed' ? 'bg-gray-200 border-gray-400' :
                'bg-blue-200 border-blue-400'
              } border`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <div className="flex items-center gap-1">
                <GripVertical className="w-3 h-3 text-gray-500 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{task.productName}</span>
              </div>
              <span className="text-xs text-gray-600">{task.quantity} units</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView({ tasks, selectedDate }: { tasks: ScheduledTask[]; selectedDate: string }) {
  const todayTasks = tasks.filter(t => t.date === selectedDate);

  return (
    <div className="space-y-4">
      {todayTasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No tasks scheduled for this date
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {todayTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ProductionSchedulingPage() {
  const [viewMode, setViewMode] = useState<'gantt' | 'calendar'>('gantt');
  const [selectedDate, setSelectedDate] = useState('2024-01-15');
  const [workCenterFilter, setWorkCenterFilter] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return workCenterFilter === 'all' 
      ? mockTasks 
      : mockTasks.filter(t => t.workCenter === workCenterFilter);
  }, [workCenterFilter]);

  const stats = {
    total: mockTasks.length,
    inProgress: mockTasks.filter(t => t.status === 'in_progress').length,
    delayed: mockTasks.filter(t => t.status === 'delayed').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
  };

  const navigateDate = (direction: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Production Scheduling</h1>
            <p className="text-gray-500">Plan and manage production schedules</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Schedule
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Scheduled</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.delayed}</p>
                <p className="text-sm text-gray-500">Delayed</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-gray-500">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg border mb-6">
          <div className="flex justify-between items-center p-4 border-b">
            <div className="flex items-center gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigateDate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-lg">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <button 
                  onClick={() => navigateDate(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Work Center Filter */}
              <select
                value={workCenterFilter}
                onChange={(e) => setWorkCenterFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Work Centers</option>
                {mockWorkCenters.map((wc) => (
                  <option key={wc.id} value={wc.name}>{wc.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('gantt')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'gantt' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Gantt View
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  viewMode === 'calendar' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Calendar View
              </button>
            </div>
          </div>

          {viewMode === 'gantt' ? (
            <>
              {/* Time Header */}
              <div className="flex border-b bg-gray-50">
                <div className="w-48 flex-shrink-0 p-3 border-r font-medium text-sm text-gray-700">
                  Work Center
                </div>
                <div className="flex-1 flex">
                  {timeSlots.map((slot) => (
                    <div key={slot} className="flex-1 min-w-[80px] p-2 border-r border-gray-200 text-center text-xs font-medium text-gray-600">
                      {slot}
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Center Rows */}
              <div className="divide-y">
                {mockWorkCenters.map((workCenter) => (
                  <WorkCenterRow 
                    key={workCenter.id} 
                    workCenter={workCenter}
                    tasks={filteredTasks.filter(t => t.workCenter === workCenter.name)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="p-4">
              <CalendarView tasks={filteredTasks} selectedDate={selectedDate} />
            </div>
          )}
        </div>

        {/* Work Center Status */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Work Center Status</h3>
          <div className="grid grid-cols-6 gap-4">
            {mockWorkCenters.map((wc) => (
              <div key={wc.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{wc.name}</h4>
                  <span className={`w-2 h-2 rounded-full ${
                    wc.status === 'available' ? 'bg-green-500' :
                    wc.status === 'busy' ? 'bg-blue-500' : 'bg-orange-500'
                  }`} />
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className={`h-2 rounded-full ${
                      wc.utilization > 80 ? 'bg-red-500' :
                      wc.utilization > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${wc.utilization}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{wc.utilization}% utilized</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
