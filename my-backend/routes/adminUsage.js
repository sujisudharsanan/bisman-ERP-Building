/**
 * Admin Usage Routes
 * ===================
 * 
 * API endpoints for querying tenant usage and quota data.
 * 
 * Endpoints:
 *   GET  /api/admin/usage/:tenantId          - Get usage for a tenant
 *   GET  /api/admin/usage                    - Get all tenants usage
 *   GET  /api/admin/usage/:tenantId/trends   - Get usage trends
 *   GET  /api/admin/usage/:tenantId/features - Get feature usage breakdown
 *   GET  /api/admin/usage/:tenantId/billing  - Get billable usage
 *   GET  /api/admin/usage/top-consumers      - Get top API consumers
 *   GET  /api/admin/quotas/:tenantId         - Get quota config
 *   PUT  /api/admin/quotas/:tenantId         - Update quota config
 *   POST /api/admin/quotas/:tenantId/reset   - Reset usage counters
 * 
 * @module routes/adminUsage
 */

const express = require('express');
const router = express.Router();

const {
  getTenantUsage,
  getAllTenantsUsage,
  getUsageTrends,
  getFeatureUsage,
  getTopConsumers,
  getBillableUsage,
} = require('../services/usage/usageService');

const {
  getTenantQuota,
  setTenantQuota,
  getCurrentUsage,
  resetUsage,
  addToDenylist,
  removeFromDenylist,
  getQuotaStats,
  DEFAULT_QUOTAS,
} = require('../middleware/tenantQuota');

const { getBufferStats } = require('../middleware/usageMeter');

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Validate date range parameters
 */
function validateDateRange(req, res, next) {
  const { from, to } = req.query;
  
  // Default to last 30 days
  const now = new Date();
  req.dateRange = {
    from: from ? new Date(from) : new Date(now.setDate(now.getDate() - 30)),
    to: to ? new Date(to) : new Date(),
  };
  
  // Validate dates
  if (isNaN(req.dateRange.from.getTime()) || isNaN(req.dateRange.to.getTime())) {
    return res.status(400).json({
      error: 'invalid_date_range',
      message: 'Invalid date format. Use YYYY-MM-DD.',
    });
  }
  
  // Ensure from <= to
  if (req.dateRange.from > req.dateRange.to) {
    return res.status(400).json({
      error: 'invalid_date_range',
      message: 'Start date must be before end date.',
    });
  }
  
  // Limit range to 1 year
  const maxRange = 365 * 24 * 60 * 60 * 1000;
  if (req.dateRange.to - req.dateRange.from > maxRange) {
    return res.status(400).json({
      error: 'date_range_too_large',
      message: 'Date range cannot exceed 1 year.',
    });
  }
  
  next();
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
  const adminRoles = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN'];
  
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Admin access required.',
    });
  }
  
  next();
}

// Apply admin check to all routes
router.use(requireAdmin);

// ============================================================================
// USAGE ROUTES
// ============================================================================

/**
 * GET /api/admin/usage/:tenantId
 * Get usage for a specific tenant
 */
router.get('/usage/:tenantId', validateDateRange, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { from, to } = req.dateRange;
    
    const usage = await getTenantUsage(tenantId, from, to);
    
    // Add current real-time usage from Redis
    const currentUsage = await getCurrentUsage(tenantId);
    if (currentUsage) {
      usage.realtime = currentUsage;
    }
    
    res.json(usage);
  } catch (error) {
    console.error('[adminUsage] Error getting tenant usage:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get tenant usage.',
    });
  }
});

/**
 * GET /api/admin/usage
 * Get usage for all tenants (summary)
 */
router.get('/usage', validateDateRange, async (req, res) => {
  try {
    const { from, to } = req.dateRange;
    const { limit, sortBy, order } = req.query;
    
    const usage = await getAllTenantsUsage(from, to, {
      limit: parseInt(limit || '100', 10),
      sortBy: sortBy || 'apiCalls',
      order: order || 'desc',
    });
    
    res.json(usage);
  } catch (error) {
    console.error('[adminUsage] Error getting all usage:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get usage data.',
    });
  }
});

/**
 * GET /api/admin/usage/:tenantId/trends
 * Get usage trends for a tenant
 */
router.get('/usage/:tenantId/trends', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { days } = req.query;
    
    const trends = await getUsageTrends(tenantId, parseInt(days || '30', 10));
    
    res.json(trends);
  } catch (error) {
    console.error('[adminUsage] Error getting trends:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get usage trends.',
    });
  }
});

/**
 * GET /api/admin/usage/:tenantId/features
 * Get feature usage breakdown
 */
router.get('/usage/:tenantId/features', validateDateRange, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { from, to } = req.dateRange;
    
    const features = await getFeatureUsage(tenantId, from, to);
    
    res.json(features);
  } catch (error) {
    console.error('[adminUsage] Error getting feature usage:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get feature usage.',
    });
  }
});

/**
 * GET /api/admin/usage/:tenantId/billing
 * Get billable usage for a billing period
 */
router.get('/usage/:tenantId/billing', validateDateRange, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { from, to } = req.dateRange;
    
    const billing = await getBillableUsage(tenantId, from, to);
    
    res.json(billing);
  } catch (error) {
    console.error('[adminUsage] Error getting billing usage:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get billing usage.',
    });
  }
});

/**
 * GET /api/admin/usage/top-consumers
 * Get top API consumers
 */
router.get('/top-consumers', async (req, res) => {
  try {
    const { date, limit } = req.query;
    
    const consumers = await getTopConsumers(
      date ? new Date(date) : new Date(),
      parseInt(limit || '10', 10)
    );
    
    res.json({
      date: (date ? new Date(date) : new Date()).toISOString().slice(0, 10),
      consumers,
    });
  } catch (error) {
    console.error('[adminUsage] Error getting top consumers:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get top consumers.',
    });
  }
});

// ============================================================================
// QUOTA ROUTES
// ============================================================================

/**
 * GET /api/admin/quotas/:tenantId
 * Get quota configuration for a tenant
 */
router.get('/quotas/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const quota = await getTenantQuota(tenantId);
    const currentUsage = await getCurrentUsage(tenantId);
    
    res.json({
      tenantId,
      quota,
      currentUsage,
      limits: {
        perMinute: quota.perMinute,
        perDay: quota.perDay,
        storageBytes: quota.storageBytesLimit,
        activeUsers: quota.activeUsersLimit,
      },
    });
  } catch (error) {
    console.error('[adminUsage] Error getting quota:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get quota.',
    });
  }
});

/**
 * PUT /api/admin/quotas/:tenantId
 * Update quota configuration for a tenant
 */
router.put('/quotas/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan, customLimits } = req.body;
    
    // Validate plan
    if (plan && !DEFAULT_QUOTAS[plan]) {
      return res.status(400).json({
        error: 'invalid_plan',
        message: `Invalid plan. Valid options: ${Object.keys(DEFAULT_QUOTAS).join(', ')}`,
      });
    }
    
    const success = await setTenantQuota(tenantId, plan || 'free', customLimits);
    
    if (success) {
      const updatedQuota = await getTenantQuota(tenantId);
      res.json({
        message: 'Quota updated successfully',
        tenantId,
        quota: updatedQuota,
      });
    } else {
      res.status(500).json({
        error: 'update_failed',
        message: 'Failed to update quota.',
      });
    }
  } catch (error) {
    console.error('[adminUsage] Error updating quota:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to update quota.',
    });
  }
});

/**
 * POST /api/admin/quotas/:tenantId/reset
 * Reset usage counters for a tenant
 */
router.post('/quotas/:tenantId/reset', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { scope } = req.body; // 'minute', 'day', or 'all'
    
    const success = await resetUsage(tenantId, scope || 'all');
    
    if (success) {
      res.json({
        message: 'Usage counters reset successfully',
        tenantId,
        scope: scope || 'all',
      });
    } else {
      res.status(500).json({
        error: 'reset_failed',
        message: 'Failed to reset usage counters.',
      });
    }
  } catch (error) {
    console.error('[adminUsage] Error resetting usage:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to reset usage.',
    });
  }
});

// ============================================================================
// DENYLIST ROUTES
// ============================================================================

/**
 * POST /api/admin/quotas/:tenantId/block
 * Block a tenant (add to denylist)
 */
router.post('/quotas/:tenantId/block', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;
    
    addToDenylist(tenantId, reason || 'admin_action');
    
    res.json({
      message: 'Tenant blocked successfully',
      tenantId,
      reason: reason || 'admin_action',
    });
  } catch (error) {
    console.error('[adminUsage] Error blocking tenant:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to block tenant.',
    });
  }
});

/**
 * POST /api/admin/quotas/:tenantId/unblock
 * Unblock a tenant (remove from denylist)
 */
router.post('/quotas/:tenantId/unblock', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    removeFromDenylist(tenantId);
    
    res.json({
      message: 'Tenant unblocked successfully',
      tenantId,
    });
  } catch (error) {
    console.error('[adminUsage] Error unblocking tenant:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to unblock tenant.',
    });
  }
});

// ============================================================================
// SYSTEM STATS
// ============================================================================

/**
 * GET /api/admin/usage/stats
 * Get usage metering and quota system stats
 */
router.get('/stats', async (req, res) => {
  try {
    const quotaStats = await getQuotaStats();
    const meterStats = getBufferStats();
    
    res.json({
      quota: quotaStats,
      meter: meterStats,
      plans: DEFAULT_QUOTAS,
    });
  } catch (error) {
    console.error('[adminUsage] Error getting stats:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Failed to get stats.',
    });
  }
});

/**
 * GET /api/admin/plans
 * Get available quota plans
 */
router.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(DEFAULT_QUOTAS).map(([name, limits]) => ({
      name,
      ...limits,
    })),
  });
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = router;
