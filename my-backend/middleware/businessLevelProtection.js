/**
 * Business Level Protection Middleware
 * 
 * CRITICAL SECURITY: Prevents unauthorized modification of business_level
 * 
 * Rules:
 * 1. Only ADMIN, SUPER_ADMIN, or ENTERPRISE_ADMIN can change business_level
 * 2. Users cannot change their own business_level
 * 3. Users cannot set a business_level higher than their own
 * 4. All business_level changes are logged for audit
 */

const { getPrismaClient } = require('../lib/prismaClients');
const { BUSINESS_LEVELS } = require('../lib/approvalEngine');

/**
 * Middleware to protect business_level field from unauthorized modification
 * Use this on any route that allows user updates
 * 
 * @param {Object} options
 * @param {boolean} options.allowSelf - Whether user can modify their own record (default: false for business_level)
 * @param {boolean} options.enforceHierarchy - Whether to enforce hierarchy (can't set level higher than own)
 */
function protectBusinessLevel(options = {}) {
  const { allowSelf = false, enforceHierarchy = true } = options;
  
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const requestedBusinessLevel = req.body?.business_level;
      
      // If business_level is not being modified, proceed
      if (requestedBusinessLevel === undefined) {
        return next();
      }
      
      // Get target user ID from params or body
      const targetUserId = parseInt(req.params.userId || req.params.id || req.body.userId);
      const currentUserId = user.id;
      const currentSystemScope = user.system_scope || 'BUSINESS';
      const currentUserLevel = user.business_level || 1;
      const currentUserType = user.userType || user.user_type || 'USER';
      
      // ============================================================================
      // RULE 1: Only TENANT or CROSS_TENANT scope users can change business_level
      // ============================================================================
      const allowedScopes = ['TENANT', 'CROSS_TENANT'];
      if (!allowedScopes.includes(currentSystemScope)) {
        console.warn(`[BusinessLevel] BLOCKED: User ${currentUserId} (scope: ${currentSystemScope}) attempted to modify business_level`);
        
        // Remove business_level from request body silently (fail-safe)
        delete req.body.business_level;
        
        // Log the attempt
        try {
          const prisma = getPrismaClient();
          await prisma.$executeRaw`
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at)
            VALUES (${currentUserId}, 'BUSINESS_LEVEL_CHANGE_BLOCKED', 'users_enhanced', ${targetUserId || null}, 
                    ${JSON.stringify({ attempted_by_scope: currentSystemScope })}::jsonb,
                    ${JSON.stringify({ requested_level: requestedBusinessLevel })}::jsonb,
                    ${req.ip || 'unknown'}, NOW())
          `;
        } catch (logError) {
          console.error('[BusinessLevel] Failed to log blocked attempt:', logError.message);
        }
        
        return next(); // Proceed without the business_level change
      }
      
      // ============================================================================
      // RULE 2: Users cannot change their own business_level
      // ============================================================================
      if (!allowSelf && targetUserId === currentUserId) {
        console.warn(`[BusinessLevel] BLOCKED: User ${currentUserId} attempted to modify their own business_level`);
        
        delete req.body.business_level;
        return next();
      }
      
      // ============================================================================
      // RULE 3: Validate level range (1-10)
      // ============================================================================
      const level = parseInt(requestedBusinessLevel);
      if (isNaN(level) || level < 1 || level > 10) {
        return res.status(400).json({
          error: 'INVALID_BUSINESS_LEVEL',
          message: 'business_level must be between 1 and 10'
        });
      }
      
      // ============================================================================
      // RULE 4: Enforce hierarchy (can't set level higher than own, except CROSS_TENANT)
      // ============================================================================
      if (enforceHierarchy && currentSystemScope !== 'CROSS_TENANT') {
        if (level > currentUserLevel) {
          console.warn(`[BusinessLevel] BLOCKED: User ${currentUserId} (L${currentUserLevel}) attempted to set L${level}`);
          return res.status(403).json({
            error: 'INSUFFICIENT_AUTHORITY',
            message: `Cannot set business_level higher than your own (L${currentUserLevel})`,
            yourLevel: currentUserLevel,
            requestedLevel: level
          });
        }
      }
      
      // ============================================================================
      // ATTACH CONTEXT FOR AUDIT LOGGING
      // ============================================================================
      req.businessLevelChange = {
        targetUserId,
        newLevel: level,
        changedBy: currentUserId,
        changedByType: currentUserType,
        changedByLevel: currentUserLevel
      };
      
      next();
    } catch (error) {
      console.error('[BusinessLevel] Middleware error:', error);
      res.status(500).json({ error: 'Failed to validate business level change' });
    }
  };
}

/**
 * Log business level changes for audit trail
 * Call this after successfully updating business_level
 */
async function logBusinessLevelChange(userId, oldLevel, newLevel, changedBy, changedByType, ipAddress) {
  try {
    const prisma = getPrismaClient();
    await prisma.$executeRaw`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at)
      VALUES (${changedBy}, 'BUSINESS_LEVEL_CHANGED', 'users_enhanced', ${userId}, 
              ${JSON.stringify({ business_level: oldLevel })}::jsonb,
              ${JSON.stringify({ business_level: newLevel, changed_by_type: changedByType })}::jsonb,
              ${ipAddress || 'unknown'}, NOW())
    `;
    console.log(`[BusinessLevel] Logged: User ${userId} changed from L${oldLevel} to L${newLevel} by ${changedBy} (${changedByType})`);
  } catch (error) {
    console.error('[BusinessLevel] Failed to log change:', error.message);
  }
}

/**
 * Sanitize request body to remove business_level if user is not authorized
 * Use this as a quick middleware on routes that shouldn't allow business_level changes
 */
function stripBusinessLevel(req, res, next) {
  const systemScope = req.user?.system_scope || 'BUSINESS';
  const allowedScopes = ['TENANT', 'CROSS_TENANT'];
  
  if (!allowedScopes.includes(systemScope)) {
    delete req.body?.business_level;
  }
  
  next();
}

/**
 * SECURITY FIX: Validate business_level on CREATE operations
 * Ensures creators cannot create users with higher business_level than themselves
 * 
 * Use this on user creation routes (POST)
 */
function validateBusinessLevelOnCreate(options = {}) {
  const { defaultLevel = 1 } = options;
  
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const requestedBusinessLevel = req.body?.business_level;
      const currentUserType = user.userType || user.user_type || 'USER';
      const currentUserLevel = user.business_level || 1;
      
      // If no business_level specified, use default
      if (requestedBusinessLevel === undefined) {
        req.body.business_level = defaultLevel;
        return next();
      }
      
      // Validate level range (1-10)
      const level = parseInt(requestedBusinessLevel);
      if (isNaN(level) || level < 1 || level > 10) {
        return res.status(400).json({
          error: 'INVALID_BUSINESS_LEVEL',
          message: 'business_level must be between 1 and 10'
        });
      }
      
      // Only ADMIN, SUPER_ADMIN, or ENTERPRISE_ADMIN can set business_level
      const allowedTypes = ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'];
      if (!allowedTypes.includes(currentUserType)) {
        console.warn(`[BusinessLevel] BLOCKED CREATE: User ${user.id} (${currentUserType}) attempted to set business_level ${level}`);
        req.body.business_level = defaultLevel; // Force default
        return next();
      }
      
      // ENTERPRISE_ADMIN can set any level
      if (currentUserType === 'ENTERPRISE_ADMIN') {
        return next();
      }
      
      // Cannot create user with higher level than own
      if (level > currentUserLevel) {
        console.warn(`[BusinessLevel] BLOCKED CREATE: User ${user.id} (L${currentUserLevel}) attempted to create L${level} user`);
        return res.status(403).json({
          error: 'INSUFFICIENT_AUTHORITY',
          message: `Cannot create user with business_level higher than your own (L${currentUserLevel})`,
          yourLevel: currentUserLevel,
          requestedLevel: level
        });
      }
      
      next();
    } catch (error) {
      console.error('[BusinessLevel] CREATE validation error:', error);
      res.status(500).json({ error: 'Failed to validate business level for new user' });
    }
  };
}

/**
 * Get business level display info
 */
function getBusinessLevelInfo(level) {
  const key = `L${level}`;
  const info = BUSINESS_LEVELS[key];
  return {
    level,
    key,
    name: info?.name || `Level ${level}`,
    description: info?.description || ''
  };
}

/**
 * SECURITY FIX UC-03: Validate reporting manager to prevent cycles
 * Ensures: 
 * 1. User cannot report to themselves
 * 2. User cannot report to someone who reports (directly or indirectly) to them
 * This prevents circular reporting hierarchies that break approval workflows
 */
function validateReportingManager() {
  return async (req, res, next) => {
    try {
      // TRANSITIONAL FALLBACK: Accept legacy field names from old clients
      // Canonical field is reports_to — see USER_MODEL_LOCK.md
      // TODO: Remove fallbacks after all clients updated (tracked in DEPRECATION_ROADMAP)
      const reportsTo = req.body.reports_to || req.body.reporting_manager_id || req.body.manager_id;
      const userId = req.params.id || req.params.userId; // For update operations
      
      // Skip if no reporting manager specified
      if (!reportsTo) {
        return next();
      }
      
      // Check 1: Cannot report to self
      if (userId && reportsTo === userId) {
        console.warn(`[ReportingManager] BLOCKED: User ${userId} attempted to set self as manager`);
        return res.status(400).json({
          error: 'INVALID_REPORTING_MANAGER',
          message: 'User cannot report to themselves',
          code: 'SELF_REFERENCE'
        });
      }
      
      // For new users (no userId), we can't have cycles yet
      if (!userId) {
        return next();
      }
      
      // Check 2: Detect cycles - ensure target manager doesn't report to this user
      const prisma = getPrismaClient();
      if (!prisma) {
        console.error('[ReportingManager] Prisma not available');
        return next();
      }
      
      // Walk up the reporting chain from the proposed manager to detect if it leads back to this user
      const visited = new Set();
      let currentId = reportsTo;
      const MAX_DEPTH = 20; // Prevent infinite loops even if DB has corruption
      let depth = 0;
      
      while (currentId && depth < MAX_DEPTH) {
        // If we find userId in the chain, there would be a cycle
        if (currentId === userId) {
          console.warn(`[ReportingManager] BLOCKED: Cycle detected - ${reportsTo} reports (indirectly) to ${userId}`);
          return res.status(400).json({
            error: 'INVALID_REPORTING_MANAGER',
            message: 'This assignment would create a circular reporting relationship',
            code: 'CYCLE_DETECTED',
            details: `Manager ${reportsTo} has ${userId} in their reporting chain`
          });
        }
        
        // Prevent revisiting (shouldn't happen, but safety check)
        if (visited.has(currentId)) {
          console.error(`[ReportingManager] Existing cycle detected in DB starting from ${currentId}`);
          break;
        }
        visited.add(currentId);
        
        // Get the manager's manager
        const result = await prisma.$queryRaw`
          SELECT reports_to FROM users WHERE id = ${currentId}::uuid LIMIT 1
        `;
        
        if (result.length === 0 || !result[0].reports_to) {
          break; // Reached top of chain or user not found
        }
        
        currentId = result[0].reports_to;
        depth++;
      }
      
      // No cycle detected
      next();
    } catch (error) {
      console.error('[ReportingManager] Validation error:', error);
      // Fail open with warning - don't block user creation on validation errors
      // But log it for investigation
      next();
    }
  };
}

module.exports = {
  protectBusinessLevel,
  logBusinessLevelChange,
  stripBusinessLevel,
  getBusinessLevelInfo,
  validateBusinessLevelOnCreate,  // SECURITY FIX: Added for CREATE operations
  validateReportingManager  // SECURITY FIX UC-03: Cycle detection
};
