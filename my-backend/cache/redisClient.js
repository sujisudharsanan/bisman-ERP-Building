// Redis client singleton with telemetry & resilience
const Redis = require('ioredis');

const url = process.env.REDIS_URL;
if (!url) {
  console.warn('[cache] REDIS_URL not set; cache will be disabled (fail-open).');
}

let redis = null;
if (url) {
  redis = new Redis(url, {
    enableAutoPipelining: true,
    maxRetriesPerRequest: 3,
    retryStrategy: times => Math.min(times * 50, 2000),
    commandTimeout: 1500
  });

  redis.on('connect', () => console.log('[cache] 🔌 Redis connect'));
  redis.on('ready', () => console.log('[cache] ✅ Redis ready'));
  redis.on('error', e => console.error('[cache] ❌ Redis error', e.message));
  redis.on('end', () => console.warn('[cache] ⚠️ Redis connection closed'));
}

function isEnabled() { return Boolean(redis); }

async function ping() {
  if (!redis) return { pong: null, ms: null, enabled: false };
  const t0 = Date.now();
  const pong = await redis.ping();
  return { pong, ms: Date.now() - t0, enabled: true };
}

module.exports = { redis, isEnabled, ping };
