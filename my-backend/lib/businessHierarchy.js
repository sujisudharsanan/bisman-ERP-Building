/**
 * ============================================================================
 * BUSINESS HIERARCHY SYSTEM (UNIFIED 10-100 SCALE)
 * ============================================================================
 * 
 * PURPOSE:
 * This module handles BUSINESS HIERARCHY (workflow approvals, escalation)
 * using a UNIFIED 10-100 scale for both security and business levels.
 * 
 * AUTHORITY LEVELS (10-100 scale):
 * 100: Super Admin
 * 90:  Admin
 * 85:  CFO, Finance Controller
 * 80:  Operations Manager
 * 75:  Branch Manager
 * 70:  Manager, Finance Manager, HR Manager
 * 60:  Branch Incharge
 * 55:  Hub Incharge
 * 40:  Store Incharge
 * 30:  Accountant, HR Executive
 * 20:  Staff, User
 * 10:  Viewer
 * 
 * WORKFLOW RULES:
 * - canReview: effective_level > creator_level (any higher level can review)
 * - canApprove: effective_level >= required_approval_level
 * - canAssignTask: effective_level >= target_user_level
 * - canEscalate: can only escalate to higher effective_level
 * 
 * AUTHORITY OVERRIDE:
 * Users can have temporary authority overrides stored in users.authority_override_level
 * Effective level = authority_override_level ?? role.level
 * 
 * @module lib/businessHierarchy
 */

// Import the unified authority level system
const authorityLevel = require('./authorityLevel');

// Re-export authority level constants for compatibility
const AUTHORITY_LEVELS = authorityLevel.AUTHORITY_LEVELS;
const TIER_THRESHOLDS = authorityLevel.TIER_THRESHOLDS;

// Legacy BUSINESS_LEVELS mapping (deprecated - use AUTHORITY_LEVELS instead)
const BUSINESS_LEVELS = {
  STAFF: 20,
  USER: 20,
  SUPERVISOR: 25,
  ACCOUNTANT: 30,
  HR_EXECUTIVE: 30,
  STORE_INCHARGE: 40,
  HUB_INCHARGE: 55,
  BRANCH_INCHARGE: 60,
  COMPLIANCE: 65,
  LEGAL: 65,
  MANAGER: 70,
  FINANCE_MANAGER: 70,
  HR_MANAGER: 70,
  BRANCH_MANAGER: 75,
  OPERATIONS_MANAGER: 80,
  TREASURY: 80,
  FINANCE_CONTROLLER: 85,
  CFO: 85,
  IT_ADMIN: 85,
  ADMIN: 90,
  SYSTEM_ADMINISTRATOR: 90,
  SUPER_ADMIN: 100
};

// Role to authority level mapping (10-100 scale)
const ROLE_TO_LEVEL = {
  'Staff': 20,
  'User': 20,
  'Viewer': 10,
  'Supervisor': 25,
  'Accountant': 30,
  'HR Executive': 30,
  'Store Incharge': 40,
  'Hub Incharge': 55,
  'Branch Incharge': 60,
  'Compliance': 65,
  'Legal': 65,
  'Manager': 70,
  'Finance Manager': 70,
  'HR Manager': 70,
  'Branch Manager': 75,
  'Operations Manager': 80,
  'Treasury': 80,
  'Finance Controller': 85,
  'CFO': 85,
  'IT Admin': 85,
  'CFO Deputy': 80,
  'CFO_DEPUTY': 80,
  'Admin Deputy': 80,
  'ADMIN_DEPUTY': 80,
  'Admin': 90,
  'System Administrator': 90,
  'Super Admin': 100
};

// Level labels for UI display (10-100 scale)
const LEVEL_LABELS = {
  10: 'Viewer',
  20: 'Staff',
  25: 'Supervisor',
  30: 'Officer',
  40: 'Store Incharge',
  55: 'Hub Incharge',
  60: 'Branch Incharge',
  65: 'Compliance/Legal',
  70: 'Manager',
  75: 'Branch Manager',
  80: 'Operations',
  85: 'Controller/CFO',
  90: 'Admin',
  100: 'Super Admin'
};

/**
 * Get business level from role name (returns 10-100 scale)
 * @param {string} roleName - The role name
 * @returns {number} Authority level (10-100)
 */
function getBusinessLevelFromRole(roleName) {
  if (!roleName) return AUTHORITY_LEVELS.STAFF;
  
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
  return AUTHORITY_LEVELS.STAFF;
}

/**
 * Get label for an authority level
 * @param {number} level - Authority level (10-100)
 * @returns {string} Human-readable label
 */
function getLevelLabel(level) {
  // Find closest label
  const sortedKeys = Object.keys(LEVEL_LABELS).map(Number).sort((a, b) => b - a);
  for (const key of sortedKeys) {
    if (level >= key) return LEVEL_LABELS[key];
  }
  return LEVEL_LABELS[10] || 'Viewer';
}

/**
 * Check if a user can REVIEW another user's work
 * Rule: Reviewer must have HIGHER level than creator
 * 
 * @param {number} reviewerLevel - Authority level of reviewer
 * @param {number} creatorLevel - Authority level of work creator
 * @returns {boolean} Can review
 */
function canReview(reviewerLevel, creatorLevel) {
  // Reviewer must have higher level
  return reviewerLevel > creatorLevel;
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
 * Get all levels that can review work from a given level
 * @param {number} creatorLevel - Authority level of work creator
 * @returns {number[]} Array of levels that can review
 */
function getReviewerLevels(creatorLevel) {
  // Any higher level can review
  return Object.values(ROLE_TO_LEVEL).filter(level => level > creatorLevel);
}

/**
 * Get all levels that can approve at a given level
 * @param {number} requiredLevel - Minimum level required
 * @returns {number[]} Array of levels that can approve
 */
function getApproverLevels(requiredLevel) {
  return Object.values(ROLE_TO_LEVEL).filter(level => level >= requiredLevel);
}

/**
 * Get all levels a given level can assign tasks to
 * @param {number} assignerLevel - Authority level of assigner
 * @returns {number[]} Array of levels that can receive tasks
 */
function getAssignableLevels(assignerLevel) {
  return Object.values(ROLE_TO_LEVEL).filter(level => level <= assignerLevel);
}

/**
 * Get all levels a given level can escalate to
 * @param {number} escalatorLevel - Authority level of escalator
 * @returns {number[]} Array of levels that can receive escalations
 */
function getEscalationTargetLevels(escalatorLevel) {
  return Object.values(ROLE_TO_LEVEL).filter(level => level > escalatorLevel);
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
// Deputies can approve but cannot override. Overrides remain level 90+ only.
// ============================================================================

const DEPUTY_ROLES = {
  'CFO Deputy': { level: 80, principalRole: 'CFO', canOverride: false },
  'CFO_DEPUTY': { level: 80, principalRole: 'CFO', canOverride: false },
  'Admin Deputy': { level: 80, principalRole: 'Admin', canOverride: false },
  'ADMIN_DEPUTY': { level: 80, principalRole: 'Admin', canOverride: false },
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
 * Overrides require level 90+ AND cannot be deputies
 * @param {number} level - Authority level
 * @param {string} roleName - Role name
 * @returns {boolean} Can override
 */
function canOverride(level, roleName) {
  // Deputies cannot override regardless of level
  if (isDeputyRole(roleName)) {
    return false;
  }
  // Only level 90+ (Admin+) can override
  return level >= AUTHORITY_LEVELS.ADMIN;
}

/**
 * Check if user can force-approve (admin override)
 * @param {number} level - Authority level
 * @param {string} roleName - Role name
 * @returns {boolean} Can force approve
 */
function canForceApprove(level, roleName) {
  return canOverride(level, roleName);
}

/**
 * Check if user can force-reject (admin override)
 * @param {number} level - Authority level
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
 * Adds business level context to request using the unified 10-100 scale
 */
function businessLevelMiddleware(req, res, next) {
  if (req.user) {
    // Get authority level from role or stored business_level
    const roleLevel = getBusinessLevelFromRole(req.user.role);
    const storedLevel = req.user.business_level || req.user.businessLevel;
    
    // Use the higher of role level or stored level, but prefer authorityLevel system
    req.user.businessLevel = storedLevel && storedLevel >= 10 ? storedLevel : roleLevel;
    req.user.businessLevelLabel = getLevelLabel(req.user.businessLevel);
    req.user.isDeputy = isDeputyRole(req.user.role);
    req.user.deputyConfig = getDeputyConfig(req.user.role);
    
    // Check for authority override
    const overrideLevel = req.user.authority_override_level || req.user.authorityOverrideLevel;
    const overrideEnd = req.user.override_end_date || req.user.overrideEndDate;
    
    if (overrideLevel !== null && overrideLevel !== undefined) {
      if (!overrideEnd || new Date(overrideEnd) > new Date()) {
        req.user.effectiveLevel = overrideLevel;
        req.user.hasActiveOverride = true;
      } else {
        req.user.effectiveLevel = req.user.businessLevel;
        req.user.hasActiveOverride = false;
      }
    } else {
      req.user.effectiveLevel = req.user.businessLevel;
      req.user.hasActiveOverride = false;
    }
    
    // Add helper functions using effective level
    req.user.canReview = (creatorLevel) => canReview(req.user.effectiveLevel, creatorLevel);
    req.user.canApprove = (requiredLevel) => canApprove(req.user.effectiveLevel, requiredLevel);
    req.user.canAssignTask = (targetLevel) => canAssignTask(req.user.effectiveLevel, targetLevel);
    req.user.canEscalate = (targetLevel) => canEscalate(req.user.effectiveLevel, targetLevel);
    req.user.canOverride = () => canOverride(req.user.effectiveLevel, req.user.role);
    req.user.canForceApprove = () => canForceApprove(req.user.effectiveLevel, req.user.role);
    req.user.canForceReject = () => canForceReject(req.user.effectiveLevel, req.user.role);
    req.user.checkPeerApproval = (creatorLevel, whitelisted, minAbove) => 
      checkPeerApprovalAllowed(req.user.effectiveLevel, creatorLevel, whitelisted, minAbove);
  }
  next();
}

/**
 * Create an approval enforcement middleware
 * @param {number} requiredLevel - Minimum authority level required (10-100 scale)
 * @returns {Function} Express middleware
 */
function requireApprovalLevel(requiredLevel) {
  return (req, res, next) => {
    const userLevel = req.user?.effectiveLevel || req.user?.business_level || req.user?.businessLevel || AUTHORITY_LEVELS.STAFF;
    
    if (!canApprove(userLevel, requiredLevel)) {
      return res.status(403).json({
        error: 'Approval Not Authorized',
        message: `This action requires Authority Level ${requiredLevel} or higher. Your level: ${userLevel}`,
        code: 'AUTHORITY_LEVEL_INSUFFICIENT',
        required: requiredLevel,
        current: userLevel,
        hint: 'Authority Level controls approvals and escalation. Use authority overrides for temporary elevation.'
      });
    }
    next();
  };
}

/**
 * Create a review enforcement middleware
 * Ensures reviewer has higher level than creator
 * @param {Function} getCreatorLevel - Function to extract creator level from request
 * @returns {Function} Express middleware
 */
function requireReviewLevel(getCreatorLevel) {
  return async (req, res, next) => {
    const userLevel = req.user?.effectiveLevel || req.user?.business_level || req.user?.businessLevel || AUTHORITY_LEVELS.STAFF;
    const creatorLevel = await getCreatorLevel(req);
    
    if (!canReview(userLevel, creatorLevel)) {
      return res.status(403).json({
        error: 'Review Not Authorized',
        message: `Reviewer level (${userLevel}) must be higher than creator level (${creatorLevel}).`,
        code: 'AUTHORITY_LEVEL_REVIEW_MISMATCH',
        requiredMinimum: creatorLevel + 1,
        current: userLevel,
        hint: 'Reviews must be done by someone with higher authority.'
      });
    }
    next();
  };
}

module.exports = {
  // New unified constants
  AUTHORITY_LEVELS,
  TIER_THRESHOLDS,
  
  // Legacy constants (deprecated - use AUTHORITY_LEVELS)
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
  requireReviewLevel,
  
  // Re-export authorityLevel functions for convenience
  getEffectiveAuthorityLevel: authorityLevel.getEffectiveAuthorityLevel,
  getEffectiveAuthorityLevelFromUser: authorityLevel.getEffectiveAuthorityLevelFromUser,
  hasMinimumAuthority: authorityLevel.hasMinimumAuthority,
  canApprovePayments: authorityLevel.canApprovePayments,
  canApproveTasks: authorityLevel.canApproveTasks,
  isAdmin: authorityLevel.isAdmin,
  getNextEscalationLevel: authorityLevel.getNextEscalationLevel,
  getUsersAtOrAboveLevel: authorityLevel.getUsersAtOrAboveLevel,
  grantAuthorityOverride: authorityLevel.grantAuthorityOverride,
  revokeAuthorityOverride: authorityLevel.revokeAuthorityOverride,
};
