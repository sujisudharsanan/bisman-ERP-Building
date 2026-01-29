/**
 * Data Scope Service
 * 
 * ARCHITECTURE:
 * - RBAC (admin_page_assignments) → Controls PAGE ACCESS (IF)
 * - Data Scope (this service) → Controls DATA VISIBILITY (WHAT)
 * 
 * SCOPE HIERARCHY:
 * - ALL: See all data (platform admins)
 * - TENANT: See all data within tenant (tenant admins)
 * - DEPARTMENT: See data in assigned department(s)
 * - TEAM: See data in assigned team(s)
 * - SELF: See only own data
 * 
 * USAGE:
 *   const { applyDataScope, getDataScope } = require('./services/dataScopeService');
 *   
 *   // Get user's effective scope
 *   const scope = await getDataScope(user);
 *   
 *   // Apply scope to Prisma query
 *   const where = applyDataScope({ tenant_id: tenantId }, scope, user);
 *   const users = await prisma.users_enhanced.findMany({ where });
 */

const { getPrisma } = require('./prismaManager');

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Data scope levels in order of permission (highest to lowest)
 */
const SCOPE_LEVELS = {
  ALL: 1,        // Platform-wide access
  TENANT: 2,     // All data within tenant
  DEPARTMENT: 3, // Department-specific access
  TEAM: 4,       // Team-specific access
  SELF: 5        // Own data only
};

/**
 * Roles that have platform-level ALL scope
 */
const PLATFORM_SCOPE_ROLES = ['ENTERPRISE_ADMIN', 'SYSTEM_ADMIN'];

/**
 * Roles that have tenant-level scope by default
 */
const TENANT_SCOPE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'IT_ADMIN', 'ADMIN_OPS'];

// ============================================================================
// CACHE
// ============================================================================

const roleScopeCache = new Map();
const cacheTTL = 5 * 60 * 1000; // 5 minutes
let lastCacheRefresh = 0;

/**
 * Clear the role scope cache
 */
function clearCache() {
  roleScopeCache.clear();
  lastCacheRefresh = 0;
  console.log('[DataScope] Cache cleared');
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get the effective data scope for a user
 * 
 * Priority:
 * 1. User-level override (users_enhanced.data_scope_override)
 * 2. Role-level scope (rbac_roles.data_scope)
 * 3. Default based on role name
 * 
 * @param {Object} user - User object with id, role, tenant_id
 * @returns {Promise<Object>} Scope object { scope, params }
 */
async function getDataScope(user) {
  const prisma = getPrisma();
  const roleName = (user.role || user.roleName || '').toUpperCase();
  const userId = user.id || user.userId;
  const tenantId = user.tenant_id || user.tenantId;
  
  // ========================================================================
  // CHECK 1: User-level override
  // ========================================================================
  try {
    const userRecord = await prisma.users_enhanced.findUnique({
      where: { id: userId },
      select: { data_scope_override: true }
    });
    
    if (userRecord?.data_scope_override) {
      const override = userRecord.data_scope_override;
      console.log(`[DataScope] Using user-level override for user ${userId}:`, override);
      return {
        scope: override.scope || 'SELF',
        params: override,
        source: 'USER_OVERRIDE'
      };
    }
  } catch {
    // Column may not exist yet, continue to role-level
  }
  
  // ========================================================================
  // CHECK 2: Role-level scope from database
  // ========================================================================
  const cacheKey = `${roleName}:${tenantId || 'global'}`;
  const now = Date.now();
  
  // Refresh cache if expired
  if (now - lastCacheRefresh > cacheTTL) {
    roleScopeCache.clear();
    lastCacheRefresh = now;
  }
  
  if (roleScopeCache.has(cacheKey)) {
    return roleScopeCache.get(cacheKey);
  }
  
  try {
    // Get role's data scope
    const roleRecord = await prisma.$queryRaw`
      SELECT data_scope FROM rbac_roles 
      WHERE UPPER(name) = ${roleName} AND is_active = true
      LIMIT 1
    `;
    
    const scope = roleRecord[0]?.data_scope || 'SELF';
    
    // Get additional scope parameters if DEPARTMENT or TEAM
    const params = {};
    if (['DEPARTMENT', 'TEAM'].includes(scope)) {
      const scopeParams = await prisma.$queryRaw`
        SELECT scope_key, scope_value 
        FROM role_data_scope_params
        WHERE role_name = ${roleName}
          AND (tenant_id IS NULL OR tenant_id = ${tenantId})
      `;
      
      for (const param of scopeParams) {
        if (!params[param.scope_key]) params[param.scope_key] = [];
        params[param.scope_key].push(param.scope_value);
      }
    }
    
    const result = {
      scope,
      params,
      source: 'ROLE_DB'
    };
    
    roleScopeCache.set(cacheKey, result);
    console.log(`[DataScope] Role ${roleName} → scope ${scope}`, params);
    
    return result;
    
  } catch (err) {
    console.warn('[DataScope] Error fetching from DB, using defaults:', err.message);
  }
  
  // ========================================================================
  // CHECK 3: Default based on role name
  // ========================================================================
  let defaultScope = 'SELF';
  
  if (PLATFORM_SCOPE_ROLES.includes(roleName)) {
    defaultScope = 'ALL';
  } else if (TENANT_SCOPE_ROLES.includes(roleName)) {
    defaultScope = 'TENANT';
  } else if (roleName.includes('MANAGER') || roleName.includes('ADMIN')) {
    defaultScope = 'DEPARTMENT';
  } else if (roleName.includes('LEAD') || roleName.includes('SUPERVISOR')) {
    defaultScope = 'TEAM';
  }
  
  const result = {
    scope: defaultScope,
    params: {},
    source: 'DEFAULT'
  };
  
  roleScopeCache.set(cacheKey, result);
  console.log(`[DataScope] Using default for ${roleName} → ${defaultScope}`);
  
  return result;
}

/**
 * Apply data scope filtering to a Prisma WHERE clause
 * 
 * @param {Object} baseWhere - Base WHERE conditions
 * @param {Object} scopeInfo - Result from getDataScope()
 * @param {Object} user - User object with id, tenant_id, department_id, team_id
 * @returns {Object} Modified WHERE clause with scope filters
 */
function applyDataScope(baseWhere, scopeInfo, user) {
  const { scope, params } = scopeInfo;
  const userId = user.id || user.userId;
  const tenantId = user.tenant_id || user.tenantId;
  const departmentId = user.department_id || user.departmentId;
  const teamId = user.team_id || user.teamId;
  
  // Start with base conditions
  const where = { ...baseWhere };
  
  switch (scope) {
    case 'ALL':
      // No additional filtering - see everything
      break;
      
    case 'TENANT':
      // Filter to user's tenant
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      break;
      
    case 'DEPARTMENT':
      // Filter to user's tenant + department(s)
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      
      // Use params if available, otherwise use user's department
      if (params.departments?.length > 0) {
        where.department_id = { in: params.departments };
      } else if (params.department?.length > 0) {
        where.department_id = { in: params.department };
      } else if (departmentId) {
        where.department_id = departmentId;
      }
      break;
      
    case 'TEAM':
      // Filter to user's tenant + team(s)
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      
      // Use params if available, otherwise use user's team
      if (params.teams?.length > 0) {
        where.team_id = { in: params.teams };
      } else if (params.team?.length > 0) {
        where.team_id = { in: params.team };
      } else if (teamId) {
        where.team_id = teamId;
      }
      break;
      
    case 'SELF':
    default:
      // Filter to own records only
      if (tenantId) {
        where.tenant_id = tenantId;
      }
      // Add user ID filter - field name varies by table
      // Caller should specify the correct field or use applyDataScopeWithUserField
      where.user_id = userId;
      break;
  }
  
  return where;
}

/**
 * Apply data scope with a custom user ID field name
 * 
 * @param {Object} baseWhere - Base WHERE conditions
 * @param {Object} scopeInfo - Result from getDataScope()
 * @param {Object} user - User object
 * @param {string} userIdField - Field name for user ID (e.g., 'created_by', 'assigned_to', 'owner_id')
 * @returns {Object} Modified WHERE clause
 */
function applyDataScopeWithUserField(baseWhere, scopeInfo, user, userIdField = 'user_id') {
  const where = applyDataScope(baseWhere, scopeInfo, user);
  
  // For SELF scope, replace user_id with the correct field
  if (scopeInfo.scope === 'SELF' && where.user_id) {
    const userId = where.user_id;
    delete where.user_id;
    where[userIdField] = userId;
  }
  
  return where;
}

/**
 * Apply data scope to a raw SQL query
 * Returns SQL conditions and parameters
 * 
 * @param {Object} scopeInfo - Result from getDataScope()
 * @param {Object} user - User object
 * @param {Object} options - { tableName, userIdColumn, tenantColumn, departmentColumn, teamColumn }
 * @returns {Object} { sql, params }
 */
function applyDataScopeSQL(scopeInfo, user, options = {}) {
  const { scope, params: scopeParams } = scopeInfo;
  const {
    tableName = '',
    userIdColumn = 'user_id',
    tenantColumn = 'tenant_id',
    departmentColumn = 'department_id',
    teamColumn = 'team_id'
  } = options;
  
  const prefix = tableName ? `${tableName}.` : '';
  const userId = user.id || user.userId;
  const tenantId = user.tenant_id || user.tenantId;
  const departmentId = user.department_id || user.departmentId;
  const teamId = user.team_id || user.teamId;
  
  const conditions = [];
  const params = {};
  
  switch (scope) {
    case 'ALL':
      // No filter
      break;
      
    case 'TENANT':
      if (tenantId) {
        conditions.push(`${prefix}${tenantColumn} = :tenantId`);
        params.tenantId = tenantId;
      }
      break;
      
    case 'DEPARTMENT': {
      if (tenantId) {
        conditions.push(`${prefix}${tenantColumn} = :tenantId`);
        params.tenantId = tenantId;
      }
      
      const depts = scopeParams.departments || scopeParams.department || [departmentId];
      if (depts.length > 0) {
        conditions.push(`${prefix}${departmentColumn} = ANY(:departments)`);
        params.departments = depts;
      }
      break;
    }
      
    case 'TEAM': {
      if (tenantId) {
        conditions.push(`${prefix}${tenantColumn} = :tenantId`);
        params.tenantId = tenantId;
      }
      
      const teams = scopeParams.teams || scopeParams.team || [teamId];
      if (teams.length > 0) {
        conditions.push(`${prefix}${teamColumn} = ANY(:teams)`);
        params.teams = teams;
      }
      break;
    }
      
    case 'SELF':
    default:
      if (tenantId) {
        conditions.push(`${prefix}${tenantColumn} = :tenantId`);
        params.tenantId = tenantId;
      }
      conditions.push(`${prefix}${userIdColumn} = :userId`);
      params.userId = userId;
      break;
  }
  
  return {
    sql: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    params
  };
}

/**
 * Check if a user can access a specific record based on data scope
 * 
 * @param {Object} scopeInfo - Result from getDataScope()
 * @param {Object} user - Current user
 * @param {Object} record - Record to check (must have tenant_id, user_id/owner_id, etc.)
 * @returns {boolean} True if user can access the record
 */
function canAccessRecord(scopeInfo, user, record) {
  const { scope, params } = scopeInfo;
  const userId = user.id || user.userId;
  const tenantId = user.tenant_id || user.tenantId;
  const departmentId = user.department_id || user.departmentId;
  const teamId = user.team_id || user.teamId;
  
  switch (scope) {
    case 'ALL':
      return true;
      
    case 'TENANT':
      return record.tenant_id === tenantId;
      
    case 'DEPARTMENT': {
      if (record.tenant_id !== tenantId) return false;
      
      const allowedDepts = params.departments || params.department || [departmentId];
      return allowedDepts.includes(record.department_id);
    }
      
    case 'TEAM': {
      if (record.tenant_id !== tenantId) return false;
      
      const allowedTeams = params.teams || params.team || [teamId];
      return allowedTeams.includes(record.team_id);
    }
      
    case 'SELF':
    default:
      if (record.tenant_id !== tenantId) return false;
      
      // Check various user ID fields
      return record.user_id === userId || 
             record.owner_id === userId ||
             record.created_by === userId ||
             record.assigned_to === userId;
  }
}

/**
 * Middleware to attach data scope to request
 * Use after authentication middleware
 */
async function attachDataScope(req, res, next) {
  try {
    if (req.user) {
      req.dataScope = await getDataScope(req.user);
      req.applyDataScope = (baseWhere) => applyDataScope(baseWhere, req.dataScope, req.user);
    }
    next();
  } catch (error) {
    console.error('[DataScope] Error in middleware:', error);
    next(); // Continue without scope (will use SELF default)
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core functions
  getDataScope,
  applyDataScope,
  applyDataScopeWithUserField,
  applyDataScopeSQL,
  canAccessRecord,
  
  // Middleware
  attachDataScope,
  
  // Cache management
  clearCache,
  
  // Constants
  SCOPE_LEVELS,
  PLATFORM_SCOPE_ROLES,
  TENANT_SCOPE_ROLES
};
