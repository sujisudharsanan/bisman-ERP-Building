/**
 * ============================================================================
 * USE DECISION LOAD HOOK
 * ============================================================================
 * 
 * Fetches live decision load data from the backend API.
 * Provides stress scores, admin pressure, and simulation capabilities.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface LiveRoleData {
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

export interface LiveEdgeData {
  id: string;
  source: string;
  target: string;
  edgeType: 'normal' | 'fallback';
  workflowName?: string;
  transitionCount: number;
  avgWaitHours: number;
  slaBreaches: number;
  isBottleneck: boolean;
}

export interface AdminPressureData {
  totalApprovals: number;
  adminApprovals: number;
  fallbackApprovals: number;
  autoApprovals: number;
  adminPercentage: number;
  redirectedFromRoles: string[];
  missingRoleImpact: { role: string; count: number }[];
  pressureLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  insightMessage: string;
}

export interface SimulationResult {
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
    adminLoadReduction?: number;
  };
}

export interface SimulationSummary {
  parameters: {
    addRoles: string[];
    addUsersToRoles: { roleCode: string; count: number }[];
  };
  results: SimulationResult[];
  overallImpact: {
    totalFallbackReduction: number;
    totalAdminReduction: number;
    avgDelayReductionHours: number;
    rolesAffected: number;
  };
  recommendation: string;
}

export interface TaskTraceStage {
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

export interface TaskTrace {
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
// HOOK
// ============================================================================

export function useDecisionLoad() {
  // State
  const [liveRoleData, setLiveRoleData] = useState<LiveRoleData[]>([]);
  const [liveEdgeData, setLiveEdgeData] = useState<LiveEdgeData[]>([]);
  const [adminPressure, setAdminPressure] = useState<AdminPressureData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  // Simulation state
  const [simulationResults, setSimulationResults] = useState<SimulationSummary | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Task trace state
  const [taskTrace, setTaskTrace] = useState<TaskTrace | null>(null);
  const [isTracing, setIsTracing] = useState(false);

  // ============================================================================
  // FETCH LIVE DATA
  // ============================================================================

  const fetchLiveData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [rolesRes, edgesRes, pressureRes] = await Promise.all([
        fetch('/api/decision-load/roles', { credentials: 'include' }),
        fetch('/api/decision-load/edges', { credentials: 'include' }),
        fetch('/api/decision-load/admin-pressure', { credentials: 'include' })
      ]);

      // Handle roles
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (rolesData.success && rolesData.data?.nodes) {
          setLiveRoleData(rolesData.data.nodes.map((n: any) => n.data));
        }
      }

      // Handle edges
      if (edgesRes.ok) {
        const edgesData = await edgesRes.json();
        if (edgesData.success && edgesData.data?.edges) {
          setLiveEdgeData(edgesData.data.edges.map((e: any) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            ...e.data
          })));
        }
      }

      // Handle admin pressure
      if (pressureRes.ok) {
        const pressureData = await pressureRes.json();
        if (pressureData.success && pressureData.data) {
          setAdminPressure(pressureData.data);
        }
      }

      setLastFetched(new Date());
    } catch (err) {
      console.error('Error fetching decision load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch live data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================================
  // SIMULATION
  // ============================================================================

  const runSimulation = useCallback(async (params: {
    addRoles: string[];
    addUsersToRoles: { roleCode: string; count: number }[];
  }) => {
    try {
      setIsSimulating(true);
      const res = await fetch('/api/decision-load/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params)
      });

      if (!res.ok) {
        throw new Error('Simulation failed');
      }

      const data = await res.json();
      if (data.success && data.simulation) {
        setSimulationResults(data.simulation);
        return data.simulation;
      }
      return null;
    } catch (err) {
      console.error('Simulation error:', err);
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, []);

  const clearSimulation = useCallback(() => {
    setSimulationResults(null);
  }, []);

  // ============================================================================
  // TASK TRACE
  // ============================================================================

  const traceTask = useCallback(async (taskId: string) => {
    try {
      setIsTracing(true);
      const res = await fetch(`/api/decision-load/task-trace/${taskId}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        setTaskTrace(null);
        return null;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setTaskTrace(data.data);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('Task trace error:', err);
      setTaskTrace(null);
      return null;
    } finally {
      setIsTracing(false);
    }
  }, []);

  const clearTaskTrace = useCallback(() => {
    setTaskTrace(null);
  }, []);

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Get live role intelligence by role name
   * Merges with static data structure for compatibility
   */
  const getLiveRoleIntelligence = useCallback((roleName: string) => {
    const liveData = liveRoleData.find(r => 
      r.roleName.toLowerCase() === roleName.toLowerCase() ||
      r.roleCode.toLowerCase().replace(/_/g, ' ') === roleName.toLowerCase()
    );

    if (!liveData) {
      return null;
    }

    // Map to existing roleIntelligenceData format for compatibility
    const stressLevelMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'NORMAL': 'low',
      'WARNING': 'medium',
      'HIGH': 'high',
      'CRITICAL': 'critical'
    };

    return {
      status: liveData.isActive ? 'active' as const : 'missing' as const,
      stressLevel: stressLevelMap[liveData.stressLevel] || 'low',
      tasksHandled: liveData.approvedCount + liveData.rejectedCount,
      pendingTasks: liveData.pendingApprovals,
      fallbackApprovals: liveData.fallbackCount,
      avgApprovalTime: liveData.avgDelayHours > 0 ? `${liveData.avgDelayHours.toFixed(1)} hrs` : '-',
      slaBreaches: liveData.slaBreaches,
      autoApprovals: liveData.autoApproveCount,
      usersCount: liveData.usersCount,
      userNames: liveData.userNames,
      stressScore: liveData.stressScore,
      receivingFallback: liveData.receivingFallback,
      // Computed context
      riskContext: liveData.fallbackCount > 0 
        ? `Handling ${liveData.fallbackCount} fallback approvals from missing roles`
        : liveData.pendingApprovals > 10
          ? `${liveData.pendingApprovals} pending approvals - high workload`
          : 'Operating within normal parameters',
      whyImportant: `Level ${liveData.businessLevel} role with ${liveData.usersCount} assigned users`,
      whatHappensWithout: !liveData.isActive 
        ? 'Approvals redirected to Admin via fallback' 
        : 'N/A - Role is active'
    };
  }, [liveRoleData]);

  /**
   * Get stress color for a role (matches existing getStressColor function)
   */
  const getStressColor = useCallback((roleName: string) => {
    const liveData = getLiveRoleIntelligence(roleName);
    if (!liveData) return 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600';

    if (liveData.status === 'missing') {
      return 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500';
    }

    switch (liveData.stressLevel) {
      case 'low': return 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600';
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-600';
      case 'high': return 'bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-600';
      case 'critical': return 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600';
      default: return 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
  }, [getLiveRoleIntelligence]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const liveMetrics = useMemo(() => {
    const totalRoles = liveRoleData.length;
    const activeRoles = liveRoleData.filter(r => r.isActive).length;
    const missingRoles = liveRoleData.filter(r => !r.isActive);
    const overloadedRoles = liveRoleData.filter(r => 
      r.stressLevel === 'HIGH' || r.stressLevel === 'CRITICAL'
    );
    const totalPending = liveRoleData.reduce((sum, r) => sum + r.pendingApprovals, 0);
    const totalFallbacks = liveRoleData.reduce((sum, r) => sum + r.fallbackCount, 0);
    const totalSlaBreaches = liveRoleData.reduce((sum, r) => sum + r.slaBreaches, 0);

    return {
      totalRoles,
      activeRoles,
      missingRoles: missingRoles.map(r => r.roleName),
      missingCount: missingRoles.length,
      overloadedRoles: overloadedRoles.map(r => r.roleName),
      overloadedCount: overloadedRoles.length,
      totalPending,
      totalFallbacks,
      totalSlaBreaches,
      coveragePercent: totalRoles > 0 ? Math.round((activeRoles / totalRoles) * 100) : 0
    };
  }, [liveRoleData]);

  // ============================================================================
  // AUTO-REFRESH
  // ============================================================================

  useEffect(() => {
    // Initial fetch
    fetchLiveData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchLiveData, 60000);

    return () => clearInterval(interval);
  }, [fetchLiveData]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Live data
    liveRoleData,
    liveEdgeData,
    adminPressure,
    liveMetrics,
    
    // Loading states
    isLoading,
    error,
    lastFetched,
    
    // Functions
    fetchLiveData,
    getLiveRoleIntelligence,
    getStressColor,
    
    // Simulation
    runSimulation,
    clearSimulation,
    simulationResults,
    isSimulating,
    
    // Task trace
    traceTask,
    clearTaskTrace,
    taskTrace,
    isTracing,
    
    // Check if live data is available
    hasLiveData: liveRoleData.length > 0
  };
}

export default useDecisionLoad;
