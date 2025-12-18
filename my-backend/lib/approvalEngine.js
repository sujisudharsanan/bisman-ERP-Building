/**
 * Module-Aware Approval Engine for BISMAN ERP
 * 
 * Core Principles:
 * 1. Approvals depend on APPROVAL LEVELS (A1, A2, A3), not ROLE NAMES
 * 2. Security access (SUPER_ADMIN, ADMIN, USER) remains unchanged
 * 3. Business levels (L1-L10) determine who can approve
 * 4. Module subscription determines which approvals apply
 * 5. Admin is the final fallback - no task ever gets stuck
 * 
 * ONE-LINE RULE:
 * "Modules decide which approvals apply. Business level decides who can approve. Admin is the final fallback."
 */

const { getPrismaClient } = require('./prismaClients');

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Approval Level Definitions (Abstract, Role-Independent)
 */
const APPROVAL_LEVELS = {
  A1: { name: 'Review', description: 'Initial review by supervisor' },
  A2: { name: 'Department Approval', description: 'Department/Manager approval' },
  A3: { name: 'Final Approval', description: 'Executive/Admin final approval' },
  A4: { name: 'Board Approval', description: 'Board-level approval (if needed)' }
};

/**
 * Business Level Hierarchy (L1 = Lowest, L10 = Highest)
 */
const BUSINESS_LEVELS = {
  L1: { level: 1, name: 'Staff', description: 'Entry-level staff' },
  L2: { level: 2, name: 'Supervisor', description: 'Team supervisor' },
  L3: { level: 3, name: 'Incharge', description: 'Branch/Store/Hub Incharge' },
  L4: { level: 4, name: 'Officer', description: 'Procurement/Accounts Officer' },
  L5: { level: 5, name: 'Senior Officer', description: 'Senior officers' },
  L6: { level: 6, name: 'Manager', description: 'Department managers' },
  L7: { level: 7, name: 'Senior Manager', description: 'Operations/Senior managers' },
  L8: { level: 8, name: 'Controller', description: 'Finance Controller / Head' },
  L9: { level: 9, name: 'Executive', description: 'CFO / Admin / Director' },
  L10: { level: 10, name: 'Super Admin', description: 'Platform Super Admin' }
};

// ============================================================================
// CORE ENGINE FUNCTIONS
// ============================================================================

/**
 * Get approval flow for a specific module
 * @param {number} moduleId - The module ID
 * @returns {Promise<Array>} Ordered list of approval steps
 */
async function getModuleApprovalFlow(moduleId) {
  const prisma = getPrismaClient();
  
  const flows = await prisma.moduleApprovalFlow.findMany({
    where: {
      module_id: moduleId,
      is_active: true
    },
    orderBy: { step_order: 'asc' },
    include: {
      module: {
        select: { module_name: true, display_name: true }
      }
    }
  });
  
  return flows;
}

/**
 * Check if a client has access to a specific module
 * @param {string} clientId - The client UUID
 * @param {number} moduleId - The module ID
 * @returns {Promise<boolean>} Whether client has module access
 */
async function clientHasModuleAccess(clientId, moduleId) {
  const prisma = getPrismaClient();
  
  const permission = await prisma.clientModulePermission.findFirst({
    where: {
      client_id: clientId,
      module_id: moduleId,
      can_view: true
    }
  });
  
  return !!permission;
}

/**
 * Find eligible approvers for a specific approval step
 * Core logic: Find users where business_level >= min_business_level
 * Select the LOWEST eligible level (closest senior) first
 * 
 * @param {string} clientId - The client UUID  
 * @param {number} minBusinessLevel - Minimum business level required
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} List of eligible approvers, sorted by business_level ascending
 */
async function findEligibleApprovers(clientId, minBusinessLevel, options = {}) {
  const prisma = getPrismaClient();
  const { excludeUserId, limit = 10 } = options;
  
  const whereClause = {
    client_id: clientId,
    business_level: { gte: minBusinessLevel },
    is_active: true
  };
  
  // Exclude the requester from approvers
  if (excludeUserId) {
    whereClause.id = { not: excludeUserId };
  }
  
  const approvers = await prisma.users_enhanced.findMany({
    where: whereClause,
    orderBy: [
      { business_level: 'asc' }, // Lowest eligible first (closest senior)
      { username: 'asc' }
    ],
    take: limit,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      business_level: true,
      user_type: true
    }
  });
  
  return approvers;
}

/**
 * Find the best approver for a step (lowest eligible business level)
 * @param {string} clientId - The client UUID
 * @param {number} minBusinessLevel - Minimum business level required
 * @param {Object} options - Additional options
 * @returns {Promise<Object|null>} The best approver or null
 */
async function findBestApprover(clientId, minBusinessLevel, options = {}) {
  const approvers = await findEligibleApprovers(clientId, minBusinessLevel, { ...options, limit: 1 });
  return approvers[0] || null;
}

/**
 * Get the client admin as fallback approver
 * Used when no user matches the approval criteria
 * CRITICAL: This ensures NO TASK EVER GETS STUCK
 * 
 * @param {string} clientId - The client UUID
 * @returns {Promise<Object|null>} The client admin
 */
async function getClientAdminFallback(clientId) {
  const prisma = getPrismaClient();
  
  // Find ADMIN user for this client
  const admin = await prisma.users_enhanced.findFirst({
    where: {
      client_id: clientId,
      user_type: 'ADMIN',
      is_active: true
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      business_level: true,
      user_type: true
    }
  });
  
  return admin;
}

/**
 * Get approver for a specific approval step with fallback logic
 * This is the MAIN function to use for approval assignment
 * 
 * RULES:
 * 1. Find users with business_level >= min_business_level
 * 2. If multiple exist, pick lowest eligible (closest senior)
 * 3. If NONE exist, AUTO-FALLBACK to CLIENT ADMIN
 * 
 * @param {string} clientId - The client UUID
 * @param {number} moduleId - The module ID
 * @param {string} approvalLevel - The approval level (A1, A2, A3)
 * @param {Object} options - Additional options (excludeUserId)
 * @returns {Promise<Object>} { approver, isFallback, approvalStep }
 */
async function getApproverForStep(clientId, moduleId, approvalLevel, options = {}) {
  const prisma = getPrismaClient();
  
  // 1. Check if client has access to this module
  const hasAccess = await clientHasModuleAccess(clientId, moduleId);
  if (!hasAccess) {
    return {
      error: 'MODULE_NOT_SUBSCRIBED',
      message: 'Client does not have access to this module',
      approver: null,
      isFallback: false,
      approvalStep: null
    };
  }
  
  // 2. Get the approval step configuration
  const approvalStep = await prisma.moduleApprovalFlow.findFirst({
    where: {
      module_id: moduleId,
      approval_level: approvalLevel,
      is_active: true
    },
    include: {
      module: {
        select: { module_name: true, display_name: true }
      }
    }
  });
  
  if (!approvalStep) {
    return {
      error: 'APPROVAL_STEP_NOT_FOUND',
      message: `Approval step ${approvalLevel} not configured for this module`,
      approver: null,
      isFallback: false,
      approvalStep: null
    };
  }
  
  // 3. Find best approver (lowest eligible business level)
  const approver = await findBestApprover(
    clientId, 
    approvalStep.min_business_level,
    options
  );
  
  // 4. If no approver found, use ADMIN FALLBACK
  if (!approver) {
    const adminFallback = await getClientAdminFallback(clientId);
    return {
      approver: adminFallback,
      isFallback: true,
      fallbackReason: 'No user with required business level found',
      approvalStep: {
        ...approvalStep,
        requiredLevel: approvalStep.min_business_level,
        levelName: BUSINESS_LEVELS[`L${approvalStep.min_business_level}`]?.name || `Level ${approvalStep.min_business_level}`
      }
    };
  }
  
  return {
    approver,
    isFallback: false,
    approvalStep: {
      ...approvalStep,
      requiredLevel: approvalStep.min_business_level,
      levelName: BUSINESS_LEVELS[`L${approvalStep.min_business_level}`]?.name || `Level ${approvalStep.min_business_level}`
    }
  };
}

/**
 * Build complete approval chain for a request in a module
 * Returns all approval steps with assigned approvers
 * 
 * @param {string} clientId - The client UUID
 * @param {number} moduleId - The module ID
 * @param {number} requesterId - The user making the request (excluded from approvers)
 * @returns {Promise<Object>} Complete approval chain
 */
async function buildApprovalChain(clientId, moduleId, requesterId) {
  // 1. Check module access
  const hasAccess = await clientHasModuleAccess(clientId, moduleId);
  if (!hasAccess) {
    return {
      error: 'MODULE_NOT_SUBSCRIBED',
      message: 'Client does not have access to this module',
      chain: []
    };
  }
  
  // 2. Get all approval steps for the module
  const approvalFlow = await getModuleApprovalFlow(moduleId);
  
  if (!approvalFlow.length) {
    return {
      error: 'NO_APPROVAL_FLOW',
      message: 'No approval flow configured for this module',
      chain: []
    };
  }
  
  // 3. Build chain with approvers for each step
  const chain = [];
  const usedApproverIds = new Set([requesterId]); // Don't let same person approve multiple steps
  
  for (const step of approvalFlow) {
    const result = await getApproverForStep(
      clientId,
      moduleId,
      step.approval_level,
      { excludeUserId: requesterId }
    );
    
    // Find an approver not already used in chain
    let approver = result.approver;
    let isFallback = result.isFallback;
    
    if (approver && usedApproverIds.has(approver.id)) {
      // Try to find another approver
      const alternates = await findEligibleApprovers(
        clientId,
        step.min_business_level,
        { excludeUserId: requesterId, limit: 5 }
      );
      
      const alternate = alternates.find(a => !usedApproverIds.has(a.id));
      if (alternate) {
        approver = alternate;
      } else {
        // Use admin as fallback
        const admin = await getClientAdminFallback(clientId);
        approver = admin;
        isFallback = true;
      }
    }
    
    if (approver) {
      usedApproverIds.add(approver.id);
    }
    
    chain.push({
      stepOrder: step.step_order,
      approvalLevel: step.approval_level,
      levelName: step.level_name,
      minBusinessLevel: step.min_business_level,
      businessLevelName: BUSINESS_LEVELS[`L${step.min_business_level}`]?.name || `Level ${step.min_business_level}`,
      description: step.description,
      approver,
      isFallback,
      fallbackReason: isFallback ? 'Admin fallback due to missing eligible user' : null
    });
  }
  
  return {
    moduleId,
    moduleName: approvalFlow[0]?.module?.display_name || 'Unknown Module',
    totalSteps: chain.length,
    chain
  };
}

/**
 * Check if a user can approve at a specific level
 * @param {Object} user - The user object with business_level
 * @param {number} minBusinessLevel - Minimum level required
 * @returns {boolean}
 */
function canUserApproveAtLevel(user, minBusinessLevel) {
  if (!user || typeof user.business_level !== 'number') return false;
  return user.business_level >= minBusinessLevel;
}

/**
 * Check if user is admin (final fallback always allowed)
 * @param {Object} user - The user object
 * @returns {boolean}
 */
function isUserAdmin(user) {
  return user?.user_type === 'ADMIN' || user?.user_type === 'SUPER_ADMIN';
}

// ============================================================================
// APPROVAL FLOW CONFIGURATION (Super Admin API)
// ============================================================================

/**
 * Update approval flow for a module
 * @param {number} moduleId - The module ID
 * @param {Array} steps - Array of { approval_level, level_name, min_business_level, step_order, description }
 * @returns {Promise<Object>} Updated flow
 */
async function updateModuleApprovalFlow(moduleId, steps) {
  const prisma = getPrismaClient();
  
  // Validate steps
  for (const step of steps) {
    if (!step.approval_level || !step.level_name || !step.min_business_level) {
      throw new Error(`Invalid step: approval_level, level_name, and min_business_level are required`);
    }
    if (step.min_business_level < 1 || step.min_business_level > 10) {
      throw new Error(`min_business_level must be between 1 and 10`);
    }
  }
  
  // Use transaction to update all steps
  const result = await prisma.$transaction(async (tx) => {
    // Deactivate existing steps
    await tx.moduleApprovalFlow.updateMany({
      where: { module_id: moduleId },
      data: { is_active: false }
    });
    
    // Upsert new steps
    const upserted = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const flow = await tx.moduleApprovalFlow.upsert({
        where: {
          module_id_approval_level: {
            module_id: moduleId,
            approval_level: step.approval_level
          }
        },
        update: {
          level_name: step.level_name,
          min_business_level: step.min_business_level,
          step_order: step.step_order || (i + 1),
          description: step.description || null,
          is_active: true,
          updated_at: new Date()
        },
        create: {
          module_id: moduleId,
          approval_level: step.approval_level,
          level_name: step.level_name,
          min_business_level: step.min_business_level,
          step_order: step.step_order || (i + 1),
          description: step.description || null,
          is_active: true
        }
      });
      upserted.push(flow);
    }
    
    return upserted;
  });
  
  return {
    moduleId,
    steps: result,
    message: `Updated ${result.length} approval steps for module ${moduleId}`
  };
}

/**
 * Get all modules with their approval flows (for Super Admin UI)
 * @returns {Promise<Array>}
 */
async function getAllModulesWithApprovalFlows() {
  const prisma = getPrismaClient();
  
  const modules = await prisma.module.findMany({
    where: { is_active: true },
    orderBy: { sort_order: 'asc' },
    include: {
      approvalFlows: {
        where: { is_active: true },
        orderBy: { step_order: 'asc' }
      }
    }
  });
  
  return modules.map(m => ({
    id: m.id,
    moduleName: m.module_name,
    displayName: m.display_name,
    description: m.description,
    approvalFlow: m.approvalFlows.map(f => ({
      approvalLevel: f.approval_level,
      levelName: f.level_name,
      minBusinessLevel: f.min_business_level,
      businessLevelName: BUSINESS_LEVELS[`L${f.min_business_level}`]?.name || `Level ${f.min_business_level}`,
      stepOrder: f.step_order,
      description: f.description
    }))
  }));
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Middleware to require minimum approval level for an action
 * Usage: router.post('/approve', requireApprovalLevel('A2', moduleId), handler)
 */
function requireApprovalLevel(approvalLevel, getModuleId) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const moduleId = typeof getModuleId === 'function' ? getModuleId(req) : getModuleId;
      const prisma = getPrismaClient();
      
      // Get the approval step configuration
      const approvalStep = await prisma.moduleApprovalFlow.findFirst({
        where: {
          module_id: moduleId,
          approval_level: approvalLevel,
          is_active: true
        }
      });
      
      if (!approvalStep) {
        return res.status(400).json({ 
          error: 'APPROVAL_NOT_CONFIGURED',
          message: `Approval level ${approvalLevel} not configured for this module`
        });
      }
      
      // Check if user can approve (by business level or admin fallback)
      const canApprove = canUserApproveAtLevel(user, approvalStep.min_business_level) || isUserAdmin(user);
      
      if (!canApprove) {
        return res.status(403).json({
          error: 'INSUFFICIENT_APPROVAL_LEVEL',
          message: `Requires business level ${approvalStep.min_business_level} (${BUSINESS_LEVELS[`L${approvalStep.min_business_level}`]?.name || 'Unknown'}) or higher`,
          required: approvalStep.min_business_level,
          current: user.business_level || 1
        });
      }
      
      // Attach approval context to request
      req.approvalContext = {
        level: approvalLevel,
        stepName: approvalStep.level_name,
        minBusinessLevel: approvalStep.min_business_level,
        userLevel: user.business_level || 1,
        isAdminFallback: isUserAdmin(user) && !canUserApproveAtLevel(user, approvalStep.min_business_level)
      };
      
      next();
    } catch (error) {
      console.error('[ApprovalEngine] Middleware error:', error);
      res.status(500).json({ error: 'Approval check failed' });
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  APPROVAL_LEVELS,
  BUSINESS_LEVELS,
  
  // Core Functions
  getModuleApprovalFlow,
  clientHasModuleAccess,
  findEligibleApprovers,
  findBestApprover,
  getClientAdminFallback,
  getApproverForStep,
  buildApprovalChain,
  
  // Utility Functions
  canUserApproveAtLevel,
  isUserAdmin,
  
  // Configuration Functions
  updateModuleApprovalFlow,
  getAllModulesWithApprovalFlows,
  
  // Middleware
  requireApprovalLevel
};
