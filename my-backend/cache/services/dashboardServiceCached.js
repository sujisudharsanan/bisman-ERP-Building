// Cached dashboard aggregation service
const { cacheFunction } = require('../decorators/cacheFunction');

async function buildDashboard(userId) {
  // Placeholder: replace with real parallel DB calls
  return { userId, alertsCount: 12, tasksDue: 7, revenueToday: 12890, inventoryLow: 3 };
}

const getDashboardCached = cacheFunction({ prefix: 'dash:core', ttlSeconds: 90 })(buildDashboard);
module.exports = { getDashboardCached };
