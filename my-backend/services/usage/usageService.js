/**
 * Usage Service
 * ==============
 * 
 * Service for querying and aggregating tenant usage data.
 * Used for billing, analytics, and admin dashboards.
 * 
 * @module services/usage/usageService
 */

const { getPrimary, getReplica } = require('../../lib/prismaClients');

// ============================================================================
// USAGE QUERIES
// ============================================================================

/**
 * Get usage for a tenant within a date range
 * @param {string} tenantId - Tenant UUID
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<object>} Usage data
 */
async function getTenantUsage(tenantId, from, to) {
  const prisma = getReplica() || getPrimary();
  
  const usage = await prisma.tenantUsage.findMany({
    where: {
      tenantId,
      date: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { date: 'asc' },
  });
  
  // Calculate totals
  const totals = {
    apiCalls: 0,
    storageBytes: BigInt(0),
    activeUsers: 0,
    featureUsage: {},
  };
  
  const uniqueUsers = new Set();
  
  for (const day of usage) {
    totals.apiCalls += day.apiCalls;
    if (day.storageBytes > totals.storageBytes) {
      totals.storageBytes = day.storageBytes;
    }
    
    // Aggregate feature usage
    if (day.featureUsage && typeof day.featureUsage === 'object') {
      for (const [feature, count] of Object.entries(day.featureUsage)) {
        if (feature === 'active_user_ids') continue;
        totals.featureUsage[feature] = (totals.featureUsage[feature] || 0) + count;
      }
      
      // Track unique users
      if (day.featureUsage.active_user_ids) {
        day.featureUsage.active_user_ids.forEach(id => uniqueUsers.add(id));
      }
    }
  }
  
  totals.activeUsers = uniqueUsers.size || Math.max(...usage.map(d => d.activeUsers), 0);
  
  return {
    tenantId,
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    totals: {
      apiCalls: totals.apiCalls,
      storageBytes: Number(totals.storageBytes),
      activeUsers: totals.activeUsers,
      featureUsage: totals.featureUsage,
    },
    daily: usage.map(day => ({
      date: day.date.toISOString().slice(0, 10),
      apiCalls: day.apiCalls,
      storageBytes: Number(day.storageBytes),
      activeUsers: day.activeUsers,
      featureUsage: day.featureUsage,
    })),
    daysWithData: usage.length,
  };
}

/**
 * Get usage summary for all tenants (for admin dashboard)
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @param {object} options - Options (limit, sortBy, order)
 * @returns {Promise<object>} All tenants usage
 */
async function getAllTenantsUsage(from, to, options = {}) {
  const prisma = getReplica() || getPrimary();
  
  const { limit = 100, sortBy = 'apiCalls', order = 'desc' } = options;
  
  // Aggregate by tenant
  const usage = await prisma.tenantUsage.groupBy({
    by: ['tenantId'],
    where: {
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      apiCalls: true,
    },
    _max: {
      storageBytes: true,
      activeUsers: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        apiCalls: order,
      },
    },
    take: limit,
  });
  
  return {
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    tenants: usage.map(t => ({
      tenantId: t.tenantId,
      totalApiCalls: t._sum.apiCalls || 0,
      maxStorageBytes: Number(t._max.storageBytes || 0),
      maxActiveUsers: t._max.activeUsers || 0,
      daysActive: t._count.id,
    })),
    totalTenants: usage.length,
  };
}

/**
 * Get usage trends for a tenant
 * @param {string} tenantId - Tenant UUID
 * @param {number} days - Number of days to look back
 * @returns {Promise<object>} Usage trends
 */
async function getUsageTrends(tenantId, days = 30) {
  const prisma = getReplica() || getPrimary();
  
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  
  const usage = await prisma.tenantUsage.findMany({
    where: {
      tenantId,
      date: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { date: 'asc' },
  });
  
  if (usage.length < 2) {
    return {
      tenantId,
      period: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      trends: null,
      message: 'Insufficient data for trend analysis',
    };
  }
  
  // Calculate trends
  const halfPoint = Math.floor(usage.length / 2);
  const firstHalf = usage.slice(0, halfPoint);
  const secondHalf = usage.slice(halfPoint);
  
  const avgFirst = {
    apiCalls: firstHalf.reduce((sum, d) => sum + d.apiCalls, 0) / firstHalf.length,
    activeUsers: firstHalf.reduce((sum, d) => sum + d.activeUsers, 0) / firstHalf.length,
  };
  
  const avgSecond = {
    apiCalls: secondHalf.reduce((sum, d) => sum + d.apiCalls, 0) / secondHalf.length,
    activeUsers: secondHalf.reduce((sum, d) => sum + d.activeUsers, 0) / secondHalf.length,
  };
  
  const apiCallsTrend = avgFirst.apiCalls > 0 
    ? ((avgSecond.apiCalls - avgFirst.apiCalls) / avgFirst.apiCalls) * 100 
    : 0;
  
  const activeUsersTrend = avgFirst.activeUsers > 0
    ? ((avgSecond.activeUsers - avgFirst.activeUsers) / avgFirst.activeUsers) * 100
    : 0;
  
  return {
    tenantId,
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    trends: {
      apiCalls: {
        firstHalfAvg: Math.round(avgFirst.apiCalls),
        secondHalfAvg: Math.round(avgSecond.apiCalls),
        changePercent: Math.round(apiCallsTrend * 10) / 10,
        direction: apiCallsTrend > 5 ? 'up' : apiCallsTrend < -5 ? 'down' : 'stable',
      },
      activeUsers: {
        firstHalfAvg: Math.round(avgFirst.activeUsers),
        secondHalfAvg: Math.round(avgSecond.activeUsers),
        changePercent: Math.round(activeUsersTrend * 10) / 10,
        direction: activeUsersTrend > 5 ? 'up' : activeUsersTrend < -5 ? 'down' : 'stable',
      },
    },
    dataPoints: usage.length,
  };
}

/**
 * Get feature usage breakdown
 * @param {string} tenantId - Tenant UUID
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Promise<object>} Feature usage breakdown
 */
async function getFeatureUsage(tenantId, from, to) {
  const prisma = getReplica() || getPrimary();
  
  const usage = await prisma.tenantUsage.findMany({
    where: {
      tenantId,
      date: {
        gte: from,
        lte: to,
      },
    },
    select: {
      date: true,
      featureUsage: true,
    },
    orderBy: { date: 'asc' },
  });
  
  // Aggregate feature usage
  const features = {};
  
  for (const day of usage) {
    if (day.featureUsage && typeof day.featureUsage === 'object') {
      for (const [feature, count] of Object.entries(day.featureUsage)) {
        if (feature === 'active_user_ids') continue;
        
        if (!features[feature]) {
          features[feature] = { total: 0, daily: [] };
        }
        features[feature].total += count;
        features[feature].daily.push({
          date: day.date.toISOString().slice(0, 10),
          count,
        });
      }
    }
  }
  
  return {
    tenantId,
    period: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
    features,
  };
}

/**
 * Get top API consumers (tenants)
 * @param {Date} date - Date to check (defaults to today)
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Top consumers
 */
async function getTopConsumers(date = new Date(), limit = 10) {
  const prisma = getReplica() || getPrimary();
  
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  const usage = await prisma.tenantUsage.findMany({
    where: {
      date: dayStart,
    },
    orderBy: { apiCalls: 'desc' },
    take: limit,
  });
  
  return usage.map(u => ({
    tenantId: u.tenantId,
    apiCalls: u.apiCalls,
    activeUsers: u.activeUsers,
    storageBytes: Number(u.storageBytes),
  }));
}

// ============================================================================
// BILLING HELPERS
// ============================================================================

/**
 * Get billable usage for a billing period
 * @param {string} tenantId - Tenant UUID
 * @param {Date} billingPeriodStart - Start of billing period
 * @param {Date} billingPeriodEnd - End of billing period
 * @returns {Promise<object>} Billable usage
 */
async function getBillableUsage(tenantId, billingPeriodStart, billingPeriodEnd) {
  const usage = await getTenantUsage(tenantId, billingPeriodStart, billingPeriodEnd);
  
  // Get quota for the tenant to determine overage
  const { getTenantQuota } = require('../../middleware/tenantQuota');
  const quota = await getTenantQuota(tenantId);
  
  const daysInPeriod = Math.ceil((billingPeriodEnd - billingPeriodStart) / (1000 * 60 * 60 * 24));
  const includedApiCalls = quota.perDay * daysInPeriod;
  
  const overage = {
    apiCalls: Math.max(0, usage.totals.apiCalls - includedApiCalls),
    storageBytes: Math.max(0, usage.totals.storageBytes - quota.storageBytesLimit),
    activeUsers: quota.activeUsersLimit > 0 
      ? Math.max(0, usage.totals.activeUsers - quota.activeUsersLimit)
      : 0,
  };
  
  return {
    tenantId,
    plan: quota.plan,
    billingPeriod: {
      start: billingPeriodStart.toISOString().slice(0, 10),
      end: billingPeriodEnd.toISOString().slice(0, 10),
      days: daysInPeriod,
    },
    included: {
      apiCalls: includedApiCalls,
      storageBytes: quota.storageBytesLimit,
      activeUsers: quota.activeUsersLimit,
    },
    actual: usage.totals,
    overage,
    hasOverage: Object.values(overage).some(v => v > 0),
  };
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Delete old usage data (retention policy)
 * @param {number} retentionDays - Days to retain (default 365)
 * @returns {Promise<number>} Number of records deleted
 */
async function cleanupOldUsage(retentionDays = 365) {
  const prisma = getPrimary();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const result = await prisma.tenantUsage.deleteMany({
    where: {
      date: {
        lt: cutoffDate,
      },
    },
  });
  
  console.log(`[usageService] Cleaned up ${result.count} usage records older than ${retentionDays} days`);
  
  return result.count;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getTenantUsage,
  getAllTenantsUsage,
  getUsageTrends,
  getFeatureUsage,
  getTopConsumers,
  getBillableUsage,
  cleanupOldUsage,
};
