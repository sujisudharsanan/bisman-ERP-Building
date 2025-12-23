/**
 * ============================================================================
 * DECISION LOAD MAP
 * ============================================================================
 * 
 * Business Pressure & Decision Flow Map visualization:
 * - Role stress visualization with live metrics
 * - Approval flow edge visualization
 * - Admin pressure analysis
 * - Simulation engine for what-if scenarios
 * - Task trace for live path visualization
 * 
 * @module components/decision-load/DecisionLoadMap
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Users, 
  Zap, 
  Clock, 
  TrendingUp,
  Filter,
  Play,
  Pause,
  Search,
  RefreshCw,
  Settings,
  Info,
  ChevronDown,
  X,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Target,
  GitBranch
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface RoleNodeData {
  roleId: string;
  roleName: string;
  roleCode: string;
  businessLevel: number;
  usersCount: number;
  userNames: string[];
  isActive: boolean;
  pendingApprovals: number;
  approvedCount: number;
  rejectedCount: number;
  autoApproveCount: number;
  fallbackCount: number;
  avgDelayHours: number;
  slaBreaches: number;
  stressScore: number;
  stressLevel: 'NORMAL' | 'WARNING' | 'HIGH' | 'CRITICAL';
  stressColor: string;
  receivingFallback: boolean;
}

interface RoleNode {
  id: string;
  type: string;
  data: RoleNodeData;
  position: { x: number; y: number };
}

interface EdgeData {
  edgeType: 'normal' | 'fallback';
  workflowName?: string;
  transitionCount?: number;
  avgWaitHours?: number;
  slaBreaches?: number;
  isBottleneck?: boolean;
  fallbackType?: string;
  redirectCount?: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  data: EdgeData;
  animated?: boolean;
  style?: {
    stroke: string;
    strokeWidth: number;
    strokeDasharray?: string;
  };
}

interface AdminPressure {
  totalApprovals: number;
  adminApprovals: number;
  fallbackApprovals: number;
  autoApprovals: number;
  adminPercentage: number;
  redirectedFromRoles: string[];
  pressureLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  insightMessage: string;
}

interface SimulationResult {
  action: string;
  roleCode: string;
  usersToAdd?: number;
  impact: {
    currentUsers: number;
    newUsers: number;
    fallbackReduction?: number;
    delayReductionHours: number;
    delayReductionPct: number;
    stressReduction?: number;
  };
}

interface TaskTraceStage {
  order: number;
  name: string;
  role: string;
  status: string;
  approver: { id: string; name: string };
  waitHours: number;
  slaBreached: boolean;
  fallbackApplied: string | null;
  isCurrent: boolean;
  isCompleted: boolean;
  isRejected: boolean;
}

interface TaskTrace {
  taskId: string;
  entityType: string;
  instanceStatus: string;
  initiator: { id: string; name: string };
  stages: TaskTraceStage[];
  summary: {
    totalStages: number;
    completedStages: number;
    slaBreaches: number;
    fallbacksUsed: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STRESS_COLORS = {
  NORMAL: '#3b82f6',
  WARNING: '#eab308',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
  faded: '#9ca3af',
  gray: '#6b7280'
};

const FILTER_CATEGORIES = [
  { id: 'all', label: 'All Flows', icon: GitBranch },
  { id: 'finance', label: 'Finance', icon: TrendingUp },
  { id: 'compliance', label: 'Compliance', icon: Target },
  { id: 'procurement', label: 'Procurement', icon: Activity },
  { id: 'sla-breaches', label: 'SLA Breaches', icon: AlertTriangle },
  { id: 'auto-approvals', label: 'Auto-Approvals', icon: Zap },
  { id: 'escalations', label: 'Escalations', icon: TrendingUp }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getStressGradient = (stressLevel: string) => {
  switch (stressLevel) {
    case 'CRITICAL': return 'from-red-500 to-red-600';
    case 'HIGH': return 'from-orange-500 to-orange-600';
    case 'WARNING': return 'from-yellow-500 to-yellow-600';
    default: return 'from-blue-500 to-blue-600';
  }
};

const getStressBorderColor = (stressLevel: string) => {
  switch (stressLevel) {
    case 'CRITICAL': return 'border-red-500';
    case 'HIGH': return 'border-orange-500';
    case 'WARNING': return 'border-yellow-500';
    default: return 'border-blue-500';
  }
};

// ============================================================================
// ROLE NODE COMPONENT
// ============================================================================

interface RoleNodeProps {
  node: RoleNode;
  isSelected: boolean;
  isHighlighted: boolean;
  isFaded: boolean;
  onClick: (node: RoleNode) => void;
}

const RoleNodeComponent: React.FC<RoleNodeProps> = ({ 
  node, 
  isSelected, 
  isHighlighted,
  isFaded,
  onClick 
}) => {
  const { data } = node;
  
  return (
    <div
      onClick={() => onClick(node)}
      className={`
        absolute cursor-pointer transition-all duration-300 transform
        ${isSelected ? 'scale-110 z-50' : 'hover:scale-105'}
        ${isFaded ? 'opacity-40' : 'opacity-100'}
        ${isHighlighted ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
      `}
      style={{
        left: node.position.x,
        top: node.position.y,
        transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.1)' : ''}`,
      }}
    >
      <div
        className={`
          relative w-40 p-3 rounded-xl shadow-lg
          bg-white dark:bg-gray-800
          border-2 ${getStressBorderColor(data.stressLevel)}
          ${data.receivingFallback ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
          ${!data.isActive ? 'bg-gray-100 dark:bg-gray-900 border-dashed' : ''}
        `}
      >
        {/* Stress Indicator Bar */}
        <div className="absolute -top-1 left-2 right-2 h-1 rounded-full bg-gray-200 overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${getStressGradient(data.stressLevel)} transition-all duration-500`}
            style={{ width: `${data.stressScore}%` }}
          />
        </div>

        {/* Role Name & Level */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            L{data.businessLevel}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            data.isActive 
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {data.isActive ? 'Active' : 'No Users'}
          </span>
        </div>

        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
          {data.roleName}
        </h4>
        
        {/* Users Count */}
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
          <Users className="w-3 h-3" />
          <span>{data.usersCount} user{data.usersCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Clock className="w-3 h-3" />
            <span>{data.pendingApprovals} pending</span>
          </div>
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Activity className="w-3 h-3" />
            <span>{data.approvedCount} done</span>
          </div>
          {data.fallbackCount > 0 && (
            <div className="col-span-2 flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              <span>{data.fallbackCount} fallback</span>
            </div>
          )}
          {data.slaBreaches > 0 && (
            <div className="col-span-2 flex items-center gap-1 text-red-600 dark:text-red-400">
              <Zap className="w-3 h-3" />
              <span>{data.slaBreaches} SLA breach</span>
            </div>
          )}
        </div>

        {/* Stress Score Badge */}
        <div 
          className={`
            absolute -bottom-2 left-1/2 transform -translate-x-1/2
            px-2 py-0.5 rounded-full text-xs font-bold text-white
            bg-gradient-to-r ${getStressGradient(data.stressLevel)}
          `}
        >
          {data.stressScore}%
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ADMIN PRESSURE PANEL
// ============================================================================

interface AdminPressurePanelProps {
  pressure: AdminPressure | null;
  isLoading: boolean;
}

const AdminPressurePanel: React.FC<AdminPressurePanelProps> = ({ pressure, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  if (!pressure) return null;

  const getPressureColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500';
      case 'WARNING': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Admin Pressure
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${getPressureColor(pressure.pressureLevel)}`}>
          {pressure.pressureLevel}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Admin Load</span>
          <span>{pressure.adminPercentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getPressureColor(pressure.pressureLevel)}`}
            style={{ width: `${Math.min(100, pressure.adminPercentage)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-lg font-bold text-gray-900 dark:text-white">{pressure.adminApprovals}</div>
          <div className="text-xs text-gray-500">Admin Approvals</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <div className="text-lg font-bold text-yellow-600">{pressure.fallbackApprovals}</div>
          <div className="text-xs text-gray-500">Fallback Used</div>
        </div>
      </div>

      {/* Insight Message */}
      <p className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-2 border-blue-500">
        {pressure.insightMessage}
      </p>

      {/* Redirected From */}
      {pressure.redirectedFromRoles.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">Load redirected from:</p>
          <div className="flex flex-wrap gap-1">
            {pressure.redirectedFromRoles.map((role, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-xs">
                {role}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SIMULATION PANEL
// ============================================================================

interface SimulationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (params: { addRoles: string[]; addUsersToRoles: { roleCode: string; count: number }[] }) => void;
  results: SimulationResult[] | null;
  isLoading: boolean;
  roles: RoleNode[];
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ 
  isOpen, 
  onClose, 
  onSimulate, 
  results,
  isLoading,
  roles 
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userAdditions, setUserAdditions] = useState<{ roleCode: string; count: number }[]>([]);

  const inactiveRoles = roles.filter(r => !r.data.isActive);
  const activeRoles = roles.filter(r => r.data.isActive);

  const handleAddRoleToSimulation = (roleCode: string) => {
    if (!selectedRoles.includes(roleCode)) {
      setSelectedRoles([...selectedRoles, roleCode]);
    }
  };

  const handleAddUsersToRole = (roleCode: string, count: number) => {
    const existing = userAdditions.find(u => u.roleCode === roleCode);
    if (existing) {
      setUserAdditions(userAdditions.map(u => 
        u.roleCode === roleCode ? { ...u, count } : u
      ));
    } else {
      setUserAdditions([...userAdditions, { roleCode, count }]);
    }
  };

  const handleRunSimulation = () => {
    onSimulate({
      addRoles: selectedRoles,
      addUsersToRoles: userAdditions.filter(u => u.count > 0)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          Simulation Mode
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Add Missing Roles */}
        {inactiveRoles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Missing Roles
            </h4>
            <div className="flex flex-wrap gap-2">
              {inactiveRoles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleAddRoleToSimulation(role.data.roleCode)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    selectedRoles.includes(role.data.roleCode)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {role.data.roleName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add Users to Roles */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add Users to Roles
          </h4>
          <div className="space-y-2 max-h-40 overflow-auto">
            {activeRoles.map(role => (
              <div key={role.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="text-sm text-gray-700 dark:text-gray-300">{role.data.roleName}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAddUsersToRole(
                      role.data.roleCode, 
                      Math.max(0, (userAdditions.find(u => u.roleCode === role.data.roleCode)?.count || 0) - 1)
                    )}
                    className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    +{userAdditions.find(u => u.roleCode === role.data.roleCode)?.count || 0}
                  </span>
                  <button 
                    onClick={() => handleAddUsersToRole(
                      role.data.roleCode, 
                      (userAdditions.find(u => u.roleCode === role.data.roleCode)?.count || 0) + 1
                    )}
                    className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Run Simulation */}
        <button
          onClick={handleRunSimulation}
          disabled={isLoading || (selectedRoles.length === 0 && userAdditions.filter(u => u.count > 0).length === 0)}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Simulation
            </>
          )}
        </button>

        {/* Results */}
        {results && results.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Simulation Results
            </h4>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div key={idx} className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {result.roleCode}
                    </span>
                    <span className="text-xs text-green-600">{result.action}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                    {result.impact.fallbackReduction !== undefined && result.impact.fallbackReduction > 0 && (
                      <div>🎯 {result.impact.fallbackReduction} fewer fallbacks</div>
                    )}
                    {result.impact.delayReductionHours > 0 && (
                      <div>⚡ {result.impact.delayReductionHours}h faster approvals</div>
                    )}
                    {result.impact.stressReduction !== undefined && result.impact.stressReduction > 0 && (
                      <div>📉 {result.impact.stressReduction}% stress reduction</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// TASK TRACE PANEL
// ============================================================================

interface TaskTracePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (taskId: string) => void;
  trace: TaskTrace | null;
  isLoading: boolean;
}

const TaskTracePanel: React.FC<TaskTracePanelProps> = ({ 
  isOpen, 
  onClose, 
  onSearch, 
  trace,
  isLoading 
}) => {
  const [taskId, setTaskId] = useState('');

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 left-4 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-500" />
          Task Trace
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="Enter Task ID..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          <button
            onClick={() => onSearch(taskId)}
            disabled={!taskId || isLoading}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {/* Trace Results */}
        {trace && (
          <div className="space-y-3">
            {/* Summary */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {trace.entityType}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  trace.instanceStatus === 'approved' 
                    ? 'bg-green-100 text-green-700' 
                    : trace.instanceStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  {trace.instanceStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div>Stages: {trace.summary.completedStages}/{trace.summary.totalStages}</div>
                <div>SLA Breaches: {trace.summary.slaBreaches}</div>
              </div>
            </div>

            {/* Stages Timeline */}
            <div className="space-y-0">
              {trace.stages.map((stage, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Timeline Line */}
                  {idx < trace.stages.length - 1 && (
                    <div className={`absolute left-2 top-6 w-0.5 h-full ${
                      stage.isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                  
                  {/* Timeline Dot */}
                  <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${
                    stage.isCurrent 
                      ? 'bg-yellow-500 border-yellow-500 animate-pulse'
                      : stage.isCompleted
                        ? 'bg-green-500 border-green-500'
                        : stage.isRejected
                          ? 'bg-red-500 border-red-500'
                          : 'bg-gray-200 border-gray-300'
                  }`} />

                  {/* Stage Content */}
                  <div className={`py-2 ${stage.isCurrent ? 'bg-yellow-50 dark:bg-yellow-900/20 -ml-4 pl-8 -mr-4 pr-4 rounded' : ''}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {stage.name}
                      </span>
                      <span className="text-xs text-gray-500">{stage.role}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {stage.approver.name && (
                        <span className="text-gray-600 dark:text-gray-400">
                          👤 {stage.approver.name}
                        </span>
                      )}
                      <span className="text-gray-600 dark:text-gray-400">
                        ⏱ {stage.waitHours}h
                      </span>
                      {stage.slaBreached && (
                        <span className="text-red-600">⚠️ SLA Breach</span>
                      )}
                      {stage.fallbackApplied && (
                        <span className="text-yellow-600">↗️ Fallback</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DECISION LOAD MAP COMPONENT
// ============================================================================

export const DecisionLoadMap: React.FC = () => {
  // State
  const [nodes, setNodes] = useState<RoleNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [adminPressure, setAdminPressure] = useState<AdminPressure | null>(null);
  const [selectedNode, setSelectedNode] = useState<RoleNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Mode toggles
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isTaskTraceOpen, setIsTaskTraceOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Simulation state
  const [simulationResults, setSimulationResults] = useState<SimulationResult[] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Task trace state
  const [taskTrace, setTaskTrace] = useState<TaskTrace | null>(null);
  const [isTracing, setIsTracing] = useState(false);

  // Zoom/Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Highlighted nodes for filter
  const [highlightedRoles, setHighlightedRoles] = useState<string[]>([]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const fetchGraphData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [rolesRes, edgesRes, pressureRes] = await Promise.all([
        fetch('/api/decision-load/roles'),
        fetch('/api/decision-load/edges'),
        fetch('/api/decision-load/admin-pressure')
      ]);

      if (!rolesRes.ok || !edgesRes.ok || !pressureRes.ok) {
        throw new Error('Failed to fetch decision load data');
      }

      const rolesData = await rolesRes.json();
      const edgesData = await edgesRes.json();
      const pressureData = await pressureRes.json();

      // Calculate node positions (hierarchical layout)
      const levelCounts: Record<number, number> = {};
      const positionedNodes = rolesData.data.nodes.map((node: RoleNode) => {
        const level = node.data.businessLevel || 1;
        levelCounts[level] = (levelCounts[level] || 0) + 1;
        
        return {
          ...node,
          position: {
            x: 150 + (levelCounts[level] - 1) * 200,
            y: 100 + (10 - level) * 140
          }
        };
      });

      setNodes(positionedNodes);
      setEdges(edgesData.data.edges);
      setAdminPressure(pressureData.data);
    } catch (err) {
      console.error('Error fetching graph data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFilteredData = useCallback(async (category: string) => {
    if (category === 'all') {
      setHighlightedRoles([]);
      return;
    }

    try {
      const res = await fetch(`/api/decision-load/filter/${category}`);
      if (!res.ok) throw new Error('Filter failed');
      
      const data = await res.json();
      setHighlightedRoles(data.data.highlightRoles || []);
    } catch (err) {
      console.error('Filter error:', err);
    }
  }, []);

  const runSimulation = useCallback(async (params: { addRoles: string[]; addUsersToRoles: { roleCode: string; count: number }[] }) => {
    try {
      setIsSimulating(true);
      const res = await fetch('/api/decision-load/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!res.ok) throw new Error('Simulation failed');
      
      const data = await res.json();
      setSimulationResults(data.simulation.results);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, []);

  const traceTask = useCallback(async (taskId: string) => {
    try {
      setIsTracing(true);
      const res = await fetch(`/api/decision-load/task-trace/${taskId}`);
      
      if (!res.ok) throw new Error('Task not found');
      
      const data = await res.json();
      setTaskTrace(data.data);
    } catch (err) {
      console.error('Trace error:', err);
      setTaskTrace(null);
    } finally {
      setIsTracing(false);
    }
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    fetchFilteredData(activeFilter);
  }, [activeFilter, fetchFilteredData]);

  // Auto-refresh in live mode
  useEffect(() => {
    if (!isLiveMode) return;

    const interval = setInterval(() => {
      fetchGraphData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isLiveMode, fetchGraphData]);

  // ============================================================================
  // RENDER EDGES (SVG)
  // ============================================================================

  const renderEdges = useMemo(() => {
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) return null;

      const x1 = sourceNode.position.x;
      const y1 = sourceNode.position.y + 40; // Bottom of source node
      const x2 = targetNode.position.x;
      const y2 = targetNode.position.y - 40; // Top of target node

      // Bezier curve control points
      const midY = (y1 + y2) / 2;

      return (
        <g key={edge.id}>
          <path
            d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
            fill="none"
            stroke={edge.style?.stroke || '#3b82f6'}
            strokeWidth={edge.style?.strokeWidth || 2}
            strokeDasharray={edge.style?.strokeDasharray}
            className={edge.animated ? 'animate-pulse' : ''}
            opacity={highlightedRoles.length > 0 && !highlightedRoles.includes(sourceNode.data.roleCode) ? 0.2 : 1}
          />
          {/* Arrow marker */}
          <polygon
            points={`${x2},${y2} ${x2-5},${y2-10} ${x2+5},${y2-10}`}
            fill={edge.style?.stroke || '#3b82f6'}
            opacity={highlightedRoles.length > 0 && !highlightedRoles.includes(sourceNode.data.roleCode) ? 0.2 : 1}
          />
          {/* Edge label */}
          {edge.data.transitionCount && edge.data.transitionCount > 5 && (
            <text
              x={(x1 + x2) / 2}
              y={midY - 10}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {edge.data.transitionCount}
            </text>
          )}
        </g>
      );
    });
  }, [edges, nodes, highlightedRoles]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to Load</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchGraphData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-blue-500" />
              Decision Load Map
            </h1>
            
            {/* Live/Simulate Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setIsLiveMode(true)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  isLiveMode 
                    ? 'bg-green-500 text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Activity className="w-4 h-4" />
                Live
              </button>
              <button
                onClick={() => { setIsLiveMode(false); setIsSimulationOpen(true); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  !isLiveMode 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Settings className="w-4 h-4" />
                Simulate
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTaskTraceOpen(!isTaskTraceOpen)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                isTaskTraceOpen
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              <Search className="w-4 h-4" />
              Task Trace
            </button>
            
            <button
              onClick={fetchGraphData}
              disabled={isLoading}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
          {FILTER_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeFilter === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              <cat.icon className="w-3 h-3" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Area */}
      <div 
        className="absolute inset-0 pt-32 overflow-auto"
        style={{ 
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'center center'
        }}
      >
        {/* Loading State */}
        {isLoading && nodes.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading decision flow...</p>
            </div>
          </div>
        )}

        {/* SVG Layer for Edges */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ minHeight: '1200px', minWidth: '100%' }}
        >
          {renderEdges}
        </svg>

        {/* Role Nodes */}
        <div className="relative" style={{ minHeight: '1200px' }}>
          {nodes.map(node => (
            <RoleNodeComponent
              key={node.id}
              node={node}
              isSelected={selectedNode?.id === node.id}
              isHighlighted={highlightedRoles.includes(node.data.roleCode)}
              isFaded={highlightedRoles.length > 0 && !highlightedRoles.includes(node.data.roleCode)}
              onClick={setSelectedNode}
            />
          ))}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-40">
        <button
          onClick={() => setZoom(z => Math.min(2, z + 0.1))}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ZoomIn className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ZoomOut className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Admin Pressure Panel */}
      <div className="absolute bottom-4 left-4 w-72 z-40">
        <AdminPressurePanel pressure={adminPressure} isLoading={isLoading} />
      </div>

      {/* Legend */}
      <div className="absolute top-36 right-4 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-lg z-30">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Stress Levels</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Normal (0-30%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">Warning (31-60%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">High (61-80%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Critical (81-100%)</span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-dashed border-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">No Users</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">Fallback Path</span>
          </div>
        </div>
      </div>

      {/* Simulation Panel */}
      <SimulationPanel
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onSimulate={runSimulation}
        results={simulationResults}
        isLoading={isSimulating}
        roles={nodes}
      />

      {/* Task Trace Panel */}
      <TaskTracePanel
        isOpen={isTaskTraceOpen}
        onClose={() => setIsTaskTraceOpen(false)}
        onSearch={traceTask}
        trace={taskTrace}
        isLoading={isTracing}
      />

      {/* Selected Node Detail */}
      {selectedNode && (
        <div className="absolute bottom-4 left-80 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700 z-40 w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {selectedNode.data.roleName}
            </h3>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-lg font-bold text-blue-600">{selectedNode.data.usersCount}</div>
              <div className="text-xs text-gray-500">Users</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-lg font-bold text-yellow-600">{selectedNode.data.pendingApprovals}</div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-lg font-bold text-green-600">{selectedNode.data.approvedCount}</div>
              <div className="text-xs text-gray-500">Approved</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-lg font-bold text-red-600">{selectedNode.data.slaBreaches}</div>
              <div className="text-xs text-gray-500">SLA Breaches</div>
            </div>
          </div>

          {selectedNode.data.userNames.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Users:</p>
              <div className="flex flex-wrap gap-1">
                {selectedNode.data.userNames.slice(0, 5).map((name, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                    {name}
                  </span>
                ))}
                {selectedNode.data.userNames.length > 5 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    +{selectedNode.data.userNames.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DecisionLoadMap;
