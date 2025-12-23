/**
 * ============================================================================
 * DECISION LOAD MAP API
 * ============================================================================
 * 
 * Powers the "Business Pressure & Decision Flow Map" visualization:
 * - Role stress calculation
 * - Live approval flow data
 * - Simulation engine for what-if scenarios
 * - Task trace for path visualization
 * 
 * @module routes/decisionLoadRoutes
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// CONSTANTS
// ============================================================================

const STRESS_THRESHOLDS = {
  NORMAL: 30,
  WARNING: 60,
  HIGH: 80,
  CRITICAL: 100
};

const STRESS_COLORS = {
  NORMAL: 'blue',
  WARNING: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
  INACTIVE: 'gray',
  FADED: 'faded'
};

// Business level to role mapping (used for reference/documentation)
// eslint-disable-next-line no-unused-vars
const ROLE_HIERARCHY = {
  10: { name: 'Super Admin', code: 'SUPER_ADMIN' },
  9: { name: 'Admin / CFO', code: 'ADMIN' },
  8: { name: 'Finance Controller', code: 'FINANCE_CONTROLLER' },
  7: { name: 'Operations Manager', code: 'OPERATIONS_MANAGER' },
  6: { name: 'Manager', code: 'MANAGER' },
  5: { name: 'Accounts', code: 'ACCOUNTS' },
  4: { name: 'Accounts Payable', code: 'ACCOUNTS_PAYABLE' },
  3: { name: 'Hub Incharge', code: 'HUB_INCHARGE' },
  2: { name: 'Supervisor', code: 'SUPERVISOR' },
  1: { name: 'Staff', code: 'STAFF' }
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require L6+ for decision load map access
 */
function requireDecisionMapAccess(req, res, next) {
  const userLevel = req.user?.businessLevel || req.user?.business_level || 1;
  
  if (userLevel < 6) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient Authority',
      message: 'Decision Load Map requires L6+ (Manager) access.',
      code: 'DECISION_MAP_ACCESS_DENIED'
    });
  }
  next();
}

router.use(requireDecisionMapAccess);

// ============================================================================
// STRESS CALCULATION
// ============================================================================

/**
 * Calculate stress score for a role
 * Formula: stress = (pending/users) + (delay*0.5) + (fallback*2) + (auto_approve*3)
 */
function calculateStressScore(roleData) {
  const {
    pending_count = 0,
    users_count = 1,
    avg_delay_hours = 0,
    fallback_count = 0,
    auto_approve_count = 0,
    reassignment_count = 0
  } = roleData;
  
  // Prevent division by zero
  const effectiveUsers = Math.max(users_count, 1);
  
  // Calculate stress components
  const pendingPerUser = (pending_count / effectiveUsers) * 5; // Scale factor
  const delayPenalty = avg_delay_hours * 0.5;
  const fallbackPenalty = fallback_count * 2;
  const autoApprovePenalty = auto_approve_count * 3;
  const reassignmentPenalty = reassignment_count * 1;
  
  // Total stress (capped at 100)
  const stress = Math.min(100, Math.round(
    pendingPerUser + delayPenalty + fallbackPenalty + autoApprovePenalty + reassignmentPenalty
  ));
  
  return stress;
}

/**
 * Get stress level from score
 */
function getStressLevel(score) {
  if (score <= STRESS_THRESHOLDS.NORMAL) return 'NORMAL';
  if (score <= STRESS_THRESHOLDS.WARNING) return 'WARNING';
  if (score <= STRESS_THRESHOLDS.HIGH) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Get stress color from score and user count
 */
function getStressColor(score, usersCount, isDisabled = false) {
  if (isDisabled) return STRESS_COLORS.INACTIVE;
  if (usersCount === 0) return STRESS_COLORS.FADED;
  
  const level = getStressLevel(score);
  return STRESS_COLORS[level];
}

// ============================================================================
// GET ROLE NODES (LIVE DATA)
// ============================================================================

/**
 * GET /api/decision-load/roles
 * Get all roles with live stress data for the tenant
 */
router.get('/roles', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
    }
    
    // Get all roles with user counts
    const rolesWithUsers = await prisma.$queryRaw`
      SELECT 
        r.id as role_id,
        r.name as role_name,
        r.code as role_code,
        r.business_level,
        r.is_system_role,
        COUNT(DISTINCT ur.user_id) as users_count,
        ARRAY_AGG(DISTINCT u.full_name) FILTER (WHERE u.full_name IS NOT NULL) as user_names
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.enterprise_id = ${tenantId}::uuid
      LEFT JOIN users u ON ur.user_id = u.id AND u.is_active = true
      WHERE r.is_system_role = true OR EXISTS (
        SELECT 1 FROM user_roles ur2 
        WHERE ur2.role_id = r.id AND ur2.enterprise_id = ${tenantId}::uuid
      )
      GROUP BY r.id, r.name, r.code, r.business_level, r.is_system_role
      ORDER BY r.business_level DESC
    `;
    
    // Get approval metrics per role
    const approvalMetrics = await prisma.$queryRaw`
      SELECT 
        aws.assigned_role as role_code,
        COUNT(*) FILTER (WHERE asi.status = 'active') as pending_count,
        COUNT(*) FILTER (WHERE asi.status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE asi.status = 'rejected') as rejected_count,
        COUNT(*) FILTER (WHERE asi.status = 'auto_approved') as auto_approve_count,
        COUNT(*) FILTER (WHERE asi.fallback_applied IS NOT NULL) as fallback_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(asi.actioned_at, NOW()) - asi.activated_at))/3600) 
          FILTER (WHERE asi.status = 'active') as avg_delay_hours,
        COUNT(*) FILTER (WHERE asi.actioned_at > asi.due_at) as sla_breaches
      FROM approval_stage_instances asi
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND ai.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY aws.assigned_role
    `;
    
    // Create metrics lookup
    const metricsMap = {};
    approvalMetrics.forEach(m => {
      metricsMap[m.role_code] = m;
    });
    
    // Get fallback redirections (roles receiving fallback load)
    const fallbackRedirections = await prisma.$queryRaw`
      SELECT 
        aws.assigned_role as original_role,
        asi.fallback_applied,
        COUNT(*) as redirect_count
      FROM approval_stage_instances asi
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND asi.fallback_applied IS NOT NULL
        AND ai.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY aws.assigned_role, asi.fallback_applied
    `;
    
    // Build role nodes
    const roleNodes = rolesWithUsers.map(role => {
      const metrics = metricsMap[role.role_code] || {};
      const usersCount = parseInt(role.users_count) || 0;
      
      // Calculate stress
      const stressData = {
        pending_count: parseInt(metrics.pending_count) || 0,
        users_count: usersCount,
        avg_delay_hours: parseFloat(metrics.avg_delay_hours) || 0,
        fallback_count: parseInt(metrics.fallback_count) || 0,
        auto_approve_count: parseInt(metrics.auto_approve_count) || 0
      };
      
      const stressScore = calculateStressScore(stressData);
      const stressLevel = getStressLevel(stressScore);
      const stressColor = getStressColor(stressScore, usersCount);
      
      // Check if receiving fallback load
      const receivingFallback = fallbackRedirections.some(
        f => f.fallback_applied === 'auto_assign_admin' && role.role_code === 'ADMIN'
      );
      
      return {
        id: `role-${role.role_code}`,
        type: 'roleNode',
        data: {
          roleId: role.role_id,
          roleName: role.role_name,
          roleCode: role.role_code,
          businessLevel: role.business_level,
          usersCount,
          userNames: role.user_names || [],
          isActive: usersCount > 0,
          isSystemRole: role.is_system_role,
          
          // Metrics
          pendingApprovals: parseInt(metrics.pending_count) || 0,
          approvedCount: parseInt(metrics.approved_count) || 0,
          rejectedCount: parseInt(metrics.rejected_count) || 0,
          autoApproveCount: parseInt(metrics.auto_approve_count) || 0,
          fallbackCount: parseInt(metrics.fallback_count) || 0,
          avgDelayHours: parseFloat(metrics.avg_delay_hours) || 0,
          slaBreaches: parseInt(metrics.sla_breaches) || 0,
          
          // Stress
          stressScore,
          stressLevel,
          stressColor,
          receivingFallback
        },
        position: { x: 0, y: 0 } // Will be calculated by frontend
      };
    });
    
    res.json({
      success: true,
      data: {
        nodes: roleNodes,
        totalRoles: roleNodes.length,
        activeRoles: roleNodes.filter(n => n.data.isActive).length,
        criticalRoles: roleNodes.filter(n => n.data.stressLevel === 'CRITICAL').length
      },
      meta: { tenantId, generatedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('[DecisionLoad] Roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch role data',
      message: error.message
    });
  }
});

// ============================================================================
// GET APPROVAL EDGES (FLOW PATHS)
// ============================================================================

/**
 * GET /api/decision-load/edges
 * Get approval flow edges between roles
 */
router.get('/edges', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    // Get workflow stage transitions
    const flowData = await prisma.$queryRaw`
      SELECT 
        s1.assigned_role as from_role,
        s2.assigned_role as to_role,
        awt.name as workflow_name,
        awt.code as workflow_code,
        COUNT(*) as transition_count,
        AVG(EXTRACT(EPOCH FROM (asi2.activated_at - asi1.actioned_at))/3600) as avg_wait_hours,
        COUNT(*) FILTER (WHERE asi2.actioned_at > asi2.due_at) as sla_breaches
      FROM approval_stage_instances asi1
      JOIN approval_stage_instances asi2 ON asi1.approval_instance_id = asi2.approval_instance_id
        AND asi2.stage_order = asi1.stage_order + 1
      JOIN approval_workflow_stages s1 ON asi1.workflow_stage_id = s1.id
      JOIN approval_workflow_stages s2 ON asi2.workflow_stage_id = s2.id
      JOIN approval_instances ai ON asi1.approval_instance_id = ai.id
      JOIN approval_workflow_templates awt ON ai.workflow_template_id = awt.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND ai.created_at >= NOW() - INTERVAL '30 days'
        AND asi1.status IN ('approved', 'auto_approved', 'skipped')
      GROUP BY s1.assigned_role, s2.assigned_role, awt.name, awt.code
    `;
    
    // Get fallback redirections
    const fallbackEdges = await prisma.$queryRaw`
      SELECT 
        aws.assigned_role as from_role,
        CASE 
          WHEN asi.fallback_applied = 'auto_assign_admin' THEN 'ADMIN'
          WHEN asi.fallback_applied = 'escalate_to_owner' THEN 'ADMIN'
          WHEN asi.fallback_applied = 'escalate_to_super_admin' THEN 'SUPER_ADMIN'
          ELSE 'ADMIN'
        END as to_role,
        asi.fallback_applied as fallback_type,
        COUNT(*) as redirect_count
      FROM approval_stage_instances asi
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND asi.fallback_applied IS NOT NULL
        AND ai.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY aws.assigned_role, asi.fallback_applied
    `;
    
    // Build edges
    const edges = [];
    
    // Normal flow edges
    flowData.forEach((flow, idx) => {
      if (flow.from_role && flow.to_role) {
        edges.push({
          id: `edge-${flow.from_role}-${flow.to_role}-${idx}`,
          source: `role-${flow.from_role}`,
          target: `role-${flow.to_role}`,
          type: 'approvalEdge',
          data: {
            edgeType: 'normal',
            workflowName: flow.workflow_name,
            workflowCode: flow.workflow_code,
            transitionCount: parseInt(flow.transition_count) || 0,
            avgWaitHours: parseFloat(flow.avg_wait_hours) || 0,
            slaBreaches: parseInt(flow.sla_breaches) || 0,
            isBottleneck: parseFloat(flow.avg_wait_hours) > 24
          },
          animated: false,
          style: {
            stroke: parseFloat(flow.avg_wait_hours) > 24 ? '#ef4444' : '#3b82f6',
            strokeWidth: Math.min(5, 1 + parseInt(flow.transition_count) / 10)
          }
        });
      }
    });
    
    // Fallback edges
    fallbackEdges.forEach((fallback, idx) => {
      if (fallback.from_role && fallback.to_role) {
        edges.push({
          id: `edge-fallback-${fallback.from_role}-${fallback.to_role}-${idx}`,
          source: `role-${fallback.from_role}`,
          target: `role-${fallback.to_role}`,
          type: 'approvalEdge',
          data: {
            edgeType: 'fallback',
            fallbackType: fallback.fallback_type,
            redirectCount: parseInt(fallback.redirect_count) || 0
          },
          animated: true,
          style: {
            stroke: '#eab308',
            strokeWidth: 2,
            strokeDasharray: '5,5'
          }
        });
      }
    });
    
    res.json({
      success: true,
      data: {
        edges,
        totalEdges: edges.length,
        normalEdges: edges.filter(e => e.data.edgeType === 'normal').length,
        fallbackEdges: edges.filter(e => e.data.edgeType === 'fallback').length,
        bottleneckEdges: edges.filter(e => e.data.isBottleneck).length
      },
      meta: { tenantId }
    });
  } catch (error) {
    console.error('[DecisionLoad] Edges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch edge data',
      message: error.message
    });
  }
});

// ============================================================================
// GET ADMIN PRESSURE ANALYSIS
// ============================================================================

/**
 * GET /api/decision-load/admin-pressure
 * Get detailed analysis of admin overload
 */
router.get('/admin-pressure', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    // Get total approvals and admin's share
    const adminPressure = await prisma.$queryRaw`
      WITH total_approvals AS (
        SELECT COUNT(*) as total
        FROM approval_stage_instances asi
        JOIN approval_instances ai ON asi.approval_instance_id = ai.id
        WHERE ai.tenant_id = ${tenantId}::uuid
          AND ai.created_at >= NOW() - INTERVAL '30 days'
          AND asi.status IN ('approved', 'auto_approved')
      ),
      admin_approvals AS (
        SELECT 
          COUNT(*) as admin_total,
          COUNT(*) FILTER (WHERE asi.fallback_applied IS NOT NULL) as fallback_approvals,
          COUNT(*) FILTER (WHERE asi.status = 'auto_approved') as auto_approvals,
          ARRAY_AGG(DISTINCT aws.assigned_role) FILTER (
            WHERE asi.fallback_applied IS NOT NULL
          ) as redirected_from_roles
        FROM approval_stage_instances asi
        JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
        JOIN approval_instances ai ON asi.approval_instance_id = ai.id
        WHERE ai.tenant_id = ${tenantId}::uuid
          AND ai.created_at >= NOW() - INTERVAL '30 days'
          AND (
            aws.assigned_role = 'ADMIN' 
            OR asi.fallback_applied IN ('auto_assign_admin', 'escalate_to_owner')
          )
      ),
      missing_roles AS (
        SELECT 
          aws.assigned_role as role_code,
          COUNT(*) as skip_count
        FROM approval_stage_instances asi
        JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
        JOIN approval_instances ai ON asi.approval_instance_id = ai.id
        WHERE ai.tenant_id = ${tenantId}::uuid
          AND ai.created_at >= NOW() - INTERVAL '30 days'
          AND asi.fallback_applied = 'skip_stage'
        GROUP BY aws.assigned_role
      )
      SELECT 
        t.total as total_approvals,
        a.admin_total as admin_approvals,
        a.fallback_approvals,
        a.auto_approvals,
        a.redirected_from_roles,
        CASE WHEN t.total > 0 
          THEN ROUND(100.0 * a.admin_total / t.total, 1) 
          ELSE 0 
        END as admin_percentage,
        (SELECT json_agg(json_build_object('role', role_code, 'count', skip_count)) 
         FROM missing_roles) as missing_role_impact
      FROM total_approvals t, admin_approvals a
    `;
    
    const data = adminPressure[0] || {};
    
    // Generate insight message
    let insightMessage = '';
    const adminPct = parseFloat(data.admin_percentage) || 0;
    
    if (adminPct > 50) {
      insightMessage = `⚠️ CRITICAL: ${adminPct}% of approvals are reaching Admin due to missing roles. Consider adding: ${(data.redirected_from_roles || []).join(', ')}`;
    } else if (adminPct > 30) {
      insightMessage = `⚡ WARNING: ${adminPct}% of approvals are handled by Admin. This may indicate understaffing.`;
    } else {
      insightMessage = `✅ Admin load is healthy at ${adminPct}%. Approval distribution is balanced.`;
    }
    
    res.json({
      success: true,
      data: {
        totalApprovals: parseInt(data.total_approvals) || 0,
        adminApprovals: parseInt(data.admin_approvals) || 0,
        fallbackApprovals: parseInt(data.fallback_approvals) || 0,
        autoApprovals: parseInt(data.auto_approvals) || 0,
        adminPercentage: adminPct,
        redirectedFromRoles: data.redirected_from_roles || [],
        missingRoleImpact: data.missing_role_impact || [],
        pressureLevel: adminPct > 50 ? 'CRITICAL' : adminPct > 30 ? 'WARNING' : 'NORMAL',
        insightMessage
      },
      meta: { tenantId }
    });
  } catch (error) {
    console.error('[DecisionLoad] Admin pressure error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin pressure data',
      message: error.message
    });
  }
});

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

/**
 * POST /api/decision-load/simulate
 * Simulate adding roles/users and calculate impact
 */
router.post('/simulate', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { addRoles = [], addUsersToRoles = [] } = req.body;
    
    // Validate input
    if (addRoles.length === 0 && addUsersToRoles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No simulation parameters provided',
        hint: 'Provide addRoles or addUsersToRoles arrays'
      });
    }
    
    // Get current state
    const currentState = await prisma.$queryRaw`
      SELECT 
        aws.assigned_role as role_code,
        COUNT(*) FILTER (WHERE asi.status = 'active') as pending_count,
        COUNT(*) FILTER (WHERE asi.fallback_applied IS NOT NULL) as fallback_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(asi.actioned_at, NOW()) - asi.activated_at))/3600) as avg_delay_hours
      FROM approval_stage_instances asi
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND ai.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY aws.assigned_role
    `;
    
    const currentStateMap = {};
    currentState.forEach(s => {
      currentStateMap[s.role_code] = s;
    });
    
    // Get current user counts
    const currentUsers = await prisma.$queryRaw`
      SELECT 
        r.code as role_code,
        COUNT(DISTINCT ur.user_id) as users_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.enterprise_id = ${tenantId}::uuid
      LEFT JOIN users u ON ur.user_id = u.id AND u.is_active = true
      GROUP BY r.code
    `;
    
    const userCountMap = {};
    currentUsers.forEach(u => {
      userCountMap[u.role_code] = parseInt(u.users_count) || 0;
    });
    
    // Calculate simulated impact
    const simulationResults = [];
    
    // Process role additions
    for (const roleCode of addRoles) {
      const currentData = currentStateMap[roleCode] || {};
      const currentUserCount = userCountMap[roleCode] || 0;
      
      // If role has no users, adding it would eliminate fallbacks to Admin
      const fallbackReduction = currentUserCount === 0 
        ? parseInt(currentData.fallback_count) || 0 
        : 0;
      
      // Estimate delay reduction (assume even distribution)
      const pendingCount = parseInt(currentData.pending_count) || 0;
      const newUserCount = currentUserCount + 1;
      const oldDelayHours = parseFloat(currentData.avg_delay_hours) || 0;
      const estimatedNewDelay = oldDelayHours * (currentUserCount / Math.max(newUserCount, 1));
      
      simulationResults.push({
        action: 'ADD_ROLE',
        roleCode,
        impact: {
          currentUsers: currentUserCount,
          newUsers: newUserCount,
          fallbackReduction,
          delayReductionHours: Math.round((oldDelayHours - estimatedNewDelay) * 10) / 10,
          delayReductionPct: oldDelayHours > 0 
            ? Math.round(100 * (oldDelayHours - estimatedNewDelay) / oldDelayHours) 
            : 0,
          adminLoadReduction: fallbackReduction > 0 ? fallbackReduction : 0,
          pendingToHandle: pendingCount
        }
      });
    }
    
    // Process user additions to existing roles
    for (const { roleCode, count = 1 } of addUsersToRoles) {
      const currentData = currentStateMap[roleCode] || {};
      const currentUserCount = userCountMap[roleCode] || 0;
      const newUserCount = currentUserCount + count;
      
      const pendingCount = parseInt(currentData.pending_count) || 0;
      const oldDelayHours = parseFloat(currentData.avg_delay_hours) || 0;
      const estimatedNewDelay = oldDelayHours * (currentUserCount / Math.max(newUserCount, 1));
      
      // Calculate stress reduction
      const oldStress = calculateStressScore({
        pending_count: pendingCount,
        users_count: currentUserCount,
        avg_delay_hours: oldDelayHours,
        fallback_count: parseInt(currentData.fallback_count) || 0
      });
      
      const newStress = calculateStressScore({
        pending_count: pendingCount,
        users_count: newUserCount,
        avg_delay_hours: estimatedNewDelay,
        fallback_count: parseInt(currentData.fallback_count) || 0
      });
      
      simulationResults.push({
        action: 'ADD_USERS',
        roleCode,
        usersToAdd: count,
        impact: {
          currentUsers: currentUserCount,
          newUsers: newUserCount,
          oldStressScore: oldStress,
          newStressScore: newStress,
          stressReduction: oldStress - newStress,
          delayReductionHours: Math.round((oldDelayHours - estimatedNewDelay) * 10) / 10,
          delayReductionPct: oldDelayHours > 0 
            ? Math.round(100 * (oldDelayHours - estimatedNewDelay) / oldDelayHours) 
            : 0,
          pendingPerUser: Math.round(pendingCount / newUserCount)
        }
      });
    }
    
    // Calculate overall impact
    const totalFallbackReduction = simulationResults.reduce(
      (sum, r) => sum + (r.impact.fallbackReduction || 0), 0
    );
    const totalAdminReduction = simulationResults.reduce(
      (sum, r) => sum + (r.impact.adminLoadReduction || 0), 0
    );
    const avgDelayReduction = simulationResults.reduce(
      (sum, r) => sum + (r.impact.delayReductionHours || 0), 0
    ) / simulationResults.length;
    
    res.json({
      success: true,
      simulation: {
        parameters: { addRoles, addUsersToRoles },
        results: simulationResults,
        overallImpact: {
          totalFallbackReduction,
          totalAdminReduction,
          avgDelayReductionHours: Math.round(avgDelayReduction * 10) / 10,
          rolesAffected: simulationResults.length
        },
        recommendation: totalAdminReduction > 5 
          ? '🎯 HIGH IMPACT: Adding these roles will significantly reduce Admin burden.'
          : avgDelayReduction > 2
            ? '⚡ MODERATE IMPACT: This will improve response times.'
            : '📊 LOW IMPACT: Consider other optimizations.'
      },
      meta: { tenantId, simulatedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('[DecisionLoad] Simulation error:', error);
    res.status(500).json({
      success: false,
      error: 'Simulation failed',
      message: error.message
    });
  }
});

// ============================================================================
// TASK TRACE (LIVE PATH VISUALIZATION)
// ============================================================================

/**
 * GET /api/decision-load/task-trace/:taskId
 * Get the approval journey of a specific task
 */
router.get('/task-trace/:taskId', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { taskId } = req.params;
    
    // Get approval instance for this task
    const approvalJourney = await prisma.$queryRaw`
      SELECT 
        ai.id as instance_id,
        ai.entity_type,
        ai.entity_reference,
        ai.status as instance_status,
        ai.current_stage_order,
        ai.initiated_by,
        u_init.full_name as initiator_name,
        ai.initiated_at,
        
        asi.id as stage_instance_id,
        asi.stage_order,
        asi.status as stage_status,
        asi.resolved_approver_id,
        u_approver.full_name as approver_name,
        asi.activated_at,
        asi.actioned_at,
        asi.due_at,
        asi.action_comment,
        asi.fallback_applied,
        
        aws.name as stage_name,
        aws.assigned_role,
        aws.sla_hours,
        
        EXTRACT(EPOCH FROM (COALESCE(asi.actioned_at, NOW()) - asi.activated_at))/3600 as wait_hours,
        CASE WHEN asi.actioned_at > asi.due_at THEN true ELSE false END as sla_breached
        
      FROM approval_instances ai
      JOIN approval_stage_instances asi ON ai.id = asi.approval_instance_id
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      LEFT JOIN users u_init ON ai.initiated_by = u_init.id
      LEFT JOIN users u_approver ON asi.resolved_approver_id = u_approver.id
      WHERE ai.tenant_id = ${tenantId}::uuid
        AND (ai.entity_id::text = ${taskId} OR ai.entity_reference = ${taskId})
      ORDER BY asi.stage_order ASC
    `;
    
    if (approvalJourney.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or no approval journey exists'
      });
    }
    
    // Build trace data
    const firstStage = approvalJourney[0];
    const trace = {
      taskId,
      entityType: firstStage.entity_type,
      entityReference: firstStage.entity_reference,
      instanceStatus: firstStage.instance_status,
      initiator: {
        id: firstStage.initiated_by,
        name: firstStage.initiator_name
      },
      initiatedAt: firstStage.initiated_at,
      currentStageOrder: firstStage.current_stage_order,
      
      stages: approvalJourney.map(stage => ({
        order: stage.stage_order,
        name: stage.stage_name,
        role: stage.assigned_role,
        status: stage.stage_status,
        approver: {
          id: stage.resolved_approver_id,
          name: stage.approver_name
        },
        activatedAt: stage.activated_at,
        actionedAt: stage.actioned_at,
        dueAt: stage.due_at,
        waitHours: Math.round(parseFloat(stage.wait_hours) * 10) / 10,
        slaBreached: stage.sla_breached,
        fallbackApplied: stage.fallback_applied,
        comment: stage.action_comment,
        isCurrent: stage.stage_status === 'active',
        isCompleted: ['approved', 'auto_approved', 'skipped'].includes(stage.stage_status),
        isRejected: stage.stage_status === 'rejected'
      })),
      
      summary: {
        totalStages: approvalJourney.length,
        completedStages: approvalJourney.filter(s => 
          ['approved', 'auto_approved', 'skipped'].includes(s.stage_status)
        ).length,
        slaBreaches: approvalJourney.filter(s => s.sla_breached).length,
        fallbacksUsed: approvalJourney.filter(s => s.fallback_applied).length,
        totalWaitHours: approvalJourney.reduce(
          (sum, s) => sum + (parseFloat(s.wait_hours) || 0), 0
        )
      }
    };
    
    res.json({
      success: true,
      data: trace,
      meta: { tenantId }
    });
  } catch (error) {
    console.error('[DecisionLoad] Task trace error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task trace',
      message: error.message
    });
  }
});

// ============================================================================
// FILTER DATA BY CATEGORY
// ============================================================================

/**
 * GET /api/decision-load/filter/:category
 * Get filtered view data by category
 */
router.get('/filter/:category', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const { category } = req.params;
    
    const validCategories = [
      'finance', 'compliance', 'procurement', 'operations',
      'sla-breaches', 'auto-approvals', 'escalations', 'all'
    ];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        validCategories
      });
    }
    
    // Build entity type filter
    let entityTypeFilter = '';
    switch (category) {
      case 'finance':
        entityTypeFilter = `ai.entity_type IN ('payment_request', 'expense_claim', 'invoice_approval')`;
        break;
      case 'compliance':
        entityTypeFilter = `ai.entity_type IN ('contract_approval', 'vendor_onboarding')`;
        break;
      case 'procurement':
        entityTypeFilter = `ai.entity_type IN ('purchase_order', 'asset_disposal')`;
        break;
      case 'operations':
        entityTypeFilter = `ai.entity_type IN ('leave_request', 'custom')`;
        break;
      case 'sla-breaches':
        entityTypeFilter = `asi.actioned_at > asi.due_at`;
        break;
      case 'auto-approvals':
        entityTypeFilter = `asi.status = 'auto_approved'`;
        break;
      case 'escalations':
        entityTypeFilter = `asi.fallback_applied IS NOT NULL`;
        break;
      default:
        entityTypeFilter = '1=1';
    }
    
    // Get filtered role data
    const filteredData = await prisma.$queryRawUnsafe(`
      SELECT 
        aws.assigned_role as role_code,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE asi.status = 'active') as pending_count,
        COUNT(*) FILTER (WHERE asi.status = 'approved') as approved_count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(asi.actioned_at, NOW()) - asi.activated_at))/3600) as avg_delay_hours
      FROM approval_stage_instances asi
      JOIN approval_workflow_stages aws ON asi.workflow_stage_id = aws.id
      JOIN approval_instances ai ON asi.approval_instance_id = ai.id
      WHERE ai.tenant_id = '${tenantId}'::uuid
        AND ai.created_at >= NOW() - INTERVAL '30 days'
        AND ${entityTypeFilter}
      GROUP BY aws.assigned_role
    `);
    
    // Get relevant edges
    const filteredEdges = await prisma.$queryRawUnsafe(`
      SELECT 
        s1.assigned_role as from_role,
        s2.assigned_role as to_role,
        COUNT(*) as transition_count
      FROM approval_stage_instances asi1
      JOIN approval_stage_instances asi2 ON asi1.approval_instance_id = asi2.approval_instance_id
        AND asi2.stage_order = asi1.stage_order + 1
      JOIN approval_workflow_stages s1 ON asi1.workflow_stage_id = s1.id
      JOIN approval_workflow_stages s2 ON asi2.workflow_stage_id = s2.id
      JOIN approval_instances ai ON asi1.approval_instance_id = ai.id
      WHERE ai.tenant_id = '${tenantId}'::uuid
        AND ai.created_at >= NOW() - INTERVAL '30 days'
        AND ${entityTypeFilter}
      GROUP BY s1.assigned_role, s2.assigned_role
    `);
    
    res.json({
      success: true,
      data: {
        category,
        roles: filteredData,
        edges: filteredEdges,
        highlightRoles: filteredData.map(r => r.role_code),
        fadeOthers: true
      },
      meta: { tenantId, category }
    });
  } catch (error) {
    console.error('[DecisionLoad] Filter error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filtered data',
      message: error.message
    });
  }
});

// ============================================================================
// COMPLETE GRAPH DATA (COMBINED)
// ============================================================================

/**
 * GET /api/decision-load/graph
 * Get complete graph data (nodes + edges + admin pressure)
 */
router.get('/graph', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    // Fetch all data in parallel
    const [rolesResponse, edgesResponse, adminResponse] = await Promise.all([
      // Roles query
      prisma.$queryRaw`
        SELECT 
          r.id as role_id,
          r.name as role_name,
          r.code as role_code,
          r.business_level,
          COUNT(DISTINCT ur.user_id) as users_count
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.enterprise_id = ${tenantId}::uuid
        LEFT JOIN users u ON ur.user_id = u.id AND u.is_active = true
        GROUP BY r.id, r.name, r.code, r.business_level
        ORDER BY r.business_level DESC
      `,
      // Edges query (simplified)
      prisma.$queryRaw`
        SELECT 
          s1.assigned_role as from_role,
          s2.assigned_role as to_role,
          COUNT(*) as count
        FROM approval_stage_instances asi1
        JOIN approval_stage_instances asi2 ON asi1.approval_instance_id = asi2.approval_instance_id
          AND asi2.stage_order = asi1.stage_order + 1
        JOIN approval_workflow_stages s1 ON asi1.workflow_stage_id = s1.id
        JOIN approval_workflow_stages s2 ON asi2.workflow_stage_id = s2.id
        JOIN approval_instances ai ON asi1.approval_instance_id = ai.id
        WHERE ai.tenant_id = ${tenantId}::uuid
          AND ai.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY s1.assigned_role, s2.assigned_role
      `,
      // Admin pressure
      prisma.$queryRaw`
        SELECT 
          COUNT(*) FILTER (WHERE asi.fallback_applied IS NOT NULL) as fallback_total,
          COUNT(*) as total
        FROM approval_stage_instances asi
        JOIN approval_instances ai ON asi.approval_instance_id = ai.id
        WHERE ai.tenant_id = ${tenantId}::uuid
          AND ai.created_at >= NOW() - INTERVAL '30 days'
      `
    ]);
    
    // Build nodes with positions (hierarchical layout)
    const levelCounts = {};
    const nodes = rolesResponse.map(role => {
      const level = role.business_level || 1;
      levelCounts[level] = (levelCounts[level] || 0) + 1;
      
      const usersCount = parseInt(role.users_count) || 0;
      const stressScore = usersCount === 0 ? 50 : 20; // Simplified for this endpoint
      
      return {
        id: `role-${role.role_code}`,
        type: 'roleNode',
        data: {
          roleName: role.role_name,
          roleCode: role.role_code,
          businessLevel: level,
          usersCount,
          isActive: usersCount > 0,
          stressScore,
          stressColor: usersCount === 0 ? 'faded' : 'blue'
        },
        position: {
          x: (levelCounts[level] - 1) * 200,
          y: (10 - level) * 120
        }
      };
    });
    
    // Build edges
    const edges = edgesResponse.map((edge, idx) => ({
      id: `edge-${edge.from_role}-${edge.to_role}-${idx}`,
      source: `role-${edge.from_role}`,
      target: `role-${edge.to_role}`,
      type: 'smoothstep',
      data: { count: parseInt(edge.count) || 0 },
      animated: false
    }));
    
    const adminData = adminResponse[0] || {};
    
    res.json({
      success: true,
      data: {
        nodes,
        edges,
        summary: {
          totalRoles: nodes.length,
          activeRoles: nodes.filter(n => n.data.isActive).length,
          inactiveRoles: nodes.filter(n => !n.data.isActive).length,
          fallbackTotal: parseInt(adminData.fallback_total) || 0,
          approvalTotal: parseInt(adminData.total) || 0
        }
      },
      meta: { tenantId, generatedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('[DecisionLoad] Graph error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch graph data',
      message: error.message
    });
  }
});

module.exports = router;
