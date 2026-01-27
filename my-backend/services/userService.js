/**
 * CANONICAL USER SERVICE
 * ======================
 * 
 * This is the SINGLE SOURCE OF TRUTH for all user lifecycle operations.
 * 
 * ALL user creation and update operations MUST go through this service.
 * Direct prisma.users_enhanced.create/update calls are PROHIBITED outside this file.
 * 
 * @version 1.0.0
 * @date 2026-01-05
 * @author Principal Systems Architect
 * @audit PRINCIPAL_SYSTEMS_AUDIT.md
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Import auto-grant service for subscription-based page permissions
let grantPagesForNewUser;
try {
  grantPagesForNewUser = require('./subscriptionPageGrant').grantPagesForNewUser;
} catch (err) {
  console.warn('[UserService] subscriptionPageGrant not available:', err.message);
  grantPagesForNewUser = null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BUSINESS_LEVEL = {
  MIN: 1,
  MAX: 10,
  DEFAULT: 1,
};

// Removed unused VALID_ROLES constant

const PASSWORD_MIN_LENGTH = 12;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw new Error('VALIDATION_ERROR: Invalid email format');
  }
}

/**
 * Validate password strength
 */
function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(`VALIDATION_ERROR: Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('VALIDATION_ERROR: Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('VALIDATION_ERROR: Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('VALIDATION_ERROR: Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('VALIDATION_ERROR: Password must contain at least one special character');
  }
}

/**
 * Validate business_level
 */
function validateBusinessLevel(level) {
  const parsedLevel = parseInt(level);
  if (isNaN(parsedLevel) || parsedLevel < BUSINESS_LEVEL.MIN || parsedLevel > BUSINESS_LEVEL.MAX) {
    throw new Error(`VALIDATION_ERROR: business_level must be between ${BUSINESS_LEVEL.MIN} and ${BUSINESS_LEVEL.MAX}`);
  }
  return parsedLevel;
}

/**
 * Validate reports_to does not create self-reference
 */
function validateNoSelfReference(userId, reportsTo) {
  if (reportsTo && userId && reportsTo === userId) {
    throw new Error('VALIDATION_ERROR: User cannot report to themselves');
  }
}

/**
 * Check for reporting chain cycles (A -> B -> C -> A)
 * @param {string} managerId - The proposed manager UUID
 * @param {string} userId - The user being assigned (null for new users)
 * @returns {Promise<boolean>} True if cycle detected
 */
async function detectReportingCycle(managerId, userId) {
  if (!managerId || !userId) return false;
  
  const MAX_DEPTH = 20; // Prevent infinite loops
  let currentId = managerId;
  let depth = 0;
  
  while (currentId && depth < MAX_DEPTH) {
    if (currentId === userId) {
      return true; // Cycle detected
    }
    
    const manager = await prisma.users_enhanced.findUnique({
      where: { id: currentId },
      select: { reports_to: true },
    });
    
    currentId = manager?.reports_to;
    depth++;
  }
  
  return false;
}

// ============================================================================
// SUBSCRIPTION ENFORCEMENT
// ============================================================================

/**
 * Check subscription limits for user creation
 * FAIL-CLOSED: If no subscription found, BLOCK the operation
 */
async function enforceSubscriptionLimits(tenantId) {
  if (!tenantId) {
    console.warn('[UserService] No tenantId provided - skipping subscription check');
    return; // Allow for system users without tenant
  }
  
  const result = await prisma.$queryRaw`
    SELECT 
      (SELECT COUNT(*) FROM users_enhanced WHERE tenant_id = ${tenantId}::uuid AND is_active = true) as current_count,
      (SELECT sp.max_users FROM subscription_plans sp 
        JOIN client_subscriptions cs ON sp.id = cs.plan_id 
        WHERE cs.client_id = ${tenantId}::uuid AND cs.state = 'ACTIVE'
        LIMIT 1) as max_users
  `;
  
  const { current_count, max_users } = result[0] || {};
  
  // FAIL-CLOSED: No subscription = no user creation
  if (max_users === null || max_users === undefined) {
    console.warn(`[SECURITY] UserService: No active subscription for tenant ${tenantId}`);
    throw new Error('SUBSCRIPTION_ERROR: No active subscription found. User creation blocked.');
  }
  
  if (Number(current_count) >= Number(max_users)) {
    console.warn(`[SECURITY] UserService: User limit (${max_users}) reached for tenant ${tenantId}`);
    throw new Error(`SUBSCRIPTION_LIMIT: User limit (${max_users}) reached for this subscription plan`);
  }
}

// ============================================================================
// HIERARCHY ENFORCEMENT
// ============================================================================

/**
 * Enforce business_level and system_scope hierarchy rules
 * - Non-Enterprise Admins cannot create users with higher business_level
 * - Users cannot escalate scope (TENANT admin can't create CROSS_TENANT user)
 * - Returns the safe business_level to use
 * 
 * @param {string} adminUserId - UUID of the admin user
 * @param {number} requestedLevel - Requested business_level (1-10)
 * @param {boolean} isEnterpriseAdmin - Whether admin is enterprise admin
 * @param {string} requestedScope - Requested system_scope (optional)
 */
async function enforceHierarchy(adminUserId, requestedLevel, isEnterpriseAdmin = false, requestedScope = null) {
  if (isEnterpriseAdmin) {
    // Enterprise Admins can create any level and scope
    return { level: validateBusinessLevel(requestedLevel || BUSINESS_LEVEL.DEFAULT), scope: requestedScope || 'BUSINESS' };
  }
  
  if (!adminUserId) {
    // System operations default to level 1, scope BUSINESS
    return { level: BUSINESS_LEVEL.DEFAULT, scope: 'BUSINESS' };
  }
  
  const adminUser = await prisma.users_enhanced.findUnique({
    where: { id: adminUserId },
    select: { business_level: true, role: true, system_scope: true },
  });
  
  if (!adminUser) {
    console.warn(`[SECURITY] UserService: Admin user ${adminUserId} not found`);
    throw new Error('SECURITY_ERROR: Admin user not found');
  }
  
  const adminLevel = adminUser.business_level || BUSINESS_LEVEL.DEFAULT;
  const adminScope = adminUser.system_scope || 'BUSINESS';
  const requested = validateBusinessLevel(requestedLevel || BUSINESS_LEVEL.DEFAULT);
  const targetScope = requestedScope || 'BUSINESS';
  
  // P0-3 FIX: Scope escalation check
  // TENANT admin cannot create CROSS_TENANT users
  // BUSINESS users cannot create TENANT or CROSS_TENANT users
  const scopeOrder = { 'BUSINESS': 1, 'TENANT': 2, 'CROSS_TENANT': 3 };
  if (scopeOrder[targetScope] > scopeOrder[adminScope]) {
    console.warn(`[SECURITY] UserService: Scope escalation blocked - ${adminScope} tried to create ${targetScope} user`);
    throw new Error(`SCOPE_ESCALATION_BLOCKED: Cannot create user with system_scope (${targetScope}) higher than your own (${adminScope})`);
  }
  
  // Business level hierarchy check
  if (requested > adminLevel) {
    console.warn(`[SECURITY] UserService: Hierarchy violation - L${adminLevel} admin tried to create L${requested} user`);
    throw new Error(`HIERARCHY_VIOLATION: Cannot create user with business_level (L${requested}) higher than your own (L${adminLevel})`);
  }
  
  return { level: requested, scope: targetScope };
}

// ============================================================================
// ROLE ASSIGNMENT (via rbac_user_roles junction)
// ============================================================================

/**
 * Assign role to user via rbac_user_roles junction table
 * This is the CANONICAL way to assign roles.
 * 
 * @param {number} legacyId - User's legacy_id (Int) for rbac_user_roles
 * @param {string} roleName - Role name to assign
 * @param {number|null} assignedBy - Legacy ID of assigning admin
 */
async function assignRoleToUser(legacyId, roleName, assignedBy = null) {
  if (!legacyId || !roleName) {
    throw new Error('VALIDATION_ERROR: legacyId and roleName are required for role assignment');
  }
  
  // Find role by name
  const role = await prisma.rbac_roles.findUnique({
    where: { name: roleName },
    select: { id: true },
  });
  
  if (!role) {
    console.warn(`[UserService] Role '${roleName}' not found in rbac_roles - using string role only`);
    return null; // Role doesn't exist in RBAC system, string role will be used
  }
  
  // Upsert role assignment
  await prisma.$executeRaw`
    INSERT INTO rbac_user_roles (user_id, role_id, assigned_at, assigned_by, is_active)
    VALUES (${legacyId}, ${role.id}, NOW(), ${assignedBy}, true)
    ON CONFLICT (user_id, role_id) 
    DO UPDATE SET is_active = true, assigned_at = NOW(), assigned_by = ${assignedBy}
  `;
  
  return role.id;
}

/**
 * Remove all role assignments for a user
 */
async function clearUserRoles(legacyId) {
  await prisma.$executeRaw`
    UPDATE rbac_user_roles SET is_active = false WHERE user_id = ${legacyId}
  `;
}

// ============================================================================
// CANONICAL USER SERVICE
// ============================================================================

const UserService = {
  /**
   * CREATE USER (CANONICAL)
   * =======================
   * 
   * This is the ONLY approved method to create users in BISMAN ERP.
   * All other creation paths MUST delegate to this function.
   * 
   * @param {Object} input - User creation input
   * @param {string} input.username - Required: Unique username
   * @param {string} input.email - Required: Unique email
   * @param {string} input.password - Required: Password (min 12 chars)
   * @param {string} input.role - Optional: Primary role name (e.g., 'USER', 'ADMIN')
   * @param {string[]} input.role_ids - Optional: Array of role names for multi-role assignment
   * @param {number} input.business_level - Optional: Business hierarchy level (1-10)
   * @param {string} input.reports_to - Optional: Manager's UUID
   * @param {string} input.tenant_id - Optional: Tenant UUID for multi-tenancy
   * @param {Object} context - Execution context
   * @param {string} context.adminUserId - UUID of creating admin (null for system)
   * @param {boolean} context.isEnterpriseAdmin - True if Enterprise Admin
   * @param {boolean} context.skipSubscriptionCheck - True for system operations
   * 
   * @returns {Promise<Object>} Created user object
   */
  async createUser(input, context = {}) {
    const {
      username,
      email,
      password,
      role = 'USER',
      role_ids, // MULTI-ROLE FIX: Accept array of role names
      business_level,
      system_scope,
      reports_to,
      tenant_id,
      super_admin_id,
      first_name,
      last_name,
      phone,
      product_type = 'BUSINESS_ERP',
      assigned_modules,
      page_permissions,
      profile_pic_url,
    } = input;

    const {
      adminUserId,
      isEnterpriseAdmin = false,
      skipSubscriptionCheck = false,
      assignedByLegacyId,
    } = context;

    console.log(`[UserService] createUser called for ${email} by admin ${adminUserId || 'SYSTEM'}`);

    try {
      // ========== VALIDATION ==========
      if (!username || !email || !password) {
        throw new Error('VALIDATION_ERROR: username, email, and password are required');
      }

      validateEmail(email);
      validatePassword(password);

      // Check email uniqueness WITHIN THE SAME TENANT (tenant isolation)
      // Same email can exist in different tenants, but NOT within the same tenant
      if (tenant_id) {
        const existingInTenant = await prisma.users_enhanced.findFirst({
          where: {
            email: email.toLowerCase(),
            tenant_id: tenant_id,
          },
          select: { id: true, email: true },
        });

        if (existingInTenant) {
          throw new Error('VALIDATION_ERROR: Email already exists in this organization');
        }
      }

      // Check username uniqueness (globally unique for login purposes)
      const existingUsername = await prisma.users_enhanced.findFirst({
        where: { username },
        select: { id: true, username: true },
      });

      if (existingUsername) {
        throw new Error('VALIDATION_ERROR: Username already exists');
      }

      // ========== HIERARCHY ENFORCEMENT ==========
      // P0-3: Now also enforces scope escalation prevention
      const hierarchyResult = await enforceHierarchy(adminUserId, business_level, isEnterpriseAdmin, system_scope);
      const safeBusinessLevel = hierarchyResult.level;
      const safeSystemScope = hierarchyResult.scope;

      // ========== SUBSCRIPTION ENFORCEMENT ==========
      if (!skipSubscriptionCheck && tenant_id) {
        await enforceSubscriptionLimits(tenant_id);
      }

      // ========== REPORTS_TO VALIDATION ==========
      const newUserId = uuidv4();
      validateNoSelfReference(newUserId, reports_to);
      
      if (reports_to) {
        // Verify manager exists
        const manager = await prisma.users_enhanced.findUnique({
          where: { id: reports_to },
          select: { id: true, username: true, business_level: true },
        });
        
        if (!manager) {
          throw new Error('VALIDATION_ERROR: Specified manager (reports_to) does not exist');
        }
        
        // Manager should generally be at same or higher level
        if (manager.business_level < safeBusinessLevel) {
          console.warn(`[UserService] Warning: Assigning manager at L${manager.business_level} to user at L${safeBusinessLevel}`);
        }
      }

      // ========== CREATE USER ==========
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate legacy_id with retry logic to handle sequence conflicts
      // The sequence can get out of sync if previous transactions failed after getting nextval
      let newUser;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Generate legacy_id from sequence for backward compatibility with RBAC junction tables
          const legacyIdResult = await prisma.$queryRaw`SELECT nextval('users_enhanced_legacy_id_seq') as legacy_id`;
          const generatedLegacyId = Number(legacyIdResult[0]?.legacy_id);

          newUser = await prisma.users_enhanced.create({
            data: {
              id: newUserId,
              legacy_id: generatedLegacyId, // Set legacy_id for RBAC role assignment
              username,
              email: email.toLowerCase(),
              password_hash: hashedPassword,
              role, // String role for backwards compatibility
              business_level: safeBusinessLevel,
              system_scope: safeSystemScope, // P0-3: Use validated scope
              reports_to: reports_to || null,
              tenant_id: tenant_id || null,
              super_admin_id: super_admin_id || null,
              first_name: first_name || null,
              last_name: last_name || null,
              phone: phone || null,
              product_type,
              assigned_modules: assigned_modules || [],
              page_permissions: page_permissions || {},
              profile_pic_url: profile_pic_url || null,
              is_active: true,
              created_by: adminUserId || null,
            },
            select: {
              id: true,
              legacy_id: true,
              username: true,
              email: true,
              role: true,
              business_level: true,
              reports_to: true,
              tenant_id: true,
              created_at: true,
              first_name: true,
              last_name: true,
            },
          });
          break; // Success, exit retry loop
        } catch (createError) {
          // Check if it's a legacy_id unique constraint error (P2002)
          if (createError.code === 'P2002' && createError.meta?.target?.includes('legacy_id')) {
            retryCount++;
            console.warn(`[UserService] legacy_id conflict, resync and retry (${retryCount}/${maxRetries})`);
            
            if (retryCount >= maxRetries) {
              // Last resort: reset sequence to max+1 and try once more
              await prisma.$executeRaw`
                SELECT setval('users_enhanced_legacy_id_seq', 
                  (SELECT COALESCE(MAX(legacy_id), 0) + 1 FROM users_enhanced), 
                  false)
              `;
              console.log('[UserService] Sequence reset to max+1, final retry');
            }
            continue;
          }
          // For other errors, rethrow immediately
          throw createError;
        }
      }

      if (!newUser) {
        throw new Error('Failed to create user after multiple retries due to legacy_id conflicts');
      }

      // ========== ROLE ASSIGNMENT (via junction table) ==========
      // MULTI-ROLE FIX: Support role_ids array for multiple role assignment
      if (newUser.legacy_id) {
        const rolesToAssign = role_ids && role_ids.length > 0 ? role_ids : (role ? [role] : []);
        for (const roleName of rolesToAssign) {
          if (roleName) {
            await assignRoleToUser(newUser.legacy_id, roleName, assignedByLegacyId);
          }
        }
      }

      // ========== AUDIT LOG ==========
      try {
        const assignedRoles = role_ids && role_ids.length > 0 ? role_ids : (role ? [role] : []);
        await prisma.audit_logs.create({
          data: {
            user_id: assignedByLegacyId || null,
            action: 'CREATE_USER',
            table_name: 'users_enhanced',
            new_values: {
              id: newUser.id,
              username: newUser.username,
              email: newUser.email,
              role: newUser.role,
              assigned_roles: assignedRoles, // MULTI-ROLE FIX: Log all assigned roles
              business_level: newUser.business_level,
              reports_to: newUser.reports_to,
            },
          },
        });
      } catch (auditError) {
        console.error('[UserService] Audit log failed (non-blocking):', auditError.message);
      }

      // ========== AUTO-GRANT SUBSCRIPTION PAGES ==========
      // When a new user is created, automatically grant pages based on tenant's subscription
      // This ensures no manual Super Admin intervention is needed!
      if (newUser.legacy_id && newUser.tenant_id && grantPagesForNewUser) {
        try {
          const grantResult = await grantPagesForNewUser(newUser.legacy_id, newUser.tenant_id);
          console.log(`[UserService] Auto-granted pages for new user:`, grantResult);
        } catch (grantError) {
          console.error('[UserService] Failed to auto-grant pages (non-blocking):', grantError.message);
        }
      }

      console.log(`[UserService] User created: ${newUser.username} (${newUser.id}) at L${newUser.business_level}`);
      return newUser;

    } catch (error) {
      console.error(`[UserService] createUser failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * UPDATE USER (CANONICAL)
   * =======================
   * 
   * This is the ONLY approved method to update users in BISMAN ERP.
   * 
   * @param {string} userId - UUID of user to update
   * @param {Object} updates - Fields to update
   * @param {Object} context - Execution context
   */
  async updateUser(userId, updates, context = {}) {
    const {
      adminUserId,
      isEnterpriseAdmin = false,
      assignedByLegacyId,
    } = context;

    console.log(`[UserService] updateUser called for ${userId} by admin ${adminUserId || 'SYSTEM'}`);

    try {
      // ========== LOAD EXISTING USER ==========
      const existingUser = await prisma.users_enhanced.findUnique({
        where: { id: userId },
        select: {
          id: true,
          legacy_id: true,
          username: true,
          email: true,
          role: true,
          business_level: true,
          reports_to: true,
          tenant_id: true,
        },
      });

      if (!existingUser) {
        throw new Error('VALIDATION_ERROR: User not found');
      }

      const updateData = {};
      const oldValues = { ...existingUser };

      // ========== VALIDATE & APPLY UPDATES ==========
      
      // Email update
      if (updates.email !== undefined && updates.email !== existingUser.email) {
        validateEmail(updates.email);
        const emailExists = await prisma.users_enhanced.findFirst({
          where: { email: updates.email.toLowerCase(), id: { not: userId } },
        });
        if (emailExists) {
          throw new Error('VALIDATION_ERROR: Email already exists');
        }
        updateData.email = updates.email.toLowerCase();
      }

      // Username update
      if (updates.username !== undefined && updates.username !== existingUser.username) {
        const usernameExists = await prisma.users_enhanced.findFirst({
          where: { username: updates.username, id: { not: userId } },
        });
        if (usernameExists) {
          throw new Error('VALIDATION_ERROR: Username already exists');
        }
        updateData.username = updates.username;
      }

      // Password update
      if (updates.password) {
        validatePassword(updates.password);
        updateData.password_hash = await bcrypt.hash(updates.password, 10);
        updateData.password_changed_at = new Date();
      }

      // Business level update (requires hierarchy check)
      if (updates.business_level !== undefined && updates.business_level !== existingUser.business_level) {
        const hierarchyResult = await enforceHierarchy(adminUserId, updates.business_level, isEnterpriseAdmin, updates.system_scope);
        updateData.business_level = hierarchyResult.level;
        // Also update scope if it was provided
        if (updates.system_scope !== undefined) {
          updateData.system_scope = hierarchyResult.scope;
        }
      } else if (updates.system_scope !== undefined && updates.system_scope !== existingUser.system_scope) {
        // Scope-only update - still need to check for escalation
        const hierarchyResult = await enforceHierarchy(adminUserId, existingUser.business_level, isEnterpriseAdmin, updates.system_scope);
        updateData.system_scope = hierarchyResult.scope;
      }

      // Reports_to update (manager change)
      if (updates.reports_to !== undefined && updates.reports_to !== existingUser.reports_to) {
        validateNoSelfReference(userId, updates.reports_to);
        
        if (updates.reports_to) {
          // Check for cycles
          const hasCycle = await detectReportingCycle(updates.reports_to, userId);
          if (hasCycle) {
            throw new Error('VALIDATION_ERROR: This manager assignment would create a reporting cycle');
          }
          
          // Verify manager exists
          const manager = await prisma.users_enhanced.findUnique({
            where: { id: updates.reports_to },
            select: { id: true },
          });
          if (!manager) {
            throw new Error('VALIDATION_ERROR: Specified manager (reports_to) does not exist');
          }
        }
        
        updateData.reports_to = updates.reports_to || null;
      }

      // Role update - supports single role or role_ids array
      if (updates.role !== undefined && updates.role !== existingUser.role) {
        updateData.role = updates.role;
        
        // Update junction table
        if (existingUser.legacy_id) {
          await clearUserRoles(existingUser.legacy_id);
          await assignRoleToUser(existingUser.legacy_id, updates.role, assignedByLegacyId);
        }
      }
      
      // MULTI-ROLE FIX: Handle role_ids array for multiple role assignment
      if (updates.role_ids && Array.isArray(updates.role_ids) && updates.role_ids.length > 0) {
        if (existingUser.legacy_id) {
          await clearUserRoles(existingUser.legacy_id);
          for (const roleName of updates.role_ids) {
            if (roleName) {
              await assignRoleToUser(existingUser.legacy_id, roleName, assignedByLegacyId);
            }
          }
        }
        // Also update the legacy role field with first role for backwards compatibility
        if (!updates.role) {
          updateData.role = updates.role_ids[0];
        }
      }

      // Simple field updates
      const simpleFields = ['first_name', 'last_name', 'phone', 'profile_pic_url', 'is_active', 'assigned_modules', 'page_permissions'];
      for (const field of simpleFields) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      // ========== APPLY UPDATE ==========
      if (Object.keys(updateData).length === 0) {
        throw new Error('VALIDATION_ERROR: No valid fields to update');
      }

      updateData.updated_at = new Date();
      updateData.updated_by = adminUserId || null;

      const updatedUser = await prisma.users_enhanced.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          legacy_id: true,
          username: true,
          email: true,
          role: true,
          business_level: true,
          reports_to: true,
          updated_at: true,
          first_name: true,
          last_name: true,
        },
      });

      // ========== AUDIT LOG ==========
      try {
        await prisma.audit_logs.create({
          data: {
            user_id: assignedByLegacyId || null,
            action: 'UPDATE_USER',
            table_name: 'users_enhanced',
            record_id: existingUser.legacy_id,
            old_values: oldValues,
            new_values: updateData,
          },
        });
      } catch (auditError) {
        console.error('[UserService] Audit log failed (non-blocking):', auditError.message);
      }

      console.log(`[UserService] User updated: ${updatedUser.username} (${updatedUser.id})`);
      return updatedUser;

    } catch (error) {
      console.error(`[UserService] updateUser failed: ${error.message}`);
      throw error;
    }
  },

  /**
   * GET USER BY ID
   */
  async getUserById(userId) {
    return prisma.users_enhanced.findUnique({
      where: { id: userId },
      select: {
        id: true,
        legacy_id: true,
        username: true,
        email: true,
        role: true,
        business_level: true,
        reports_to: true,
        tenant_id: true,
        is_active: true,
        first_name: true,
        last_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
        profile_pic_url: true,
        // Include manager info via relation
        manager: {
          select: {
            id: true,
            username: true,
            email: true,
            business_level: true,
          },
        },
      },
    });
  },

  /**
   * GET DIRECT REPORTS
   */
  async getDirectReports(managerId) {
    return prisma.users_enhanced.findMany({
      where: { reports_to: managerId, is_active: true },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        business_level: true,
      },
      orderBy: { username: 'asc' },
    });
  },

  /**
   * GET MANAGER CHAIN (for approval workflows)
   */
  async getManagerChain(userId, maxDepth = 10) {
    const chain = [];
    let currentId = userId;
    let depth = 0;
    
    while (currentId && depth < maxDepth) {
      const user = await prisma.users_enhanced.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          username: true,
          business_level: true,
          reports_to: true,
        },
      });
      
      if (!user || !user.reports_to) break;
      
      chain.push({
        level: depth + 1,
        reports_to: user.reports_to, // CANONICAL: Use reports_to instead of manager_id
      });
      
      currentId = user.reports_to;
      depth++;
    }
    
    return chain;
  },

  /**
   * SOFT DELETE USER
   */
  async deleteUser(userId, context = {}) {
    const { adminUserId, assignedByLegacyId } = context;
    
    const user = await prisma.users_enhanced.findUnique({
      where: { id: userId },
      select: { id: true, legacy_id: true, username: true },
    });
    
    if (!user) {
      throw new Error('VALIDATION_ERROR: User not found');
    }
    
    // Soft delete
    await prisma.users_enhanced.update({
      where: { id: userId },
      data: {
        is_active: false,
        updated_at: new Date(),
        updated_by: adminUserId,
      },
    });
    
    // Deactivate roles
    if (user.legacy_id) {
      await clearUserRoles(user.legacy_id);
    }
    
    // Audit
    try {
      await prisma.audit_logs.create({
        data: {
          user_id: assignedByLegacyId,
          action: 'DELETE_USER',
          table_name: 'users_enhanced',
          record_id: user.legacy_id,
          old_values: { id: user.id, username: user.username },
        },
      });
    } catch (e) {
      console.error('[UserService] Audit log failed:', e.message);
    }
    
    console.log(`[UserService] User deleted: ${user.username} (${user.id})`);
    return true;
  },
};

module.exports = UserService;
module.exports.BUSINESS_LEVEL = BUSINESS_LEVEL;
module.exports.validateEmail = validateEmail;
module.exports.validatePassword = validatePassword;
module.exports.validateBusinessLevel = validateBusinessLevel;
