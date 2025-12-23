/**
 * ============================================================================
 * APPROVAL AUTHORITY DASHBOARD API
 * ============================================================================
 * 
 * CEO / Admin view for organizational decision engine metrics:
 * - Approval Load per Role
 * - SLA Breach Heatmap
 * - Auto-Approval % by Workflow
 * - Fallback Usage Frequency
 * - Rejection Loops by Creator
 * - Missing Role Impact
 * - Approval Bottlenecks
 * - Override Compliance Risk
 * 
 * @module routes/approvalDashboardRoutes
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require L8+ for dashboard access (Controller level or above)
 */
function requireDashboardAccess(req, res, next) {
  const userLevel = req.user?.businessLevel || req.user?.business_level || 1;
  
  if (userLevel < 8) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient Authority',
      message: 'Approval Authority Dashboard requires L8+ access.',
      code: 'DASHBOARD_ACCESS_DENIED',
      required: 8,
      current: userLevel
    });
  }
  next();
}

// Apply to all routes
router.use(requireDashboardAccess);

// ============================================================================
// APPROVAL LOAD PER ROLE
// ============================================================================

/**
 * GET /api/approval-dashboard/load-by-role
 * Get approval workload distribution across roles
 */
router.get('/load-by-role', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const days = parseInt(req.query.days) || 30;
    
    const data = await prisma.$queryRaw`
      SELECT 
        assigned_role,
        SUM(pending_count) as pending_count,
        SUM(approved_count) as approved_count,
        SUM(rejected_count) as rejected_count,
        SUM(total_count) as total_count,
        AVG(avg_resolution_hours) as avg_resolution_hours,
        SUM(sla_breached_count) as sla_breached_count
      FROM v_approval_load_by_role
      WHERE tenant_id = ${tenantId}::uuid
      GROUP BY assigned_role
      ORDER BY pending_count DESC
    `;
    
    res.json({
      success: true,
      data,
      meta: { days, tenantId }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Load by role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approval load data',
      message: error.message
    });
  }
});

// ============================================================================
// SLA BREACH HEATMAP
// ============================================================================

/**
 * GET /api/approval-dashboard/sla-breaches
 * Get SLA breach patterns for heatmap visualization
 */
router.get('/sla-breaches', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const days = parseInt(req.query.days) || 90;
    
    const data = await prisma.$queryRaw`
      SELECT 
        assigned_role,
        breach_date,
        hour_of_day,
        day_of_week,
        breach_count,
        avg_overdue_hours
      FROM v_sla_breach_heatmap
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY breach_date DESC, hour_of_day ASC
    `;
    
    // Aggregate for heatmap format
    const heatmapData = {};
    data.forEach(row => {
      const key = `${row.day_of_week}-${row.hour_of_day}`;
      if (!heatmapData[key]) {
        heatmapData[key] = { 
          dayOfWeek: row.day_of_week, 
          hourOfDay: row.hour_of_day, 
          count: 0,
          avgOverdue: 0 
        };
      }
      heatmapData[key].count += parseInt(row.breach_count);
      heatmapData[key].avgOverdue = parseFloat(row.avg_overdue_hours) || 0;
    });
    
    res.json({
      success: true,
      data: {
        raw: data,
        heatmap: Object.values(heatmapData)
      },
      meta: { days, tenantId }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] SLA breaches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SLA breach data',
      message: error.message
    });
  }
});

// ============================================================================
// AUTO-APPROVAL RATE
// ============================================================================

/**
 * GET /api/approval-dashboard/auto-approval-rate
 * Get auto-approval percentage by workflow and stage
 */
router.get('/auto-approval-rate', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    const data = await prisma.$queryRaw`
      SELECT 
        workflow_code,
        workflow_name,
        stage_code,
        stage_name,
        total_stage_instances,
        auto_approved_count,
        auto_approval_pct,
        fallback_used_count
      FROM v_auto_approval_rate
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY auto_approval_pct DESC
    `;
    
    // Calculate overall stats
    const totalInstances = data.reduce((sum, r) => sum + parseInt(r.total_stage_instances || 0), 0);
    const totalAutoApproved = data.reduce((sum, r) => sum + parseInt(r.auto_approved_count || 0), 0);
    const overallRate = totalInstances > 0 ? (totalAutoApproved / totalInstances * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data,
      summary: {
        totalInstances,
        totalAutoApproved,
        overallAutoApprovalRate: parseFloat(overallRate)
      },
      meta: { tenantId }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Auto-approval rate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch auto-approval data',
      message: error.message
    });
  }
});

// ============================================================================
// FALLBACK USAGE
// ============================================================================

/**
 * GET /api/approval-dashboard/fallback-usage
 * Get fallback strategy usage frequency
 */
router.get('/fallback-usage', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    const data = await prisma.$queryRaw`
      SELECT 
        fallback_strategy,
        original_role,
        usage_count,
        unique_workflows_affected
      FROM v_fallback_usage
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY usage_count DESC
    `;
    
    // Group by strategy
    const byStrategy = {};
    data.forEach(row => {
      const strategy = row.fallback_strategy;
      if (!byStrategy[strategy]) {
        byStrategy[strategy] = { 
          strategy, 
          totalUsage: 0, 
          affectedRoles: [],
          workflowsAffected: 0
        };
      }
      byStrategy[strategy].totalUsage += parseInt(row.usage_count);
      byStrategy[strategy].affectedRoles.push(row.original_role);
      byStrategy[strategy].workflowsAffected += parseInt(row.unique_workflows_affected);
    });
    
    res.json({
      success: true,
      data,
      byStrategy: Object.values(byStrategy),
      meta: { tenantId }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Fallback usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fallback usage data',
      message: error.message
    });
  }
});

// ============================================================================
// REJECTION LOOPS
// ============================================================================

/**
 * GET /api/approval-dashboard/rejection-loops
 * Get users with high rejection rates
 */
router.get('/rejection-loops', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    const data = await prisma.$queryRaw`
      SELECT 
        creator_id,
        creator_email,
        creator_name,
        entity_type,
        total_requests,
        total_rejections,
        avg_rejections_per_request,
        multi_rejection_count,
        permanently_rejected_count
      FROM v_rejection_loops
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY total_rejections DESC
      LIMIT 50
    `;
    
    res.json({
      success: true,
      data,
      meta: { tenantId }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Rejection loops error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rejection loops data',
      message: error.message
    });
  }
});

// ============================================================================
// MISSING ROLE IMPACT
// ============================================================================

/**
 * GET /api/approval-dashboard/missing-roles
 * Get impact of missing roles (skip_stage frequency)
 */
router.get('/missing-roles', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    const data = await prisma.$queryRaw`
      SELECT 
        missing_role,
        stage_name,
        skip_count,
        days_affected,
        affected_workflows
      FROM v_missing_role_impact
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY skip_count DESC
    `;
    
    res.json({
      success: true,
      data,
      meta: { tenantId },
      recommendation: data.length > 0 
        ? `Consider adding users to the following roles: ${[...new Set(data.map(d => d.missing_role))].join(', ')}`
        : 'No missing roles detected'
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Missing roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch missing roles data',
      message: error.message
    });
  }
});

// ============================================================================
// APPROVAL BOTTLENECKS
// ============================================================================

/**
 * GET /api/approval-dashboard/bottlenecks
 * Get users/roles causing approval delays
 */
router.get('/bottlenecks', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const minPending = parseInt(req.query.minPending) || 3;
    
    const data = await prisma.$queryRaw`
      SELECT 
        resolved_approver_id,
        approver_email,
        approver_name,
        role_name,
        pending_count,
        total_assigned,
        avg_wait_hours,
        max_pending_hours,
        sla_breaches
      FROM v_approval_bottlenecks
      WHERE tenant_id = ${tenantId}::uuid
        AND pending_count >= ${minPending}
      ORDER BY pending_count DESC
      LIMIT 20
    `;
    
    res.json({
      success: true,
      data,
      meta: { tenantId, minPending }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Bottlenecks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bottleneck data',
      message: error.message
    });
  }
});

// ============================================================================
// OVERRIDE COMPLIANCE RISK
// ============================================================================

/**
 * GET /api/approval-dashboard/override-compliance
 * Get override actions without proper documentation
 */
router.get('/override-compliance', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const userLevel = req.user?.businessLevel || req.user?.business_level || 1;
    
    // Only L9+ can see override compliance data
    if (userLevel < 9) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient Authority',
        message: 'Override compliance data requires L9+ access.',
        code: 'COMPLIANCE_ACCESS_DENIED'
      });
    }
    
    const data = await prisma.$queryRaw`
      SELECT 
        performed_by,
        actor_email,
        actor_name,
        actor_business_level,
        action,
        override_type,
        action_count,
        missing_comment_count,
        missing_comment_pct
      FROM v_override_compliance_risk
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY missing_comment_count DESC
    `;
    
    // Calculate risk score
    const totalMissing = data.reduce((sum, r) => sum + parseInt(r.missing_comment_count || 0), 0);
    const totalActions = data.reduce((sum, r) => sum + parseInt(r.action_count || 0), 0);
    const overallComplianceRate = totalActions > 0 
      ? ((totalActions - totalMissing) / totalActions * 100).toFixed(2) 
      : 100;
    
    res.json({
      success: true,
      data,
      summary: {
        totalOverrideActions: totalActions,
        missingComments: totalMissing,
        complianceRate: parseFloat(overallComplianceRate),
        riskLevel: totalMissing === 0 ? 'LOW' : totalMissing < 5 ? 'MEDIUM' : 'HIGH'
      },
      meta: { tenantId }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Override compliance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch override compliance data',
      message: error.message
    });
  }
});

// ============================================================================
// COMBINED DASHBOARD SUMMARY
// ============================================================================

/**
 * GET /api/approval-dashboard/summary
 * Get combined dashboard summary for CEO/Admin view
 */
router.get('/summary', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    
    // Fetch all key metrics in parallel
    const [
      loadData,
      bottleneckData,
      fallbackData,
      rejectionData
    ] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          SUM(pending_count) as total_pending,
          SUM(sla_breached_count) as total_sla_breaches,
          AVG(avg_resolution_hours) as avg_resolution_hours
        FROM v_approval_load_by_role
        WHERE tenant_id = ${tenantId}::uuid
      `,
      prisma.$queryRaw`
        SELECT COUNT(*) as bottleneck_users
        FROM v_approval_bottlenecks
        WHERE tenant_id = ${tenantId}::uuid
      `,
      prisma.$queryRaw`
        SELECT 
          SUM(usage_count) as total_fallbacks,
          COUNT(DISTINCT fallback_strategy) as strategies_used
        FROM v_fallback_usage
        WHERE tenant_id = ${tenantId}::uuid
      `,
      prisma.$queryRaw`
        SELECT 
          SUM(total_rejections) as total_rejections,
          COUNT(*) as users_with_rejections
        FROM v_rejection_loops
        WHERE tenant_id = ${tenantId}::uuid
      `
    ]);
    
    res.json({
      success: true,
      summary: {
        pendingApprovals: parseInt(loadData[0]?.total_pending || 0),
        slaBreaches: parseInt(loadData[0]?.total_sla_breaches || 0),
        avgResolutionHours: parseFloat(loadData[0]?.avg_resolution_hours || 0).toFixed(1),
        bottleneckUsers: parseInt(bottleneckData[0]?.bottleneck_users || 0),
        totalFallbacks: parseInt(fallbackData[0]?.total_fallbacks || 0),
        fallbackStrategiesUsed: parseInt(fallbackData[0]?.strategies_used || 0),
        totalRejections: parseInt(rejectionData[0]?.total_rejections || 0),
        usersWithRejections: parseInt(rejectionData[0]?.users_with_rejections || 0)
      },
      healthScore: calculateHealthScore({
        slaBreaches: parseInt(loadData[0]?.total_sla_breaches || 0),
        bottlenecks: parseInt(bottleneckData[0]?.bottleneck_users || 0),
        fallbacks: parseInt(fallbackData[0]?.total_fallbacks || 0)
      }),
      meta: { tenantId, generatedAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('[ApprovalDashboard] Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary',
      message: error.message
    });
  }
});

/**
 * Calculate overall approval health score (0-100)
 */
function calculateHealthScore({ slaBreaches, bottlenecks, fallbacks }) {
  let score = 100;
  
  // Deduct for SLA breaches (max 30 points)
  score -= Math.min(slaBreaches * 2, 30);
  
  // Deduct for bottlenecks (max 25 points)
  score -= Math.min(bottlenecks * 5, 25);
  
  // Deduct for excessive fallbacks (max 20 points)
  score -= Math.min(fallbacks * 0.5, 20);
  
  return {
    score: Math.max(0, Math.round(score)),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    status: score >= 80 ? 'HEALTHY' : score >= 60 ? 'NEEDS_ATTENTION' : 'CRITICAL'
  };
}

module.exports = router;
