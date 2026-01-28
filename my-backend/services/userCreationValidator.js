/**
 * ============================================================================
 * BISMAN ERP - User Creation Validation (PHASE 2 MANDATORY FIX)
 * ============================================================================
 * 
 * SECURITY REQUIREMENTS (NON-NEGOTIABLE):
 *   1. Admin can ONLY grant pages they are approved for
 *   2. Subscription pages are filtered through 4-layer intersection
 *   3. Violations throw HARD ERRORS (no silent failures)
 *   4. ALL validations are logged for audit
 * 
 * @module services/userCreationValidator
 */

const { getPrisma } = require('../lib/prisma');
const effectiveAccessService = require('./effectiveAccessService');

// MANDATORY: Fail if service not available
if (!effectiveAccessService || !effectiveAccessService.computeEffectivePages) {
  throw new Error('[SECURITY] effectiveAccessService is REQUIRED for user creation validation');
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

class UserCreationSecurityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'UserCreationSecurityError';
    this.code = code;
    this.details = details;
    this.isSecurityViolation = true;
  }
}

class PageGrantViolationError extends UserCreationSecurityError {
  constructor(attemptedPages, adminApprovedPages) {
    const violatedPages = attemptedPages.filter(p => !adminApprovedPages.has(p));
    super(
      'PAGE_GRANT_VIOLATION',
      `Admin attempted to grant ${violatedPages.length} pages they are not approved for`,
      { violatedPages, attemptedCount: attemptedPages.length, adminApprovedCount: adminApprovedPages.size }
    );
  }
}

class SubscriptionViolationError extends UserCreationSecurityError {
  constructor(message, details = {}) {
    super('SUBSCRIPTION_VIOLATION', message, details);
  }
}

class HierarchyViolationError extends UserCreationSecurityError {
  constructor(message, details = {}) {
    super('HIERARCHY_VIOLATION', message, details);
  }
}

// ============================================================================
// VALIDATION: Get Admin's Effective Pages
// ============================================================================

/**
 * Get pages that an admin is approved to grant
 * This is the CEILING for what they can assign to new users
 * 
 * @param {number} adminLegacyId - Admin's legacy_id
 * @param {string} tenantId - Tenant ID
 * @param {number} planId - Subscription plan ID
 * @returns {Promise<Set<string>>} Set of page keys admin can grant
 */
async function getAdminGrantablePages(adminLegacyId, tenantId, planId) {
  // Admin's effective pages = what they can grant (they can't grant what they don't have)
  const result = await effectiveAccessService.computeEffectivePages({
    userId: adminLegacyId,
    tenantId,
    planId
  });
  
  if (!result || !result.effectivePages || result.effectivePages.length === 0) {
    console.warn(`[UserCreationValidator] Admin ${adminLegacyId} has NO effective pages to grant`);
    return new Set();
  }
  
  return new Set(result.effectivePages);
}

/**
 * Get pages that a role typically has access to
 * This is used to determine what the new user's role needs
 * 
 * @param {string} roleName - Role name
 * @returns {Promise<Set<string>>} Set of page keys for role
 */
async function getRolePages(roleName) {
  const prisma = getPrisma();
  
  const rolePages = await prisma.$queryRaw`
    SELECT DISTINCT pm.page_code
    FROM role_page_access rpa
    JOIN pages_master pm ON rpa.page_id = pm.id
    WHERE rpa.role_name = ${roleName}
      AND rpa.can_view = true
      AND pm.is_active = true
  `;
  
  return new Set(rolePages.map(r => r.page_code));
}

// ============================================================================
// VALIDATION: Validate Page Grant Request
// ============================================================================

/**
 * Validate that admin can grant all requested pages
 * THROWS HARD ERROR if any violation detected
 * 
 * @param {Object} params
 * @param {number} params.adminLegacyId - Admin creating the user
 * @param {string} params.tenantId - Tenant ID
 * @param {number} params.planId - Subscription plan ID
 * @param {string} params.newUserRole - Role for new user
 * @param {string[]} params.requestedPages - Optional explicit pages (if null, use role pages)
 * @returns {Promise<Object>} Validation result with grantable pages
 */
async function validatePageGrant({
  adminLegacyId,
  tenantId,
  planId,
  newUserRole,
  requestedPages = null
}) {
  console.log(`[UserCreationValidator] Validating page grant: admin=${adminLegacyId}, role=${newUserRole}`);
  
  // STEP 1: Get admin's approved pages (ceiling)
  const adminApprovedPages = await getAdminGrantablePages(adminLegacyId, tenantId, planId);
  
  if (adminApprovedPages.size === 0) {
    throw new PageGrantViolationError(
      requestedPages || ['*'],
      adminApprovedPages
    );
  }
  
  // STEP 2: Get role's default pages
  const rolePages = await getRolePages(newUserRole);
  
  // STEP 3: Determine pages to grant
  // If explicit pages requested, use those; otherwise use role defaults
  const pagesToGrant = requestedPages 
    ? new Set(requestedPages)
    : rolePages;
  
  // STEP 4: HARD VALIDATION - all requested pages must be in admin's approved set
  const violations = [];
  const approved = [];
  
  for (const pageKey of pagesToGrant) {
    if (adminApprovedPages.has(pageKey)) {
      approved.push(pageKey);
    } else {
      violations.push(pageKey);
    }
  }
  
  // STEP 5: HARD ERROR on any violation
  if (violations.length > 0) {
    console.error(`[SECURITY] UserCreationValidator: Admin ${adminLegacyId} tried to grant unauthorized pages:`, violations);
    
    throw new PageGrantViolationError(
      Array.from(pagesToGrant),
      adminApprovedPages
    );
  }
  
  console.log(`[UserCreationValidator] PASS: Admin can grant ${approved.length} pages for role ${newUserRole}`);
  
  return {
    valid: true,
    grantablePages: approved,
    adminApprovedCount: adminApprovedPages.size,
    roleDefaultCount: rolePages.size,
    actualGrantCount: approved.length
  };
}

// ============================================================================
// VALIDATION: Full User Creation Validation
// ============================================================================

/**
 * Complete validation for user creation
 * Runs ALL checks and throws HARD ERRORS on any failure
 * 
 * @param {Object} params - User creation parameters
 * @returns {Promise<Object>} Validated parameters with approved pages
 */
async function validateUserCreation({
  adminUserId: _adminUserId,  // UUID of admin creating user (reserved)
  adminLegacyId,        // legacy_id of admin
  adminRole,            // Role of admin
  tenantId,             // Target tenant
  planId,               // Subscription plan
  newUserData,          // New user's data
  requestedPages = null // Optional explicit pages
}) {
  const prisma = getPrisma();
  
  console.log(`[UserCreationValidator] Full validation: admin=${adminLegacyId}, tenant=${tenantId}`);
  
  // =========================================================================
  // VALIDATION 1: Subscription Check
  // =========================================================================
  
  const subscription = await prisma.client_subscriptions.findFirst({
    where: { 
      client_id: tenantId,
      state: { in: ['ACTIVE', 'TRIAL'] }
    },
    select: { plan_id: true, state: true }
  });
  
  if (!subscription) {
    throw new SubscriptionViolationError(
      'No active subscription - user creation blocked',
      { tenantId }
    );
  }
  
  const effectivePlanId = planId || subscription.plan_id;
  
  // =========================================================================
  // VALIDATION 2: User Limit Check
  // =========================================================================
  
  const userCountResult = await prisma.$queryRaw`
    SELECT 
      (SELECT COUNT(*) FROM users_enhanced WHERE tenant_id = ${tenantId}::uuid AND is_active = true) as current_count,
      (SELECT max_users FROM subscription_plans WHERE id = ${effectivePlanId}) as max_users
  `;
  
  const { current_count, max_users } = userCountResult[0] || {};
  
  if (max_users !== null && Number(current_count) >= Number(max_users)) {
    throw new SubscriptionViolationError(
      `User limit (${max_users}) reached for subscription`,
      { currentCount: current_count, maxUsers: max_users }
    );
  }
  
  // =========================================================================
  // VALIDATION 3: Hierarchy Check (business_level)
  // =========================================================================
  
  const isSystemAdmin = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(adminRole);
  
  if (!isSystemAdmin && adminLegacyId) {
    // Get admin's business level
    const adminUser = await prisma.users_enhanced.findFirst({
      where: { legacy_id: adminLegacyId },
      select: { business_level: true, role: true }
    });
    
    const requestedLevel = newUserData.business_level || 1;
    
    // Non-system admins cannot create users at higher or equal level
    if (adminUser && requestedLevel >= adminUser.business_level) {
      throw new HierarchyViolationError(
        `Cannot create user at level ${requestedLevel} (admin level: ${adminUser.business_level})`,
        { 
          adminLevel: adminUser.business_level, 
          requestedLevel,
          rule: 'Admin can only create users at LOWER business_level'
        }
      );
    }
  }
  
  // =========================================================================
  // VALIDATION 4: Page Grant Check (CRITICAL)
  // =========================================================================
  
  let validatedPages = [];
  
  // Only validate if admin is not a system admin
  if (!isSystemAdmin && adminLegacyId) {
    const pageValidation = await validatePageGrant({
      adminLegacyId,
      tenantId,
      planId: effectivePlanId,
      newUserRole: newUserData.role,
      requestedPages
    });
    
    validatedPages = pageValidation.grantablePages;
  } else {
    // System admins can grant all role pages
    const rolePages = await getRolePages(newUserData.role);
    validatedPages = Array.from(rolePages);
  }
  
  // =========================================================================
  // VALIDATION PASSED
  // =========================================================================
  
  console.log(`[UserCreationValidator] ALL CHECKS PASSED for new user role=${newUserData.role}`);
  
  return {
    valid: true,
    planId: effectivePlanId,
    grantablePages: validatedPages,
    validations: {
      subscription: 'PASS',
      userLimit: 'PASS',
      hierarchy: 'PASS',
      pageGrant: 'PASS'
    }
  };
}

// ============================================================================
// HELPER: Log Security Violation
// ============================================================================

async function logSecurityViolation(violation) {
  try {
    const prisma = getPrisma();
    await prisma.audit_logs.create({
      data: {
        user_id: violation.adminLegacyId,
        action: 'SECURITY_VIOLATION',
        table_name: 'users_enhanced',
        new_values: {
          type: violation.type,
          message: violation.message,
          details: violation.details,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (err) {
    console.error('[UserCreationValidator] Failed to log violation:', err.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main validators
  validateUserCreation,
  validatePageGrant,
  getAdminGrantablePages,
  getRolePages,
  
  // Error classes for catching specific violations
  UserCreationSecurityError,
  PageGrantViolationError,
  SubscriptionViolationError,
  HierarchyViolationError,
  
  // Utilities
  logSecurityViolation
};
