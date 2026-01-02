'use client';

/**
 * ============================================================================
 * ADMIN APPROVAL KANBAN DASHBOARD
 * ============================================================================
 * 
 * PURPOSE: Admin oversight of all tasks across the client organization
 * Displays all tasks from all users in a Kanban board format
 * Admin can intervene and take action on any task
 * 
 * FEATURES:
 * - Shows all tasks from all users under the client
 * - Kanban board with columns: Assigned, In Progress, Need Attention, Done
 * - Admin can approve/reject/override any task
 * - Tasks with admin action show a prominent "ADMIN ACTION" stamp
 * - Search and filter capabilities
 * - Real-time updates via socket
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Search, Filter, X, RefreshCw, ChevronDown,
  CheckCircle, XCircle, Clock, AlertTriangle, 
  Shield, Eye, Users, Building2, FileCheck,
  ChevronRight, Play, AlertCircle, Zap, 
  UserCheck, ArrowRight, MessageSquare, Stamp
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useToast } from '@/components/ui/toast';

// ============================================================================
// TYPES
// ============================================================================

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  department?: string;
  amount?: number;
  admin_action?: {
    taken: boolean;
    action_type: 'APPROVED' | 'REJECTED' | 'OVERRIDDEN' | 'INTERVENED';
    action_by: string;
    action_at: string;
    notes?: string;
  };
  workflow_status?: string;
  sla_breach?: boolean;
}

interface TaskStats {
  total: number;
  assigned: number;
  in_progress: number;
  need_attention: number;
  done: number;
  admin_intervened: number;
}

// ============================================================================
// ADMIN TASK CARD COMPONENT
// ============================================================================

interface AdminTaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
  onAdminAction: (task: Task, action: string) => void;
  isSelected?: boolean;
}

const AdminTaskCard: React.FC<AdminTaskCardProps> = ({ task, onClick, onAdminAction, isSelected }) => {
  const [showActions, setShowActions] = useState(false);
  
  const priorityColors: Record<string, string> = {
    'URGENT': 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    'HIGH': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
    'MEDIUM': 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
    'LOW': 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  };
  
  const hasAdminAction = task.admin_action?.taken;
  
  return (
    <div
      className={`relative group p-3 bg-white dark:bg-slate-800 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-lg ${
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
          : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300'
      } ${hasAdminAction ? 'ring-2 ring-amber-400/50' : ''}`}
      onClick={() => onClick(task)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Admin Action Stamp */}
      {hasAdminAction && (
        <div className="absolute -top-2 -right-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-md shadow-lg transform rotate-3">
            <Stamp className="w-3 h-3" />
            <span>ADMIN ACTION</span>
          </div>
        </div>
      )}
      
      {/* SLA Breach Warning */}
      {task.sla_breach && (
        <div className="absolute -top-1 -left-1 z-10">
          <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
      
      {/* Task Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 flex-1 pr-2">
          {task.title}
        </h3>
        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${priorityColors[task.priority] || priorityColors['MEDIUM']}`}>
          {task.priority}
        </span>
      </div>
      
      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
          {task.description}
        </p>
      )}
      
      {/* Creator & Assignee Info */}
      <div className="flex items-center gap-2 mb-2 text-xs">
        {task.creator && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Users className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{task.creator.name || task.creator.email?.split('@')[0]}</span>
          </div>
        )}
        {task.assignee && (
          <>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <UserCheck className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{task.assignee.name || task.assignee.email?.split('@')[0]}</span>
            </div>
          </>
        )}
      </div>
      
      {/* Task Meta */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>
          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
        </span>
        {task.department && (
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {task.department}
          </span>
        )}
      </div>
      
      {/* Admin Action Details */}
      {hasAdminAction && task.admin_action && (
        <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
            <Shield className="w-3 h-3" />
            <span className="font-medium">{task.admin_action.action_type}</span>
            <span>by {task.admin_action.action_by}</span>
          </div>
        </div>
      )}
      
      {/* Admin Quick Actions - Show on hover */}
      {showActions && !hasAdminAction && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-white dark:from-slate-800 to-transparent rounded-b-xl">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onAdminAction(task, 'APPROVE'); }}
              className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-medium rounded-lg transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
              Approve
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAdminAction(task, 'INTERVENE'); }}
              className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-medium rounded-lg transition-colors"
            >
              <Shield className="w-3 h-3" />
              Intervene
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAdminAction(task, 'REJECT'); }}
              className="flex items-center gap-1 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-medium rounded-lg transition-colors"
            >
              <XCircle className="w-3 h-3" />
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// KANBAN COLUMN COMPONENT
// ============================================================================

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  icon: React.ReactNode;
  color: string;
  badgeColor: string;
  onTaskClick: (task: Task) => void;
  onAdminAction: (task: Task, action: string) => void;
  selectedTaskId?: string | null;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  tasks,
  icon,
  color,
  badgeColor,
  onTaskClick,
  onAdminAction,
  selectedTaskId
}) => {
  const adminIntervenedCount = tasks.filter(t => t.admin_action?.taken).length;
  
  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[320px] bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-200 dark:border-slate-700/50">
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={color}>{icon}</span>
            <h3 className={`font-semibold text-sm uppercase tracking-wide ${color}`}>
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${badgeColor}`}>
              {tasks.length}
            </span>
            {adminIntervenedCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {adminIntervenedCount}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Task Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className={`w-12 h-12 rounded-full ${badgeColor} flex items-center justify-center mb-3 opacity-30`}>
              {icon}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">No tasks here</p>
          </div>
        ) : (
          tasks.map((task) => (
            <AdminTaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onAdminAction={onAdminAction}
              isSelected={selectedTaskId === task.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN ADMIN APPROVALS PAGE
// ============================================================================

export default function AdminApprovalsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionTask, setActionTask] = useState<Task | null>(null);
  const [actionType, setActionType] = useState<string>('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks/all-client-tasks', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || data.data || []);
      } else {
        // Fallback to regular tasks endpoint with admin flag
        const fallbackResponse = await fetch('/api/tasks?admin=true&all=true', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setTasks(fallbackData.tasks || fallbackData.data || fallbackData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({ title: 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);
  
  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, fetchTasks]);
  
  // Refresh handler
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };
  
  // Group tasks by status
  const groupedTasks = useMemo(() => {
    let filtered = tasks;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.creator?.name?.toLowerCase().includes(query) ||
        task.assignee?.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(task => {
        const status = task.status?.toUpperCase();
        switch (statusFilter) {
          case 'ADMIN_INTERVENED':
            return task.admin_action?.taken;
          case 'SLA_BREACH':
            return task.sla_breach;
          default:
            return status === statusFilter;
        }
      });
    }
    
    return {
      ASSIGNED: filtered.filter(t => t.status?.toUpperCase() === 'ASSIGNED' || t.status?.toUpperCase() === 'PENDING'),
      IN_PROGRESS: filtered.filter(t => t.status?.toUpperCase() === 'IN_PROGRESS' || t.status?.toUpperCase() === 'IN_REVIEW'),
      NEED_ATTENTION: filtered.filter(t => 
        t.status?.toUpperCase() === 'EDITING' || 
        t.status?.toUpperCase() === 'NEED_ATTENTION' ||
        t.status?.toUpperCase() === 'REJECTED' ||
        t.sla_breach
      ),
      DONE: filtered.filter(t => t.status?.toUpperCase() === 'DONE' || t.status?.toUpperCase() === 'COMPLETED'),
    };
  }, [tasks, searchQuery, statusFilter]);
  
  // Task stats
  const stats = useMemo<TaskStats>(() => ({
    total: tasks.length,
    assigned: groupedTasks.ASSIGNED.length,
    in_progress: groupedTasks.IN_PROGRESS.length,
    need_attention: groupedTasks.NEED_ATTENTION.length,
    done: groupedTasks.DONE.length,
    admin_intervened: tasks.filter(t => t.admin_action?.taken).length,
  }), [tasks, groupedTasks]);
  
  // Handle task click
  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    // Open task in chat panel
    window.dispatchEvent(new CustomEvent('openTaskInChat', { detail: task }));
  };
  
  // Handle admin action
  const handleAdminAction = (task: Task, action: string) => {
    setActionTask(task);
    setActionType(action);
    setActionNotes('');
    setShowActionModal(true);
  };
  
  // Submit admin action
  const submitAdminAction = async () => {
    if (!actionTask || !actionType) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/tasks/${actionTask.id}/admin-action`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          notes: actionNotes,
        }),
      });
      
      if (response.ok) {
        toast({ title: `Task ${actionType.toLowerCase()} successfully`, variant: 'success' });
        setShowActionModal(false);
        fetchTasks(); // Refresh tasks
      } else {
        const error = await response.json();
        toast({ title: error.message || 'Action failed', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Admin action error:', error);
      toast({ title: 'Failed to perform action', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };
  
  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    router.push('/auth/login');
    return null;
  }
  
  return (
    <DashboardLayout role={user?.roleName || user?.role || 'ADMIN'}>
      <div className="h-full flex flex-col bg-white dark:bg-slate-800">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Title & Description */}
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Admin Task Dashboard
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Oversee and manage all tasks across your organization
                  </p>
                </div>
              </div>
            </div>
            
            {/* Stats Summary */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total:</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{stats.admin_intervened}</span>
                <span className="text-xs text-amber-600 dark:text-amber-400">Admin Actions</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks, users, descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="NEED_ATTENTION">Need Attention</option>
                <option value="DONE">Done</option>
                <option value="ADMIN_INTERVENED">Admin Intervened</option>
                <option value="SLA_BREACH">SLA Breach</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Clear Filters */}
            {(searchQuery || statusFilter !== 'ALL') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
        
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-500">Loading tasks...</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-full min-h-[600px]">
              <KanbanColumn
                title="Assigned"
                tasks={groupedTasks.ASSIGNED}
                icon={<Play className="w-5 h-5" />}
                color="text-blue-600 dark:text-blue-400"
                badgeColor="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                onTaskClick={handleTaskClick}
                onAdminAction={handleAdminAction}
                selectedTaskId={selectedTaskId}
              />
              <KanbanColumn
                title="In Progress"
                tasks={groupedTasks.IN_PROGRESS}
                icon={<Clock className="w-5 h-5" />}
                color="text-amber-600 dark:text-amber-400"
                badgeColor="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                onTaskClick={handleTaskClick}
                onAdminAction={handleAdminAction}
                selectedTaskId={selectedTaskId}
              />
              <KanbanColumn
                title="Need Attention"
                tasks={groupedTasks.NEED_ATTENTION}
                icon={<AlertTriangle className="w-5 h-5" />}
                color="text-red-600 dark:text-red-400"
                badgeColor="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                onTaskClick={handleTaskClick}
                onAdminAction={handleAdminAction}
                selectedTaskId={selectedTaskId}
              />
              <KanbanColumn
                title="Done"
                tasks={groupedTasks.DONE}
                icon={<CheckCircle className="w-5 h-5" />}
                color="text-green-600 dark:text-green-400"
                badgeColor="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                onTaskClick={handleTaskClick}
                onAdminAction={handleAdminAction}
                selectedTaskId={selectedTaskId}
              />
            </div>
          )}
        </div>
        
        {/* Admin Action Modal */}
        {showActionModal && actionTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
              {/* Modal Header */}
              <div className={`p-4 ${
                actionType === 'APPROVE' ? 'bg-green-500' :
                actionType === 'REJECT' ? 'bg-red-500' :
                'bg-amber-500'
              }`}>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    {actionType === 'APPROVE' && <CheckCircle className="w-5 h-5" />}
                    {actionType === 'REJECT' && <XCircle className="w-5 h-5" />}
                    {actionType === 'INTERVENE' && <Shield className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{actionType} Task</h3>
                    <p className="text-sm opacity-90">Admin Override Action</p>
                  </div>
                </div>
              </div>
              
              {/* Modal Body */}
              <div className="p-4">
                <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{actionTask.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Created by {actionTask.creator?.name || 'Unknown'} • 
                    Assigned to {actionTask.assignee?.name || 'Unassigned'}
                  </p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add any notes about this action..."
                  className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
                
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <Stamp className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-700 dark:text-amber-400">
                    This action will be stamped with &quot;ADMIN ACTION&quot; and visible to all users
                  </span>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAdminAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    actionType === 'APPROVE' ? 'bg-green-500 hover:bg-green-600' :
                    actionType === 'REJECT' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-amber-500 hover:bg-amber-600'
                  } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
