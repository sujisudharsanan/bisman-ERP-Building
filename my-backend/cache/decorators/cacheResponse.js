// Express response caching middleware for idempotent GET endpoints
const { redis } = require('../redisClient');

function cacheResponse({ prefix, ttlSeconds, varyParams = [] }) {
  return async function (req, res, next) {
    if (!redis || req.method !== 'GET') return next();
    try {
      const paramsFragment = varyParams.map(p => `${p}=${req.query[p]||req.params[p]||''}`).join('&');
      const userPart = req.user?.id || 'anon';
      const k = `${prefix}:${userPart}:${req.path}:${paramsFragment}`;
      const hit = await redis.get(k);
      if (hit) {
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(hit));
      }
      const original = res.json.bind(res);
      res.json = async (body) => {
        if (res.statusCode === 200) {
          await redis.set(k, JSON.stringify(body), 'EX', ttlSeconds);
          res.set('X-Cache', 'MISS');
        }
        return original(body);
      };
      next();
    } catch (e) { next(); }
  };
}
module.exports = { cacheResponse };
