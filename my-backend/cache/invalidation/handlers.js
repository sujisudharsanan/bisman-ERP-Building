// Event-based cache invalidation handlers
const { redis } = require('../redisClient');
const { key, NS } = require('../namespaces');

const patternRegistry = {
  PARTY_UPDATED: id => [ key(NS.PARTY, id) ],
  PARTY_BULK_IMPORT: () => ['party:*'],
  DASHBOARD_CRITICAL_METRIC_CHANGE: userId => [ `dash:core:[\"${userId}\"]` ]
};

async function invalidate(event, payload) {
  if (!redis) return; // fail-open
  const patterns = patternRegistry[event]?.(payload) || [];
  for (const p of patterns) {
    if (p.includes('*')) {
      let cursor = '0';
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', p, 'COUNT', 100);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== '0');
    } else {
      await redis.del(p);
    }
  }
}

module.exports = { invalidate, patternRegistry };
