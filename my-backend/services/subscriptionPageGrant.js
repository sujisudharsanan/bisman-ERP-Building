/**
 * SUBSCRIPTION PAGE GRANT SERVICE
 * ================================
 * 
 * Automatically grants EFFECTIVE page permissions to users when a subscription is activated.
 * 
 * USES THREE-LAYER INTERSECTION:
 *   effectivePages = subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
 * 
 * FLOW:
 * 1. Client activates subscription (via coupon or payment)
 * 2. This service is called with tenantId and planId
 * 3. Computes effective pages using intersection logic
 * 4. Grants only effective pages to users (blocked pages are NOT granted)
 * 
 * NO MANUAL INTERVENTION NEEDED - but respects approval gates!
 */

const { getPrisma } = require('../lib/prisma');

// Try to load effective access service for intersection logic
let effectiveAccessService;
try {
  effectiveAccessService = require('./effectiveAccessService');
} catch (err) {
  console.warn('[SubscriptionPageGrant] effectiveAccessService not available:', err.message);
  effectiveAccessService = null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Core modules always accessible regardless of plan
const ALWAYS_ACCESSIBLE_MODULES = ['dashboard', 'common', 'chat', 'support', 'help'];

// ============================================================================
// MAIN FUNCTION: Grant Pages Based on Subscription Plan
// ============================================================================

/**
 * Grant EFFECTIVE pages from the subscription plan to all tenant users
 * Uses 3-layer intersection: subscription ∩ enterprise ∩ superadmin
 * 
 * @param {string} tenantId - The tenant/client ID
 * @param {number} planId - The subscription plan ID
 * @param {Object} options - Optional configuration
 * @returns {Object} Result with counts of pages/users updated
 */
async function grantPagesForSubscription(tenantId, planId, options = {}) {
  const prisma = getPrisma();
  const { actorUserId = null, actorRole = 'SYSTEM' } = options;
  
  console.log(`[SubscriptionPageGrant] Granting EFFECTIVE pages for tenant=${tenantId}, plan=${planId}`);
  
  try {
    // STEP 1: Get all users of this tenant
    const tenantUsers = await prisma.users.findMany({
      where: { 
        tenant_id: tenantId,
        is_active: true
      },
      select: { id: true, legacy_id: true, email: true, role: true }
    });
    
    console.log(`[SubscriptionPageGrant] Found ${tenantUsers.length} active users for tenant`);
    
    if (tenantUsers.length === 0) {
      return { success: true, pagesGranted: 0, usersUpdated: 0, message: 'No users to grant' };
    }
    
    // STEP 2: For each user, compute and grant EFFECTIVE pages (using 3-layer intersection)
    let totalPermissionsCreated = 0;
    let totalBlocked = 0;
    const userResults = [];
    
    for (const user of tenantUsers) {
      const userId = user.legacy_id || user.id;
      
      // Skip if userId is not numeric (required for rbac_user_permissions)
      if (typeof userId !== 'number') {
        console.log(`[SubscriptionPageGrant] Skipping user ${user.email} - no numeric ID`);
        continue;
      }
      
      // Use effective access service if available for 3-layer intersection
      if (effectiveAccessService && effectiveAccessService.grantEffectivePagesToUser) {
        try {
          const result = await effectiveAccessService.grantEffectivePagesToUser({
            userId,
            tenantId,
            planId,
            actorUserId,
            actorRole
          });
          totalPermissionsCreated += result.grantedCount || 0;
          totalBlocked += result.blockedCount || 0;
          userResults.push({
            userId,
            email: user.email,
            granted: result.grantedCount,
            blocked: result.blockedCount
          });
        } catch (err) {
          console.error(`[SubscriptionPageGrant] Error granting to user ${userId}:`, err.message);
        }
      } else {
        // Fallback: Grant all subscription pages (no intersection check)
        const grantResult = await grantAllSubscriptionPagesToUser(userId, planId);
        totalPermissionsCreated += grantResult.count || 0;
        userResults.push({
          userId,
          email: user.email,
          granted: grantResult.count,
          blocked: 0,
          note: 'Fallback mode - no intersection check'
        });
      }
    }
    
    console.log(`[SubscriptionPageGrant] ✅ Granted ${totalPermissionsCreated} permissions, ${totalBlocked} blocked`);
    
    // STEP 3: Log the grant event
    try {
      await prisma.subscription_coupon_audit_logs.create({
        data: {
          event_type: 'SUBSCRIPTION_EFFECTIVE_PAGES_GRANTED',
          tenant_id: tenantId,
          actor_user_id: actorUserId,
          actor_role: actorRole,
          payload_snapshot: {
            planId,
            usersCount: tenantUsers.length,
            permissionsCreated: totalPermissionsCreated,
            blockedCount: totalBlocked,
            userResults: userResults.slice(0, 5)
          },
          notes: `Auto-granted ${totalPermissionsCreated} effective pages to ${tenantUsers.length} users (${totalBlocked} blocked by approval gates)`
        }
      });
    } catch (logErr) {
      console.error('[SubscriptionPageGrant] Failed to log audit event:', logErr.message);
    }
    
    return {
      success: true,
      pagesGranted: totalPermissionsCreated,
      pagesBlocked: totalBlocked,
      usersUpdated: userResults.length,
      userResults
    };
    
  } catch (error) {
    console.error('[SubscriptionPageGrant] Error:', error);
    return {
      success: false,
      error: error.message,
      pagesGranted: 0,
      usersUpdated: 0
    };
  }
}

/**
 * Fallback: Grant all subscription pages without intersection check
 */
async function grantAllSubscriptionPagesToUser(userId, planId) {
  const prisma = getPrisma();
  
  const moduleAccess = await prisma.plan_module_access.findMany({
    where: { plan_id: planId, access_level: { not: 'none' } },
    select: { module_id: true }
  });
  
  const accessibleModules = new Set([
    ...ALWAYS_ACCESSIBLE_MODULES,
    ...moduleAccess.map(m => m.module_id)
  ]);
  
  const pages = await prisma.$queryRaw`
    SELECT pm.page_code, pm.route
    FROM pages_master pm
    JOIN modules_master mm ON pm.module_id = mm.id
    WHERE mm.module_code = ANY(${Array.from(accessibleModules)}::text[])
      AND pm.is_active = true
  `;
  
  let count = 0;
  for (const page of pages) {
    const pageKey = page.page_code || page.route?.replace(/^\//, '').replace(/\//g, '-');
    if (!pageKey) continue;
    
    try {
      await prisma.rbac_user_permissions.upsert({
        where: { user_id_page_key: { user_id: userId, page_key: pageKey } },
        create: { user_id: userId, page_key: pageKey, updated_at: new Date() },
        update: { updated_at: new Date() }
      });
      count++;
    } catch { /* Ignore */ }
  }
  
  return { count };
}

/**
 * Grant EFFECTIVE pages to a new user
 */
async function grantPagesForNewUser(userId, tenantId) {
  const prisma = getPrisma();
  
  console.log(`[SubscriptionPageGrant] Granting pages for new user=${userId}, tenant=${tenantId}`);
  
  try {
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      select: { plan_id: true, state: true }
    });
    
    if (!subscription || !['ACTIVE', 'TRIAL'].includes(subscription.state)) {
      return { success: false, reason: 'No active subscription' };
    }
    
    if (effectiveAccessService && effectiveAccessService.grantEffectivePagesToUser) {
      const result = await effectiveAccessService.grantEffectivePagesToUser({
        userId,
        tenantId,
        planId: subscription.plan_id,
        actorUserId: null,
        actorRole: 'SYSTEM'
      });
      return { success: true, pagesGranted: result.grantedCount, pagesBlocked: result.blockedCount };
    }
    
    const result = await grantAllSubscriptionPagesToUser(userId, subscription.plan_id);
    return { success: true, pagesGranted: result.count };
    
  } catch (error) {
    console.error('[SubscriptionPageGrant] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke pages when subscription changes
 */
async function revokePagesForSubscriptionChange(tenantId, oldPlanId, newPlanId = 0) {
  const prisma = getPrisma();
  
  try {
    const oldModules = await prisma.plan_module_access.findMany({
      where: { plan_id: oldPlanId, access_level: { not: 'none' } },
      select: { module_id: true }
    });
    
    const newModules = newPlanId > 0 ? await prisma.plan_module_access.findMany({
      where: { plan_id: newPlanId, access_level: { not: 'none' } },
      select: { module_id: true }
    }) : [];
    
    const newModuleSet = new Set([...ALWAYS_ACCESSIBLE_MODULES, ...newModules.map(m => m.module_id)]);
    const modulesToRevoke = oldModules.map(m => m.module_id).filter(m => !newModuleSet.has(m));
    
    if (modulesToRevoke.length === 0) {
      return { success: true, pagesRevoked: 0 };
    }
    
    const pagesToRevoke = await prisma.$queryRaw`
      SELECT pm.page_code FROM pages_master pm
      JOIN modules_master mm ON pm.module_id = mm.id
      WHERE mm.module_code = ANY(${modulesToRevoke}::text[])
    `;
    
    const pageKeys = pagesToRevoke.map(p => p.page_code).filter(Boolean);
    const tenantUsers = await prisma.users.findMany({
      where: { tenant_id: tenantId },
      select: { legacy_id: true }
    });
    
    const userIds = tenantUsers.map(u => u.legacy_id).filter(id => typeof id === 'number');
    
    const result = await prisma.rbac_user_permissions.deleteMany({
      where: { user_id: { in: userIds }, page_key: { in: pageKeys } }
    });
    
    return { success: true, pagesRevoked: result.count };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  grantPagesForSubscription,
  grantPagesForNewUser,
  revokePagesForSubscriptionChange,
  grantAllSubscriptionPagesToUser
};
