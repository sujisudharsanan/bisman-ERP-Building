/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SUBSCRIPTION ACCESS CONTROL API
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Enterprise Admin API for managing subscription plan module/feature access
 * with staging/draft state before publish to production.
 * 
 * @requires ENTERPRISE_ADMIN role authorization
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const prisma = getPrisma();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Map DB enum value to frontend value
 * DB uses 'read_only', frontend expects 'read'
 */
function mapAccessLevelToFrontend(level) {
  return level === 'read_only' ? 'read' : level;
}

/**
 * Map frontend value to DB enum value
 * Frontend sends 'read', DB expects 'read_only'
 */
function mapAccessLevelToDB(level) {
  return level === 'read' ? 'read_only' : level;
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================
// TODO: Uncomment in production
// const { requireEnterpriseAdmin } = require('../middleware/enterpriseAuth');
// router.use(requireEnterpriseAdmin);

// ============================================================================
// PLAN MODULE MATRIX (Tab 1)
// ============================================================================

/**
 * GET /api/enterprise-admin/subscriptions/module-matrix
 * Get all plans with their module access settings (from draft table)
 */
router.get('/module-matrix', async (req, res) => {
  try {
    // Get all plans
    const plans = await prisma.$queryRaw`
      SELECT id, plan_code, name, sort_order 
      FROM subscription_plans 
      WHERE is_active = true 
      ORDER BY sort_order
    `;

    // Get all modules
    const modules = await prisma.$queryRaw`
      SELECT id, module_code, display_name, icon, sort_order, layout_group
      FROM modules_master 
      WHERE is_active = true 
      ORDER BY layout_group, sort_order
    `;

    // Get draft module access (with dirty flag)
    const draftAccess = await prisma.$queryRaw`
      SELECT 
        d.id, d.plan_id, d.module_id, d.access_level, 
        d.page_limit, d.features_json, d.is_dirty, d.draft_action,
        d.updated_at, d.modified_by
      FROM plan_module_access_draft d
      ORDER BY d.plan_id, d.module_id
    `;

    // Get production module access for comparison
    const prodAccess = await prisma.$queryRaw`
      SELECT plan_id, module_id, access_level, page_limit
      FROM plan_module_access
    `;

    // Count dirty changes
    const dirtyCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM plan_module_access_draft WHERE is_dirty = true
    `;

    // Map access levels from DB enum to frontend values
    const mappedDraftAccess = draftAccess.map(a => ({
      ...a,
      access_level: mapAccessLevelToFrontend(a.access_level)
    }));
    const mappedProdAccess = prodAccess.map(a => ({
      ...a,
      access_level: mapAccessLevelToFrontend(a.access_level)
    }));

    res.json({
      success: true,
      data: {
        plans,
        modules,
        draftAccess: mappedDraftAccess,
        prodAccess: mappedProdAccess,
        pendingChanges: Number(dirtyCount[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching module matrix:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/enterprise-admin/subscriptions/module-access
 * Update module access level in draft table
 */
router.put('/module-access', async (req, res) => {
  try {
    const { planId, moduleId, accessLevel, modifiedBy } = req.body;

    if (!planId || !moduleId || !accessLevel) {
      return res.status(400).json({ 
        success: false, 
        error: 'planId, moduleId, and accessLevel are required' 
      });
    }

    // Validate access level - frontend uses 'read', DB enum uses 'read_only'
    const validLevels = ['none', 'read', 'full'];
    if (!validLevels.includes(accessLevel)) {
      return res.status(400).json({ 
        success: false, 
        error: 'accessLevel must be none, read, or full' 
      });
    }

    // Map frontend values to DB enum values
    const dbAccessLevel = accessLevel === 'read' ? 'read_only' : accessLevel;

    // Upsert into draft table
    await prisma.$executeRaw`
      INSERT INTO plan_module_access_draft 
        (plan_id, module_id, access_level, is_dirty, draft_action, modified_by, updated_at)
      VALUES 
        (${planId}, ${moduleId}, ${dbAccessLevel}::module_access_level, true, 'update', ${modifiedBy}, NOW())
      ON CONFLICT (plan_id, module_id) 
      DO UPDATE SET 
        access_level = ${dbAccessLevel}::module_access_level,
        is_dirty = true,
        draft_action = 'update',
        modified_by = ${modifiedBy},
        updated_at = NOW()
    `;

    res.json({ success: true, message: 'Draft updated' });
  } catch (error) {
    console.error('Error updating module access:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/enterprise-admin/subscriptions/module-access/bulk
 * Bulk update module access for multiple cells
 */
router.post('/module-access/bulk', async (req, res) => {
  try {
    const { changes, modifiedBy } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'changes array is required' 
      });
    }

    let updated = 0;
    for (const change of changes) {
      const { planId, moduleId, accessLevel } = change;
      // Map frontend values to DB enum values
      const dbAccessLevel = accessLevel === 'read' ? 'read_only' : accessLevel;
      await prisma.$executeRaw`
        INSERT INTO plan_module_access_draft 
          (plan_id, module_id, access_level, is_dirty, draft_action, modified_by, updated_at)
        VALUES 
          (${planId}, ${moduleId}, ${dbAccessLevel}::module_access_level, true, 'update', ${modifiedBy}, NOW())
        ON CONFLICT (plan_id, module_id) 
        DO UPDATE SET 
          access_level = ${dbAccessLevel}::module_access_level,
          is_dirty = true,
          draft_action = 'update',
          modified_by = ${modifiedBy},
          updated_at = NOW()
      `;
      updated++;
    }

    res.json({ success: true, message: `${updated} changes saved to draft` });
  } catch (error) {
    console.error('Error bulk updating module access:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// FEATURE LIMITS (Tab 2)
// ============================================================================

/**
 * GET /api/enterprise-admin/subscriptions/feature-limits
 * Get all feature limits grouped by plan
 */
router.get('/feature-limits', async (req, res) => {
  try {
    // Get feature definitions
    const features = await prisma.$queryRaw`
      SELECT id, feature_code, feature_name, description, category, icon, sort_order
      FROM master_feature_definitions
      WHERE is_active = true
      ORDER BY category, sort_order
    `;

    // Get master plans (for feature controls)
    const plans = await prisma.$queryRaw`
      SELECT id, code, name, status, sort_order
      FROM master_subscription_plans
      WHERE status = 'active'
      ORDER BY sort_order
    `;

    // Get draft feature controls
    const draftControls = await prisma.$queryRaw`
      SELECT 
        d.id, d.plan_id, d.feature_code, d.free_limit, d.limit_period,
        d.unlock_price, d.unlock_unit, d.currency, d.lock_mode,
        d.requires_approval, d.approval_threshold,
        d.is_visible, d.show_in_pricing, d.is_dirty, d.draft_action
      FROM plan_feature_controls_draft d
      ORDER BY d.plan_id, d.feature_code
    `;

    // Get production controls for comparison
    const prodControls = await prisma.$queryRaw`
      SELECT plan_id, feature_code, free_limit, lock_mode, unlock_price
      FROM plan_feature_controls
    `;

    // Count dirty changes
    const dirtyCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM plan_feature_controls_draft WHERE is_dirty = true
    `;

    res.json({
      success: true,
      data: {
        features,
        plans,
        draftControls,
        prodControls,
        pendingChanges: Number(dirtyCount[0]?.count || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching feature limits:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/enterprise-admin/subscriptions/feature-limit
 * Update a feature limit in draft table
 */
router.put('/feature-limit', async (req, res) => {
  try {
    const { 
      planId, featureCode, freeLimit, lockMode, 
      unlockPrice, requiresApproval, modifiedBy 
    } = req.body;

    if (!planId || !featureCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'planId and featureCode are required' 
      });
    }

    await prisma.$executeRaw`
      UPDATE plan_feature_controls_draft
      SET 
        free_limit = COALESCE(${freeLimit}, free_limit),
        lock_mode = COALESCE(${lockMode}::lock_mode_type, lock_mode),
        unlock_price = COALESCE(${unlockPrice}, unlock_price),
        requires_approval = COALESCE(${requiresApproval}, requires_approval),
        is_dirty = true,
        draft_action = 'update',
        modified_by = ${modifiedBy},
        updated_at = NOW()
      WHERE plan_id = ${planId} AND feature_code = ${featureCode}
    `;

    res.json({ success: true, message: 'Feature limit draft updated' });
  } catch (error) {
    console.error('Error updating feature limit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TENANT DEBUGGER (Tab 3)
// ============================================================================

/**
 * GET /api/enterprise-admin/subscriptions/tenants/search
 * Search tenants by name or ID
 */
router.get('/tenants/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const tenants = await prisma.$queryRaw`
      SELECT 
        c.id, c.name, c.email, c.phone,
        cs.plan_id, sp.plan_code, sp.name as plan_name,
        cs.state as subscription_state
      FROM clients c
      LEFT JOIN client_subscriptions cs ON cs.client_id = c.id
      LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
      WHERE 
        c.name ILIKE ${'%' + q + '%'}
        OR c.email ILIKE ${'%' + q + '%'}
        OR c.id::text ILIKE ${'%' + q + '%'}
      LIMIT 20
    `;

    res.json({ success: true, data: tenants });
  } catch (error) {
    console.error('Error searching tenants:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/enterprise-admin/subscriptions/tenants/:tenantId/access
 * Get calculated access for a specific tenant
 */
router.get('/tenants/:tenantId/access', async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Get tenant info with subscription
    const tenantInfo = await prisma.$queryRaw`
      SELECT 
        c.id, c.name, c.email,
        cs.plan_id, sp.plan_code, sp.name as plan_name,
        cs.state as subscription_state,
        cs.current_period_start, cs.current_period_end
      FROM clients c
      LEFT JOIN client_subscriptions cs ON cs.client_id = c.id
      LEFT JOIN subscription_plans sp ON sp.id = cs.plan_id
      WHERE c.id = ${tenantId}::uuid
    `;

    if (!tenantInfo || tenantInfo.length === 0) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const tenant = tenantInfo[0];
    const planId = tenant.plan_id;

    // Get plan module access
    const planModuleAccess = planId ? await prisma.$queryRaw`
      SELECT module_id, access_level
      FROM plan_module_access
      WHERE plan_id = ${planId}
    ` : [];

    // Get tenant module overrides
    const tenantOverrides = await prisma.$queryRaw`
      SELECT 
        module_id, access_level, override_type, override_reason,
        start_date, end_date, is_active, granted_by, granted_at
      FROM tenant_module_overrides
      WHERE tenant_id = ${tenantId}::uuid AND is_active = true
    `;

    // Get all modules for display
    const allModules = await prisma.$queryRaw`
      SELECT id, module_code, display_name, icon, layout_group
      FROM modules_master
      WHERE is_active = true
      ORDER BY layout_group, sort_order
    `;

    // Calculate effective access
    const effectiveAccess = allModules.map(mod => {
      const planAccess = planModuleAccess.find(p => p.module_id === mod.module_code);
      const override = tenantOverrides.find(o => o.module_id === mod.module_code);

      return {
        module_code: mod.module_code,
        display_name: mod.display_name,
        icon: mod.icon,
        layout_group: mod.layout_group,
        plan_access: planAccess?.access_level || 'none',
        has_override: !!override,
        override_type: override?.override_type || null,
        override_reason: override?.override_reason || null,
        effective_access: override 
          ? override.access_level 
          : (planAccess?.access_level || 'none'),
        source: override ? 'OVERRIDE' : 'PLAN'
      };
    });

    // Get tenant feature unlocks
    const featureUnlocks = await prisma.$queryRaw`
      SELECT 
        feature_key, status, price_per_month, is_override,
        override_reason, start_date, end_date
      FROM tenant_feature_unlocks
      WHERE tenant_id = ${tenantId}::uuid AND status = 'UNLOCKED'
    `;

    res.json({
      success: true,
      data: {
        tenant,
        effectiveAccess,
        tenantOverrides,
        featureUnlocks
      }
    });
  } catch (error) {
    console.error('Error fetching tenant access:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/enterprise-admin/subscriptions/tenants/:tenantId/override
 * Add or update a tenant module override
 */
router.post('/tenants/:tenantId/override', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { moduleId, accessLevel, overrideType, overrideReason, grantedBy, endDate } = req.body;

    if (!moduleId || !accessLevel || !grantedBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'moduleId, accessLevel, and grantedBy are required' 
      });
    }

    // Map frontend values to DB enum values
    const dbAccessLevel = accessLevel === 'read' ? 'read_only' : accessLevel;

    await prisma.$executeRaw`
      INSERT INTO tenant_module_overrides 
        (tenant_id, module_id, access_level, override_type, override_reason, 
         granted_by, granted_at, end_date, is_active)
      VALUES 
        (${tenantId}::uuid, ${moduleId}, ${dbAccessLevel}::module_access_level, 
         ${overrideType || 'grant'}, ${overrideReason}, ${grantedBy}, NOW(), 
         ${endDate ? endDate : null}::timestamptz, true)
      ON CONFLICT (tenant_id, module_id) 
      DO UPDATE SET 
        access_level = ${dbAccessLevel}::module_access_level,
        override_type = ${overrideType || 'grant'},
        override_reason = ${overrideReason},
        granted_by = ${grantedBy},
        granted_at = NOW(),
        end_date = ${endDate ? endDate : null}::timestamptz,
        is_active = true,
        revoked_by = NULL,
        revoked_at = NULL,
        revoke_reason = NULL,
        updated_at = NOW()
    `;

    res.json({ success: true, message: 'Tenant override saved' });
  } catch (error) {
    console.error('Error adding tenant override:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/enterprise-admin/subscriptions/tenants/:tenantId/override/:moduleId
 * Revoke a tenant module override
 */
router.delete('/tenants/:tenantId/override/:moduleId', async (req, res) => {
  try {
    const { tenantId, moduleId } = req.params;
    const { revokedBy, revokeReason } = req.body;

    await prisma.$executeRaw`
      UPDATE tenant_module_overrides
      SET 
        is_active = false,
        revoked_by = ${revokedBy},
        revoked_at = NOW(),
        revoke_reason = ${revokeReason},
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND module_id = ${moduleId}
    `;

    res.json({ success: true, message: 'Override revoked' });
  } catch (error) {
    console.error('Error revoking override:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PUBLISH TO PRODUCTION
// ============================================================================

/**
 * GET /api/enterprise-admin/subscriptions/publish/status
 * Get pending changes count and last publish info
 */
router.get('/publish/status', async (req, res) => {
  try {
    // Count pending module changes
    const moduleChanges = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM plan_module_access_draft WHERE is_dirty = true
    `;

    // Count pending feature changes
    const featureChanges = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM plan_feature_controls_draft WHERE is_dirty = true
    `;

    // Get last publish info
    const lastPublish = await prisma.$queryRaw`
      SELECT published_at, published_by, publish_type, total_changes, notes
      FROM subscription_publish_log
      ORDER BY published_at DESC
      LIMIT 1
    `;

    res.json({
      success: true,
      data: {
        pendingModuleChanges: Number(moduleChanges[0]?.count || 0),
        pendingFeatureChanges: Number(featureChanges[0]?.count || 0),
        totalPending: Number(moduleChanges[0]?.count || 0) + Number(featureChanges[0]?.count || 0),
        lastPublish: lastPublish[0] || null
      }
    });
  } catch (error) {
    console.error('Error fetching publish status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/enterprise-admin/subscriptions/publish
 * Publish all draft changes to production
 */
router.post('/publish', async (req, res) => {
  try {
    const { publishedBy, notes, ipAddress, userAgent } = req.body;

    if (!publishedBy) {
      return res.status(400).json({ success: false, error: 'publishedBy is required' });
    }

    // Get dirty module changes for rollback data
    const dirtyModules = await prisma.$queryRaw`
      SELECT plan_id, module_id, access_level, page_limit
      FROM plan_module_access_draft
      WHERE is_dirty = true
    `;

    // Get dirty feature changes for rollback data
    const dirtyFeatures = await prisma.$queryRaw`
      SELECT plan_id, feature_code, free_limit, lock_mode, unlock_price
      FROM plan_feature_controls_draft
      WHERE is_dirty = true
    `;

    // Get current production state for rollback
    const rollbackData = {
      modules: await prisma.$queryRaw`
        SELECT * FROM plan_module_access 
        WHERE (plan_id, module_id) IN (
          SELECT plan_id, module_id FROM plan_module_access_draft WHERE is_dirty = true
        )
      `,
      features: await prisma.$queryRaw`
        SELECT * FROM plan_feature_controls 
        WHERE (plan_id, feature_code) IN (
          SELECT plan_id, feature_code FROM plan_feature_controls_draft WHERE is_dirty = true
        )
      `
    };

    // Apply module changes to production
    if (dirtyModules.length > 0) {
      await prisma.$executeRaw`
        INSERT INTO plan_module_access (plan_id, module_id, access_level, page_limit, features_json, updated_at)
        SELECT plan_id, module_id, access_level, page_limit, features_json, NOW()
        FROM plan_module_access_draft
        WHERE is_dirty = true
        ON CONFLICT (plan_id, module_id)
        DO UPDATE SET 
          access_level = EXCLUDED.access_level,
          page_limit = EXCLUDED.page_limit,
          features_json = EXCLUDED.features_json,
          updated_at = NOW()
      `;
    }

    // Apply feature changes to production
    if (dirtyFeatures.length > 0) {
      await prisma.$executeRaw`
        INSERT INTO plan_feature_controls (
          plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit,
          currency, approval_threshold, requires_approval, lock_mode, is_visible, 
          show_in_pricing, updated_at
        )
        SELECT 
          plan_id, feature_code, free_limit, limit_period, unlock_price, unlock_unit,
          currency, approval_threshold, requires_approval, lock_mode, is_visible, 
          show_in_pricing, NOW()
        FROM plan_feature_controls_draft
        WHERE is_dirty = true
        ON CONFLICT (plan_id, feature_code)
        DO UPDATE SET 
          free_limit = EXCLUDED.free_limit,
          limit_period = EXCLUDED.limit_period,
          unlock_price = EXCLUDED.unlock_price,
          unlock_unit = EXCLUDED.unlock_unit,
          lock_mode = EXCLUDED.lock_mode,
          requires_approval = EXCLUDED.requires_approval,
          approval_threshold = EXCLUDED.approval_threshold,
          is_visible = EXCLUDED.is_visible,
          show_in_pricing = EXCLUDED.show_in_pricing,
          updated_at = NOW()
      `;
    }

    // Clear dirty flags
    await prisma.$executeRaw`
      UPDATE plan_module_access_draft SET is_dirty = false, draft_action = 'update' WHERE is_dirty = true
    `;
    await prisma.$executeRaw`
      UPDATE plan_feature_controls_draft SET is_dirty = false, draft_action = 'update' WHERE is_dirty = true
    `;

    // Get affected plans for logging
    const affectedPlans = [...new Set([
      ...dirtyModules.map(m => m.plan_id),
      ...dirtyFeatures.map(f => f.plan_id)
    ])];

    const affectedModules = [...new Set(dirtyModules.map(m => m.module_id))];
    const affectedFeatures = [...new Set(dirtyFeatures.map(f => f.feature_code))];

    // Log the publish event
    await prisma.$executeRaw`
      INSERT INTO subscription_publish_log (
        publish_type, published_by, published_at, changes_summary,
        affected_plans, affected_modules, affected_features, total_changes,
        rollback_data, notes, ip_address, user_agent
      )
      VALUES (
        'both', ${publishedBy}, NOW(), 
        ${JSON.stringify({ modules: dirtyModules.length, features: dirtyFeatures.length })}::jsonb,
        ${affectedPlans}::int[], ${affectedModules}::varchar[], ${affectedFeatures}::varchar[],
        ${dirtyModules.length + dirtyFeatures.length},
        ${JSON.stringify(rollbackData)}::jsonb,
        ${notes}, ${ipAddress}::inet, ${userAgent}
      )
    `;

    res.json({ 
      success: true, 
      message: 'Published to production',
      data: {
        modulesPublished: dirtyModules.length,
        featuresPublished: dirtyFeatures.length,
        totalChanges: dirtyModules.length + dirtyFeatures.length
      }
    });
  } catch (error) {
    console.error('Error publishing changes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/enterprise-admin/subscriptions/discard
 * Discard all pending draft changes
 */
router.post('/discard', async (req, res) => {
  try {
    // Reset module drafts from production
    await prisma.$executeRaw`
      UPDATE plan_module_access_draft d
      SET 
        access_level = p.access_level,
        page_limit = p.page_limit,
        features_json = p.features_json,
        is_dirty = false,
        draft_action = 'update'
      FROM plan_module_access p
      WHERE d.plan_id = p.plan_id AND d.module_id = p.module_id AND d.is_dirty = true
    `;

    // Reset feature drafts from production
    await prisma.$executeRaw`
      UPDATE plan_feature_controls_draft d
      SET 
        free_limit = p.free_limit,
        limit_period = p.limit_period,
        unlock_price = p.unlock_price,
        unlock_unit = p.unlock_unit,
        lock_mode = p.lock_mode,
        requires_approval = p.requires_approval,
        approval_threshold = p.approval_threshold,
        is_visible = p.is_visible,
        show_in_pricing = p.show_in_pricing,
        is_dirty = false,
        draft_action = 'update'
      FROM plan_feature_controls p
      WHERE d.plan_id = p.plan_id AND d.feature_code = p.feature_code AND d.is_dirty = true
    `;

    res.json({ success: true, message: 'All draft changes discarded' });
  } catch (error) {
    console.error('Error discarding changes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/enterprise-admin/subscriptions/publish/history
 * Get publish history
 */
router.get('/publish/history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const history = await prisma.$queryRaw`
      SELECT 
        id, publish_type, published_by, published_at,
        changes_summary, affected_plans, total_changes, notes
      FROM subscription_publish_log
      ORDER BY published_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching publish history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
