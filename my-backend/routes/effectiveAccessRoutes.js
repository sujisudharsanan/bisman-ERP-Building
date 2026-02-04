/**
 * EFFECTIVE ACCESS ROUTES
 * ========================
 * 
 * API endpoints for the three-layer permission system:
 *   effectivePages = subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
 * 
 * Used by frontend to:
 *   - Fetch effective pages for sidebar/menu
 *   - Show blocked pages with reasons
 *   - Check access before navigation
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  computeEffectivePages,
  computeEffectiveRoles,
  checkEffectivePageAccess,
  grantEffectivePagesToUser
} = require('../services/effectiveAccessService');
const { getPrisma } = require('../lib/prisma');

// ============================================================================
// GET /api/access/effective
// Get effective pages and roles for the authenticated user
// ============================================================================

router.get('/effective', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id || req.user?.client_id;
    const userRole = (req.user?.role || req.user?.roleName || req.user?.userType || '').toUpperCase();
    
    // Super Admin and Enterprise Admin bypass - they have full access
    if (userRole === 'SUPER_ADMIN' || userRole === 'ENTERPRISE_ADMIN') {
      console.log(`[EffectiveAccess API] ${userRole} bypass - full access granted for user ${userId}`);
      return res.json({
        ok: true,
        success: true,
        data: {
          effectivePages: ['*'],
          effectiveRoles: ['*'],
          blockedPages: [],
          accessDetails: {},
          planId: null,
          tenantId: null,
          layers: {
            subscription: -1,
            enterprise: -1,
            superadmin: -1,
            effective: -1
          },
          cached: false,
          computedAt: new Date().toISOString(),
          bypass: true,
          bypassReason: `${userRole} has full access`
        }
      });
    }
    
    if (!userId || !tenantId) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required'
      });
    }
    
    // Get subscription plan
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      select: { plan_id: true, state: true }
    });
    
    if (!subscription) {
      return res.json({
        ok: true,
        hasSubscription: false,
        effectivePages: [],
        effectiveRoles: [],
        message: 'No subscription found'
      });
    }
    
    if (!['ACTIVE', 'TRIAL'].includes(subscription.state)) {
      return res.json({
        ok: true,
        hasSubscription: true,
        subscriptionState: subscription.state,
        effectivePages: [],
        effectiveRoles: [],
        message: 'Subscription not active'
      });
    }
    
    // Compute effective pages
    const pagesResult = await computeEffectivePages({
      userId,
      tenantId,
      planId: subscription.plan_id,
      role: userRole  // Pass user's role for role-based page assignments
    });
    
    // Compute effective roles
    const rolesResult = await computeEffectiveRoles({
      userId,
      tenantId,
      planId: subscription.plan_id,
      role: userRole
    });
    
    // Return in format expected by frontend (success + data wrapper)
    res.json({
      ok: true,
      success: true,
      data: {
        hasSubscription: true,
        subscriptionState: subscription.state,
        planId: subscription.plan_id,
        effectivePages: pagesResult.effectivePages,
        blockedPages: pagesResult.blockedPages,
        effectiveRoles: rolesResult.effectiveRoles,
        blockedRoles: rolesResult.blockedRoles,
        accessDetails: pagesResult.accessDetails,
        roleDetails: rolesResult.roleDetails,
        layers: {
          subscription: pagesResult.effectivePages?.length || 0,
          enterprise: 0,
          superadmin: 0,
          effective: pagesResult.effectivePages?.length || 0
        },
        computedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[EffectiveAccess API] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to compute effective access'
    });
  }
});

// ============================================================================
// GET /api/access/check/:pageKey
// Check if user has effective access to a specific page
// ============================================================================

router.get('/check/:pageKey', authenticate, async (req, res) => {
  try {
    const { pageKey } = req.params;
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id || req.user?.client_id;
    
    if (!userId || !tenantId) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required'
      });
    }
    
    const result = await checkEffectivePageAccess(userId, tenantId, pageKey);
    
    res.json({
      ok: true,
      pageKey,
      ...result
    });
    
  } catch (error) {
    console.error('[EffectiveAccess API] Check error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check access'
    });
  }
});

// ============================================================================
// POST /api/access/refresh
// Refresh effective pages for user (after approval changes)
// ============================================================================

router.post('/refresh', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id || req.user?.client_id;
    
    if (!userId || !tenantId) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required'
      });
    }
    
    // Get subscription plan
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      select: { plan_id: true, state: true }
    });
    
    if (!subscription || !['ACTIVE', 'TRIAL'].includes(subscription.state)) {
      return res.json({
        ok: false,
        error: 'No active subscription'
      });
    }
    
    // Re-grant effective pages
    const result = await grantEffectivePagesToUser({
      userId,
      tenantId,
      planId: subscription.plan_id,
      actorUserId: userId,
      actorRole: req.user?.role || 'USER'
    });
    
    res.json({
      ok: true,
      message: 'Effective pages refreshed',
      ...result
    });
    
  } catch (error) {
    console.error('[EffectiveAccess API] Refresh error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to refresh access'
    });
  }
});

// ============================================================================
// GET /api/access/role-version/:roleName
// Get the latest version/timestamp for a role's page assignments
// Used by frontend to check if cached data is stale
// ============================================================================

router.get('/role-version/:roleName', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const { roleName } = req.params;
    const normalizedRole = (roleName || '').toUpperCase();
    
    // Get the latest update timestamp for this role's assignments
    const latestAssignment = await prisma.$queryRaw`
      SELECT MAX(GREATEST(
        COALESCE(updated_at, created_at),
        COALESCE(granted_at, created_at),
        COALESCE(revoked_at, '1970-01-01'::timestamp)
      )) as last_changed
      FROM admin_page_assignments
      WHERE assignee_type = ${normalizedRole}
    `;
    
    const lastChanged = latestAssignment[0]?.last_changed || new Date(0);
    const version = new Date(lastChanged).getTime();
    
    res.json({
      ok: true,
      role: normalizedRole,
      version,
      lastChanged: lastChanged.toISOString(),
      cacheKey: `role_${normalizedRole}_${version}`
    });
    
  } catch (error) {
    console.error('[EffectiveAccess API] Role version error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to get role version'
    });
  }
});

// ============================================================================
// GET /api/access/check-stale
// Check if user's cached effective access is stale
// Returns true if the role assignments have changed since the provided timestamp
// ============================================================================

router.get('/check-stale', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const userRole = (req.user?.role || req.user?.roleName || '').toUpperCase();
    const cachedAt = parseInt(req.query.cachedAt || '0', 10);
    
    if (!userRole) {
      return res.json({ ok: true, isStale: true, reason: 'NO_ROLE' });
    }
    
    // Get the latest update timestamp for this role's assignments
    const latestAssignment = await prisma.$queryRaw`
      SELECT MAX(GREATEST(
        COALESCE(updated_at, created_at),
        COALESCE(granted_at, created_at),
        COALESCE(revoked_at, '1970-01-01'::timestamp)
      )) as last_changed
      FROM admin_page_assignments
      WHERE assignee_type = ${userRole}
    `;
    
    const lastChanged = latestAssignment[0]?.last_changed;
    const lastChangedMs = lastChanged ? new Date(lastChanged).getTime() : 0;
    
    // Cache is stale if role assignments have been updated after the cache timestamp
    const isStale = cachedAt < lastChangedMs;
    
    res.json({
      ok: true,
      isStale,
      role: userRole,
      cachedAt,
      lastChangedAt: lastChangedMs,
      reason: isStale ? 'ROLE_ASSIGNMENTS_UPDATED' : 'CACHE_VALID'
    });
    
  } catch (error) {
    console.error('[EffectiveAccess API] Check stale error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check stale status'
    });
  }
});

// ============================================================================
// GET /api/access/summary
// Get summary of access layers for debugging/admin view
// ============================================================================

router.get('/summary', authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    const userId = req.user?.id;
    const tenantId = req.user?.tenant_id || req.user?.client_id;
    
    // Get subscription
    const subscription = await prisma.client_subscriptions.findUnique({
      where: { client_id: tenantId },
      include: { plan: { select: { id: true, plan_code: true, name: true } } }
    });
    
    // Get client info
    const client = await prisma.clients.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, super_admin_id: true }
    });
    
    // Get Superadmin info
    let superadminInfo = null;
    if (client?.super_admin_id) {
      const sa = await prisma.users_enhanced.findFirst({
        where: { legacy_id: client.super_admin_id },
        select: { id: true, username: true, email: true }
      });
      superadminInfo = sa;
    }
    
    res.json({
      ok: true,
      user: {
        id: userId,
        tenantId
      },
      subscription: subscription ? {
        planId: subscription.plan_id,
        planCode: subscription.plan?.plan_code,
        planName: subscription.plan?.name,
        state: subscription.state
      } : null,
      client: {
        id: client?.id,
        name: client?.name,
        superadminId: client?.super_admin_id
      },
      superadmin: superadminInfo,
      layers: {
        subscription: 'plan_module_access + pages_master',
        enterprise: 'admin_page_assignments (assigner_type=ENTERPRISE_ADMIN)',
        superadmin: 'admin_page_assignments (assigner_type=SUPER_ADMIN) + rbac_user_permissions'
      }
    });
    
  } catch (error) {
    console.error('[EffectiveAccess API] Summary error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to get summary'
    });
  }
});

module.exports = router;
