/**
 * ============================================================================
 * BUSINESS HIERARCHY SYSTEM
 * ============================================================================
 * 
 * PURPOSE:
 * This module handles BUSINESS HIERARCHY (workflow approvals, escalation)
 * which is COMPLETELY SEPARATE from SECURITY ACCESS.
 * 
 * KEY PRINCIPLE:
 * - SECURITY decides what you can SEE (pages, modules, data)
 * - BUSINESS LEVEL decides what you can APPROVE (workflow actions)
 * 
 * BUSINESS LEVELS (L1 - L10):
 * L10: Super Admin
 * L9:  Admin, CFO, System Administrator
 * L8:  Finance Controller, IT Admin
 * L7:  Operations Manager, Treasury
 * L6:  Compliance, Legal, Manager
 * L5:  Accounts, Banker
 * L4:  Accounts Payable, Procurement Officer
 * L3:  Branch Incharge, Store Incharge
 * L2:  Supervisor
 * L1:  Staff
 * 
 * WORKFLOW RULES:
 * - canReview: business_level = target_level + 1 (immediate superior)
 * - canApprove: business_level >= required_approval_level
 * - canAssignTask: business_level >= target_user_level
 * - canEscalate: can only escalate to higher business_level
 * 
 * @module lib/businessHierarchy
 */

// Business level constants
const BUSINESS_LEVELS = {
  STAFF: 1,
  SUPERVISOR: 2,
  BRANCH_INCHARGE: 3,
  STORE_INCHARGE: 3,
  ACCOUNTS_PAYABLE: 4,
  PROCUREMENT_OFFICER: 4,
  ACCOUNTS: 5,
  BANKER: 5,
  COMPLIANCE: 6,
  LEGAL: 6,
  MANAGER: 6,
  OPERATIONS_MANAGER: 7,
  TREASURY: 7,
  FINANCE_CONTROLLER: 8,
  IT_ADMIN: 8,
  ADMIN: 9,
  CFO: 9,
  SYSTEM_ADMINISTRATOR: 9,
  SUPER_ADMIN: 10
};

// Role to business level mapping
const ROLE_TO_LEVEL = {
  'Staff': 1,
  'Supervisor': 2,
  'Branch Incharge': 3,
  'Store Incharge': 3,
  'Hub Incharge': 3,
  'Accounts Payable': 4,
  'Procurement Officer': 4,
  'Accounts': 5,
  'Banker': 5,
  'Compliance': 6,
  'Legal': 6,
  'Manager': 6,
  'Operations Manager': 7,
  'Treasury': 7,
  'Finance Controller': 8,
  'IT Admin': 8,
  // Deputy roles - level 8.5 (rounded to 8 for integer comparisons, but tracked separately)
  'CFO Deputy': 8,
  'CFO_DEPUTY': 8,
  'Admin Deputy': 8,
  'ADMIN_DEPUTY': 8,
  'Admin': 9,
  'CFO': 9,
  'System Administrator': 9,
  'Super Admin': 10
};

// Level labels for UI display
const LEVEL_LABELS = {
  1: 'L1 - Staff',
  2: 'L2 - Supervisor',
  3: 'L3 - Incharge',
  4: 'L4 - Officer',
  5: 'L5 - Accounts',
  6: 'L6 - Manager',
  7: 'L7 - Operations',
  8: 'L8 - Controller',
  9: 'L9 - Executive',
  10: 'L10 - Super Admin'
};

/**
 * Get business level from role name
 * @param {string} roleName - The role name
 * @returns {number} Business level (1-10)
 */
function getBusinessLevelFromRole(roleName) {
  if (!roleName) return 1;
  
  // Normalize role name
  const normalized = roleName.trim();
  
  // Direct match
  if (ROLE_TO_LEVEL[normalized]) {
    return ROLE_TO_LEVEL[normalized];
  }
  
  // Case-insensitive match
  const lowerRole = normalized.toLowerCase().replace(/[_-]/g, ' ');
  for (const [role, level] of Object.entries(ROLE_TO_LEVEL)) {
    if (role.toLowerCase() === lowerRole) {
      return level;
    }
  }
  
  // Default to Staff level
  return 1;
}

/**
 * Get label for a business level
 * @param {number} level - Business level (1-10)
 * @returns {string} Human-readable label
 */
function getLevelLabel(level) {
  return LEVEL_LABELS[level] || `L${level}`;
}

/**
 * Check if a user can REVIEW another user's work
 * Rule: Reviewer must be exactly ONE level above the creator
 * 
 * @param {number} reviewerLevel - Business level of reviewer
 * @param {number} creatorLevel - Business level of work creator
 * @returns {boolean} Can review
 */
function canReview(reviewerLevel, creatorLevel) {
  // Reviewer must be exactly one level higher
  return reviewerLevel === creatorLevel + 1;
}

/**
 * Check if a user can APPROVE a request
 * Rule: Approver must be at or above the required approval level
 * 
 * @param {number} approverLevel - Business level of approver
 * @param {number} requiredLevel - Minimum level required to approve
 * @returns {boolean} Can approve
 */
function canApprove(approverLevel, requiredLevel) {
  return approverLevel >= requiredLevel;
}

/**
 * Check if a user can ASSIGN TASKS to another user
 * Rule: Assigner must be at or above target user's level
 * 
 * @param {number} assignerLevel - Business level of task assigner
 * @param {number} targetLevel - Business level of target user
 * @returns {boolean} Can assign
 */
function canAssignTask(assignerLevel, targetLevel) {
  return assignerLevel >= targetLevel;
}

/**
 * Check if a user can ESCALATE to another user
 * Rule: Can only escalate to someone at a HIGHER level
 * 
 * @param {number} escalatorLevel - Business level of escalating user
 * @param {number} targetLevel - Business level of escalation target
 * @returns {boolean} Can escalate
 */
function canEscalate(escalatorLevel, targetLevel) {
  return targetLevel > escalatorLevel;
}

/**
 * Get all users who can review work from a given level
 * @param {number} creatorLevel - Business level of work creator
 * @returns {number[]} Array of levels that can review
 */
function getReviewerLevels(creatorLevel) {
  // Only the immediate superior can review
  const reviewerLevel = creatorLevel + 1;
  return reviewerLevel <= 10 ? [reviewerLevel] : [];
}

/**
 * Get all users who can approve at a given level
 * @param {number} requiredLevel - Minimum level required
 * @returns {number[]} Array of levels that can approve
 */
function getApproverLevels(requiredLevel) {
  const levels = [];
  for (let i = requiredLevel; i <= 10; i++) {
    levels.push(i);
  }
  return levels;
}

/**
 * Get all users a given level can assign tasks to
 * @param {number} assignerLevel - Business level of assigner
 * @returns {number[]} Array of levels that can receive tasks
 */
function getAssignableLevels(assignerLevel) {
  const levels = [];
  for (let i = 1; i <= assignerLevel; i++) {
    levels.push(i);
  }
  return levels;
}

/**
 * Get all users a given level can escalate to
 * @param {number} escalatorLevel - Business level of escalator
 * @returns {number[]} Array of levels that can receive escalations
 */
function getEscalationTargetLevels(escalatorLevel) {
  const levels = [];
  for (let i = escalatorLevel + 1; i <= 10; i++) {
    levels.push(i);
  }
  return levels;
}

/**
 * Validate a workflow approval chain
 * Returns true if the chain follows proper hierarchy
 * 
 * @param {Array<{userId: string, level: number, action: string}>} chain - Approval chain
 * @returns {{valid: boolean, error?: string}}
 */
function validateApprovalChain(chain) {
  if (!chain || chain.length === 0) {
    return { valid: true };
  }
  
  for (let i = 1; i < chain.length; i++) {
    const prevStep = chain[i - 1];
    const currentStep = chain[i];
    
    // Each step must be at same or higher level
    if (currentStep.level < prevStep.level) {
      return {
        valid: false,
        error: `Invalid chain: L${currentStep.level} cannot follow L${prevStep.level}. Lower levels cannot approve after higher levels.`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Get suggested approval chain for a request
 * 
 * @param {number} creatorLevel - Business level of request creator
 * @param {number} finalApprovalLevel - Level needed for final approval
 * @returns {number[]} Suggested approval levels
 */
function getSuggestedApprovalChain(creatorLevel, finalApprovalLevel) {
  const chain = [];
  
  // Start with immediate reviewer
  let currentLevel = creatorLevel + 1;
  
  // Add intermediate levels up to final approval
  while (currentLevel <= finalApprovalLevel && currentLevel <= 10) {
    chain.push(currentLevel);
    currentLevel++;
  }
  
  return chain;
}

// ============================================================================
// DEPUTY ROLE CONFIGURATION
// Deputies can approve but cannot override. Overrides remain L9+ only.
// ============================================================================

const DEPUTY_ROLES = {
  'CFO Deputy': { level: 8.5, principalRole: 'CFO', canOverride: false },
  'CFO_DEPUTY': { level: 8.5, principalRole: 'CFO', canOverride: false },
  'Admin Deputy': { level: 8.5, principalRole: 'Admin', canOverride: false },
  'ADMIN_DEPUTY': { level: 8.5, principalRole: 'Admin', canOverride: false },
};

/**
 * Check if a role is a deputy role
 * @param {string} roleName - The role name
 * @returns {boolean} Is deputy role
 */
function isDeputyRole(roleName) {
  if (!roleName) return false;
  const normalized = roleName.trim();
  return !!DEPUTY_ROLES[normalized];
}

/**
 * Get deputy configuration for a role
 * @param {string} roleName - The role name
 * @returns {Object|null} Deputy configuration
 */
function getDeputyConfig(roleName) {
  if (!roleName) return null;
  const normalized = roleName.trim();
  return DEPUTY_ROLES[normalized] || null;
}

/**
 * Check if user can perform override actions
 * Overrides require L9+ AND cannot be deputies
 * @param {number} level - Business level
 * @param {string} roleName - Role name
 * @returns {boolean} Can override
 */
function canOverride(level, roleName) {
  // Deputies cannot override regardless of level
  if (isDeputyRole(roleName)) {
    return false;
  }
  // Only L9+ can override
  return level >= 9;
}

/**
 * Check if user can force-approve (admin override)
 * @param {number} level - Business level
 * @param {string} roleName - Role name
 * @returns {boolean} Can force approve
 */
function canForceApprove(level, roleName) {
  return canOverride(level, roleName);
}

/**
 * Check if user can force-reject (admin override)
 * @param {number} level - Business level
 * @param {string} roleName - Role name
 * @returns {boolean} Can force reject
 */
function canForceReject(level, roleName) {
  return canOverride(level, roleName);
}

// ============================================================================
// PEER-APPROVAL CONTROL
// Enforces approver_level > creator_level except when whitelisted
// ============================================================================

/**
 * Check if peer approval is allowed for this specific action
 * @param {number} approverLevel - Approver's business level
 * @param {number} creatorLevel - Creator's business level
 * @param {boolean} peerApprovalWhitelisted - Stage allows peer approval
 * @param {number} minLevelAbove - Minimum levels above creator required
 * @returns {{allowed: boolean, reason?: string}}
 */
function checkPeerApprovalAllowed(approverLevel, creatorLevel, peerApprovalWhitelisted = false, minLevelAbove = 1) {
  const levelDiff = approverLevel - creatorLevel;
  
  // Approver is above creator by required amount
  if (levelDiff >= minLevelAbove) {
    return { allowed: true };
  }
  
  // Same level or below - check whitelist
  if (levelDiff <= 0) {
    if (peerApprovalWhitelisted && levelDiff === 0) {
      return { 
        allowed: true, 
        reason: 'Peer approval allowed by workflow configuration',
        peerApprovalUsed: true
      };
    }
    return {
      allowed: false,
      reason: levelDiff === 0 
        ? 'Peer approval not allowed. Approver must be at least 1 level above creator.'
        : 'Approver cannot be below creator level.',
      approverLevel,
      creatorLevel,
      levelDiff
    };
  }
  
  // Level diff is positive but less than required
  return {
    allowed: false,
    reason: `Approver must be at least ${minLevelAbove} level(s) above creator. Current difference: ${levelDiff}`,
    approverLevel,
    creatorLevel,
    required: minLevelAbove,
    actual: levelDiff
  };
}

/**
 * Express middleware to enforce business level for approvals
 * Adds business level context to request
 */
function businessLevelMiddleware(req, res, next) {
  if (req.user) {
    // Add business level context
    req.user.businessLevel = req.user.business_level || getBusinessLevelFromRole(req.user.role);
    req.user.businessLevelLabel = getLevelLabel(req.user.businessLevel);
    req.user.isDeputy = isDeputyRole(req.user.role);
    req.user.deputyConfig = getDeputyConfig(req.user.role);
    
    // Add helper functions
    req.user.canReview = (creatorLevel) => canReview(req.user.businessLevel, creatorLevel);
    req.user.canApprove = (requiredLevel) => canApprove(req.user.businessLevel, requiredLevel);
    req.user.canAssignTask = (targetLevel) => canAssignTask(req.user.businessLevel, targetLevel);
    req.user.canEscalate = (targetLevel) => canEscalate(req.user.businessLevel, targetLevel);
    req.user.canOverride = () => canOverride(req.user.businessLevel, req.user.role);
    req.user.canForceApprove = () => canForceApprove(req.user.businessLevel, req.user.role);
    req.user.canForceReject = () => canForceReject(req.user.businessLevel, req.user.role);
    req.user.checkPeerApproval = (creatorLevel, whitelisted, minAbove) => 
      checkPeerApprovalAllowed(req.user.businessLevel, creatorLevel, whitelisted, minAbove);
  }
  next();
}

/**
 * Create an approval enforcement middleware
 * @param {number} requiredLevel - Minimum business level required
 * @returns {Function} Express middleware
 */
function requireApprovalLevel(requiredLevel) {
  return (req, res, next) => {
    const userLevel = req.user?.business_level || req.user?.businessLevel || 1;
    
    if (!canApprove(userLevel, requiredLevel)) {
      return res.status(403).json({
        error: 'Approval Not Authorized',
        message: `This action requires Business Level ${requiredLevel} or higher. Your level: L${userLevel}`,
        code: 'BUSINESS_LEVEL_INSUFFICIENT',
        required: requiredLevel,
        current: userLevel,
        hint: 'Business Level controls approvals and escalation only. This is separate from security access.'
      });
    }
    next();
  };
}

/**
 * Create a review enforcement middleware
 * Ensures reviewer is exactly one level above creator
 * @param {Function} getCreatorLevel - Function to extract creator level from request
 * @returns {Function} Express middleware
 */
function requireReviewLevel(getCreatorLevel) {
  return async (req, res, next) => {
    const userLevel = req.user?.business_level || req.user?.businessLevel || 1;
    const creatorLevel = await getCreatorLevel(req);
    
    if (!canReview(userLevel, creatorLevel)) {
      return res.status(403).json({
        error: 'Review Not Authorized',
        message: `Only L${creatorLevel + 1} can review L${creatorLevel} work. Your level: L${userLevel}`,
        code: 'BUSINESS_LEVEL_REVIEW_MISMATCH',
        required: creatorLevel + 1,
        current: userLevel,
        hint: 'Reviews must be done by immediate superiors (one level above).'
      });
    }
    next();
  };
}

module.exports = {
  // Constants
  BUSINESS_LEVELS,
  ROLE_TO_LEVEL,
  LEVEL_LABELS,
  DEPUTY_ROLES,
  
  // Utility functions
  getBusinessLevelFromRole,
  getLevelLabel,
  
  // Permission checks
  canReview,
  canApprove,
  canAssignTask,
  canEscalate,
  
  // Deputy & Override checks
  isDeputyRole,
  getDeputyConfig,
  canOverride,
  canForceApprove,
  canForceReject,
  
  // Peer-approval control
  checkPeerApprovalAllowed,
  
  // Level queries
  getReviewerLevels,
  getApproverLevels,
  getAssignableLevels,
  getEscalationTargetLevels,
  
  // Workflow validation
  validateApprovalChain,
  getSuggestedApprovalChain,
  
  // Middleware
  businessLevelMiddleware,
  requireApprovalLevel,
  requireReviewLevel
};
