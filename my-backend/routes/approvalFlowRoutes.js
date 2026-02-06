/**
 * Module Approval Flow Routes
 * Super Admin configuration for approval hierarchies
 * 
 * Routes:
 * GET  /api/approval-flows              - Get all modules with approval flows
 * GET  /api/approval-flows/:moduleId    - Get approval flow for a module
 * PUT  /api/approval-flows/:moduleId    - Update approval flow for a module
 * POST /api/approval-flows/preview      - Preview approval chain for a request
 * GET  /api/approval-flows/levels       - Get business level definitions
 */

const express = require('express');
const router = express.Router();
const { getPrismaClient } = require('../lib/prismaClients');
const approvalEngine = require('../lib/approvalEngine');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require SUPER_ADMIN for configuration routes
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.userType !== 'SUPER_ADMIN' && req.user.user_type !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }
  next();
}

/**
 * Allow ADMIN or SUPER_ADMIN for read-only routes
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userType = req.user.userType || req.user.user_type;
  if (userType !== 'SUPER_ADMIN' && userType !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/approval-flows
 * Get all modules with their approval flows
 * Access: Super Admin (full), Admin (read-only view)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const modules = await approvalEngine.getAllModulesWithApprovalFlows();
    
    res.json({
      success: true,
      count: modules.length,
      data: modules,
      tooltip: 'Approvals are assigned based on business level and module subscription, not role names.'
    });
  } catch (error) {
    console.error('[ApprovalFlows] Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch approval flows' });
  }
});

/**
 * GET /api/approval-flows/levels
 * Get business level definitions
 * Access: Any authenticated user
 */
router.get('/levels', async (req, res) => {
  try {
    const levels = Object.entries(approvalEngine.BUSINESS_LEVELS).map(([key, value]) => ({
      key,
      ...value
    }));
    
    res.json({
      success: true,
      data: levels,
      approvalLevels: Object.entries(approvalEngine.APPROVAL_LEVELS).map(([key, value]) => ({
        key,
        ...value
      }))
    });
  } catch (error) {
    console.error('[ApprovalFlows] Error fetching levels:', error);
    res.status(500).json({ error: 'Failed to fetch level definitions' });
  }
});

/**
 * GET /api/approval-flows/:moduleId
 * Get approval flow for a specific module
 * Access: Admin or Super Admin
 */
router.get('/:moduleId', requireAdmin, async (req, res) => {
  try {
    const moduleId = parseInt(req.params.moduleId, 10);
    if (isNaN(moduleId)) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    const prisma = getPrismaClient();
    
    // Get module info
    const module = await prisma.modules.findUnique({
      where: { id: moduleId },
      include: {
        approvalFlows: {
          where: { is_active: true },
          orderBy: { step_order: 'asc' }
        }
      }
    });
    
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    res.json({
      success: true,
      data: {
        id: module.id,
        moduleName: module.module_name,
        displayName: module.display_name,
        description: module.description,
        approvalFlow: module.approvalFlows.map(f => ({
          id: f.id,
          approvalLevel: f.approval_level,
          levelName: f.level_name,
          minBusinessLevel: f.min_business_level,
          businessLevelName: approvalEngine.BUSINESS_LEVELS[`L${f.min_business_level}`]?.name || `Level ${f.min_business_level}`,
          stepOrder: f.step_order,
          description: f.description,
          isActive: f.is_active
        }))
      },
      tooltip: 'Approvals are assigned based on business level and module subscription, not role names.'
    });
  } catch (error) {
    console.error('[ApprovalFlows] Error fetching module flow:', error);
    res.status(500).json({ error: 'Failed to fetch approval flow' });
  }
});

/**
 * PUT /api/approval-flows/:moduleId
 * Update approval flow for a module
 * Access: Super Admin only
 * 
 * Body:
 * {
 *   "steps": [
 *     { "approval_level": "A1", "level_name": "Review", "min_business_level": 2, "step_order": 1, "description": "..." },
 *     { "approval_level": "A2", "level_name": "Manager Approval", "min_business_level": 6, "step_order": 2 }
 *   ]
 * }
 */
router.put('/:moduleId', requireSuperAdmin, async (req, res) => {
  try {
    const moduleId = parseInt(req.params.moduleId, 10);
    if (isNaN(moduleId)) {
      return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    const { steps } = req.body;
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'steps array is required' });
    }
    
    // Validate module exists
    const prisma = getPrismaClient();
    const module = await prisma.modules.findUnique({ where: { id: moduleId } });
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }
    
    // Update the approval flow
    const result = await approvalEngine.updateModuleApprovalFlow(moduleId, steps);
    
    res.json({
      success: true,
      message: `Updated approval flow for ${module.display_name}`,
      data: result
    });
  } catch (error) {
    console.error('[ApprovalFlows] Error updating flow:', error);
    res.status(400).json({ error: error.message || 'Failed to update approval flow' });
  }
});

/**
 * POST /api/approval-flows/preview
 * Preview approval chain for a hypothetical request
 * Useful for testing and showing admins how approvals will work
 * Access: Admin or Super Admin
 * 
 * Body:
 * {
 *   "clientId": "uuid",
 *   "moduleId": 2,
 *   "requesterId": 5
 * }
 */
router.post('/preview', requireAdmin, async (req, res) => {
  try {
    const { clientId, moduleId, requesterId } = req.body;
    
    if (!clientId || !moduleId) {
      return res.status(400).json({ error: 'clientId and moduleId are required' });
    }
    
    const chain = await approvalEngine.buildApprovalChain(
      clientId,
      parseInt(moduleId, 10),
      requesterId ? parseInt(requesterId, 10) : null
    );
    
    if (chain.error) {
      return res.status(400).json({
        success: false,
        error: chain.error,
        message: chain.message
      });
    }
    
    res.json({
      success: true,
      data: chain,
      fallbackNote: 'If no user matches the required business level, the Client Admin automatically becomes the approver. This ensures no task ever gets stuck.',
      tooltip: 'Approvals are assigned based on business level and module subscription, not role names.'
    });
  } catch (error) {
    console.error('[ApprovalFlows] Error previewing chain:', error);
    res.status(500).json({ error: 'Failed to preview approval chain' });
  }
});

/**
 * GET /api/approval-flows/client/:clientId/eligible
 * Get all eligible approvers for a client, grouped by business level
 * Useful for admins to see who can approve what
 * Access: Admin or Super Admin
 */
router.get('/client/:clientId/eligible', requireAdmin, async (req, res) => {
  try {
    const { clientId } = req.params;
    const prisma = getPrismaClient();
    
    // Get all users for this client with their business levels
    const users = await prisma.users_enhanced.findMany({
      where: {
        client_id: clientId,
        is_active: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        business_level: true,
        user_type: true
      },
      orderBy: [
        { business_level: 'desc' },
        { username: 'asc' }
      ]
    });
    
    // Group by business level
    const grouped = {};
    for (const user of users) {
      const level = user.business_level || 1;
      const levelKey = `L${level}`;
      if (!grouped[levelKey]) {
        grouped[levelKey] = {
          level,
          levelName: approvalEngine.BUSINESS_LEVELS[levelKey]?.name || `Level ${level}`,
          users: []
        };
      }
      grouped[levelKey].users.push(user);
    }
    
    // Convert to array sorted by level desc
    const result = Object.values(grouped).sort((a, b) => b.level - a.level);
    
    res.json({
      success: true,
      clientId,
      totalUsers: users.length,
      data: result,
      explanation: 'Users are grouped by business level. Higher levels can approve requests requiring lower or equal levels.'
    });
  } catch (error) {
    console.error('[ApprovalFlows] Error fetching eligible approvers:', error);
    res.status(500).json({ error: 'Failed to fetch eligible approvers' });
  }
});

/**
 * POST /api/approval-flows/find-approver
 * Find the best approver for a specific step
 * Access: Any authenticated user
 * 
 * Body:
 * {
 *   "clientId": "uuid",
 *   "moduleId": 2,
 *   "approvalLevel": "A2",
 *   "excludeUserId": 5
 * }
 */
router.post('/find-approver', async (req, res) => {
  try {
    const { clientId, moduleId, approvalLevel, excludeUserId } = req.body;
    
    if (!clientId || !moduleId || !approvalLevel) {
      return res.status(400).json({ error: 'clientId, moduleId, and approvalLevel are required' });
    }
    
    const result = await approvalEngine.getApproverForStep(
      clientId,
      parseInt(moduleId, 10),
      approvalLevel,
      { excludeUserId: excludeUserId ? parseInt(excludeUserId, 10) : null }
    );
    
    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }
    
    res.json({
      success: true,
      data: {
        approver: result.approver,
        isFallback: result.isFallback,
        fallbackReason: result.fallbackReason,
        approvalStep: result.approvalStep
      },
      note: result.isFallback 
        ? 'Admin assigned as fallback because no user with required business level exists'
        : 'Approver assigned based on lowest eligible business level'
    });
  } catch (error) {
    console.error('[ApprovalFlows] Error finding approver:', error);
    res.status(500).json({ error: 'Failed to find approver' });
  }
});

module.exports = router;
