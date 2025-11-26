// Redis client singleton with telemetry & resilience
// If REDIS_URL is one of special sentinel values, disable Redis and use a no-op client.
const Redis = require('ioredis');

const rawUrl = process.env.REDIS_URL || '';
const sentinel = ['inmemory', 'memory', 'mock', 'disabled', 'none'];
const isDisabled = sentinel.includes(String(rawUrl).trim().toLowerCase());

let redis = null;
if (!rawUrl || isDisabled) {
  if (!rawUrl) {
    console.warn('[cache] REDIS_URL not set; cache will be disabled (fail-open).');
  } else {
    console.log('[cache] ✅ In-memory/disabled mode selected by REDIS_URL value. No Redis connection will be made.');
  }
} else {
  redis = new Redis(rawUrl, {
    enableAutoPipelining: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // fail fast, no endless retries
    commandTimeout: 1200,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on('connect', () => console.log('[cache] 🔌 Redis connect'));
  redis.on('ready', () => console.log('[cache] ✅ Redis ready'));
  redis.on('error', e => console.error('[cache] ❌ Redis error', e.message));
  redis.on('end', () => console.warn('[cache] ⚠️ Redis connection closed'));

  // attempt connect but don't explode
  redis.connect().catch(() => {
    console.warn('[cache] ⚠️ Redis not reachable, caching will be no-op until available.');
  });
}

function isEnabled() { return Boolean(redis); }

async function ping() {
  if (!redis) return { pong: null, ms: null, enabled: false };
  const t0 = Date.now();
  const pong = await redis.ping();
  return { pong, ms: Date.now() - t0, enabled: true };
}

module.exports = { redis, isEnabled, ping };
