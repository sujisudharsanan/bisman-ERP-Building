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
      const currentUserType = user.userType || user.user_type || 'USER';
      const currentUserLevel = user.business_level || 1;
      
      // ============================================================================
      // RULE 1: Only ADMIN, SUPER_ADMIN, or ENTERPRISE_ADMIN can change business_level
      // ============================================================================
      const allowedTypes = ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'];
      if (!allowedTypes.includes(currentUserType)) {
        console.warn(`[BusinessLevel] BLOCKED: User ${currentUserId} (${currentUserType}) attempted to modify business_level`);
        
        // Remove business_level from request body silently (fail-safe)
        delete req.body.business_level;
        
        // Log the attempt
        try {
          const prisma = getPrismaClient();
          await prisma.$executeRaw`
            INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at)
            VALUES (${currentUserId}, 'BUSINESS_LEVEL_CHANGE_BLOCKED', 'users_enhanced', ${targetUserId || null}, 
                    ${JSON.stringify({ attempted_by: currentUserType })}::jsonb,
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
      // RULE 4: Enforce hierarchy (can't set level higher than own, except ENTERPRISE_ADMIN)
      // ============================================================================
      if (enforceHierarchy && currentUserType !== 'ENTERPRISE_ADMIN') {
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
  const userType = req.user?.userType || req.user?.user_type || 'USER';
  const allowedTypes = ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN'];
  
  if (!allowedTypes.includes(userType)) {
    delete req.body?.business_level;
  }
  
  next();
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

module.exports = {
  protectBusinessLevel,
  logBusinessLevelChange,
  stripBusinessLevel,
  getBusinessLevelInfo
};
