// Cached heavy report generation
const { cacheFunction } = require('../decorators/cacheFunction');

async function generateMonthlySales({ month, year, currency }) {
  // Placeholder heavy computation
  return { month, year, currency, total: 890123.55, lines: 2402 };
}

const getMonthlySalesCached = cacheFunction({ prefix: 'report:monthly:v1', ttlSeconds: 3600 })(generateMonthlySales);
module.exports = { getMonthlySalesCached };
