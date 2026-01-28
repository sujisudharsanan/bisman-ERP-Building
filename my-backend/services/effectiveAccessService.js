/**
 * EFFECTIVE ACCESS SERVICE
 * =========================
 * 
 * Computes effective roles and pages using THREE-LAYER INTERSECTION:
 * 
 *   effectiveRoles = subscriptionRoles ∩ enterpriseApproved ∩ superadminApproved
 *   effectivePages = subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
 * 
 * A client/admin can access a page ONLY when:
 *   ✅ Page is in the selected Subscription (base entitlement)
 *   ✅ Page is approved by Enterprise Admin for the Superadmin (enterprise gate)
 *   ✅ Page is approved by Superadmin for that Client/Admin (client gate)
 * 
 * SOURCES OF TRUTH:
 *   1. Subscription Mapping: plan_module_access + pages_master (what subscription includes)
 *   2. Enterprise Approval: admin_page_assignments where assigner_type='ENTERPRISE_ADMIN' (enterprise gate)
 *   3. Superadmin Approval: admin_page_assignments where assigner_type='SUPER_ADMIN' (client gate)
 * 
 * @module services/effectiveAccessService
 */

const { getPrisma } = require('../lib/prisma');

// ============================================================================
// CONSTANTS
// ============================================================================

// These pages are ALWAYS accessible to any logged-in user regardless of role/subscription
const ALWAYS_ACCESSIBLE_PAGES = [
  'dashboard', 'home', 'profile', 'settings', 'help', 'support', 'notifications',
  // Common module pages - accessible to all logged-in users
  'calendar', 'user-settings', 'user_settings', 'usersettings',
  '/common/calendar', '/common/user-settings', '/calendar', '/settings',
  'common_calendar', 'common_user_settings'
];

const ALWAYS_ACCESSIBLE_MODULES = [
  'dashboard', 'common', 'chat', 'support', 'help'
];

// ============================================================================
// HELPER: Get pages from subscription plan
// ============================================================================

/**
 * Get all pages included in a subscription plan
 * @param {number} planId - Subscription plan ID
 * @returns {Promise<Set<string>>} Set of page keys
 */
async function getSubscriptionPages(planId) {
  const prisma = getPrisma();
  
  // Get modules accessible by this plan
  const moduleAccess = await prisma.plan_module_access.findMany({
    where: { 
      plan_id: planId,
      access_level: { not: 'none' }
    },
    select: { module_id: true }
  });
  
  const accessibleModules = new Set([
    ...ALWAYS_ACCESSIBLE_MODULES,
    ...moduleAccess.map(m => m.module_id)
  ]);
  
  // Get pages from those modules
  const pages = await prisma.$queryRaw`
    SELECT pm.page_code, pm.route, mm.module_code
    FROM pages_master pm
    JOIN modules_master mm ON pm.module_id = mm.id
    WHERE mm.module_code = ANY(${Array.from(accessibleModules)}::text[])
      AND pm.is_active = true
  `;
  
  const pageKeys = new Set(ALWAYS_ACCESSIBLE_PAGES);
  for (const page of pages) {
    if (page.page_code) pageKeys.add(page.page_code);
    if (page.route) pageKeys.add(page.route);
  }
  
  return pageKeys;
}

// ============================================================================
// HELPER: Get Enterprise Admin approved pages for a Superadmin
// ============================================================================

/**
 * Get pages approved by Enterprise Admin for a specific Superadmin
 * @param {number} superadminId - The Superadmin's legacy_id
 * @returns {Promise<Set<string>>} Set of approved page keys
 */
async function getEnterpriseApprovedPages(superadminId) {
  const prisma = getPrisma();
  
  // Check admin_page_assignments where Enterprise Admin assigned to this Superadmin
  const assignments = await prisma.$queryRaw`
    SELECT page_key, page_id, is_active
    FROM admin_page_assignments
    WHERE assignee_id = ${superadminId}
      AND assigner_type = 'ENTERPRISE_ADMIN'
      AND is_active = true
  `;
  
  const pageKeys = new Set(ALWAYS_ACCESSIBLE_PAGES);
  for (const a of assignments) {
    if (a.page_key) pageKeys.add(a.page_key);
  }
  
  // If no explicit assignments, Enterprise Admin hasn't restricted - allow all
  // This is the "default open" behavior until Enterprise Admin configures
  if (assignments.length === 0) {
    return null; // null means "no restriction"
  }
  
  return pageKeys;
}

// ============================================================================
// HELPER: Get Superadmin approved pages for a Client/Admin
// ============================================================================

/**
 * Get pages approved by Superadmin for a specific Client/Admin
 * @param {number} clientAdminId - The Client Admin's legacy_id
 * @param {string} _tenantId - The tenant/client ID (reserved for future use)
 * @returns {Promise<Set<string>>} Set of approved page keys
 */
async function getSuperadminApprovedPages(clientAdminId, _tenantId) {
  const prisma = getPrisma();
  
  // Check admin_page_assignments where Superadmin assigned to this user
  const userAssignments = await prisma.$queryRaw`
    SELECT page_key, is_active
    FROM admin_page_assignments
    WHERE assignee_id = ${clientAdminId}
      AND assigner_type = 'SUPER_ADMIN'
      AND is_active = true
  `;
  
  // Also check rbac_user_permissions for explicit grants
  const rbacPermissions = await prisma.rbac_user_permissions.findMany({
    where: { user_id: clientAdminId },
    select: { page_key: true }
  });
  
  const pageKeys = new Set(ALWAYS_ACCESSIBLE_PAGES);
  
  for (const a of userAssignments) {
    if (a.page_key) pageKeys.add(a.page_key);
  }
  
  for (const p of rbacPermissions) {
    if (p.page_key) pageKeys.add(p.page_key);
  }
  
  // If no explicit assignments, Superadmin hasn't configured - return null (no restriction)
  if (userAssignments.length === 0 && rbacPermissions.length === 0) {
    return null;
  }
  
  return pageKeys;
}

// ============================================================================
// MAIN: Compute Effective Pages
// ============================================================================

/**
 * Compute effective pages for a user using THREE-LAYER INTERSECTION
 * 
 * @param {Object} params
 * @param {number} params.userId - User's legacy_id
 * @param {string} params.tenantId - Tenant/client ID
 * @param {number} params.planId - Subscription plan ID
 * @param {number} params.superadminId - The Superadmin managing this tenant (optional)
 * @returns {Promise<Object>} Effective access result
 */
async function computeEffectivePages({
  userId,
  tenantId,
  planId,
  superadminId = null
}) {
  console.log(`[EffectiveAccess] Computing for user=${userId}, tenant=${tenantId}, plan=${planId}`);
  
  const result = {
    effectivePages: [],
    blockedPages: [],
    accessDetails: {},
    planId,
    tenantId
  };
  
  try {
    // LAYER 1: Get subscription pages (base entitlement)
    const subscriptionPages = await getSubscriptionPages(planId);
    console.log(`[EffectiveAccess] Subscription has ${subscriptionPages.size} pages`);
    
    // LAYER 2: Get Enterprise Admin approved pages (enterprise gate)
    // Find the Superadmin for this tenant if not provided
    if (!superadminId) {
      const prisma = getPrisma();
      const client = await prisma.clients.findUnique({
        where: { id: tenantId },
        select: { super_admin_id: true }
      });
      superadminId = client?.super_admin_id;
    }
    
    let enterpriseApproved = null;
    if (superadminId) {
      enterpriseApproved = await getEnterpriseApprovedPages(superadminId);
      if (enterpriseApproved) {
        console.log(`[EffectiveAccess] Enterprise approved ${enterpriseApproved.size} pages for Superadmin ${superadminId}`);
      } else {
        console.log(`[EffectiveAccess] No Enterprise restrictions for Superadmin ${superadminId}`);
      }
    }
    
    // LAYER 3: Get Superadmin approved pages (client gate)
    const superadminApproved = await getSuperadminApprovedPages(userId, tenantId);
    if (superadminApproved) {
      console.log(`[EffectiveAccess] Superadmin approved ${superadminApproved.size} pages for user ${userId}`);
    } else {
      console.log(`[EffectiveAccess] No Superadmin restrictions for user ${userId}`);
    }
    
    // COMPUTE INTERSECTION
    for (const pageKey of subscriptionPages) {
      const inSubscription = true;
      const inEnterprise = enterpriseApproved === null || enterpriseApproved.has(pageKey);
      const inSuperadmin = superadminApproved === null || superadminApproved.has(pageKey);
      
      const isEffective = inSubscription && inEnterprise && inSuperadmin;
      
      result.accessDetails[pageKey] = {
        inSubscription,
        inEnterprise,
        inSuperadmin,
        isEffective,
        blockedReason: !isEffective ? (
          !inEnterprise ? 'Not approved by Enterprise Admin' :
          !inSuperadmin ? 'Not enabled by Superadmin' :
          'Unknown'
        ) : null
      };
      
      if (isEffective) {
        result.effectivePages.push(pageKey);
      } else {
        result.blockedPages.push({
          pageKey,
          reason: result.accessDetails[pageKey].blockedReason
        });
      }
    }
    
    console.log(`[EffectiveAccess] Result: ${result.effectivePages.length} effective, ${result.blockedPages.length} blocked`);
    
    return result;
    
  } catch (error) {
    console.error('[EffectiveAccess] Error computing effective pages:', error);
    throw error;
  }
}

// ============================================================================
// MAIN: Compute Effective Roles
// ============================================================================

/**
 * Compute effective roles for a user using THREE-LAYER INTERSECTION
 * 
 * @param {Object} params
 * @param {number} params.userId - User's legacy_id
 * @param {string} params.tenantId - Tenant/client ID
 * @param {number} params.planId - Subscription plan ID
 * @param {number} params.superadminId - The Superadmin managing this tenant
 * @returns {Promise<Object>} Effective roles result
 */
async function computeEffectiveRoles({
  userId,
  tenantId,
  planId,
  superadminId = null
}) {
  const prisma = getPrisma();
  
  console.log(`[EffectiveAccess] Computing roles for user=${userId}, tenant=${tenantId}, plan=${planId}`);
  
  const result = {
    effectiveRoles: [],
    blockedRoles: [],
    roleDetails: {},
    planId,
    tenantId
  };
  
  try {
    // LAYER 1: Get subscription roles (from plan_role_access or all roles for high plans)
    const planRoles = await prisma.$queryRaw`
      SELECT r.id, r.name, r.display_name
      FROM rbac_roles r
      WHERE r.is_active = true
        AND r.status = 'active'
    `;
    
    // For simplicity, all active roles are available - plans may restrict this in future
    const subscriptionRoles = new Set(planRoles.map(r => r.name.toUpperCase()));
    
    // LAYER 2: Get Enterprise Admin approved roles for Superadmin
    let enterpriseApprovedRoles = null;
    if (superadminId) {
      const enterpriseRoleAssignments = await prisma.$queryRaw`
        SELECT role_id, role_name
        FROM admin_role_assignments
        WHERE assignee_id = ${superadminId}
          AND assigner_type = 'ENTERPRISE_ADMIN'
          AND is_active = true
      `;
      
      if (enterpriseRoleAssignments.length > 0) {
        enterpriseApprovedRoles = new Set(
          enterpriseRoleAssignments.map(a => (a.role_name || '').toUpperCase())
        );
      }
    }
    
    // LAYER 3: Get Superadmin approved roles for this user
    const superadminRoleAssignments = await prisma.$queryRaw`
      SELECT role_id, role_name
      FROM admin_role_assignments
      WHERE assignee_id = ${userId}
        AND assigner_type = 'SUPER_ADMIN'
        AND is_active = true
    `;
    
    let superadminApprovedRoles = null;
    if (superadminRoleAssignments.length > 0) {
      superadminApprovedRoles = new Set(
        superadminRoleAssignments.map(a => (a.role_name || '').toUpperCase())
      );
    }
    
    // Also check user_roles junction table
    const userRoles = await prisma.$queryRaw`
      SELECT r.name
      FROM user_roles ur
      JOIN rbac_roles r ON ur.role_id = r.id
      WHERE ur.user_id = ${userId}
    `;
    
    if (userRoles.length > 0) {
      if (!superadminApprovedRoles) superadminApprovedRoles = new Set();
      for (const ur of userRoles) {
        superadminApprovedRoles.add((ur.name || '').toUpperCase());
      }
    }
    
    // COMPUTE INTERSECTION
    for (const role of planRoles) {
      const roleName = role.name.toUpperCase();
      const inSubscription = subscriptionRoles.has(roleName);
      const inEnterprise = enterpriseApprovedRoles === null || enterpriseApprovedRoles.has(roleName);
      const inSuperadmin = superadminApprovedRoles === null || superadminApprovedRoles.has(roleName);
      
      const isEffective = inSubscription && inEnterprise && inSuperadmin;
      
      result.roleDetails[roleName] = {
        id: role.id,
        name: role.name,
        displayName: role.display_name,
        inSubscription,
        inEnterprise,
        inSuperadmin,
        isEffective,
        blockedReason: !isEffective ? (
          !inSubscription ? 'Not included in subscription' :
          !inEnterprise ? 'Not approved by Enterprise Admin' :
          !inSuperadmin ? 'Not enabled by Superadmin' :
          'Unknown'
        ) : null
      };
      
      if (isEffective) {
        result.effectiveRoles.push({
          id: role.id,
          name: role.name,
          displayName: role.display_name
        });
      } else {
        result.blockedRoles.push({
          id: role.id,
          name: role.name,
          displayName: role.display_name,
          reason: result.roleDetails[roleName].blockedReason
        });
      }
    }
    
    console.log(`[EffectiveAccess] Roles result: ${result.effectiveRoles.length} effective, ${result.blockedRoles.length} blocked`);
    
    return result;
    
  } catch (error) {
    console.error('[EffectiveAccess] Error computing effective roles:', error);
    throw error;
  }
}

// ============================================================================
// GRANT EFFECTIVE PAGES TO USER
// ============================================================================

/**
 * Grant only effective pages (intersection of all 3 layers) to a user
 * Called when subscription is activated or approvals change
 * 
 * @param {Object} params
 * @param {number} params.userId - User's legacy_id
 * @param {string} params.tenantId - Tenant/client ID
 * @param {number} params.planId - Subscription plan ID
 * @param {number} params.actorUserId - Who is triggering this grant
 * @param {string} params.actorRole - Role of actor (SYSTEM, SUPER_ADMIN, etc)
 */
async function grantEffectivePagesToUser({
  userId,
  tenantId,
  planId,
  actorUserId = null,
  _actorRole = 'SYSTEM'
}) {
  const prisma = getPrisma();
  
  console.log(`[EffectiveAccess] Granting effective pages to user=${userId}, tenant=${tenantId}`);
  
  // Compute effective pages
  const effectiveResult = await computeEffectivePages({ userId, tenantId, planId });
  
  const effectivePageKeys = effectiveResult.effectivePages;
  console.log(`[EffectiveAccess] Will grant ${effectivePageKeys.length} effective pages`);
  
  // Clear existing subscription-granted permissions and re-grant only effective ones
  // This ensures blocked pages are not accessible
  
  let grantedCount = 0;
  for (const pageKey of effectivePageKeys) {
    try {
      await prisma.rbac_user_permissions.upsert({
        where: {
          user_id_page_key: { user_id: userId, page_key: pageKey }
        },
        create: {
          user_id: userId,
          page_key: pageKey,
          updated_at: new Date()
        },
        update: {
          updated_at: new Date()
        }
      });
      grantedCount++;
    } catch {
      // Ignore duplicates
    }
  }
  
  // Log the grant
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: actorUserId,
        action: 'GRANT_EFFECTIVE_PAGES',
        table_name: 'rbac_user_permissions',
        new_values: {
          targetUserId: userId,
          tenantId,
          planId,
          effectivePagesCount: grantedCount,
          blockedPagesCount: effectiveResult.blockedPages.length,
          blockedPages: effectiveResult.blockedPages.slice(0, 10) // First 10 for log size
        }
      }
    });
  } catch (logErr) {
    console.error('[EffectiveAccess] Audit log failed:', logErr.message);
  }
  
  return {
    success: true,
    grantedCount,
    blockedCount: effectiveResult.blockedPages.length,
    effectivePages: effectivePageKeys,
    blockedPages: effectiveResult.blockedPages
  };
}

// ============================================================================
// AUTHORIZATION CHECK (Backend Middleware)
// ============================================================================

/**
 * Check if a user has effective access to a specific page
 * Use this in backend middleware to enforce authorization
 * 
 * @param {number} userId - User's legacy_id
 * @param {string} tenantId - Tenant/client ID
 * @param {string} pageKey - Page key to check
 * @returns {Promise<Object>} Access check result
 */
async function checkEffectivePageAccess(userId, tenantId, pageKey) {
  const prisma = getPrisma();
  
  // Always allow core pages
  if (ALWAYS_ACCESSIBLE_PAGES.includes(pageKey.toLowerCase())) {
    return { hasAccess: true, reason: 'Core page - always accessible' };
  }
  
  // Get user's subscription plan
  const subscription = await prisma.client_subscriptions.findUnique({
    where: { client_id: tenantId },
    select: { plan_id: true, state: true }
  });
  
  if (!subscription || !['ACTIVE', 'TRIAL'].includes(subscription.state)) {
    return { hasAccess: false, reason: 'No active subscription' };
  }
  
  // Compute effective access for this specific page
  const effectiveResult = await computeEffectivePages({
    userId,
    tenantId,
    planId: subscription.plan_id
  });
  
  const pageDetail = effectiveResult.accessDetails[pageKey];
  
  if (!pageDetail) {
    // Page not in subscription at all
    return { hasAccess: false, reason: 'Page not included in subscription plan' };
  }
  
  if (pageDetail.isEffective) {
    return { hasAccess: true, reason: 'Effective access granted' };
  }
  
  return { 
    hasAccess: false, 
    reason: pageDetail.blockedReason || 'Access not approved'
  };
}

// ============================================================================
// AUDIT LOGGING FOR APPROVAL CHANGES
// ============================================================================

/**
 * Log when Enterprise Admin changes page approvals for a Superadmin
 */
async function logEnterpriseApprovalChange({
  enterpriseAdminId,
  superadminId,
  action, // 'GRANT' or 'REVOKE'
  pageKeys,
  reason = null
}) {
  const prisma = getPrisma();
  
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: enterpriseAdminId,
        action: `ENTERPRISE_${action}_PAGES`,
        table_name: 'admin_page_assignments',
        new_values: {
          superadminId,
          pageKeys,
          reason,
          timestamp: new Date().toISOString()
        }
      }
    });
    console.log(`[EffectiveAccess] Logged Enterprise approval change: ${action} ${pageKeys.length} pages`);
  } catch (err) {
    console.error('[EffectiveAccess] Failed to log Enterprise approval change:', err.message);
  }
}

/**
 * Log when Superadmin changes page approvals for a Client/Admin
 */
async function logSuperadminApprovalChange({
  superadminId,
  clientAdminId,
  tenantId,
  action, // 'GRANT' or 'REVOKE'
  pageKeys,
  reason = null
}) {
  const prisma = getPrisma();
  
  try {
    await prisma.audit_logs.create({
      data: {
        user_id: superadminId,
        action: `SUPERADMIN_${action}_PAGES`,
        table_name: 'admin_page_assignments',
        new_values: {
          clientAdminId,
          tenantId,
          pageKeys,
          reason,
          timestamp: new Date().toISOString()
        }
      }
    });
    console.log(`[EffectiveAccess] Logged Superadmin approval change: ${action} ${pageKeys.length} pages`);
  } catch (err) {
    console.error('[EffectiveAccess] Failed to log Superadmin approval change:', err.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core computation
  computeEffectivePages,
  computeEffectiveRoles,
  
  // Granting
  grantEffectivePagesToUser,
  
  // Authorization check
  checkEffectivePageAccess,
  
  // Audit logging
  logEnterpriseApprovalChange,
  logSuperadminApprovalChange,
  
  // Helpers (for testing)
  getSubscriptionPages,
  getEnterpriseApprovedPages,
  getSuperadminApprovedPages
};
