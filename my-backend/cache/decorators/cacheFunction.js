// Generic async function caching decorator
const { redis } = require('../redisClient');

function cacheFunction({ prefix, ttlSeconds, serialize = JSON.stringify, deserialize = JSON.parse }) {
  return function wrap(fn) {
    return async function cached(...args) {
      if (!redis) return fn(...args); // fail-open
      const sig = serialize(args);
      const k = `${prefix}:${sig}`;
      const cached = await redis.get(k);
      if (cached) {
        return deserialize(cached);
      }
      const result = await fn(...args);
      if (result !== undefined && result !== null) {
        await redis.set(k, serialize(result), 'EX', ttlSeconds);
      }
      return result;
    };
  };
}
module.exports = { cacheFunction };
